from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView  # Import RedirectView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('login/', include('vulnerable_app.urls')),
    path('', RedirectView.as_view(url='/login/', permanent=True)),  # Redirect root to /login/
]
