# frontend/public/views.py
from django.shortcuts import render, redirect
from rest_framework_simplejwt.tokens import AccessToken, TokenError

def login_view(request):
    """Vista de login"""
    token = request.COOKIES.get('access_token')
    if token:
        try:
            AccessToken(token)  # valida firma y expiración
            return redirect('private:dashboard')
        except TokenError:
            # Token inválido/expirado: limpia cookies y muestra login
            resp = render(request, 'public/login.html')
            resp.delete_cookie('access_token')
            resp.delete_cookie('refresh_token')
            return resp

    return render(request, 'public/login.html')

# NUEVO: Handler para error 404
def handler404(request, exception=None):
    """Página 404 personalizada"""
    # Verificar si el usuario está autenticado
    is_authenticated = False
    if hasattr(request, 'user') and request.user.is_authenticated:
        is_authenticated = True
    
    return render(request, 'errors/404.html', {
        'is_authenticated': is_authenticated,
    }, status=404)

# NUEVO: Handler para error 403
def handler403(request, exception=None):
    """Página 403 personalizada - Convertir a 404 por seguridad"""
    return handler404(request, exception)