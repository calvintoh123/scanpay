from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, CreateInvoiceView, InvoicePublicView, InvoiceStatusView,
    WalletMeView, WalletTopupView, WalletPayView, GuestPayView,
    DeviceNextCommandView, DeviceLatestInvoiceView, DeviceRequestInvoiceView, DeviceAckCommandView
)

urlpatterns = [
    # Auth
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", TokenObtainPairView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),

    # Invoices
    path("invoices/", CreateInvoiceView.as_view()),
    path("invoices/<str:public_id>/", InvoicePublicView.as_view()),
    path("invoices/<str:public_id>/status/", InvoiceStatusView.as_view()),

    # Wallet
    path("wallet/me/", WalletMeView.as_view()),
    path("wallet/topup/", WalletTopupView.as_view()),
    path("wallet/pay/", WalletPayView.as_view()),

    # Guest Pay
    path("pay/guest/", GuestPayView.as_view()),

    # Device
    path("device/<str:device_id>/next/", DeviceNextCommandView.as_view()),
    path("device/<str:device_id>/latest-invoice/", DeviceLatestInvoiceView.as_view()),
    path("device/<str:device_id>/request-invoice/", DeviceRequestInvoiceView.as_view()),
    path("device/<str:device_id>/ack/", DeviceAckCommandView.as_view()),
]
