# api/views/consignment_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import Consignment, ConsignmentItem, Client, Product
from api.serializers.consignment_serializer import ConsignmentSerializer, ConsignmentItemSerializer
from api.middleware.permission_middleware import PermissionMiddleware
from api.utils.pagination import Paginator
from django.db.models import Sum, Q, F
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
def list_consignments(request):
    """
    Listar consignaciones con paginación
    
    Query Parameters:
        page (int): Número de página
        page_size (int): Items por página (default: 50)
        status (str): Filtrar por estado (pending, active, settled, cancelled)
        client_id (uuid): Filtrar por cliente
        overdue (bool): Solo consignaciones vencidas
        start_date (date): Desde fecha
        end_date (date): Hasta fecha
    """
    if not PermissionMiddleware.check_permission(request.user, 'consignments', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    consignments = Consignment.objects.filter(
        company=request.user.company
    ).select_related('client', 'created_by', 'settled_by')
    
    # Filtros
    consignment_status = request.GET.get('status')
    if consignment_status:
        consignments = consignments.filter(status=consignment_status)
    
    client_id = request.GET.get('client_id')
    if client_id:
        consignments = consignments.filter(client_id=client_id)
    
    # Solo vencidas
    overdue = request.GET.get('overdue')
    if overdue and overdue.lower() == 'true':
        today = timezone.now().date()
        consignments = consignments.filter(
            status='active',
            expected_return_date__lt=today
        )
    
    start_date = request.GET.get('start_date')
    if start_date:
        consignments = consignments.filter(delivery_date__gte=start_date)
    
    end_date = request.GET.get('end_date')
    if end_date:
        consignments = consignments.filter(delivery_date__lte=end_date)
    
    consignments = consignments.order_by('-created_at')
    
    return Paginator.paginate_response(
        consignments,
        request,
        ConsignmentSerializer,
        default_page_size=50,
        max_page_size=200
    )


@api_view(['GET'])
def get_consignment(request, consignment_id):
    """Obtener detalle de consignación"""
    if not PermissionMiddleware.check_permission(request.user, 'consignments', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        consignment = Consignment.objects.select_related(
            'client', 'created_by', 'settled_by'
        ).prefetch_related(
            'items__product'
        ).get(
            id=consignment_id,
            company=request.user.company
        )
    except Consignment.DoesNotExist:
        return Response({'error': 'Consignación no encontrada'}, status=404)
    
    serializer = ConsignmentSerializer(consignment)
    return Response(serializer.data)


@api_view(['POST'])
def create_consignment(request):
    """
    Crear consignación
    
    Body:
        client_id (uuid): ID del cliente
        event_name (str): Nombre del evento
        event_location (str): Ubicación del evento
        delivery_date (date): Fecha de entrega
        expected_return_date (date): Fecha esperada de devolución
        items (list): Lista de productos
            - product_id (uuid): ID del producto
            - delivered_quantity (decimal): Cantidad entregada
            - unit_price (decimal): Precio unitario
        notes (str): Notas adicionales (opcional)
    """
    if not PermissionMiddleware.check_permission(request.user, 'consignments', 'create'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    data = request.data.copy()
    items_data = data.pop('items', [])
    
    if not items_data:
        return Response({'error': 'Debe agregar al menos un producto'}, status=400)
    
    # Validar cliente
    try:
        client = Client.objects.get(
            id=data.get('client_id'),
            company=request.user.company
        )
    except Client.DoesNotExist:
        return Response({'error': 'Cliente no encontrado'}, status=404)
    
    # Validar fechas
    delivery_date = data.get('delivery_date')
    expected_return_date = data.get('expected_return_date')
    
    if not delivery_date or not expected_return_date:
        return Response({
            'error': 'Debe especificar fechas de entrega y devolución'
        }, status=400)
    
    if expected_return_date <= delivery_date:
        return Response({
            'error': 'La fecha de devolución debe ser posterior a la entrega'
        }, status=400)
    
    with transaction.atomic():
        # Validar stock de productos
        validated_items = []
        total_value = Decimal('0')
        
        for item_data in items_data:
            product_id = item_data.get('product_id')
            delivered_qty = Decimal(str(item_data.get('delivered_quantity', 0)))
            
            if delivered_qty <= 0:
                return Response({
                    'error': 'La cantidad entregada debe ser mayor a 0'
                }, status=400)
            
            try:
                product = Product.objects.select_for_update().get(
                    id=product_id,
                    company=request.user.company
                )
            except Product.DoesNotExist:
                return Response({
                    'error': f'Producto no encontrado: {product_id}'
                }, status=404)
            
            # Validar stock
            if product.stock_units < delivered_qty:
                return Response({
                    'error': f'Stock insuficiente para {product.name}. Disponible: {product.stock_units}'
                }, status=400)
            
            unit_price = Decimal(str(item_data.get('unit_price', product.unit_price)))
            item_total = delivered_qty * unit_price
            total_value += item_total
            
            validated_items.append({
                'product': product,
                'delivered_quantity': delivered_qty,
                'unit_price': unit_price
            })
        
        # Generar número de consignación
        last_consignment = Consignment.objects.filter(
            company=request.user.company
        ).order_by('-created_at').first()
        
        if last_consignment and last_consignment.consignment_number:
            try:
                last_number = int(last_consignment.consignment_number.split('-')[-1])
                new_number = last_number + 1
            except:
                new_number = 1
        else:
            new_number = 1
        
        # Crear consignación
        consignment = Consignment.objects.create(
            company=request.user.company,
            consignment_number=f"CONS-{new_number:06d}",
            client=client,
            event_name=data.get('event_name'),
            event_location=data.get('event_location', ''),
            delivery_date=delivery_date,
            expected_return_date=expected_return_date,
            total_delivered_value=total_value,
            status='pending',
            created_by=request.user,
            notes=data.get('notes', '')
        )
        
        # Crear items y reducir stock
        for item in validated_items:
            ConsignmentItem.objects.create(
                consignment=consignment,
                product=item['product'],
                delivered_quantity=item['delivered_quantity'],
                unit_price=item['unit_price']
            )
            
            # Reducir stock
            item['product'].stock_units -= item['delivered_quantity']
            item['product'].save()
        
        logger.info(
            f"Consignación creada: {consignment.consignment_number} "
            f"para {client.first_name} {client.last_name}"
        )
        
        serializer = ConsignmentSerializer(consignment)
        return Response(serializer.data, status=201)


@api_view(['POST'])
def activate_consignment(request, consignment_id):
    """Activar consignación (marcar como entregada al cliente)"""
    if not PermissionMiddleware.check_permission(request.user, 'consignments', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        consignment = Consignment.objects.get(
            id=consignment_id,
            company=request.user.company
        )
    except Consignment.DoesNotExist:
        return Response({'error': 'Consignación no encontrada'}, status=404)
    
    if consignment.status != 'pending':
        return Response({
            'error': 'Solo se pueden activar consignaciones pendientes'
        }, status=400)
    
    consignment.status = 'active'
    consignment.save()
    
    logger.info(f"Consignación activada: {consignment.consignment_number}")
    
    serializer = ConsignmentSerializer(consignment)
    return Response(serializer.data)


@api_view(['POST'])
def settle_consignment(request, consignment_id):
    """
    Liquidar consignación (registrar devoluciones y ventas)
    
    Body:
        items (list): Lista de items con cantidades
            - item_id (uuid): ID del item
            - sold_quantity (decimal): Cantidad vendida
            - returned_quantity (decimal): Cantidad devuelta
        settlement_notes (str): Notas de liquidación (opcional)
    """
    if not PermissionMiddleware.check_permission(request.user, 'consignments', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        consignment = Consignment.objects.select_for_update().get(
            id=consignment_id,
            company=request.user.company
        )
    except Consignment.DoesNotExist:
        return Response({'error': 'Consignación no encontrada'}, status=404)
    
    if consignment.status != 'active':
        return Response({
            'error': 'Solo se pueden liquidar consignaciones activas'
        }, status=400)
    
    items_data = request.data.get('items', [])
    
    if not items_data:
        return Response({'error': 'Debe proporcionar datos de liquidación'}, status=400)
    
    with transaction.atomic():
        total_sold_value = Decimal('0')
        total_returned_value = Decimal('0')
        
        for item_data in items_data:
            item_id = item_data.get('item_id')
            sold_qty = Decimal(str(item_data.get('sold_quantity', 0)))
            returned_qty = Decimal(str(item_data.get('returned_quantity', 0)))
            
            try:
                item = ConsignmentItem.objects.select_for_update().get(
                    id=item_id,
                    consignment=consignment
                )
            except ConsignmentItem.DoesNotExist:
                return Response({
                    'error': f'Item de consignación no encontrado: {item_id}'
                }, status=404)
            
            # Validar cantidades
            if sold_qty < 0 or returned_qty < 0:
                return Response({
                    'error': 'Las cantidades no pueden ser negativas'
                }, status=400)
            
            total_accounted = sold_qty + returned_qty
            if total_accounted > item.delivered_quantity:
                return Response({
                    'error': f'La suma de vendido y devuelto excede lo entregado para {item.product.name}'
                }, status=400)
            
            # Actualizar item
            item.sold_quantity = sold_qty
            item.returned_quantity = returned_qty
            item.save()
            
            # Restaurar stock con productos devueltos
            if returned_qty > 0:
                item.product.stock_units += returned_qty
                item.product.save()
            
            # Calcular valores
            total_sold_value += sold_qty * item.unit_price
            total_returned_value += returned_qty * item.unit_price
        
        # Actualizar consignación
        consignment.total_sold_value = total_sold_value
        consignment.total_returned_value = total_returned_value
        consignment.status = 'settled'
        consignment.settlement_date = timezone.now()
        consignment.settlement_notes = request.data.get('settlement_notes', '')
        consignment.settled_by = request.user
        consignment.save()
        
        # Crear venta por lo vendido (si hay ventas)
        if total_sold_value > 0:
            consignment.create_sale_from_settlement(request.user)
        
        logger.info(
            f"Consignación liquidada: {consignment.consignment_number} "
            f"- Vendido: ${total_sold_value}, Devuelto: ${total_returned_value}"
        )
        
        serializer = ConsignmentSerializer(consignment)
        return Response(serializer.data)


@api_view(['POST'])
def cancel_consignment(request, consignment_id):
    """
    Cancelar consignación (restaurar stock)
    
    Body:
        cancellation_reason (str): Motivo de cancelación
    """
    if not PermissionMiddleware.check_permission(request.user, 'consignments', 'delete'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        consignment = Consignment.objects.select_for_update().get(
            id=consignment_id,
            company=request.user.company
        )
    except Consignment.DoesNotExist:
        return Response({'error': 'Consignación no encontrada'}, status=404)
    
    if consignment.status == 'settled':
        return Response({
            'error': 'No se puede cancelar una consignación liquidada'
        }, status=400)
    
    if consignment.status == 'cancelled':
        return Response({'error': 'La consignación ya está cancelada'}, status=400)
    
    cancellation_reason = request.data.get('cancellation_reason', '')
    
    if not cancellation_reason:
        return Response({
            'error': 'Debe proporcionar un motivo de cancelación'
        }, status=400)
    
    with transaction.atomic():
        # Restaurar stock de todos los items
        for item in consignment.items.all():
            # Solo restaurar lo que aún no fue procesado
            pending_qty = item.pending_quantity
            if pending_qty > 0:
                item.product.stock_units += pending_qty
                item.product.save()
        
        # Cancelar consignación
        consignment.status = 'cancelled'
        consignment.settlement_notes = f"CANCELADA: {cancellation_reason}"
        consignment.settlement_date = timezone.now()
        consignment.settled_by = request.user
        consignment.save()
        
        logger.warning(
            f"Consignación cancelada: {consignment.consignment_number} - "
            f"Motivo: {cancellation_reason}"
        )
        
        serializer = ConsignmentSerializer(consignment)
        return Response(serializer.data)


@api_view(['GET'])
def consignment_summary(request):
    """
    Resumen de consignaciones
    
    Incluye:
    - Total de consignaciones activas
    - Valor total en consignación
    - Consignaciones vencidas
    - Próximas devoluciones
    """
    if not PermissionMiddleware.check_permission(request.user, 'consignments', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    company = request.user.company
    today = timezone.now().date()
    
    # Consignaciones activas
    active_consignments = Consignment.objects.filter(
        company=company,
        status='active'
    )
    
    total_active = active_consignments.count()
    total_value = active_consignments.aggregate(
        total=Sum('total_delivered_value')
    )['total'] or Decimal('0')
    
    # Consignaciones vencidas
    overdue = active_consignments.filter(expected_return_date__lt=today)
    total_overdue = overdue.count()
    
    # Próximas devoluciones (próximos 7 días)
    next_week = today + timezone.timedelta(days=7)
    upcoming = active_consignments.filter(
        expected_return_date__gte=today,
        expected_return_date__lte=next_week
    ).select_related('client').order_by('expected_return_date')
    
    upcoming_list = [
        {
            'id': str(c.id),
            'number': c.consignment_number,
            'client': f"{c.client.first_name} {c.client.last_name}",
            'event': c.event_name,
            'expected_return': c.expected_return_date.isoformat(),
            'value': float(c.total_delivered_value)
        }
        for c in upcoming[:10]
    ]
    
    return Response({
        'total_active': total_active,
        'total_value': float(total_value),
        'total_overdue': total_overdue,
        'upcoming_returns': upcoming_list
    })


@api_view(['GET'])
def get_client_consignments(request, client_id):
    """Obtener consignaciones de un cliente específico"""
    if not PermissionMiddleware.check_permission(request.user, 'consignments', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        client = Client.objects.get(
            id=client_id,
            company=request.user.company
        )
    except Client.DoesNotExist:
        return Response({'error': 'Cliente no encontrado'}, status=404)
    
    consignments = Consignment.objects.filter(
        client=client
    ).order_by('-created_at')
    
    serializer = ConsignmentSerializer(consignments, many=True)
    
    return Response({
        'client': {
            'id': str(client.id),
            'name': f"{client.first_name} {client.last_name}",
            'rut': client.rut,
            'phone': client.phone
        },
        'consignments': serializer.data,
        'total_consignments': consignments.count(),
        'active_consignments': consignments.filter(status='active').count()
    })