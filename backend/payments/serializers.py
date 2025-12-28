from rest_framework import serializers
from django.contrib.auth.models import User
from decimal import Decimal
from .models import Wallet, WalletTransaction, Invoice

class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"]
        )
        Wallet.objects.create(user=user)
        return user

class InvoicePublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            "public_id","amount","description","device_id","duration_sec",
            "status","created_at","expires_at","paid_at","paid_reference"
        ]

class CreateInvoiceSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    description = serializers.CharField(required=False, allow_blank=True)
    device_id = serializers.CharField(required=True)          # which device to control
    duration_sec = serializers.IntegerField(required=True)    # seconds for action=1

    def validate_duration_sec(self, v):
        if v <= 0 or v > 24 * 60 * 60:
            raise serializers.ValidationError("duration_sec must be 1..86400")
        return v

class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = ["tx_type", "amount", "reference", "created_at", "invoice_public_id"]

class TopupSerializer(serializers.Serializer):
    preset = serializers.IntegerField(required=False)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)

    def validate(self, data):
        presets = [1,2,5,10,20,50]
        if "preset" not in data and "amount" not in data:
            raise serializers.ValidationError("Provide preset or amount.")
        if "preset" in data:
            if data["preset"] not in presets:
                raise serializers.ValidationError("Invalid preset.")
            data["amount"] = Decimal(str(data["preset"])).quantize(Decimal("0.00"))
        amt = data["amount"]
        if amt < Decimal("1.00"):
            raise serializers.ValidationError("Minimum reload is RM1.00.")
        if amt > Decimal("500.00"):
            raise serializers.ValidationError("Maximum reload is RM500.00 (simulation).")
        return data

class WalletPaySerializer(serializers.Serializer):
    invoice_public_id = serializers.CharField()

class GuestPaySerializer(serializers.Serializer):
    invoice_public_id = serializers.CharField()
    guest_name = serializers.CharField(required=False, allow_blank=True)

class DeviceNextSerializer(serializers.Serializer):
    secret = serializers.CharField(required=False, allow_blank=True)

class DeviceAckSerializer(serializers.Serializer):
    secret = serializers.CharField(required=False, allow_blank=True)
    command_id = serializers.IntegerField()
