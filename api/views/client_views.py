# api/views/client_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import Client
from api.serializers.client_serializers import (
    ClientSerializer, 
    ClientDetailSerializer,
    ClientCreateSerializer
)
from api.middleware.permission_middleware import PermissionMiddleware
from api.utils.excel_handler import ExcelExporter
from api.utils.validators import RutValidator
from django.db.models import Q
import logging
from api.utils.pagination import Paginator
logger = logging.getLogger(__name__)


@api_view(['GET'])
def list_clients(request):
    """
    Listar clientes con paginación opcional
    
    Query Parameters:
        page (int): Número de página (default: sin paginación)
        page_size (int): Items por página (default: 50, max: 500)
        has_credit (bool): Filtrar por clientes con crédito
        has_debt (bool): Filtrar por clientes con deuda
    """
    if not PermissionMiddleware.check_permission(request.user, 'clients', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Determinar scope según rol
    if request.user.role.name == 'master_admin':
        clients = Client.objects.filter(is_active=True)
    else:
        clients = Client.objects.filter(
            company=request.user.company,
            is_active=True
        )
    
    # Filtros opcionales
    has_credit = request.GET.get('has_credit')
    if has_credit is not None:
        clients = clients.filter(has_credit=(has_credit.lower() == 'true'))
    
    has_debt = request.GET.get('has_debt')
    if has_debt is not None:
        if has_debt.lower() == 'true':
            clients = clients.filter(current_debt__gt=0)
        else:
            clients = clients.filter(current_debt=0)
    
    clients = clients.order_by('first_name', 'last_name')
    
    # Verificar si se solicita paginación
    if 'page' in request.GET:
        return Paginator.paginate_response(
            clients, 
            request, 
            ClientSerializer,
            default_page_size=50,
            max_page_size=500
        )
    
    # Sin paginación
    serializer = ClientSerializer(clients, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_client(request, client_id):
    """Obtener detalle de cliente"""
    if not PermissionMiddleware.check_permission(request.user, 'clients', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        client = Client.objects.get(
            id=client_id,
            company=request.user.company
        )
    except Client.DoesNotExist:
        return Response({'error': 'Cliente no encontrado'}, status=404)
    
    serializer = ClientDetailSerializer(client)
    return Response(serializer.data)


@api_view(['GET'])
def get_client_by_rut(request, rut):
    """Buscar cliente por RUT"""
    if not PermissionMiddleware.check_permission(request.user, 'clients', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        # Formatear RUT para búsqueda
        formatted_rut = RutValidator.format_rut(rut)
        
        client = Client.objects.get(
            rut=formatted_rut,
            company=request.user.company,
            is_active=True
        )
        
        serializer = ClientDetailSerializer(client)
        return Response(serializer.data)
        
    except Client.DoesNotExist:
        return Response({'error': 'Cliente no encontrado'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['POST'])
def create_client(request):
    """Crear cliente"""
    if not PermissionMiddleware.check_permission(request.user, 'clients', 'create'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    data = request.data.copy()
    data['company'] = request.user.company.id
    
    serializer = ClientCreateSerializer(data=data)
    
    if serializer.is_valid():
        client = serializer.save()
        logger.info(f"Cliente creado: {client.rut} - {client.first_name} {client.last_name} por {request.user.email}")
        
        # Retornar con el serializer completo
        response_serializer = ClientSerializer(client)
        return Response(response_serializer.data, status=201)
    
    return Response(serializer.errors, status=400)


@api_view(['PUT'])
def update_client(request, client_id):
    """Actualizar cliente"""
    if not PermissionMiddleware.check_permission(request.user, 'clients', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        client = Client.objects.get(
            id=client_id,
            company=request.user.company
        )
    except Client.DoesNotExist:
        return Response({'error': 'Cliente no encontrado'}, status=404)
    
    # No permitir modificar current_debt directamente
    if 'current_debt' in request.data:
        return Response({
            'error': 'No se puede modificar la deuda directamente. Use el sistema de créditos.'
        }, status=400)
    
    serializer = ClientSerializer(
        client,
        data=request.data,
        partial=True,
        context={'company': request.user.company}
    )
    
    if serializer.is_valid():
        serializer.save()
        logger.info(f"Cliente actualizado: {client.rut} por {request.user.email}")
        return Response(serializer.data)
    
    return Response(serializer.errors, status=400)


@api_view(['DELETE'])
def delete_client(request, client_id):
    """Eliminar (desactivar) cliente"""
    if not PermissionMiddleware.check_permission(request.user, 'clients', 'delete'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        client = Client.objects.get(
            id=client_id,
            company=request.user.company
        )
    except Client.DoesNotExist:
        return Response({'error': 'Cliente no encontrado'}, status=404)
    
    # Verificar si tiene deuda pendiente
    if client.current_debt > 0:
        return Response({
            'error': f'No se puede eliminar. Tiene deuda pendiente de ${client.current_debt:,.0f}'
        }, status=400)
    
    # Desactivar en lugar de eliminar
    client.is_active = False
    client.save()
    
    logger.info(f"Cliente eliminado: {client.rut} - {client.first_name} {client.last_name} por {request.user.email}")
    return Response({'message': 'Cliente eliminado exitosamente'})


@api_view(['GET'])
def export_clients(request):
    """Exportar clientes a Excel"""
    if not PermissionMiddleware.check_permission(request.user, 'clients', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Master Admin exporta de todas las companies
    if request.user.role.name == 'master_admin':
        clients = Client.objects.filter(is_active=True)
        company_name = "Todas las empresas"
    else:
        clients = Client.objects.filter(
            company=request.user.company,
            is_active=True
        )
        company_name = request.user.company.name
    
    clients = clients.order_by('first_name', 'last_name')
    
    logger.info(f"Exportando {clients.count()} clientes por {request.user.email}")
    return ExcelExporter.export_clients(clients, company_name)