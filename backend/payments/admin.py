from django.contrib import admin
from .models import Wallet, WalletTransaction, Invoice, PaymentTransaction, Device, DeviceCommand

admin.site.register(Wallet)
admin.site.register(WalletTransaction)
admin.site.register(Invoice)
admin.site.register(PaymentTransaction)
admin.site.register(Device)
admin.site.register(DeviceCommand)
