# api/views/category_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from api.models import Category, Department, Product
from api.serializers.category_serializers import CategorySerializer, CategoryDetailSerializer
from api.middleware.permission_middleware import PermissionMiddleware
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
def list_categories(request):
    """Listar categorías, opcionalmente filtradas por departamento"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    categories = Category.objects.filter(
        company=request.user.company,
        is_active=True
    ).select_related('department')
    
    # Filtro opcional por departamento
    department_id = request.GET.get('department')
    if department_id:
        categories = categories.filter(department_id=department_id)
    
    categories = categories.order_by('department__name', 'name')
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_category(request, category_id):
    """Obtener detalle de categoría con productos"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        category = Category.objects.get(
            id=category_id,
            company=request.user.company
        )
    except Category.DoesNotExist:
        return Response({'error': 'Categoría no encontrada'}, status=404)
    
    serializer = CategoryDetailSerializer(category)
    return Response(serializer.data)


@api_view(['POST'])
def create_category(request):
    """Crear categoría"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'create'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    data = request.data.copy()
    data['company'] = request.user.company.id
    
    serializer = CategorySerializer(
        data=data,
        context={'company': request.user.company, 'department': data.get('department')}
    )
    
    if serializer.is_valid():
        serializer.save()
        logger.info(f"Categoría creada: {serializer.data['name']} por {request.user.email}")
        return Response(serializer.data, status=201)
    
    return Response(serializer.errors, status=400)


@api_view(['PUT', 'PATCH'])
def update_category(request, category_id):
    """Actualizar categoría"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        category = Category.objects.get(
            id=category_id,
            company=request.user.company
        )
    except Category.DoesNotExist:
        return Response({'error': 'Categoría no encontrada'}, status=404)
    
    serializer = CategorySerializer(
        category,
        data=request.data,
        partial=True,
        context={'company': request.user.company, 'department': category.department_id}
    )
    
    if serializer.is_valid():
        serializer.save()
        logger.info(f"Categoría actualizada: {serializer.data['name']} por {request.user.email}")
        return Response(serializer.data)
    
    return Response(serializer.errors, status=400)


@api_view(['DELETE'])
def delete_category(request, category_id):
    """Eliminar (desactivar) categoría"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'delete'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        category = Category.objects.get(
            id=category_id,
            company=request.user.company
        )
    except Category.DoesNotExist:
        return Response({'error': 'Categoría no encontrada'}, status=404)
    
    # Verificar si tiene productos activos
    active_products = category.products.filter(is_active=True).count()
    if active_products > 0:
        return Response({
            'error': f'No se puede eliminar. Tiene {active_products} productos activos'
        }, status=400)
    
    category.is_active = False
    category.save()
    
    logger.info(f"Categoría eliminada: {category.name} por {request.user.email}")
    return Response({'message': 'Categoría eliminada exitosamente'})