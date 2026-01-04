# frontend/public/urls.py

from django.urls import path
from . import views

app_name = 'public'

urlpatterns = [
    path('', views.login_view, name='login'),
]