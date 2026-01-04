# api/views/auth_views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.utils import timezone
from api.models import (
    User, Page, Permission, 
    RolePageAccess, RolePermission,
    UserPageAccess, UserPermission
)
from api.serializers.auth_serializers import UserSerializer
from api.authentication.password_handler import PasswordHandler
from api.authentication.jwt_auth import JWTAuthHandler
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Login de usuario y generación de tokens JWT"""
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({
            'error': 'Email y contraseña son requeridos'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.select_related('role', 'company').get(email=email)
        
        if not user.is_active:
            logger.warning(f"[LOGIN] Usuario inactivo: {email}")
            return Response({
                'error': 'Usuario inactivo'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if not PasswordHandler.verify_password(password, user.password):
            logger.warning(f"[LOGIN] Contraseña incorrecta: {email}")
            return Response({
                'error': 'Credenciales inválidas'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        tokens = JWTAuthHandler.generate_tokens(user)
        
        response = Response({
            'user': UserSerializer(user).data,
            'access': tokens['access'],
            'refresh': tokens['refresh'],
        }, status=status.HTTP_200_OK)
        
        response = JWTAuthHandler.set_auth_cookies(response, tokens)
        
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        logger.info(f"[LOGIN] Login exitoso: {email}")
        
        return response
        
    except User.DoesNotExist:
        logger.warning(f"[LOGIN] Usuario no existe: {email}")
        return Response({
            'error': 'Credenciales inválidas'
        }, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    """Logout de usuario"""
    if hasattr(request, 'user') and hasattr(request.user, 'email'):
        user_email = request.user.email
    else:
        user_email = 'Anonimo'
    
    logger.info(f"[LOGOUT] Usuario: {user_email}")
    
    response = Response({
        'message': 'Logout exitoso'
    }, status=status.HTTP_200_OK)
    
    response = JWTAuthHandler.clear_auth_cookies(response)
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def current_user_view(request):
    """
    Obtener usuario actual con sus permisos y páginas personalizadas.
    
    Sistema de permisos por usuario:
    1. Master Admin: Acceso total a todo
    2. Usuario normal: 
       - Permisos del rol + overrides personalizados del usuario
       - Consulta user_permissions y user_page_access para customizaciones
    """
    # Verificar autenticación
    if not hasattr(request, 'user'):
        logger.warning(f"[API] /api/auth/me/ - request.user no existe")
        return Response({'error': 'No autenticado'}, status=401)
    
    from django.contrib.auth.models import AnonymousUser
    if isinstance(request.user, AnonymousUser):
        logger.warning(f"[API] /api/auth/me/ - usuario es AnonymousUser")
        return Response({'error': 'No autenticado'}, status=401)
    
    if not hasattr(request.user, 'email'):
        logger.warning(f"[API] /api/auth/me/ - usuario sin email")
        return Response({'error': 'No autenticado'}, status=401)
    
    logger.info(f"[API] /api/auth/me/ para: {request.user.email}")
    
    # Obtener el usuario con relaciones optimizadas
    user = User.objects.select_related('company', 'role').get(id=request.user.id)
    
    # Serializar datos básicos del usuario
    user_data = UserSerializer(user).data
    
    # Determinar si es Master Admin
    is_master_admin = user.role.name == 'master_admin'
    
    # ==========================================
    # CASO 1: Master Admin - Acceso total
    # ==========================================
    if is_master_admin:
        all_pages = Page.objects.filter(is_active=True).order_by('order')
        all_permissions = Permission.objects.all().order_by('resource', 'action')
        
        pages_data = [{
            'id': str(p.id),
            'name': p.name,
            'display_name': p.display_name,
            'route': p.route,
            'icon': p.icon,
            'association': p.association,
            'order': p.order
        } for p in all_pages]
        
        permissions_data = [{
            'id': str(p.id),
            'name': p.name,
            'resource': p.resource,
            'action': p.action
        } for p in all_permissions]
        
        return Response({
            'user': user_data,
            'is_master_admin': True,
            'pages': pages_data,
            'permissions': permissions_data
        })
    
    # ==========================================
    # CASO 2: Usuario Normal - Permisos del rol + overrides de usuario
    # ==========================================
    
    # ========== PÁGINAS ==========
    # 1. Obtener páginas del rol
    role_pages = RolePageAccess.objects.filter(
        role=user.role,
        can_access=True
    ).select_related('page').order_by('page__order')
    
    # 2. Obtener overrides de páginas del usuario
    user_page_overrides = UserPageAccess.objects.filter(
        user=user
    ).select_related('page')
    
    # Crear diccionario de overrides {page_id: can_access}
    page_override_dict = {
        str(upa.page.id): upa.can_access 
        for upa in user_page_overrides
    }
    
    # 3. Construir lista final de páginas aplicando overrides
    final_pages = []
    role_page_ids = set()
    
    for rp in role_pages:
        page_id = str(rp.page.id)
        role_page_ids.add(page_id)
        
        # Si hay override del usuario, respetarlo
        if page_id in page_override_dict:
            if page_override_dict[page_id]:  # Solo agregar si el override es True
                final_pages.append({
                    'id': page_id,
                    'name': rp.page.name,
                    'display_name': rp.page.display_name,
                    'route': rp.page.route,
                    'icon': rp.page.icon,
                    'order': rp.page.order,
                    'association': rp.page.association,
                })
        else:
            # Sin override, usar el permiso del rol
            final_pages.append({
                'id': page_id,
                'name': rp.page.name,
                'display_name': rp.page.display_name,
                'route': rp.page.route,
                'icon': rp.page.icon,
                'order': rp.page.order,
                'association': rp.page.association,
            })
    
    # 4. Agregar páginas exclusivas del usuario (que el rol no tiene)
    user_exclusive_pages = UserPageAccess.objects.filter(
        user=user,
        can_access=True
    ).select_related('page').order_by('page__order')
    
    for up in user_exclusive_pages:
        page_id = str(up.page.id)
        if page_id not in role_page_ids:
            final_pages.append({
                'id': page_id,
                'name': up.page.name,
                'display_name': up.page.display_name,
                'route': up.page.route,
                'icon': up.page.icon,
                'order': up.page.order,
                'association': up.page.association,
            })
    
    # Ordenar páginas por order
    final_pages.sort(key=lambda x: x['order'])
    
    # ========== PERMISOS ==========
    # 1. Obtener permisos del rol
    role_permissions = RolePermission.objects.filter(
        role=user.role,
        is_granted=True
    ).select_related('permission')
    
    # 2. Obtener overrides de permisos del usuario
    user_perm_overrides = UserPermission.objects.filter(
        user=user
    ).select_related('permission')
    
    # Crear diccionario de overrides {permission_id: is_granted}
    perm_override_dict = {
        str(up.permission.id): up.is_granted 
        for up in user_perm_overrides
    }
    
    # 3. Construir lista final de permisos aplicando overrides
    final_perms = []
    role_perm_ids = set()
    
    for rp in role_permissions:
        perm_id = str(rp.permission.id)
        role_perm_ids.add(perm_id)
        
        # Si hay override del usuario, respetarlo
        if perm_id in perm_override_dict:
            if perm_override_dict[perm_id]:  # Solo agregar si el override es True
                final_perms.append({
                    'id': perm_id,
                    'name': rp.permission.name,
                    'resource': rp.permission.resource,
                    'action': rp.permission.action
                })
        else:
            # Sin override, usar el permiso del rol
            final_perms.append({
                'id': perm_id,
                'name': rp.permission.name,
                'resource': rp.permission.resource,
                'action': rp.permission.action
            })
    
    # 4. Agregar permisos exclusivos del usuario (que el rol no tiene)
    user_exclusive_perms = UserPermission.objects.filter(
        user=user,
        is_granted=True
    ).select_related('permission')
    
    for up in user_exclusive_perms:
        perm_id = str(up.permission.id)
        if perm_id not in role_perm_ids:
            final_perms.append({
                'id': perm_id,
                'name': up.permission.name,
                'resource': up.permission.resource,
                'action': up.permission.action
            })
    
    logger.info(f"[PERMISOS] Usuario {user.email}: {len(final_pages)} páginas, {len(final_perms)} permisos")
    
    return Response({
        'user': user_data,
        'is_master_admin': False,
        'pages': final_pages,
        'permissions': final_perms
    })