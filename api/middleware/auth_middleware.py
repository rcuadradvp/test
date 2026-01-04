# api/middleware/auth_middleware.py

from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.shortcuts import redirect
from rest_framework_simplejwt.tokens import AccessToken, TokenError
from api.models import User
from api.authentication.jwt_auth import JWTAuthHandler
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

class JWTAuthenticationMiddleware(MiddlewareMixin):
    """Middleware para validar JWT en cookies o Authorization header con renovación automática"""
    
    # Ventana de renovación: 5-10 minutos antes de expirar (en segundos)
    RENEWAL_WINDOW_START = 10 * 60  # 10 minutos
    RENEWAL_WINDOW_END = 5 * 60     # 5 minutos
    
    def process_request(self, request):
        # Rutas que NO requieren autenticación
        public_paths = [
            '/api/auth/login/',
            '/api/auth/register/',
            '/admin/',
            '/static/',
            '/media/',
            '/',
        ]
        
        # Verificar si es ruta pública (incluyendo raíz exacta)
        if request.path == '/' or any(request.path.startswith(path) for path in public_paths):
            return None
        
        # Intentar obtener token de cookie PRIMERO
        token = request.COOKIES.get('access_token')
        logger.info(f"[AUTH] Cookie access_token: {'PRESENTE' if token else 'NO ENCONTRADA'}")
        logger.info(f"[AUTH] Cookies disponibles: {list(request.COOKIES.keys())}")
        
        # Si no hay cookie, intentar del header Authorization
        if not token:
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                logger.info(f"[AUTH] Token obtenido del header Authorization")
        
        if not token:
            logger.warning(f"[AUTH] No se encontró token para: {request.path}")
            return self._handle_no_token(request)
        
        try:
            # Validar token
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            
            logger.info(f"[AUTH] Token válido para user_id: {user_id}")
            
            # Obtener usuario
            user = User.objects.select_related('company', 'role').get(id=user_id)
            
            if not user.is_active:
                logger.warning(f"[AUTH] Usuario inactivo: {user.email}")
                return JsonResponse({
                    'error': 'Usuario inactivo'
                }, status=403)
            
            # Asignar usuario al request
            request.user = user
            request._cached_user = user  # Cache para DRF
            
            logger.info(f"[AUTH] Usuario autenticado: {user.email}")
            
            # NUEVO: Verificar si el token está en ventana de renovación
            self._check_and_renew_token(request, access_token, user)
            
        except TokenError as e:
            logger.error(f"[AUTH] Token inválido o expirado: {str(e)}")
            return self._handle_invalid_token(request)
            
        except User.DoesNotExist:
            logger.error(f"[AUTH] Usuario no encontrado para user_id: {user_id}")
            return JsonResponse({
                'error': 'Usuario no encontrado'
            }, status=401)
        except Exception as e:
            logger.error(f"[AUTH] Error inesperado en auth middleware: {str(e)}")
            return JsonResponse({
                'error': 'Error de autenticación',
                'message': str(e)
            }, status=500)
        
        return None
    
    def _check_and_renew_token(self, request, access_token, user):
        """
        Verificar si el token está en ventana de renovación y renovarlo si hay actividad
        """
        try:
            # Obtener timestamp de expiración del token
            exp_timestamp = access_token['exp']
            current_timestamp = datetime.now(timezone.utc).timestamp()
            
            # Calcular tiempo restante hasta expiración (en segundos)
            time_until_expiry = exp_timestamp - current_timestamp
            
            logger.info(f"[AUTH-RENEWAL] Tiempo hasta expiración: {int(time_until_expiry)} segundos")
            
            # Verificar si está en ventana de renovación (entre 10 y 5 minutos antes de expirar)
            if self.RENEWAL_WINDOW_END <= time_until_expiry <= self.RENEWAL_WINDOW_START:
                logger.info(f"[AUTH-RENEWAL] Token en ventana de renovación para: {user.email}")
                
                # Obtener última actividad del token
                last_activity = access_token.get('last_activity')
                
                if last_activity:
                    # Verificar si hubo actividad reciente (en los últimos 5 minutos)
                    time_since_activity = current_timestamp - last_activity
                    
                    if time_since_activity < 300:  # 5 minutos
                        logger.info(f"[AUTH-RENEWAL] Actividad reciente detectada. Renovando token...")
                        self._renew_token(request, user)
                    else:
                        logger.info(f"[AUTH-RENEWAL] Sin actividad reciente ({int(time_since_activity)}s). Token NO renovado.")
                else:
                    # Si no hay registro de actividad, renovar por seguridad
                    logger.info(f"[AUTH-RENEWAL] Sin registro de actividad. Renovando token...")
                    self._renew_token(request, user)
            
            elif time_until_expiry < self.RENEWAL_WINDOW_END:
                logger.warning(f"[AUTH-RENEWAL] Token próximo a expirar en {int(time_until_expiry)}s")
            
        except Exception as e:
            logger.error(f"[AUTH-RENEWAL] Error verificando renovación: {str(e)}")
    
    def _renew_token(self, request, user):
        """
        Renovar el token del usuario y actualizar la cookie
        """
        try:
            # Generar nuevos tokens
            tokens = JWTAuthHandler.generate_tokens(user)
            
            # Crear una respuesta temporal para setear las cookies
            # Esta respuesta será modificada por el middleware de respuesta
            if not hasattr(request, '_renewed_tokens'):
                request._renewed_tokens = tokens
                logger.info(f"[AUTH-RENEWAL] ✓ Token renovado para: {user.email}")
        except Exception as e:
            logger.error(f"[AUTH-RENEWAL] Error renovando token: {str(e)}")
    
    def process_response(self, request, response):
        """
        Procesar la respuesta para actualizar cookies si el token fue renovado
        """
        if hasattr(request, '_renewed_tokens'):
            logger.info("[AUTH-RENEWAL] Actualizando cookies con nuevo token")
            response = JWTAuthHandler.set_auth_cookies(response, request._renewed_tokens)
        
        return response
    
    def _handle_no_token(self, request):
        """Manejar caso cuando no hay token"""
        # Si es una petición a /*, redirigir al login
        if request.path.startswith(''):
            return redirect('/')
        
        # Si es una petición API, retornar 401
        return JsonResponse({
            'error': 'No autenticado',
            'message': 'Token no proporcionado'
        }, status=401)
    
    def _handle_invalid_token(self, request):
        """Manejar caso cuando el token es inválido o expiró"""
        # Si es una petición a /*, redirigir al login y limpiar cookies
        if request.path.startswith(''):
            response = redirect('/')
            response.delete_cookie('access_token')
            response.delete_cookie('refresh_token')
            logger.info("[AUTH] Token expirado. Sesión cerrada y redirigido a login.")
            return response
        
        # Si es una petición API, retornar 401
        return JsonResponse({
            'error': 'Token inválido o expirado',
            'message': 'La sesión ha expirado. Por favor, inicie sesión nuevamente.'
        }, status=401)