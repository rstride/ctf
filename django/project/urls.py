from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('sql_injection/', include('vulnerable_app.urls')),
]
