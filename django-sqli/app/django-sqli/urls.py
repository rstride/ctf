from django.urls import path
from vulnerable_app import views

urlpatterns = [
    path('search/', views.search),
]
