# api/middleware/permission_middleware.py

from django.http import JsonResponse, Http404
from django.shortcuts import render
from api.models import Page, Permission, RolePageAccess, UserPageAccess, RolePermission, UserPermission
from django.utils.deprecation import MiddlewareMixin
import logging

logger = logging.getLogger(__name__)

class PermissionMiddleware(MiddlewareMixin):
    """Middleware para verificar permisos de acceso a páginas"""
    
    def process_request(self, request):
        # Rutas que NO requieren verificación de permisos
        public_paths = [
            '/api/auth/login/',
            '/api/auth/register/',
            '/api/auth/logout/',
            '/api/auth/me/',
            '/admin/',
            '/static/',
            '/media/',
            '/login/',
            '/',  # Dashboard siempre accesible para autenticados
        ]
        
        # Saltar verificación para rutas públicas
        if any(request.path.startswith(path) for path in public_paths):
            return None
        
        # Si no hay usuario autenticado, el middleware JWT ya manejó esto
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return None
        
        user = request.user
        
        # Verificar que tenga rol
        if not hasattr(user, 'role'):
            logger.warning(f"[PERMISOS] Usuario sin rol: {user.email}")
            raise Http404("Página no encontrada")
        
        # Master Admin tiene acceso total - saltar verificación
        if user.role.name == 'master_admin':
            return None
        
        # Para rutas de API, permitir (permisos se verifican en vistas)
        if request.path.startswith('/api/'):
            return None
        
        # VERIFICACIÓN DE ACCESO A PÁGINAS FRONTEND
        return self._check_page_access(request, user)
    
    def _check_page_access(self, request, user):
        """Verificar si el usuario tiene acceso a la página"""
        path = request.path
        
        try:
            # Buscar la página por ruta
            page = Page.objects.filter(route=path).first()
            
            if not page:
                # Página no existe en BD - dejar pasar (será 404 real de Django)
                return None
            
            # Verificar si el usuario tiene acceso
            has_access = self.check_page_access(user, page)
            
            if not has_access:
                logger.warning(f"[PERMISOS] Acceso denegado a {path} para {user.email} ({user.role.display_name})")
                # Retornar 404 en lugar de 403 por seguridad
                raise Http404("Página no encontrada")
            
            logger.info(f"[PERMISOS] Acceso permitido a {path} para {user.email}")
            return None
            
        except Page.DoesNotExist:
            # Página no existe - Django manejará el 404
            return None
    
    @staticmethod
    def check_page_access(user, page):
        """
        Verificar si un usuario tiene acceso a una página
        Prioridad: Restricción de usuario > Permiso de rol
        """
        # Master Admin siempre tiene acceso
        if user.role.name == 'master_admin':
            return True
        
        # 1. Verificar restricción específica del usuario (puede QUITAR acceso)
        user_access = UserPageAccess.objects.filter(
            user=user,
            page=page
        ).first()
        
        if user_access:
            # Si existe restricción de usuario y can_access=False, denegar
            if not user_access.can_access:
                return False
        
        # 2. Verificar permiso del rol
        role_access = RolePageAccess.objects.filter(
            role=user.role,
            page=page,
            can_access=True
        ).exists()
        
        return role_access
    
    @staticmethod
    def check_permission(user, resource, action):
        """Verificar permiso específico de recurso"""
        if not hasattr(user, 'role'):
            return False
        
        if user.role.name == 'master_admin':
            return True
        
        try:
            permission = Permission.objects.get(resource=resource, action=action)
        except Permission.DoesNotExist:
            return False
        
        # Verificar restricción de usuario (puede QUITAR permiso)
        user_perm = UserPermission.objects.filter(
            user=user,
            permission=permission
        ).first()
        
        if user_perm and not user_perm.is_granted:
            return False
        
        # Verificar permiso del rol
        role_perm = RolePermission.objects.filter(
            role=user.role,
            permission=permission,
            is_granted=True
        ).exists()
        
        return role_perm