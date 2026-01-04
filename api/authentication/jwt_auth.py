# api/authentication/jwt_auth.py

from rest_framework_simplejwt.tokens import RefreshToken
from datetime import datetime, timezone, timedelta
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class JWTAuthHandler:
    """Manejador de tokens JWT con soporte para renovación automática"""
    
    # Duración del access token: 8 horas
    ACCESS_TOKEN_LIFETIME = timedelta(hours=8)
    
    # Duración del refresh token: 7 días
    REFRESH_TOKEN_LIFETIME = timedelta(days=7)
    
    @staticmethod
    def generate_tokens(user):
        """
        Generar access y refresh tokens con duración personalizada
        """
        refresh = RefreshToken.for_user(user)
        
        # Configurar duración del refresh token
        refresh.set_exp(lifetime=JWTAuthHandler.REFRESH_TOKEN_LIFETIME)
        
        # Obtener access token y configurar su duración
        access = refresh.access_token
        access.set_exp(lifetime=JWTAuthHandler.ACCESS_TOKEN_LIFETIME)
        
        # Agregar claims personalizados al access token
        access['email'] = user.email
        access['role'] = user.role.name
        access['company_id'] = str(user.company.id)
        
        # Agregar timestamp de última actividad (ahora)
        access['last_activity'] = datetime.now(timezone.utc).timestamp()
        
        # Agregar claims personalizados al refresh token
        refresh['email'] = user.email
        refresh['role'] = user.role.name
        refresh['company_id'] = str(user.company.id)
        
        logger.info(f"[JWT] Tokens generados para: {user.email} (access: 8h, refresh: 7d)")
        
        return {
            'refresh': str(refresh),
            'access': str(access),
        }
    
    @staticmethod
    def set_auth_cookies(response, tokens):
        """
        Configurar cookies HTTPOnly con los tokens
        """
        
        # Access token - 8 horas (28800 segundos)
        response.set_cookie(
            key='access_token',
            value=tokens['access'],
            httponly=True,
            secure=False,  # False en desarrollo, True en producción
            samesite='Lax',
            max_age=28800,  # 8 horas en segundos
            path='/',
        )
        
        # Refresh token - 7 días (604800 segundos)
        response.set_cookie(
            key='refresh_token',
            value=tokens['refresh'],
            httponly=True,
            secure=False,  # False en desarrollo, True en producción
            samesite='Lax',
            max_age=604800,  # 7 días en segundos
            path='/',
        )
        
        logger.info(f"[COOKIES] Configuradas: access_token (8h), refresh_token (7d)")
        
        return response
    
    @staticmethod
    def clear_auth_cookies(response):
        """
        Limpiar cookies de autenticación
        """
        response.delete_cookie('access_token', path='/')
        response.delete_cookie('refresh_token', path='/')
        logger.info(f"[COOKIES] Eliminadas")
        return response
    
    @staticmethod
    def update_activity_timestamp(token):
        """
        Actualizar el timestamp de última actividad en un token
        NOTA: Esto requiere generar un nuevo token, ya que los tokens JWT son inmutables
        """
        try:
            # Los tokens JWT son inmutables, así que necesitamos generar uno nuevo
            # Esta función es más conceptual - en la práctica, renovamos el token completo
            current_time = datetime.now(timezone.utc).timestamp()
            logger.info(f"[JWT] Actividad actualizada: {current_time}")
            return current_time
        except Exception as e:
            logger.error(f"[JWT] Error actualizando actividad: {str(e)}")
            return None