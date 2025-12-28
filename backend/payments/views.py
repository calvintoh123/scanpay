from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.views import TokenObtainPairView
from django.utils import timezone
from django.db import transaction
from decimal import Decimal
import secrets

from .models import Wallet, WalletTransaction, Invoice, PaymentTransaction, Device, DeviceCommand
from .serializers import (
    RegisterSerializer, InvoicePublicSerializer, CreateInvoiceSerializer,
    WalletTransactionSerializer, TopupSerializer,
    WalletPaySerializer, GuestPaySerializer,
    DeviceNextSerializer, DeviceAckSerializer
)
from .tokens import sign_invoice_token, verify_invoice_token

def _ref(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(3).upper()}"

def _ensure_device(device_id: str) -> Device:
    dev, _ = Device.objects.get_or_create(device_id=device_id)
    return dev

@transaction.atomic
def _mark_invoice_paid_and_enqueue_command(inv: Invoice, user=None, method="GUEST") -> str:
    """
    Marks invoice paid (if still pending) and enqueues device command:
      action=1, duration_sec=inv.duration_sec
    Returns receipt ref.
    """
    if inv.status != Invoice.PENDING:
        raise ValueError(f"Invoice not payable (status={inv.status})")
    if inv.is_expired():
        inv.status = Invoice.EXPIRED
        inv.save(update_fields=["status"])
        raise ValueError("Invoice expired")

    rcpt = _ref("RCPT")
    inv.status = Invoice.PAID
    inv.paid_at = timezone.now()
    inv.paid_reference = rcpt
    inv.save(update_fields=["status","paid_at","paid_reference"])

    PaymentTransaction.objects.create(
        invoice=inv,
        user=user,
        method=method,
        status=PaymentTransaction.SUCCESS,
        amount=inv.amount,
        reference=rcpt,
    )

    # Create device command (START=1)
    if inv.device_id:
        dev = _ensure_device(inv.device_id)
        DeviceCommand.objects.create(
            device=dev,
            invoice=inv,
            action=1,
            duration_sec=inv.duration_sec,
            state=DeviceCommand.QUEUED
        )

    return rcpt

class RegisterView(APIView):
    def post(self, request):
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        return Response({"username": user.username}, status=201)

class CreateInvoiceView(APIView):
    """
    Create invoice and return pay_url + signed token (for QR).
    Also stores device_id + duration_sec inside invoice.
    """
    def post(self, request):
        s = CreateInvoiceSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        inv = Invoice.objects.create(
            amount=s.validated_data["amount"],
            description=s.validated_data.get("description",""),
            device_id=s.validated_data["device_id"],
            duration_sec=s.validated_data["duration_sec"],
            expires_at=timezone.now() + timezone.timedelta(minutes=15),
        )

        token = sign_invoice_token(inv.public_id, exp_seconds=900)
        pay_url = f"/pay/{inv.public_id}?t={token}"

        return Response({
            "public_id": inv.public_id,
            "amount": str(inv.amount),
            "status": inv.status,
            "device_id": inv.device_id,
            "duration_sec": inv.duration_sec,
            "expires_at": inv.expires_at,
            "pay_url": pay_url,
            "token": token,
        }, status=201)

class InvoicePublicView(APIView):
    """
    Pay page reads invoice details using signed token in query ?t=
    """
    def get(self, request, public_id: str):
        token = request.query_params.get("t", "")
        if not verify_invoice_token(token, public_id):
            return Response({"detail":"Invalid or expired token."}, status=401)

        try:
            inv = Invoice.objects.get(public_id=public_id)
        except Invoice.DoesNotExist:
            return Response({"detail":"Not found."}, status=404)

        if inv.status == Invoice.PENDING and inv.is_expired():
            inv.status = Invoice.EXPIRED
            inv.save(update_fields=["status"])

        return Response(InvoicePublicSerializer(inv).data)

class InvoiceStatusView(APIView):
    """
    Optional: public status endpoint. For devices, prefer /api/device/<id>/next/
    """
    def get(self, request, public_id: str):
        try:
            inv = Invoice.objects.get(public_id=public_id)
        except Invoice.DoesNotExist:
            return Response({"detail":"Not found."}, status=404)

        if inv.status == Invoice.PENDING and inv.is_expired():
            inv.status = Invoice.EXPIRED
            inv.save(update_fields=["status"])

        return Response({
            "public_id": inv.public_id,
            "status": inv.status,
            "paid_reference": inv.paid_reference,
            "device_id": inv.device_id,
            "duration_sec": inv.duration_sec,
        })

class WalletMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        txs = wallet.transactions.order_by("-created_at")[:20]
        return Response({
            "balance": str(wallet.balance),
            "transactions": WalletTransactionSerializer(txs, many=True).data
        })

class WalletTopupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        s = TopupSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        amount: Decimal = s.validated_data["amount"]

        wallet = Wallet.objects.select_for_update().get(user=request.user)
        wallet.balance = (wallet.balance + amount).quantize(Decimal("0.00"))
        wallet.save(update_fields=["balance"])

        wtx = WalletTransaction.objects.create(
            wallet=wallet,
            tx_type=WalletTransaction.TOPUP,
            amount=amount,
            reference=_ref("TOPUP"),
        )
        return Response({
            "balance": str(wallet.balance),
            "topup_amount": str(amount),
            "reference": wtx.reference,
            "created_at": wtx.created_at,
        }, status=201)

class WalletPayView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        s = WalletPaySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        pid = s.validated_data["invoice_public_id"]

        try:
            inv = Invoice.objects.select_for_update().get(public_id=pid)
        except Invoice.DoesNotExist:
            return Response({"detail":"Invoice not found."}, status=404)

        if inv.status != Invoice.PENDING:
            return Response({"detail": f"Invoice not payable (status={inv.status})."}, status=400)
        if inv.is_expired():
            inv.status = Invoice.EXPIRED
            inv.save(update_fields=["status"])
            return Response({"detail":"Invoice expired."}, status=400)

        wallet = Wallet.objects.select_for_update().get(user=request.user)
        if wallet.balance < inv.amount:
            return Response({"detail":"Insufficient balance."}, status=400)

        wallet.balance = (wallet.balance - inv.amount).quantize(Decimal("0.00"))
        wallet.save(update_fields=["balance"])

        WalletTransaction.objects.create(
            wallet=wallet,
            tx_type=WalletTransaction.PAYMENT,
            amount=inv.amount,
            reference=_ref("PAY"),
            invoice_public_id=inv.public_id,
        )

        try:
            rcpt = _mark_invoice_paid_and_enqueue_command(inv, user=request.user, method=PaymentTransaction.WALLET)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        return Response({
            "status": "PAID",
            "paid_reference": rcpt,
            "new_balance": str(wallet.balance),
        }, status=200)

class GuestPayView(APIView):
    @transaction.atomic
    def post(self, request):
        s = GuestPaySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        pid = s.validated_data["invoice_public_id"]

        try:
            inv = Invoice.objects.select_for_update().get(public_id=pid)
        except Invoice.DoesNotExist:
            return Response({"detail":"Invoice not found."}, status=404)

        try:
            rcpt = _mark_invoice_paid_and_enqueue_command(inv, user=None, method=PaymentTransaction.GUEST)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        return Response({"status":"PAID","paid_reference": rcpt}, status=200)

# ---------------------------
# Device polling API (0/1 + duration)
# ---------------------------

class DeviceNextCommandView(APIView):
    """
    Device polls:
      GET /api/device/<device_id>/next/?secret=...
    returns:
      { "has_command": true/false, "command_id": int, "action": 0/1, "duration_sec": int }
    """
    def get(self, request, device_id: str):
        s = DeviceNextSerializer(data={"secret": request.query_params.get("secret","")})
        s.is_valid(raise_exception=True)

        try:
            dev = Device.objects.get(device_id=device_id)
        except Device.DoesNotExist:
            return Response({"detail":"Unknown device."}, status=404)

        if not dev.is_active or dev.secret != s.validated_data["secret"]:
            return Response({"detail":"Unauthorized."}, status=401)

        dev.last_seen = timezone.now()
        dev.save(update_fields=["last_seen"])

        cmd = dev.commands.filter(state=DeviceCommand.QUEUED).order_by("created_at").first()
        if not cmd:
            return Response({"has_command": False})

        # mark as SENT when delivered
        cmd.state = DeviceCommand.SENT
        cmd.sent_at = timezone.now()
        cmd.save(update_fields=["state","sent_at"])

        return Response({
            "has_command": True,
            "command_id": cmd.id,
            "action": int(cmd.action),  # 0/1
            "duration_sec": int(cmd.duration_sec),
        })

class DeviceAckCommandView(APIView):
    """
    Device ACK:
      POST /api/device/<device_id>/ack/
      { "secret": "...", "command_id": 123 }
    """
    @transaction.atomic
    def post(self, request, device_id: str):
        s = DeviceAckSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        try:
            dev = Device.objects.select_for_update().get(device_id=device_id)
        except Device.DoesNotExist:
            return Response({"detail":"Unknown device."}, status=404)

        if not dev.is_active or dev.secret != s.validated_data["secret"]:
            return Response({"detail":"Unauthorized."}, status=401)

        cmd = DeviceCommand.objects.select_for_update().filter(
            id=s.validated_data["command_id"],
            device=dev
        ).first()

        if not cmd:
            return Response({"detail":"Command not found."}, status=404)

        cmd.state = DeviceCommand.ACKED
        cmd.acked_at = timezone.now()
        cmd.save(update_fields=["state","acked_at"])

        return Response({"ok": True})
