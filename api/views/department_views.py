# api/views/department_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import Department
from api.serializers.department_serializers import DepartmentSerializer, DepartmentDetailSerializer
from api.middleware.permission_middleware import PermissionMiddleware
from api.utils.excel_handler import ExcelExporter
from django.db.models import Q
import logging
from api.utils.pagination import Paginator
logger = logging.getLogger(__name__)


@api_view(['GET'])
def list_departments(request):
    """
    Listar departamentos con paginación opcional
    
    Query Parameters:
        page (int): Número de página (default: sin paginación)
        page_size (int): Items por página (default: 50, max: 500)
    """
    if not PermissionMiddleware.check_permission(request.user, 'products', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Determinar scope según rol
    if request.user.role.name == 'master_admin':
        departments = Department.objects.filter(is_active=True)
    else:
        departments = Department.objects.filter(
            company=request.user.company,
            is_active=True
        )
    
    departments = departments.order_by('name')
    
    # Verificar si se solicita paginación
    if 'page' in request.GET:
        return Paginator.paginate_response(
            departments, 
            request, 
            DepartmentSerializer,
            default_page_size=50,
            max_page_size=500
        )
    
    # Sin paginación
    serializer = DepartmentSerializer(departments, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_department(request, department_id):
    """Obtener detalle de departamento con productos"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        department = Department.objects.get(
            id=department_id,
            company=request.user.company
        )
    except Department.DoesNotExist:
        return Response({'error': 'Departamento no encontrado'}, status=404)
    
    serializer = DepartmentDetailSerializer(department)
    return Response(serializer.data)


@api_view(['POST'])
def create_department(request):
    """Crear departamento"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'create'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # NO incluir company en data
    serializer = DepartmentSerializer(
        data=request.data, 
        context={'company': request.user.company}
    )
    
    if serializer.is_valid():
        # Pasar company directamente al save()
        serializer.save(company=request.user.company)
        logger.info(f"Departamento creado: {serializer.data['name']} por {request.user.email}")
        return Response(serializer.data, status=201)
    
    return Response(serializer.errors, status=400)


@api_view(['PUT'])
def update_department(request, department_id):
    """Actualizar departamento"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        department = Department.objects.get(
            id=department_id,
            company=request.user.company
        )
    except Department.DoesNotExist:
        return Response({'error': 'Departamento no encontrado'}, status=404)
    
    serializer = DepartmentSerializer(
        department,
        data=request.data,
        partial=True,
        context={'company': request.user.company}
    )
    
    if serializer.is_valid():
        serializer.save()
        logger.info(f"Departamento actualizado: {serializer.data['name']} por {request.user.email}")
        return Response(serializer.data)
    
    return Response(serializer.errors, status=400)


@api_view(['DELETE'])
def delete_department(request, department_id):
    """Eliminar (desactivar) departamento"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'delete'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        department = Department.objects.get(
            id=department_id,
            company=request.user.company
        )
    except Department.DoesNotExist:
        return Response({'error': 'Departamento no encontrado'}, status=404)
    
    # Verificar si tiene productos activos
    active_products = department.products.filter(is_active=True).count()
    if active_products > 0:
        return Response({
            'error': f'No se puede eliminar. Tiene {active_products} productos activos'
        }, status=400)
    
    # Desactivar en lugar de eliminar
    department.is_active = False
    department.save()
    
    logger.info(f"Departamento eliminado: {department.name} por {request.user.email}")
    return Response({'message': 'Departamento eliminado exitosamente'})


@api_view(['GET'])
def export_departments(request):
    """Exportar departamentos a Excel"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'export'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Master Admin exporta de todas las companies
    if request.user.role.name == 'master_admin':
        departments = Department.objects.filter(is_active=True)
        company_name = "Todas las empresas"
    else:
        departments = Department.objects.filter(
            company=request.user.company,
            is_active=True
        )
        company_name = request.user.company.name
    
    departments = departments.order_by('name')
    
    logger.info(f"Exportando {departments.count()} departamentos por {request.user.email}")
    return ExcelExporter.export_departments(departments, company_name)