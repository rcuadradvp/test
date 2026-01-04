# api/middleware/error_handler_middleware.py

from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
import logging
from django.shortcuts import render

logger = logging.getLogger(__name__)

class ErrorHandlerMiddleware(MiddlewareMixin):
    """Middleware para manejar errores 404 y otros errores"""
    
    def process_response(self, request, response):
        if response.status_code == 404:
            
            return render(request, 'errors/404.html', {
            }, status=404)
        
        return response
    
    def process_exception(self, request, exception):
        logger.error(f"Error no manejado: {str(exception)}", exc_info=True)
        
        return JsonResponse({
            'error': 'Error interno del servidor',
            'message': 'Ha ocurrido un error inesperado'
        }, status=500)