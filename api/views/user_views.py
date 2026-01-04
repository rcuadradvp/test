# api/views/user_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import User, Role
from api.serializers.auth_serializers import UserSerializer
from api.middleware.permission_middleware import PermissionMiddleware
from django.db.models import Q
from api.utils.pagination import Paginator

@api_view(['GET'])
def list_users(request):
    """
    Listar usuarios con paginación opcional
    
    Query Parameters:
        page (int): Número de página (default: sin paginación)
        page_size (int): Items por página (default: 50, max: 500)
    """
    if not PermissionMiddleware.check_permission(request.user, 'users', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Determinar scope según rol
    if request.user.role.name == 'master_admin':
        users = User.objects.filter(is_active=True)
    else:
        users = User.objects.filter(
            company=request.user.company,
            is_active=True
        )
    
    users = users.select_related('role', 'company').order_by('email')
    
    # Verificar si se solicita paginación
    if 'page' in request.GET:
        return Paginator.paginate_response(
            users, 
            request, 
            UserSerializer,
            default_page_size=50,
            max_page_size=500
        )
    
    # Sin paginación
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def get_user(request, user_id):
    """Obtener detalle de un usuario específico"""
    if not PermissionMiddleware.check_permission(request.user, 'users', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        # Master Admin puede ver cualquier usuario
        if request.user.role.name == 'master_admin':
            user = User.objects.get(id=user_id, is_active=True)
        else:
            user = User.objects.get(
                id=user_id,
                company=request.user.company,
                is_active=True
            )
        
        serializer = UserSerializer(user)
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=404)


@api_view(['POST'])
def create_user(request):
    """Crear usuario"""
    if not PermissionMiddleware.check_permission(request.user, 'users', 'create'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    from api.serializers.auth_serializers import RegisterSerializer
    
    data = request.data.copy()
    data['company'] = request.user.company.id
    
    serializer = RegisterSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PUT'])
def update_user(request, user_id):
    """Actualizar usuario"""
    if not PermissionMiddleware.check_permission(request.user, 'users', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        user = User.objects.get(id=user_id, company=request.user.company)
    except User.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=404)
    
    # No permitir editar campos sensibles
    protected_fields = ['password', 'password_confirm', 'company']
    for field in protected_fields:
        if field in request.data:
            del request.data[field]
    
    serializer = UserSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['DELETE'])
def delete_user(request, user_id):
    """Eliminar (desactivar) usuario"""
    if not PermissionMiddleware.check_permission(request.user, 'users', 'delete'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        user = User.objects.get(id=user_id, company=request.user.company)
    except User.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=404)
    
    # No permitir eliminar al usuario actual
    if user.id == request.user.id:
        return Response({'error': 'No puedes eliminarte a ti mismo'}, status=400)
    
    # Desactivar en lugar de eliminar
    user.is_active = False
    user.save()
    
    return Response({'message': 'Usuario eliminado exitosamente'})