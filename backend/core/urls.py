from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("payments.urls")),
]

# Production (after building React into static/frontend/index.html)
if not settings.DEBUG:
    urlpatterns += [
        re_path(r"^(?!api/).*", TemplateView.as_view(template_name="index.html")),
    ]
