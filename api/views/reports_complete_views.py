# api/views/reports_complete_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import (
    Product, Department, Sale, SaleItem, SalePayment,
    CashMovement, Shift, Credit, CreditPayment,
    PurchaseOrder, PurchaseOrderItem, Client
)
from api.middleware.permission_middleware import PermissionMiddleware
from api.utils.excel_handler import ExcelExporter
from django.db.models import Sum, Count, Q, F, DecimalField
from django.db.models.functions import Coalesce, TruncDate, TruncMonth
from django.utils import timezone
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


# ==========================================
# INVENTORY REPORTS
# ==========================================

@api_view(['GET'])
def inventory_report(request):
    """
    Reporte completo de inventario
    
    Query Parameters:
        department_id (uuid): Filtrar por departamento
        low_stock (bool): Solo productos con stock bajo
        format (str): 'json' o 'excel' (default: json)
    """
    if not PermissionMiddleware.check_permission(request.user, 'reports', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    products = Product.objects.filter(
        company=request.user.company,
        is_active=True
    ).select_related('department')
    
    # Filtros
    department_id = request.GET.get('department_id')
    if department_id:
        products = products.filter(department_id=department_id)
    
    low_stock = request.GET.get('low_stock')
    if low_stock and low_stock.lower() == 'true':
        products = products.filter(stock_units__lte=F('min_stock'))
    
    products = products.order_by('department__name', 'name')
    
    # Calcular totales
    total_products = products.count()
    total_stock_value = sum(
        float(p.stock_units * p.cost_price) for p in products
    )
    products_with_low_stock = products.filter(stock_units__lte=F('min_stock')).count()
    
    # Preparar datos
    inventory_data = []
    for product in products:
        stock_value = float(product.stock_units * product.cost_price)
        stock_status = 'BAJO' if product.stock_units <= product.min_stock else 'OK'
        
        inventory_data.append({
            'department': product.department.name,
            'barcode': product.barcode,
            'name': product.name,
            'stock_units': float(product.stock_units),
            'min_stock': float(product.min_stock),
            'unit_price': float(product.unit_price),
            'cost_price': float(product.cost_price),
            'stock_value': stock_value,
            'status': stock_status,
            'is_package': product.is_package,
            'units_per_package': product.units_per_package
        })
    
    # Formato de respuesta
    response_format = request.GET.get('format', 'json')
    
    if response_format == 'excel':
        # Exportar a Excel
        filename = f'inventario_{request.user.company.name}_{timezone.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        
        try:
            file_path = ExcelExporter.export_to_excel(
                data=inventory_data,
                filename=filename,
                sheet_name='Inventario'
            )
            
            with open(file_path, 'rb') as f:
                response = Response(
                    f.read(),
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
        except Exception as e:
            logger.error(f"Error exportando inventario: {str(e)}")
            return Response({'error': 'Error al exportar'}, status=500)
    
    # Respuesta JSON
    return Response({
        'summary': {
            'total_products': total_products,
            'total_stock_value': total_stock_value,
            'products_with_low_stock': products_with_low_stock
        },
        'inventory': inventory_data
    })


@api_view(['GET'])
def inventory_by_department(request):
    """Reporte de inventario agrupado por departamento"""
    if not PermissionMiddleware.check_permission(request.user, 'reports', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    departments = Department.objects.filter(
        company=request.user.company,
        is_active=True
    ).prefetch_related('products')
    
    report_data = []
    
    for dept in departments:
        products = dept.products.filter(is_active=True)
        
        total_products = products.count()
        total_stock_value = sum(
            float(p.stock_units * p.cost_price) for p in products
        )
        low_stock_count = products.filter(stock_units__lte=F('min_stock')).count()
        
        report_data.append({
            'department_id': str(dept.id),
            'department_name': dept.name,
            'total_products': total_products,
            'total_stock_value': total_stock_value,
            'low_stock_products': low_stock_count
        })
    
    return Response({
        'report_date': timezone.now().isoformat(),
        'departments': report_data,
        'total_value': sum(d['total_stock_value'] for d in report_data)
    })


# ==========================================
# CASH MOVEMENT REPORTS
# ==========================================

@api_view(['GET'])
def cash_movements_report(request):
    """
    Reporte detallado de movimientos de caja
    
    Query Parameters:
        start_date (date): Desde fecha
        end_date (date): Hasta fecha
        movement_type (str): income o expense
        shift_id (uuid): Filtrar por turno
        user_id (uuid): Filtrar por usuario
    """
    if not PermissionMiddleware.check_permission(request.user, 'reports', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    movements = CashMovement.objects.filter(
        shift__company=request.user.company
    ).select_related('shift__user', 'created_by')
    
    # Filtros
    start_date = request.GET.get('start_date')
    if start_date:
        movements = movements.filter(created_at__gte=start_date)
    
    end_date = request.GET.get('end_date')
    if end_date:
        movements = movements.filter(created_at__lte=end_date)
    
    movement_type = request.GET.get('movement_type')
    if movement_type:
        movements = movements.filter(movement_type=movement_type)
    
    shift_id = request.GET.get('shift_id')
    if shift_id:
        movements = movements.filter(shift_id=shift_id)
    
    user_id = request.GET.get('user_id')
    if user_id:
        movements = movements.filter(created_by_id=user_id)
    
    movements = movements.order_by('-created_at')
    
    # Calcular totales
    total_income = movements.filter(movement_type='income').aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    
    total_expense = movements.filter(movement_type='expense').aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    
    net_movement = total_income - total_expense
    
    # Preparar datos
    movements_data = [
        {
            'id': str(m.id),
            'date': m.created_at.isoformat(),
            'shift_number': m.shift.shift_number,
            'user': m.created_by.username,
            'movement_type': m.movement_type,
            'movement_type_display': m.get_movement_type_display(),
            'amount': float(m.amount),
            'reason': m.reason,
            'notes': m.notes
        }
        for m in movements
    ]
    
    return Response({
        'summary': {
            'total_income': float(total_income),
            'total_expense': float(total_expense),
            'net_movement': float(net_movement),
            'total_movements': movements.count()
        },
        'movements': movements_data
    })


# ==========================================
# FINANCIAL PROJECTION REPORTS
# ==========================================

@api_view(['GET'])
def financial_projection_report(request):
    """
    Reporte de proyección de ingresos y egresos con IVA
    
    Query Parameters:
        start_date (date): Desde fecha (default: inicio del mes)
        end_date (date): Hasta fecha (default: hoy)
    """
    if not PermissionMiddleware.check_permission(request.user, 'reports', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Fechas
    today = timezone.now().date()
    start_date = request.GET.get('start_date')
    if not start_date:
        start_date = today.replace(day=1)
    
    end_date = request.GET.get('end_date', today)
    
    company = request.user.company
    
    # INGRESOS
    sales = Sale.objects.filter(
        company=company,
        status='completed',
        sale_date__gte=start_date,
        sale_date__lte=end_date
    )
    
    total_sales = sales.aggregate(total=Sum('total'))['total'] or Decimal('0')
    sales_subtotal = sales.aggregate(total=Sum('subtotal'))['total'] or Decimal('0')
    sales_tax = sales.aggregate(total=Sum('tax_amount'))['total'] or Decimal('0')
    
    # Ventas por método de pago
    payments = SalePayment.objects.filter(sale__in=sales)
    
    cash_sales = payments.filter(payment_method='cash').aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    
    card_sales = payments.filter(payment_method__in=['debit', 'credit_card']).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    
    transfer_sales = payments.filter(payment_method='transfer').aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    
    credit_sales = payments.filter(payment_method='internal_credit').aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    
    # Entradas y salidas de efectivo
    movements = CashMovement.objects.filter(
        shift__company=company,
        created_at__gte=start_date,
        created_at__lte=end_date
    )
    
    cash_income = movements.filter(movement_type='income').aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    
    cash_expense = movements.filter(movement_type='expense').aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    
    # Pagos de créditos
    credit_payments = CreditPayment.objects.filter(
        credit__client__company=company,
        created_at__gte=start_date,
        created_at__lte=end_date
    )
    
    total_credit_payments = credit_payments.aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    
    # Devoluciones en efectivo
    cash_returns = movements.filter(
        movement_type='expense',
        reason__icontains='devolución'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    # EGRESOS
    # Compras a proveedores (con IVA)
    purchases = PurchaseOrder.objects.filter(
        company=company,
        created_at__gte=start_date,
        created_at__lte=end_date,
        status__in=['completed', 'paid']
    )
    
    total_purchases = purchases.aggregate(total=Sum('total'))['total'] or Decimal('0')
    purchases_subtotal = purchases.aggregate(total=Sum('subtotal'))['total'] or Decimal('0')
    purchases_tax = purchases.aggregate(total=Sum('tax_amount'))['total'] or Decimal('0')
    
    # Ventas por departamento
    sales_by_dept = SaleItem.objects.filter(
        sale__in=sales,
        product__isnull=False
    ).values(
        'product__department__name'
    ).annotate(
        total=Sum(F('quantity') * F('unit_price'))
    ).order_by('-total')
    
    dept_breakdown = [
        {
            'department': item['product__department__name'],
            'total': float(item['total'])
        }
        for item in sales_by_dept
    ]
    
    # Cálculo final
    total_income = (
        total_sales + 
        cash_income + 
        total_credit_payments
    )
    
    total_expense = (
        total_purchases + 
        cash_expense + 
        cash_returns
    )
    
    net_result = total_income - total_expense
    
    return Response({
        'period': {
            'start_date': str(start_date),
            'end_date': str(end_date)
        },
        'income': {
            'total_sales': float(total_sales),
            'sales_subtotal': float(sales_subtotal),
            'sales_tax': float(sales_tax),
            'payment_methods': {
                'cash': float(cash_sales),
                'card': float(card_sales),
                'transfer': float(transfer_sales),
                'internal_credit': float(credit_sales)
            },
            'cash_income': float(cash_income),
            'credit_payments': float(total_credit_payments),
            'total': float(total_income)
        },
        'expenses': {
            'total_purchases': float(total_purchases),
            'purchases_subtotal': float(purchases_subtotal),
            'purchases_tax': float(purchases_tax),
            'cash_expense': float(cash_expense),
            'cash_returns': float(cash_returns),
            'total': float(total_expense)
        },
        'net_result': float(net_result),
        'sales_by_department': dept_breakdown
    })


# ==========================================
# PURCHASE ORDER REPORTS
# ==========================================

@api_view(['GET'])
def purchase_orders_report(request):
    """
    Reporte de órdenes de compra con IVA
    
    Query Parameters:
        start_date (date): Desde fecha
        end_date (date): Hasta fecha
        supplier_id (uuid): Filtrar por proveedor
        status (str): Filtrar por estado
    """
    if not PermissionMiddleware.check_permission(request.user, 'reports', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    orders = PurchaseOrder.objects.filter(
        company=request.user.company
    ).select_related('supplier', 'created_by')
    
    # Filtros
    start_date = request.GET.get('start_date')
    if start_date:
        orders = orders.filter(created_at__gte=start_date)
    
    end_date = request.GET.get('end_date')
    if end_date:
        orders = orders.filter(created_at__lte=end_date)
    
    supplier_id = request.GET.get('supplier_id')
    if supplier_id:
        orders = orders.filter(supplier_id=supplier_id)
    
    order_status = request.GET.get('status')
    if order_status:
        orders = orders.filter(status=order_status)
    
    orders = orders.order_by('-created_at')
    
    # Calcular totales
    total_orders = orders.count()
    
    total_subtotal = orders.aggregate(total=Sum('subtotal'))['total'] or Decimal('0')
    total_tax = orders.aggregate(total=Sum('tax_amount'))['total'] or Decimal('0')
    total_amount = orders.aggregate(total=Sum('total'))['total'] or Decimal('0')
    total_paid = orders.aggregate(total=Sum('paid_amount'))['total'] or Decimal('0')
    total_pending = total_amount - total_paid
    
    # Preparar datos detallados
    orders_data = []
    for order in orders:
        # Items de la orden con IVA
        items_data = []
        for item in order.items.all():
            items_data.append({
                'product_name': item.product_name,
                'quantity': float(item.quantity),
                'unit_price': float(item.unit_price),
                'subtotal': float(item.subtotal),
                'tax_rate': float(item.tax_rate),
                'tax_amount': float(item.tax_amount),
                'total': float(item.total)
            })
        
        orders_data.append({
            'order_number': order.order_number,
            'supplier': order.supplier.name,
            'order_date': order.order_date.isoformat(),
            'subtotal': float(order.subtotal),
            'tax_amount': float(order.tax_amount),
            'total': float(order.total),
            'paid_amount': float(order.paid_amount),
            'pending_amount': float(order.total - order.paid_amount),
            'status': order.get_status_display(),
            'created_by': order.created_by.username,
            'items': items_data
        })
    
    return Response({
        'summary': {
            'total_orders': total_orders,
            'subtotal': float(total_subtotal),
            'tax': float(total_tax),
            'total': float(total_amount),
            'paid': float(total_paid),
            'pending': float(total_pending)
        },
        'orders': orders_data
    })


# ==========================================
# SHIFT SUMMARY (CORTE DE CAJA)
# ==========================================

@api_view(['GET'])
def shift_closing_report(request, shift_id):
    """
    Corte de caja completo para un turno
    Incluye todos los detalles para impresión
    """
    if not PermissionMiddleware.check_permission(request.user, 'shifts', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        if request.user.role.name == 'cashier':
            shift = Shift.objects.get(id=shift_id, user=request.user)
        else:
            shift = Shift.objects.get(id=shift_id, company=request.user.company)
    except Shift.DoesNotExist:
        return Response({'error': 'Turno no encontrado'}, status=404)
    
    # Ventas
    sales = Sale.objects.filter(shift=shift, status='completed')
    total_sales = sales.count()
    sales_amount = sales.aggregate(total=Sum('total'))['total'] or Decimal('0')
    
    # Por método de pago
    payments = SalePayment.objects.filter(sale__in=sales)
    
    payment_breakdown = {}
    for method, display in SalePayment.PAYMENT_METHOD_CHOICES:
        amount = payments.filter(payment_method=method).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        payment_breakdown[method] = {
            'display': display,
            'amount': float(amount)
        }
    
    # Movimientos de caja
    movements = CashMovement.objects.filter(shift=shift)
    income = movements.filter(movement_type='income').aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    expense = movements.filter(movement_type='expense').aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    
    # Pagos de créditos
    credit_payments = CreditPayment.objects.filter(shift=shift)
    credit_total = credit_payments.aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    
    # Ventas por departamento
    sales_by_dept = SaleItem.objects.filter(
        sale__in=sales,
        product__isnull=False
    ).values(
        'product__department__name'
    ).annotate(
        total=Sum(F('quantity') * F('unit_price'))
    ).order_by('-total')
    
    return Response({
        'shift': {
            'number': shift.shift_number,
            'user': shift.user.username,
            'opened_at': shift.opened_at.isoformat(),
            'closed_at': shift.closed_at.isoformat() if shift.closed_at else None,
            'status': shift.get_status_display()
        },
        'sales': {
            'count': total_sales,
            'total': float(sales_amount)
        },
        'payment_methods': payment_breakdown,
        'cash_movements': {
            'income': float(income),
            'expense': float(expense),
            'net': float(income - expense)
        },
        'credit_payments': float(credit_total),
        'cash_summary': {
            'opening': float(shift.opening_cash),
            'expected': float(shift.expected_cash),
            'closing': float(shift.closing_cash) if shift.closing_cash else None,
            'difference': float(shift.cash_difference)
        },
        'sales_by_department': [
            {
                'department': item['product__department__name'],
                'total': float(item['total'])
            }
            for item in sales_by_dept
        ]
    })