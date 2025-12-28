from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
import secrets

class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="wallet")
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

class WalletTransaction(models.Model):
    TOPUP = "TOPUP"
    PAYMENT = "PAYMENT"
    TYPES = [(TOPUP, "Topup"), (PAYMENT, "Payment")]

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="transactions")
    tx_type = models.CharField(max_length=10, choices=TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)  # positive
    reference = models.CharField(max_length=32, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    invoice_public_id = models.CharField(max_length=32, blank=True, default="")

class Invoice(models.Model):
    PENDING = "PENDING"
    PAID = "PAID"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    STATUSES = [(PENDING,"Pending"), (PAID,"Paid"), (EXPIRED,"Expired"), (CANCELLED,"Cancelled")]

    public_id = models.CharField(max_length=32, unique=True, editable=False)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=200, blank=True, default="")

    # Device control parameters
    device_id = models.CharField(max_length=64, blank=True, default="")
    duration_sec = models.PositiveIntegerField(default=0)  # seconds for action=1

    status = models.CharField(max_length=10, choices=STATUSES, default=PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    paid_at = models.DateTimeField(null=True, blank=True)
    paid_reference = models.CharField(max_length=32, blank=True, default="")

    def save(self, *args, **kwargs):
        if not self.public_id:
            self.public_id = "pay_" + secrets.token_hex(6).upper()
        super().save(*args, **kwargs)

    def is_expired(self):
        return timezone.now() >= self.expires_at

class PaymentTransaction(models.Model):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    STATUSES = [(SUCCESS,"Success"), (FAILED,"Failed")]

    WALLET = "WALLET"
    GUEST = "GUEST"
    METHODS = [(WALLET,"Wallet"), (GUEST,"Guest")]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    method = models.CharField(max_length=10, choices=METHODS)
    status = models.CharField(max_length=10, choices=STATUSES, default=SUCCESS)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField(max_length=32, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Device(models.Model):
    """
    A simple device registry.
    device_id is public-ish; secret exists but is not required for polling/acking.
    """
    device_id = models.CharField(max_length=64, unique=True)
    secret = models.CharField(max_length=64, editable=False)
    is_active = models.BooleanField(default=True)
    last_seen = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.secret:
            self.secret = secrets.token_hex(16)
        super().save(*args, **kwargs)

class DeviceCommand(models.Model):
    """
    action: 0=STOP, 1=START
    duration_sec: only meaningful when action=1
    """
    QUEUED = "QUEUED"
    SENT = "SENT"
    ACKED = "ACKED"
    STATES = [(QUEUED,"Queued"), (SENT,"Sent"), (ACKED,"Acked")]

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="commands")
    invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True)

    action = models.IntegerField()  # 0 or 1
    duration_sec = models.PositiveIntegerField(default=0)

    state = models.CharField(max_length=10, choices=STATES, default=QUEUED)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    acked_at = models.DateTimeField(null=True, blank=True)
