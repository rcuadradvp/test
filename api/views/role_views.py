# api/views/role_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from api.models import Role, RolePageAccess, RolePermission

@api_view(['GET'])
def list_roles(request):
    """Listar roles de la empresa"""
    roles = Role.objects.filter(
        company=request.user.company,
        is_active=True
    ).order_by('-hierarchy_level')
    
    data = [{
        'id': str(role.id),
        'name': role.name,
        'display_name': role.display_name,
        'description': role.description,
        'hierarchy_level': role.hierarchy_level,
        'created_at': role.created_at
    } for role in roles]
    
    return Response(data)


@api_view(['GET'])
def get_role_details(request, role_id):
    """Obtener detalle de un rol con sus permisos y páginas"""
    try:
        role = Role.objects.get(id=role_id, company=request.user.company)
    except Role.DoesNotExist:
        return Response({'error': 'Rol no encontrado'}, status=404)
    
    # Obtener páginas accesibles
    page_accesses = RolePageAccess.objects.filter(
        role=role,
        can_access=True
    ).select_related('page')
    
    # Obtener permisos
    permissions = RolePermission.objects.filter(
        role=role,
        is_granted=True
    ).select_related('permission')
    
    data = {
        'id': str(role.id),
        'name': role.name,
        'display_name': role.display_name,
        'description': role.description,
        'hierarchy_level': role.hierarchy_level,
        'pages': [{
            'id': str(pa.page.id),
            'name': pa.page.name,
            'display_name': pa.page.display_name,
            'route': pa.page.route,
            'icon': pa.page.icon
        } for pa in page_accesses],
        'permissions': [{
            'id': str(p.permission.id),
            'name': p.permission.name,
            'display_name': p.permission.display_name,
            'resource': p.permission.resource,
            'action': p.permission.action
        } for p in permissions]
    }
    
    return Response(data)


