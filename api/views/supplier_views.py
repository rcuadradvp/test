# api/views/supplier_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import Supplier, Product
from api.serializers.supplier_serializers import (
    SupplierSerializer,
    SupplierListSerializer,
    SuggestedPurchaseSerializer
)
from api.middleware.permission_middleware import PermissionMiddleware
from api.utils.excel_handler import ExcelExporter
from api.utils.pagination import Paginator
from django.db.models import Q, F
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
def list_suppliers(request):
    """
    Listar proveedores con paginación opcional
    
    Query Parameters:
        page (int): Número de página
        page_size (int): Items por página (default: 50, max: 500)
        search (str): Búsqueda por nombre o representante
        has_pending_orders (bool): Filtrar proveedores con órdenes pendientes
    """
    if not PermissionMiddleware.check_permission(request.user, 'suppliers', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Scope por empresa
    if request.user.role.name == 'master_admin':
        suppliers = Supplier.objects.filter(is_active=True)
    else:
        suppliers = Supplier.objects.filter(
            company=request.user.company,
            is_active=True
        )
    
    # Búsqueda
    search = request.GET.get('search')
    if search:
        suppliers = suppliers.filter(
            Q(name__icontains=search) |
            Q(representative__icontains=search)
        )
    
    # Filtro por órdenes pendientes
    has_pending = request.GET.get('has_pending_orders')
    if has_pending and has_pending.lower() == 'true':
        suppliers = suppliers.filter(
            purchase_orders__status='pending'
        ).distinct()
    
    suppliers = suppliers.order_by('name')
    
    # Paginación
    if 'page' in request.GET:
        return Paginator.paginate_response(
            suppliers,
            request,
            SupplierListSerializer,
            default_page_size=50,
            max_page_size=500
        )
    
    # Sin paginación
    serializer = SupplierListSerializer(suppliers, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_supplier(request, supplier_id):
    """Obtener detalle de proveedor"""
    if not PermissionMiddleware.check_permission(request.user, 'suppliers', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        supplier = Supplier.objects.get(
            id=supplier_id,
            company=request.user.company
        )
    except Supplier.DoesNotExist:
        return Response({'error': 'Proveedor no encontrado'}, status=404)
    
    serializer = SupplierSerializer(supplier)
    return Response(serializer.data)


@api_view(['POST'])
def create_supplier(request):
    """Crear proveedor"""
    if not PermissionMiddleware.check_permission(request.user, 'suppliers', 'create'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    serializer = SupplierSerializer(
        data=request.data,
        context={'request': request, 'company': request.user.company}
    )
    
    if serializer.is_valid():
        supplier = serializer.save()
        logger.info(f"Proveedor creado: {supplier.name} por {request.user.email}")
        return Response(serializer.data, status=201)
    
    return Response(serializer.errors, status=400)


@api_view(['PUT', 'PATCH'])
def update_supplier(request, supplier_id):
    """Actualizar proveedor"""
    if not PermissionMiddleware.check_permission(request.user, 'suppliers', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        supplier = Supplier.objects.get(
            id=supplier_id,
            company=request.user.company
        )
    except Supplier.DoesNotExist:
        return Response({'error': 'Proveedor no encontrado'}, status=404)
    
    serializer = SupplierSerializer(
        supplier,
        data=request.data,
        partial=(request.method == 'PATCH'),
        context={'request': request, 'company': request.user.company}
    )
    
    if serializer.is_valid():
        serializer.save()
        logger.info(f"Proveedor actualizado: {supplier.name} por {request.user.email}")
        return Response(serializer.data)
    
    return Response(serializer.errors, status=400)


@api_view(['DELETE'])
def delete_supplier(request, supplier_id):
    """Eliminar proveedor (soft delete)"""
    if not PermissionMiddleware.check_permission(request.user, 'suppliers', 'delete'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        supplier = Supplier.objects.get(
            id=supplier_id,
            company=request.user.company
        )
    except Supplier.DoesNotExist:
        return Response({'error': 'Proveedor no encontrado'}, status=404)
    
    # Verificar si tiene órdenes pendientes
    pending_orders = supplier.purchase_orders.filter(status='pending').count()
    if pending_orders > 0:
        return Response({
            'error': f'No se puede eliminar. El proveedor tiene {pending_orders} orden(es) pendiente(s)'
        }, status=400)
    
    supplier.is_active = False
    supplier.save()
    
    logger.info(f"Proveedor eliminado: {supplier.name} por {request.user.email}")
    return Response({'message': 'Proveedor eliminado exitosamente'}, status=200)


@api_view(['GET'])
def export_suppliers(request):
    """Exportar proveedores a Excel"""
    if not PermissionMiddleware.check_permission(request.user, 'suppliers', 'export'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    suppliers = Supplier.objects.filter(
        company=request.user.company,
        is_active=True
    ).order_by('name')
    
    # Preparar datos
    data = []
    for supplier in suppliers:
        pending_orders = supplier.purchase_orders.filter(status='pending').count()
        total_debt = sum(
            order.total - order.paid_amount 
            for order in supplier.purchase_orders.filter(status__in=['pending', 'completed'])
        )
        
        data.append({
            'Nombre': supplier.name,
            'Representante': supplier.representative or '',
            'Teléfono 1': supplier.phone_1 or '',
            'Teléfono 2': supplier.phone_2 or '',
            'Email 1': supplier.email_1 or '',
            'Email 2': supplier.email_2 or '',
            'Sitio Web': supplier.website or '',
            'Dirección': supplier.address or '',
            'Órdenes Pendientes': pending_orders,
            'Deuda Total': float(total_debt),
            'Fecha Creación': supplier.created_at.strftime('%Y-%m-%d %H:%M')
        })
    
    # Exportar
    filename = f'proveedores_{request.user.company.name}_{timezone.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    
    try:
        file_path = ExcelExporter.export_to_excel(
            data=data,
            filename=filename,
            sheet_name='Proveedores'
        )
        
        with open(file_path, 'rb') as f:
            response = Response(
                f.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
    
    except Exception as e:
        logger.error(f"Error exportando proveedores: {str(e)}")
        return Response({'error': 'Error al exportar'}, status=500)


@api_view(['GET'])
def suggested_purchases(request):
    """
    Obtener sugerencias de compra basadas en stock bajo
    
    Query Parameters:
        min_stock_multiplier (float): Multiplicador del stock mínimo (default: 1.0)
    """
    if not PermissionMiddleware.check_permission(request.user, 'suppliers', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    multiplier = float(request.GET.get('min_stock_multiplier', 1.0))
    
    # Productos con stock bajo
    products = Product.objects.filter(
        company=request.user.company,
        is_active=True
    ).filter(
        stock_units__lte=F('min_stock') * multiplier
    ).select_related('department').prefetch_related('supplier_relations__supplier')
    
    suggestions = []
    for product in products:
        # Obtener proveedor principal
        primary_supplier_relation = product.supplier_relations.filter(is_primary=True).first()
        primary_supplier = primary_supplier_relation.supplier if primary_supplier_relation else None
        
        # Si no hay proveedor principal, tomar el primero disponible
        if not primary_supplier:
            first_relation = product.supplier_relations.first()
            primary_supplier = first_relation.supplier if first_relation else None
        
        # Calcular cantidad sugerida (al menos el doble del mínimo)
        deficit = product.min_stock - product.stock_units
        suggested_qty = max(deficit, product.min_stock * 2)
        
        suggestions.append({
            'product_id': str(product.id),
            'product_name': product.name,
            'product_barcode': product.barcode,
            'current_stock': float(product.stock_units),
            'min_stock': float(product.min_stock),
            'suggested_quantity': float(suggested_qty),
            'primary_supplier_id': str(primary_supplier.id) if primary_supplier else None,
            'primary_supplier_name': primary_supplier.name if primary_supplier else None
        })
    
    serializer = SuggestedPurchaseSerializer(suggestions, many=True)
    return Response(serializer.data)


from django.utils import timezone