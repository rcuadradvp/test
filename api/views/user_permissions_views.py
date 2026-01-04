# api/views/user_permissions_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import User, UserPageAccess, UserPermission, Page, Permission
from api.middleware.permission_middleware import PermissionMiddleware
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
def get_user_full_permissions(request, user_id):
    """
    Obtener todos los permisos y páginas de un usuario específico
    Solo Master Admin puede ver esto
    """
    # Verificar que sea Master Admin
    if request.user.role.name != 'master_admin':
        return Response({'error': 'Solo Master Admin puede gestionar permisos de usuarios'}, status=403)
    
    try:
        target_user = User.objects.select_related('role', 'company').get(
            id=user_id, 
            company=request.user.company
        )
    except User.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=404)
    
    # Obtener todas las páginas
    all_pages = Page.objects.filter(is_active=True).order_by('order')
    
    # Obtener todos los permisos
    all_permissions = Permission.objects.all().order_by('resource', 'action')
    
    # Obtener restricciones personalizadas del usuario
    user_page_restrictions = UserPageAccess.objects.filter(user=target_user)
    user_perm_restrictions = UserPermission.objects.filter(user=target_user)
    
    # Crear diccionarios para búsqueda rápida
    user_page_dict = {str(upa.page.id): upa.can_access for upa in user_page_restrictions}
    user_perm_dict = {str(up.permission.id): up.is_granted for up in user_perm_restrictions}
    
    # Construir respuesta con estado de cada página
    pages_status = []
    for page in all_pages:
        page_id = str(page.id)
        
        # Verificar acceso del rol
        role_has_access = page.page_accesses.filter(
            role=target_user.role,
            can_access=True
        ).exists()
        
        # Verificar si hay restricción de usuario
        has_user_restriction = page_id in user_page_dict
        user_override = user_page_dict.get(page_id, None)
        
        # Determinar acceso final
        if has_user_restriction:
            final_access = user_override
        else:
            final_access = role_has_access
        
        pages_status.append({
            'id': page_id,
            'name': page.name,
            'display_name': page.display_name,
            'route': page.route,
            'role_access': role_has_access,
            'has_user_override': has_user_restriction,
            'user_override': user_override,
            'final_access': final_access
        })
    
    # Construir respuesta con estado de cada permiso
    perms_status = []
    for perm in all_permissions:
        perm_id = str(perm.id)
        
        # Verificar permiso del rol
        role_has_perm = perm.role_permissions.filter(
            role=target_user.role,
            is_granted=True
        ).exists()
        
        # Verificar si hay restricción de usuario
        has_user_restriction = perm_id in user_perm_dict
        user_override = user_perm_dict.get(perm_id, None)
        
        # Determinar permiso final
        if has_user_restriction:
            final_perm = user_override
        else:
            final_perm = role_has_perm
        
        perms_status.append({
            'id': perm_id,
            'name': perm.name,
            'display_name': perm.display_name,
            'resource': perm.resource,
            'action': perm.action,
            'role_has_perm': role_has_perm,
            'has_user_override': has_user_restriction,
            'user_override': user_override,
            'final_perm': final_perm
        })
    
    return Response({
        'user': {
            'id': str(target_user.id),
            'email': target_user.email,
            'username': target_user.username,
            'full_name': f'{target_user.first_name} {target_user.last_name}',
            'role': {
                'name': target_user.role.name,
                'display_name': target_user.role.display_name
            }
        },
        'pages': pages_status,
        'permissions': perms_status
    })


@api_view(['POST'])
def update_user_page_access(request, user_id):
    """
    Actualizar acceso a una página específica para un usuario
    Solo Master Admin
    """
    if request.user.role.name != 'master_admin':
        return Response({'error': 'Solo Master Admin'}, status=403)
    
    try:
        target_user = User.objects.get(id=user_id, company=request.user.company)
        page = Page.objects.get(id=request.data.get('page_id'))
        can_access = request.data.get('can_access', True)
        
        # Si can_access es True y el rol ya tiene acceso, eliminar la restricción
        role_has_access = page.page_accesses.filter(
            role=target_user.role,
            can_access=True
        ).exists()
        
        if can_access and role_has_access:
            # Eliminar restricción si existe
            UserPageAccess.objects.filter(user=target_user, page=page).delete()
            logger.info(f"[PERMISOS] Restricción de página eliminada: {target_user.email} -> {page.name}")
        else:
            # Crear o actualizar restricción
            obj, created = UserPageAccess.objects.update_or_create(
                user=target_user,
                page=page,
                defaults={'can_access': can_access}
            )
            action = "creada" if created else "actualizada"
            logger.info(f"[PERMISOS] Restricción de página {action}: {target_user.email} -> {page.name} = {can_access}")
        
        return Response({'success': True, 'message': 'Acceso actualizado'})
        
    except (User.DoesNotExist, Page.DoesNotExist):
        return Response({'error': 'Usuario o página no encontrada'}, status=404)


@api_view(['POST'])
def update_user_permission(request, user_id):
    """
    Actualizar un permiso específico para un usuario
    Solo Master Admin
    """
    if request.user.role.name != 'master_admin':
        return Response({'error': 'Solo Master Admin'}, status=403)
    
    try:
        target_user = User.objects.get(id=user_id, company=request.user.company)
        permission = Permission.objects.get(id=request.data.get('permission_id'))
        is_granted = request.data.get('is_granted', True)
        
        # Si is_granted es True y el rol ya tiene el permiso, eliminar la restricción
        role_has_perm = permission.role_permissions.filter(
            role=target_user.role,
            is_granted=True
        ).exists()
        
        if is_granted and role_has_perm:
            # Eliminar restricción si existe
            UserPermission.objects.filter(user=target_user, permission=permission).delete()
            logger.info(f"[PERMISOS] Restricción de permiso eliminada: {target_user.email} -> {permission.name}")
        else:
            # Crear o actualizar restricción
            obj, created = UserPermission.objects.update_or_create(
                user=target_user,
                permission=permission,
                defaults={'is_granted': is_granted}
            )
            action = "creada" if created else "actualizada"
            logger.info(f"[PERMISOS] Restricción de permiso {action}: {target_user.email} -> {permission.name} = {is_granted}")
        
        return Response({'success': True, 'message': 'Permiso actualizado'})
        
    except (User.DoesNotExist, Permission.DoesNotExist):
        return Response({'error': 'Usuario o permiso no encontrado'}, status=404)


@api_view(['DELETE'])
def remove_all_user_restrictions(request, user_id):
    """
    Eliminar todas las restricciones personalizadas de un usuario
    (volver a permisos del rol)
    Solo Master Admin
    """
    if request.user.role.name != 'master_admin':
        return Response({'error': 'Solo Master Admin'}, status=403)
    
    try:
        target_user = User.objects.get(id=user_id, company=request.user.company)
        
        # Contar restricciones
        page_restrictions = UserPageAccess.objects.filter(user=target_user).count()
        perm_restrictions = UserPermission.objects.filter(user=target_user).count()
        
        # Eliminar todas
        UserPageAccess.objects.filter(user=target_user).delete()
        UserPermission.objects.filter(user=target_user).delete()
        
        logger.info(f"[PERMISOS] Todas las restricciones eliminadas para: {target_user.email}")
        
        return Response({
            'success': True,
            'message': f'Eliminadas {page_restrictions} restricciones de páginas y {perm_restrictions} de permisos'
        })
        
    except User.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=404)