# frontend/private/views.py
from django.shortcuts import render, redirect
from rest_framework_simplejwt.tokens import AccessToken, TokenError

def check_auth(request):
    """Verifica autenticación por cookie"""
    token = request.COOKIES.get('access_token')
    if not token:
        return redirect('public:login')
    try:
        AccessToken(token)
        return None
    except TokenError:
        resp = redirect('public:login')
        resp.delete_cookie('access_token')
        resp.delete_cookie('refresh_token')
        return resp

def dashboard_view(request):
    """Dashboard principal - Todos los roles"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/dashboard/index.html')

def users_view(request):
    """Gestión de usuarios - Solo Super Admin y Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/users/index.html')

def roles_view(request):
    """Ver roles - Solo Super Admin y Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/roles.html')

def permissions_view(request):
    """Ver permisos del usuario"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/permissions.html')

# ===== NUEVAS PÁGINAS DE PRUEBA =====

def sales_view(request):
    """Ventas/POS - Cashier, Admin, Super Admin, Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/sales/index.html')

def credit_payments_view(request):
    """Pago de Créditos - Cashier, Admin, Super Admin, Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/credit_payments.html')

# ===== RESTO DE VISTAS =====

def clients_view(request):
    """Clientes - Admin, Super Admin, Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/clients.html')

def system_config_view(request):
    """Configuración del Sistema - Solo Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/system_config.html')