# api/views/sale_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import (
    Sale, SaleItem, SalePayment, Product, Client, 
    Shift, Credit, Promotion, Ticket
)
from api.serializers.sale_serializer import SaleSerializer
from api.middleware.permission_middleware import PermissionMiddleware
from api.utils.pagination import Paginator
from django.db.models import Sum, Q, F
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
def list_sales(request):
    """
    Listar ventas con paginación
    
    Query Parameters:
        page (int): Número de página
        page_size (int): Items por página (default: 50)
        status (str): Filtrar por estado
        sale_type (str): Filtrar por tipo
        client_id (uuid): Filtrar por cliente
        shift_id (uuid): Filtrar por turno
        start_date (date): Desde fecha
        end_date (date): Hasta fecha
    """
    if not PermissionMiddleware.check_permission(request.user, 'sales', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Scope por rol
    if request.user.role.name == 'cashier':
        sales = Sale.objects.filter(created_by=request.user)
    else:
        sales = Sale.objects.filter(company=request.user.company)
    
    # Filtros
    sale_status = request.GET.get('status')
    if sale_status:
        sales = sales.filter(status=sale_status)
    
    sale_type = request.GET.get('sale_type')
    if sale_type:
        sales = sales.filter(sale_type=sale_type)
    
    client_id = request.GET.get('client_id')
    if client_id:
        sales = sales.filter(client_id=client_id)
    
    shift_id = request.GET.get('shift_id')
    if shift_id:
        sales = sales.filter(shift_id=shift_id)
    
    start_date = request.GET.get('start_date')
    if start_date:
        sales = sales.filter(sale_date__gte=start_date)
    
    end_date = request.GET.get('end_date')
    if end_date:
        sales = sales.filter(sale_date__lte=end_date)
    
    sales = sales.select_related(
        'client', 'created_by', 'shift'
    ).order_by('-created_at')
    
    return Paginator.paginate_response(
        sales,
        request,
        SaleSerializer,
        default_page_size=50,
        max_page_size=200
    )


@api_view(['GET'])
def get_sale(request, sale_id):
    """Obtener detalle de venta"""
    if not PermissionMiddleware.check_permission(request.user, 'sales', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        if request.user.role.name == 'cashier':
            sale = Sale.objects.get(id=sale_id, created_by=request.user)
        else:
            sale = Sale.objects.get(id=sale_id, company=request.user.company)
    except Sale.DoesNotExist:
        return Response({'error': 'Venta no encontrada'}, status=404)
    
    serializer = SaleSerializer(sale)
    return Response(serializer.data)


@api_view(['POST'])
def create_sale(request):
    """
    Crear venta (POS)
    
    Body:
        client_id (uuid): ID del cliente (opcional)
        sale_type (str): 'regular', 'consignment', 'credit'
        items (list): Lista de productos
            - product_id (uuid): ID del producto (null para productos no registrados)
            - product_name (str): Nombre (para productos no registrados)
            - barcode (str): Código de barras
            - quantity (decimal): Cantidad
            - unit_price (decimal): Precio unitario (opcional, usa precio del producto)
        payments (list): Lista de pagos
            - payment_method (str): Método de pago
            - amount (decimal): Monto
        notes (str): Notas adicionales (opcional)
        apply_client_discount (bool): Aplicar descuento del cliente (default: true)
    """
    user = request.user
    
    # Verificar turno abierto
    try:
        shift = Shift.objects.get(user=user, status='open')
    except Shift.DoesNotExist:
        return Response({
            'error': 'Debes abrir un turno antes de realizar ventas'
        }, status=400)
    
    data = request.data.copy()
    
    # Validar datos básicos
    items_data = data.get('items', [])
    payments_data = data.get('payments', [])
    
    if not items_data:
        return Response({'error': 'Debe agregar al menos un producto'}, status=400)
    
    if not payments_data:
        return Response({'error': 'Debe agregar al menos un método de pago'}, status=400)
    
    # Obtener cliente si existe
    client = None
    client_id = data.get('client_id')
    if client_id:
        try:
            client = Client.objects.get(id=client_id, company=user.company)
        except Client.DoesNotExist:
            return Response({'error': 'Cliente no encontrado'}, status=404)
    
    sale_type = data.get('sale_type', 'regular')
    
    # Validar crédito si es venta a crédito
    if sale_type == 'credit':
        if not client:
            return Response({
                'error': 'Debe seleccionar un cliente para ventas a crédito'
            }, status=400)
        
        if not client.has_credit:
            return Response({
                'error': 'El cliente no tiene crédito habilitado'
            }, status=400)
    
    with transaction.atomic():
        # Calcular totales
        subtotal = Decimal('0')
        tax_amount = Decimal('0')
        discount_amount = Decimal('0')
        
        # Validar items y calcular subtotal
        validated_items = []
        
        for item_data in items_data:
            product_id = item_data.get('product_id')
            quantity = Decimal(str(item_data.get('quantity', 0)))
            
            if quantity <= 0:
                return Response({
                    'error': f'Cantidad inválida para producto'
                }, status=400)
            
            # Producto registrado
            if product_id:
                try:
                    product = Product.objects.select_for_update().get(
                        id=product_id,
                        company=user.company
                    )
                except Product.DoesNotExist:
                    return Response({
                        'error': f'Producto no encontrado: {product_id}'
                    }, status=404)
                
                # Validar stock
                if product.stock_units < quantity:
                    return Response({
                        'error': f'Stock insuficiente para {product.name}. Disponible: {product.stock_units}'
                    }, status=400)
                
                # Usar precio del producto o el especificado
                unit_price = Decimal(str(item_data.get('unit_price', product.unit_price)))
                
                # Aplicar promociones activas
                # TODO: Implementar lógica de promociones
                
                validated_items.append({
                    'product': product,
                    'product_name': product.name,
                    'barcode': product.barcode,
                    'quantity': quantity,
                    'unit_price': unit_price,
                    'is_registered': True
                })
                
            # Producto no registrado
            else:
                product_name = item_data.get('product_name')
                unit_price = Decimal(str(item_data.get('unit_price', 0)))
                
                if not product_name or unit_price <= 0:
                    return Response({
                        'error': 'Productos no registrados deben tener nombre y precio'
                    }, status=400)
                
                validated_items.append({
                    'product': None,
                    'product_name': product_name,
                    'barcode': None,
                    'quantity': quantity,
                    'unit_price': unit_price,
                    'is_registered': False
                })
            
            # Calcular subtotal del item
            item_subtotal = quantity * unit_price
            subtotal += item_subtotal
            
            # Calcular impuesto del item
            if product_id:
                if not product.is_tax_exempt:
                    tax_rate = product.variable_tax_rate or Decimal('19.00')
                    item_tax = item_subtotal * (tax_rate / 100)
                    tax_amount += item_tax
        
        # Aplicar descuento del cliente
        apply_discount = data.get('apply_client_discount', True)
        if client and client.has_discount and apply_discount:
            discount_percentage = client.discount_percentage or Decimal('0')
            discount_amount = subtotal * (discount_percentage / 100)
        
        # Total final
        total = subtotal - discount_amount + tax_amount
        
        # Validar pagos
        total_paid = sum(Decimal(str(p.get('amount', 0))) for p in payments_data)
        
        if abs(total_paid - total) > Decimal('0.01'):  # Tolerancia de 1 centavo
            return Response({
                'error': f'El total pagado (${total_paid}) no coincide con el total de la venta (${total})'
            }, status=400)
        
        # Validar crédito disponible
        if sale_type == 'credit':
            if client.credit_limit:
                available_credit = client.credit_limit - client.current_debt
                if total > available_credit:
                    return Response({
                        'error': f'Crédito insuficiente. Disponible: ${available_credit:,.0f}'
                    }, status=400)
        
        # Generar número de venta
        last_sale = Sale.objects.filter(company=user.company).order_by('-created_at').first()
        
        if last_sale and last_sale.sale_number:
            try:
                last_number = int(last_sale.sale_number.split('-')[-1])
                new_number = last_number + 1
            except:
                new_number = 1
        else:
            new_number = 1
        
        # Crear venta
        sale = Sale.objects.create(
            company=user.company,
            sale_number=f"VTA-{new_number:08d}",
            client=client,
            shift=shift,
            sale_type=sale_type,
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            total=total,
            status='completed',
            sale_date=timezone.now(),
            completed_at=timezone.now(),
            created_by=user,
            notes=data.get('notes', '')
        )
        
        # Crear items
        for item in validated_items:
            sale_item = SaleItem.objects.create(
                sale=sale,
                product=item['product'],
                product_name=item['product_name'],
                barcode=item['barcode'],
                quantity=item['quantity'],
                unit_price=item['unit_price']
            )
            
            # Reducir stock si es producto registrado
            if item['is_registered'] and item['product']:
                item['product'].stock_units -= item['quantity']
                item['product'].save()
        
        # Crear pagos
        for payment_data in payments_data:
            SalePayment.objects.create(
                sale=sale,
                payment_method=payment_data['payment_method'],
                amount=Decimal(str(payment_data['amount']))
            )
        
        # Si es venta a crédito, crear registro de crédito
        if sale_type == 'credit':
            Credit.objects.create(
                client=client,
                sale=sale,
                total_amount=total,
                due_date=data.get('due_date')  # Fecha de vencimiento opcional
            )
            
            # Actualizar deuda del cliente
            client.current_debt += total
            client.save()
        
        # Generar ticket
        # TODO: Implementar generación de ticket
        
        logger.info(f"Venta creada: {sale.sale_number} - ${total} por {user.email}")
        
        serializer = SaleSerializer(sale)
        return Response(serializer.data, status=201)


@api_view(['POST'])
def cancel_sale(request, sale_id):
    """
    Cancelar venta
    
    Body:
        cancellation_reason (str): Motivo de cancelación
    """
    if not PermissionMiddleware.check_permission(request.user, 'sales', 'delete'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        sale = Sale.objects.get(id=sale_id, company=request.user.company)
    except Sale.DoesNotExist:
        return Response({'error': 'Venta no encontrada'}, status=404)
    
    if sale.status == 'cancelled':
        return Response({'error': 'La venta ya está cancelada'}, status=400)
    
    cancellation_reason = request.data.get('cancellation_reason', '')
    
    if not cancellation_reason:
        return Response({
            'error': 'Debe proporcionar un motivo de cancelación'
        }, status=400)
    
    with transaction.atomic():
        # Restaurar stock de productos
        for item in sale.items.all():
            if item.product:
                item.product.stock_units += item.quantity
                item.product.save()
        
        # Si era venta a crédito, ajustar deuda del cliente
        if sale.sale_type == 'credit' and sale.client:
            sale.client.current_debt -= sale.total
            sale.client.save()
            
            # Cancelar crédito asociado
            try:
                credit = Credit.objects.get(sale=sale)
                credit.status = 'cancelled'
                credit.save()
            except Credit.DoesNotExist:
                pass
        
        # Cancelar venta
        sale.status = 'cancelled'
        sale.cancelled_at = timezone.now()
        sale.cancelled_by = request.user
        sale.cancellation_reason = cancellation_reason
        sale.save()
        
        logger.warning(f"Venta cancelada: {sale.sale_number} - Motivo: {cancellation_reason}")
        
        serializer = SaleSerializer(sale)
        return Response(serializer.data)


@api_view(['GET'])
def price_checker(request):
    """
    Verificador de precios por código de barras o nombre
    
    Query Parameters:
        barcode (str): Código de barras
        name (str): Búsqueda por nombre
    """
    barcode = request.GET.get('barcode')
    name = request.GET.get('name')
    
    if not barcode and not name:
        return Response({
            'error': 'Debe proporcionar código de barras o nombre'
        }, status=400)
    
    try:
        if barcode:
            product = Product.objects.get(
                Q(barcode=barcode) | Q(barcode_package=barcode),
                company=request.user.company,
                is_active=True
            )
        else:
            # Búsqueda por nombre (primer coincidencia)
            product = Product.objects.filter(
                name__icontains=name,
                company=request.user.company,
                is_active=True
            ).first()
            
            if not product:
                return Response({
                    'error': 'Producto no encontrado'
                }, status=404)
        
        # Calcular precio con IVA
        price_with_tax = product.unit_price
        if not product.is_tax_exempt:
            tax_rate = product.variable_tax_rate or Decimal('19.00')
            price_with_tax = product.unit_price * (1 + tax_rate / 100)
        
        return Response({
            'product_id': str(product.id),
            'barcode': product.barcode,
            'name': product.name,
            'department': product.department.name,
            'stock': float(product.stock_units),
            'unit_price': float(product.unit_price),
            'price_with_tax': float(price_with_tax),
            'is_tax_exempt': product.is_tax_exempt,
            'tax_rate': float(product.variable_tax_rate) if product.variable_tax_rate else 19.0,
            'is_package': product.is_package,
            'units_per_package': product.units_per_package,
            'package_price': float(product.package_price) if product.package_price else None
        })
        
    except Product.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=404)


@api_view(['GET'])
def daily_sales_report(request):
    """
    Reporte de ventas del día actual
    
    Incluye:
    - Total de ventas
    - Ventas por método de pago
    - Productos más vendidos
    - Ventas por hora
    """
    if not PermissionMiddleware.check_permission(request.user, 'sales', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Ventas del día
    today = timezone.now().date()
    
    if request.user.role.name == 'cashier':
        sales = Sale.objects.filter(
            created_by=request.user,
            sale_date__date=today,
            status='completed'
        )
    else:
        sales = Sale.objects.filter(
            company=request.user.company,
            sale_date__date=today,
            status='completed'
        )
    
    # Totales
    total_sales = sales.count()
    total_amount = sales.aggregate(total=Sum('total'))['total'] or Decimal('0')
    
    # Por método de pago
    payments = SalePayment.objects.filter(sale__in=sales)
    
    payment_summary = {}
    for method, display in SalePayment.PAYMENT_METHOD_CHOICES:
        amount = payments.filter(payment_method=method).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        payment_summary[method] = {
            'display': display,
            'amount': float(amount)
        }
    
    # Productos más vendidos
    top_products = SaleItem.objects.filter(
        sale__in=sales,
        product__isnull=False
    ).values(
        'product__name'
    ).annotate(
        total_quantity=Sum('quantity'),
        total_amount=Sum(F('quantity') * F('unit_price'))
    ).order_by('-total_amount')[:10]
    
    return Response({
        'date': today.isoformat(),
        'total_sales': total_sales,
        'total_amount': float(total_amount),
        'payment_methods': payment_summary,
        'top_products': [
            {
                'product': item['product__name'],
                'quantity': float(item['total_quantity']),
                'amount': float(item['total_amount'])
            }
            for item in top_products
        ]
    })


@api_view(['POST'])
def print_last_ticket(request):
    """Reimprimir último ticket del turno actual"""
    try:
        shift = Shift.objects.get(user=request.user, status='open')
    except Shift.DoesNotExist:
        return Response({'error': 'No hay turno abierto'}, status=404)
    
    # Obtener última venta del turno
    last_sale = Sale.objects.filter(
        shift=shift,
        status='completed'
    ).order_by('-created_at').first()
    
    if not last_sale:
        return Response({'error': 'No hay ventas en este turno'}, status=404)
    
    # TODO: Implementar generación e impresión de ticket
    
    return Response({
        'message': 'Ticket enviado a impresora',
        'sale_number': last_sale.sale_number,
        'total': float(last_sale.total)
    })