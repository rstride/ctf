from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.vulnerable_login, name='vulnerable_login'),
]
