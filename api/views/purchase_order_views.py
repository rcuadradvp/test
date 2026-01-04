# api/views/purchase_order_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import PurchaseOrder, SupplierPayment, Supplier
from api.serializers.supplier_serializers import (
    PurchaseOrderSerializer,
    PurchaseOrderListSerializer
)
from api.serializers.payment_serializers import (
    SupplierPaymentSerializer,
    RegisterSupplierPaymentSerializer
)
from api.middleware.permission_middleware import PermissionMiddleware
from api.utils.excel_handler import ExcelExporter
from api.utils.pagination import Paginator
from django.db.models import Q
from django.db import transaction
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
def list_purchase_orders(request):
    """
    Listar órdenes de compra con paginación opcional
    
    Query Parameters:
        page (int): Número de página
        page_size (int): Items por página (default: 50, max: 500)
        supplier_id (uuid): Filtrar por proveedor
        status (str): Filtrar por estado (pending, completed, paid, cancelled)
        start_date (date): Desde fecha
        end_date (date): Hasta fecha
    """
    if not PermissionMiddleware.check_permission(request.user, 'suppliers', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Scope por empresa
    orders = PurchaseOrder.objects.filter(
        company=request.user.company
    ).select_related('supplier', 'created_by')
    
    # Filtros
    supplier_id = request.GET.get('supplier_id')
    if supplier_id:
        orders = orders.filter(supplier_id=supplier_id)
    
    order_status = request.GET.get('status')
    if order_status:
        orders = orders.filter(status=order_status)
    
    start_date = request.GET.get('start_date')
    if start_date:
        orders = orders.filter(order_date__gte=start_date)
    
    end_date = request.GET.get('end_date')
    if end_date:
        orders = orders.filter(order_date__lte=end_date)
    
    orders = orders.order_by('-created_at')
    
    # Paginación
    if 'page' in request.GET:
        return Paginator.paginate_response(
            orders,
            request,
            PurchaseOrderListSerializer,
            default_page_size=50,
            max_page_size=500
        )
    
    # Sin paginación
    serializer = PurchaseOrderListSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_purchase_order(request, order_id):
    """Obtener detalle de orden de compra"""
    if not PermissionMiddleware.check_permission(request.user, 'suppliers', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        order = PurchaseOrder.objects.select_related(
            'supplier', 'created_by'
        ).prefetch_related(
            'items__product', 'items__department', 'payments'
        ).get(
            id=order_id,
            company=request.user.company
        )
    except PurchaseOrder.DoesNotExist:
        return Response({'error': 'Orden de compra no encontrada'}, status=404)
    
    serializer = PurchaseOrderSerializer(order)
    return Response(serializer.data)


@api_view(['POST'])
def create_purchase_order(request):
    """Crear orden de compra"""
    if not PermissionMiddleware.check_permission(request.user, 'suppliers', 'create'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    serializer = PurchaseOrderSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        order = serializer.save()
        logger.info(f"Orden de compra creada: {order.order_number} por {request.user.email}")
        
        # TODO: Crear alerta para administradores
        
        return Response(serializer.data, status=201)
    
    return Response(serializer.errors, status=400)


@api_view(['PUT', 'PATCH'])
def update_purchase_order(request, order_id):
    """Actualizar orden de compra (solo si está pendiente)"""
    if not PermissionMiddleware.check_permission(request.user, 'suppliers', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        order = PurchaseOrder.objects.get(
            id=order_id,
            company=request.user.company
        )
    except PurchaseOrder.DoesNotExist:
        return Response({'error': 'Orden de compra no encontrada'}, status=404)
    
    if order.status != 'pending':
        return Response({
            'error': 'Solo se pueden editar órdenes pendientes'
        }, status=400)
    
    serializer = PurchaseOrderSerializer(
        order,
        data=request.data,
        partial=(request.method == 'PATCH'),
        context={'request': request}
    )
    
    if serializer.is_valid():
        serializer.save()
        logger.info(f"Orden de compra actualizada: {order.order_number} por {request.user.email}")
        return Response(serializer.data)
    
    return Response(serializer.errors, status=400)


@api_view(['POST'])
def cancel_purchase_order(request, order_id):
    """Cancelar orden de compra"""
    if not PermissionMiddleware.check_permission(request.user, 'suppliers', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        order = PurchaseOrder.objects.get(
            id=order_id,
            company=request.user.company
        )
    except PurchaseOrder.DoesNotExist:
        return Response({'error': 'Orden de compra no encontrada'}, status=404)
    
    if order.status == 'cancelled':
        return Response({'error': 'La orden ya está cancelada'}, status=400)
    
    if order.status == 'paid':
        return Response({'error': 'No se puede cancelar una orden pagada'}, status=400)
    
    if order.paid_amount > 0:
        return Response({
            'error': 'No se puede cancelar una orden con pagos realizados'
        }, status=400)
    
    cancellation_reason = request.data.get('reason', '')
    
    order.status = 'cancelled'
    order.notes = f"{order.notes}\n\nCANCELADA: {cancellation_reason}".strip()
    order.save()
    
    logger.info(f"Orden de compra cancelada: {order.order_number} por {request.user.email}")
    
    serializer = PurchaseOrderSerializer(order)
    return Response(serializer.data)


@api_view(['POST'])
def register_supplier_payment(request):
    """Registrar pago a proveedor"""
    if not PermissionMiddleware.check_permission(request.user, 'suppliers', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Validar datos de entrada
    input_serializer = RegisterSupplierPaymentSerializer(data=request.data)
    
    if not input_serializer.is_valid():
        return Response(input_serializer.errors, status=400)
    
    validated_data = input_serializer.validated_data
    
    try:
        purchase_order = PurchaseOrder.objects.get(
            id=validated_data['purchase_order_id'],
            company=request.user.company
        )
    except PurchaseOrder.DoesNotExist:
        return Response({'error': 'Orden de compra no encontrada'}, status=404)
    
    # Preparar datos del pago
    payment_data = {
        'purchase_order': purchase_order.id,
        'amount': validated_data['amount'],
        'payment_method': validated_data['payment_method'],
        'payment_source': validated_data['payment_source'],
        'notes': validated_data.get('notes', '')
    }
    
    # Agregar campos opcionales según la fuente
    if validated_data['payment_source'] == 'cash_register':
        payment_data['shift'] = validated_data.get('shift_id')
    elif validated_data['payment_source'] == 'external':
        payment_data['delivered_by'] = validated_data.get('delivered_by_id')
    
    # Crear el pago
    with transaction.atomic():
        payment_serializer = SupplierPaymentSerializer(
            data=payment_data,
            context={'request': request}
        )
        
        if payment_serializer.is_valid():
            payment = payment_serializer.save()
            
            logger.info(
                f"Pago a proveedor registrado: {payment.purchase_order.supplier.name} "
                f"- ${payment.amount} por {request.user.email}"
            )
            
            # TODO: Crear alerta para administradores
            
            return Response(payment_serializer.data, status=201)
        
        return Response(payment_serializer.errors, status=400)


@api_view(['GET'])
def list_supplier_payments(request):
    """
    Listar pagos a proveedores
    
    Query Parameters:
        supplier_id (uuid): Filtrar por proveedor
        start_date (date): Desde fecha
        end_date (date): Hasta fecha
        payment_method (str): Filtrar por método de pago
    """
    if not PermissionMiddleware.check_permission(request.user, 'suppliers', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Obtener pagos de órdenes de la empresa
    payments = SupplierPayment.objects.filter(
        purchase_order__company=request.user.company
    ).select_related(
        'purchase_order__supplier', 
        'delivered_by', 
        'delivery_registered_by',
        'shift'
    )
    
    # Filtros
    supplier_id = request.GET.get('supplier_id')
    if supplier_id:
        payments = payments.filter(purchase_order__supplier_id=supplier_id)
    
    start_date = request.GET.get('start_date')
    if start_date:
        payments = payments.filter(payment_date__gte=start_date)
    
    end_date = request.GET.get('end_date')
    if end_date:
        payments = payments.filter(payment_date__lte=end_date)
    
    payment_method = request.GET.get('payment_method')
    if payment_method:
        payments = payments.filter(payment_method=payment_method)
    
    payments = payments.order_by('-payment_date')
    
    # Paginación
    if 'page' in request.GET:
        return Paginator.paginate_response(
            payments,
            request,
            SupplierPaymentSerializer,
            default_page_size=50,
            max_page_size=500
        )
    
    serializer = SupplierPaymentSerializer(payments, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def export_purchase_orders(request):
    """Exportar órdenes de compra a Excel"""
    if not PermissionMiddleware.check_permission(request.user, 'suppliers', 'export'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Aplicar mismos filtros que en list
    orders = PurchaseOrder.objects.filter(
        company=request.user.company
    ).select_related('supplier', 'created_by')
    
    supplier_id = request.GET.get('supplier_id')
    if supplier_id:
        orders = orders.filter(supplier_id=supplier_id)
    
    order_status = request.GET.get('status')
    if order_status:
        orders = orders.filter(status=order_status)
    
    orders = orders.order_by('-created_at')
    
    # Preparar datos
    data = []
    for order in orders:
        data.append({
            'Número Orden': order.order_number,
            'Proveedor': order.supplier.name,
            'Fecha Orden': order.order_date.strftime('%Y-%m-%d'),
            'Fecha Entrega Esperada': order.expected_delivery_date.strftime('%Y-%m-%d') if order.expected_delivery_date else '',
            'Subtotal': float(order.subtotal),
            'IVA': float(order.tax_amount),
            'Total': float(order.total),
            'Pagado': float(order.paid_amount),
            'Pendiente': float(order.total - order.paid_amount),
            'Estado': order.get_status_display(),
            'Creado Por': order.created_by.username,
            'Fecha Creación': order.created_at.strftime('%Y-%m-%d %H:%M')
        })
    
    filename = f'ordenes_compra_{request.user.company.name}_{timezone.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    
    try:
        file_path = ExcelExporter.export_to_excel(
            data=data,
            filename=filename,
            sheet_name='Órdenes de Compra'
        )
        
        with open(file_path, 'rb') as f:
            response = Response(
                f.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
    
    except Exception as e:
        logger.error(f"Error exportando órdenes: {str(e)}")
        return Response({'error': 'Error al exportar'}, status=500)