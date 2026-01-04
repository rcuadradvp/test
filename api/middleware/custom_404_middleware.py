# api/middleware/custom_404_middleware.py

from django.shortcuts import render
from django.utils.deprecation import MiddlewareMixin
from django.http import Http404

class Custom404Middleware(MiddlewareMixin):
    """
    Middleware para mostrar 404 personalizado incluso con DEBUG=True
    """
    
    def process_exception(self, request, exception):
        """Capturar excepciones Http404 y mostrar template personalizado"""
        if isinstance(exception, Http404):
            # Verificar si el usuario está autenticado
            is_authenticated = False
            if hasattr(request, 'user') and request.user.is_authenticated:
                is_authenticated = True
            
            return render(request, 'errors/404.html', {
                'is_authenticated': is_authenticated,
            }, status=404)
        
        return None