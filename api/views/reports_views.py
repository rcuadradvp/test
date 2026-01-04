# project/api/views/reports_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import (
    Sale, SaleItem, SalePayment, Product, Client, 
    Credit, CreditPayment, Shift, CashMovement,
    PurchaseOrder, PurchaseOrderItem, Department
)
from api.middleware.permission_middleware import PermissionMiddleware
from django.db.models import Sum, Count, Q, F, DecimalField
from django.db.models.functions import Coalesce
from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
def sales_report(request):
    """
    Reporte de ventas con filtros avanzados
    Query params:
        - start_date, end_date: rango de fechas
        - cashier_id: filtrar por cajero
        - department_id: filtrar por departamento
        - payment_method: filtrar por método de pago
        - include_iva: incluir cálculos de IVA (default: true)
    """
    if not PermissionMiddleware.check_permission(request.user, 'reports', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Filtros de fecha
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    
    # Base query
    sales = Sale.objects.filter(
        company=request.user.company,
        status='completed'
    )
    
    if start_date:
        sales = sales.filter(sale_date__gte=start_date)
    if end_date:
        sales = sales.filter(sale_date__lte=end_date)
    
    # Filtro por cajero
    cashier_id = request.GET.get('cashier_id')
    if cashier_id:
        sales = sales.filter(created_by_id=cashier_id)
    
    # Totales generales
    total_sales = sales.count()
    total_revenue = sales.aggregate(
        total=Coalesce(Sum('total'), Decimal('0'))
    )['total']
    
    # Ventas por método de pago
    payment_methods = SalePayment.objects.filter(
        sale__in=sales
    ).values('payment_method').annotate(
        count=Count('id'),
        total=Sum('amount')
    ).order_by('-total')
    
    # Cálculo de IVA
    include_iva = request.GET.get('include_iva', 'true').lower() == 'true'
    iva_breakdown = None
    
    if include_iva:
        iva_breakdown = calculate_iva_breakdown(sales)
    
    # Ventas por departamento
    sales_by_department = SaleItem.objects.filter(
        sale__in=sales
    ).values(
        department_name=F('product__department__name')
    ).annotate(
        count=Count('id'),
        total=Sum(F('quantity') * F('unit_price'), output_field=DecimalField())
    ).order_by('-total')
    
    # Top productos vendidos
    top_products = SaleItem.objects.filter(
        sale__in=sales
    ).values(
        'product__name', 'product__barcode'
    ).annotate(
        quantity_sold=Sum('quantity'),
        revenue=Sum(F('quantity') * F('unit_price'), output_field=DecimalField())
    ).order_by('-quantity_sold')[:20]
    
    # Ventas por cajero (si no se filtró por uno específico)
    sales_by_cashier = None
    if not cashier_id:
        sales_by_cashier = sales.values(
            cashier_name=F('created_by__username')
        ).annotate(
            sales_count=Count('id'),
            total_revenue=Sum('total')
        ).order_by('-total_revenue')
    
    return Response({
        'period': {
            'start_date': start_date,
            'end_date': end_date
        },
        'summary': {
            'total_sales': total_sales,
            'total_revenue': float(total_revenue),
            'average_ticket': float(total_revenue / total_sales) if total_sales > 0 else 0
        },
        'by_payment_method': [
            {
                'method': pm['payment_method'],
                'count': pm['count'],
                'total': float(pm['total'])
            } for pm in payment_methods
        ],
        'by_department': [
            {
                'department': dept['department_name'],
                'count': dept['count'],
                'total': float(dept['total'])
            } for dept in sales_by_department
        ],
        'top_products': [
            {
                'name': prod['product__name'],
                'barcode': prod['product__barcode'],
                'quantity_sold': float(prod['quantity_sold']),
                'revenue': float(prod['revenue'])
            } for prod in top_products
        ],
        'by_cashier': [
            {
                'cashier': cashier['cashier_name'],
                'sales_count': cashier['sales_count'],
                'total_revenue': float(cashier['total_revenue'])
            } for cashier in (sales_by_cashier or [])
        ] if sales_by_cashier else None,
        'iva_breakdown': iva_breakdown
    })


def calculate_iva_breakdown(sales):
    """
    Calcular desglose detallado de IVA
    Considera productos con IVA variable y exentos
    """
    total_with_iva = Decimal('0')
    total_exempt = Decimal('0')
    iva_19_total = Decimal('0')
    iva_variable_total = Decimal('0')
    
    for sale in sales:
        for item in sale.items.all():
            item_total = item.quantity * item.unit_price
            
            if item.product:
                if item.product.is_tax_exempt:
                    total_exempt += item_total
                else:
                    # Calcular base imponible
                    tax_rate = item.product.variable_tax_rate or Decimal('19')
                    base = item_total / (1 + (tax_rate / 100))
                    iva_amount = item_total - base
                    
                    if tax_rate == Decimal('19'):
                        iva_19_total += iva_amount
                    else:
                        iva_variable_total += iva_amount
                    
                    total_with_iva += item_total
            else:
                # Producto no registrado - asumir 19%
                base = item_total / Decimal('1.19')
                iva_19_total += (item_total - base)
                total_with_iva += item_total
    
    total_base = total_with_iva - (iva_19_total + iva_variable_total)
    
    return {
        'total_with_iva': float(total_with_iva),
        'total_exempt': float(total_exempt),
        'total_base_imponible': float(total_base),
        'iva_19_percent': float(iva_19_total),
        'iva_variable': float(iva_variable_total),
        'total_iva': float(iva_19_total + iva_variable_total)
    }


@api_view(['GET'])
def cash_flow_report(request):
    """
    Reporte de flujo de caja con proyecciones
    Incluye ingresos, egresos y cálculo de IVA
    """
    if not PermissionMiddleware.check_permission(request.user, 'reports', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    
    # Ventas completadas
    sales = Sale.objects.filter(
        company=request.user.company,
        status='completed'
    )
    
    if start_date:
        sales = sales.filter(sale_date__gte=start_date)
    if end_date:
        sales = sales.filter(sale_date__lte=end_date)
    
    # Ingresos
    sales_cash = SalePayment.objects.filter(
        sale__in=sales,
        payment_method='cash'
    ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']
    
    sales_card = SalePayment.objects.filter(
        sale__in=sales,
        payment_method__in=['debit', 'credit_card']
    ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']
    
    sales_transfer = SalePayment.objects.filter(
        sale__in=sales,
        payment_method='transfer'
    ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']
    
    # Créditos internos (no es efectivo inmediato)
    sales_credit = SalePayment.objects.filter(
        sale__in=sales,
        payment_method='internal_credit'
    ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']
    
    # Pagos de créditos recibidos
    credit_payments = CreditPayment.objects.filter(
        credit__client__company=request.user.company,
        created_at__gte=start_date if start_date else timezone.now() - timedelta(days=30),
        created_at__lte=end_date if end_date else timezone.now()
    ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']
    
    # Movimientos de caja (ingresos y egresos)
    cash_movements = CashMovement.objects.filter(
        shift__company=request.user.company,
        created_at__gte=start_date if start_date else timezone.now() - timedelta(days=30),
        created_at__lte=end_date if end_date else timezone.now()
    )
    
    cash_income = cash_movements.filter(
        movement_type='income'
    ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']
    
    cash_expenses = cash_movements.filter(
        movement_type='expense'
    ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']
    
    # Devoluciones en efectivo
    refunded_sales = Sale.objects.filter(
        company=request.user.company,
        status='refunded'
    )
    
    if start_date:
        refunded_sales = refunded_sales.filter(sale_date__gte=start_date)
    if end_date:
        refunded_sales = refunded_sales.filter(sale_date__lte=end_date)
    
    refunds_amount = refunded_sales.aggregate(
        total=Coalesce(Sum('total'), Decimal('0'))
    )['total']
    
    # Calcular totales
    total_income = (
        sales_cash + sales_card + sales_transfer + 
        credit_payments + cash_income
    )
    
    total_expenses = cash_expenses + refunds_amount
    net_flow = total_income - total_expenses
    
    # Cálculo de IVA para proyecciones
    iva_breakdown = calculate_iva_breakdown(sales)
    
    # IVA a pagar (aproximado)
    iva_to_pay = Decimal(str(iva_breakdown['total_iva']))
    
    # Proyección después de IVA
    net_after_iva = net_flow - iva_to_pay
    
    return Response({
        'period': {
            'start_date': start_date,
            'end_date': end_date
        },
        'income': {
            'sales_cash': float(sales_cash),
            'sales_card': float(sales_card),
            'sales_transfer': float(sales_transfer),
            'sales_credit': float(sales_credit),
            'credit_payments': float(credit_payments),
            'other_income': float(cash_income),
            'total_income': float(total_income)
        },
        'expenses': {
            'cash_expenses': float(cash_expenses),
            'refunds': float(refunds_amount),
            'total_expenses': float(total_expenses)
        },
        'summary': {
            'net_cash_flow': float(net_flow),
            'estimated_iva': float(iva_to_pay),
            'projected_net_after_iva': float(net_after_iva)
        },
        'iva_details': iva_breakdown
    })


@api_view(['GET'])
def inventory_report(request):
    """
    Reporte de inventario
    Query params:
        - department_id: filtrar por departamento
        - low_stock: solo productos con stock bajo (true/false)
    """
    if not PermissionMiddleware.check_permission(request.user, 'reports', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    products = Product.objects.filter(
        company=request.user.company,
        is_active=True
    ).select_related('department', 'category')
    
    # Filtros
    department_id = request.GET.get('department_id')
    if department_id:
        products = products.filter(department_id=department_id)
    
    low_stock_only = request.GET.get('low_stock', 'false').lower() == 'true'
    if low_stock_only:
        products = products.filter(stock_units__lte=F('min_stock'))
    
    # Calcular valor total
    inventory_data = []
    total_value = Decimal('0')
    
    for product in products:
        item_value = product.stock_units * product.unit_price
        total_value += item_value
        
        inventory_data.append({
            'barcode': product.barcode,
            'name': product.name,
            'department': product.department.name,
            'category': product.category.name if product.category else None,
            'stock_units': float(product.stock_units),
            'min_stock': float(product.min_stock),
            'unit_price': float(product.unit_price),
            'total_value': float(item_value),
            'status': 'critical' if product.stock_units == 0 else 'low' if product.stock_units <= product.min_stock else 'optimal'
        })
    
    # Agrupar por departamento
    by_department = {}
    for item in inventory_data:
        dept = item['department']
        if dept not in by_department:
            by_department[dept] = {
                'products_count': 0,
                'total_value': 0
            }
        by_department[dept]['products_count'] += 1
        by_department[dept]['total_value'] += item['total_value']
    
    return Response({
        'summary': {
            'total_products': len(inventory_data),
            'total_inventory_value': float(total_value)
        },
        'by_department': by_department,
        'products': inventory_data
    })


@api_view(['GET'])
def credits_report(request):
    """
    Reporte de créditos activos
    """
    if not PermissionMiddleware.check_permission(request.user, 'reports', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    credits = Credit.objects.filter(
        client__company=request.user.company,
        status__in=['active', 'partial']
    ).select_related('client', 'sale')
    
    credits_data = []
    total_debt = Decimal('0')
    
    for credit in credits:
        # Última pago
        last_payment = credit.payments.order_by('-created_at').first()
        
        credits_data.append({
            'credit_id': str(credit.id),
            'client_rut': credit.client.rut,
            'client_name': f"{credit.client.first_name} {credit.client.last_name}",
            'client_phone': credit.client.phone,
            'client_address': credit.client.address,
            'sale_number': credit.sale.sale_number,
            'total_amount': float(credit.total_amount),
            'paid_amount': float(credit.paid_amount),
            'remaining_amount': float(credit.remaining_amount),
            'due_date': credit.due_date.isoformat() if credit.due_date else None,
            'last_payment_date': last_payment.created_at.isoformat() if last_payment else None,
            'last_payment_amount': float(last_payment.amount) if last_payment else 0
        })
        
        total_debt += credit.remaining_amount
    
    return Response({
        'summary': {
            'total_active_credits': len(credits_data),
            'total_debt': float(total_debt)
        },
        'credits': credits_data
    })


@api_view(['GET'])
def purchase_orders_report(request):
    """
    Reporte de órdenes de compra con IVA
    """
    if not PermissionMiddleware.check_permission(request.user, 'reports', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    
    orders = PurchaseOrder.objects.filter(
        company=request.user.company
    ).select_related('supplier')
    
    if start_date:
        orders = orders.filter(created_at__gte=start_date)
    if end_date:
        orders = orders.filter(created_at__lte=end_date)
    
    orders_data = []
    total_amount = Decimal('0')
    total_iva = Decimal('0')
    
    for order in orders:
        # Calcular IVA total de la orden
        order_iva = Decimal('0')
        order_subtotal = Decimal('0')
        
        for item in order.items.all():
            item_subtotal = item.quantity * item.unit_price
            item_iva = item_subtotal * (item.tax_rate / 100)
            
            order_subtotal += item_subtotal
            order_iva += item_iva
        
        order_total = order_subtotal + order_iva
        
        orders_data.append({
            'order_number': order.order_number,
            'supplier': order.supplier.name,
            'status': order.status,
            'subtotal': float(order_subtotal),
            'iva_amount': float(order_iva),
            'total': float(order_total),
            'paid_amount': float(order.paid_amount),
            'remaining': float(order_total - order.paid_amount),
            'created_at': order.created_at.isoformat()
        })
        
        total_amount += order_total
        total_iva += order_iva
    
    return Response({
        'summary': {
            'total_orders': len(orders_data),
            'total_amount': float(total_amount),
            'total_iva': float(total_iva),
            'subtotal': float(total_amount - total_iva)
        },
        'orders': orders_data
    })