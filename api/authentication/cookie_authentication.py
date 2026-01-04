# api/authentication/cookie_authentication.py

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import AccessToken, TokenError
from api.models import User
import logging

logger = logging.getLogger(__name__)

class CookieJWTAuthentication(BaseAuthentication):
    """
    Autenticación JWT desde cookies para Django Rest Framework
    """
    
    def authenticate(self, request):
        """
        Intenta autenticar usando el token de la cookie
        IMPORTANTE: NO acceder a request.user aquí - causaría recursión infinita
        """
        # Obtener token de la cookie
        token = request.COOKIES.get('access_token')
        
        if not token:
            # No hay token, retornar None (permite autenticación anónima)
            logger.debug("[DRF-AUTH] No hay token en cookies")
            return None
        
        try:
            # Validar token
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            
            # Obtener usuario
            user = User.objects.select_related('company', 'role').get(id=user_id)
            
            if not user.is_active:
                logger.warning(f"[DRF-AUTH] Usuario inactivo: {user.email}")
                raise AuthenticationFailed('Usuario inactivo')
            
            logger.info(f"[DRF-AUTH] Usuario autenticado: {user.email}")
            return (user, None)
            
        except TokenError as e:
            logger.error(f"[DRF-AUTH] Token inválido: {str(e)}")
            raise AuthenticationFailed('Token inválido o expirado')
        except User.DoesNotExist:
            logger.error(f"[DRF-AUTH] Usuario no encontrado: {user_id}")
            raise AuthenticationFailed('Usuario no encontrado')
        except Exception as e:
            logger.error(f"[DRF-AUTH] Error inesperado: {str(e)}")
            raise AuthenticationFailed('Error de autenticación')