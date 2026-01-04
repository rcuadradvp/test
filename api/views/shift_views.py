# api/views/shift_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import Shift, CashMovement, CashCount
from api.serializers.shift_serializer import (
    ShiftSerializer,
    ShiftListSerializer,
    OpenShiftSerializer,
    CloseShiftSerializer,
    CashMovementSerializer,
    CashCountSerializer,
    ShiftSummarySerializer
)
from api.middleware.permission_middleware import PermissionMiddleware
from api.utils.pagination import Paginator
from django.db.models import Sum, Q, F
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
def list_shifts(request):
    """
    Listar turnos con paginación
    
    Query Parameters:
        page (int): Número de página
        page_size (int): Items por página (default: 50)
        status (str): Filtrar por estado (open, closed)
        user_id (uuid): Filtrar por usuario
        start_date (date): Desde fecha
        end_date (date): Hasta fecha
    """
    if not PermissionMiddleware.check_permission(request.user, 'shifts', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Scope por rol
    if request.user.role.name == 'cashier':
        # Cajeros solo ven sus turnos
        shifts = Shift.objects.filter(user=request.user)
    else:
        # Admins ven todos los turnos de su empresa
        shifts = Shift.objects.filter(company=request.user.company)
    
    # Filtros
    shift_status = request.GET.get('status')
    if shift_status:
        shifts = shifts.filter(status=shift_status)
    
    user_id = request.GET.get('user_id')
    if user_id and request.user.role.name != 'cashier':
        shifts = shifts.filter(user_id=user_id)
    
    start_date = request.GET.get('start_date')
    if start_date:
        shifts = shifts.filter(opened_at__gte=start_date)
    
    end_date = request.GET.get('end_date')
    if end_date:
        shifts = shifts.filter(opened_at__lte=end_date)
    
    shifts = shifts.select_related('user', 'closed_by').order_by('-opened_at')
    
    # Paginación
    return Paginator.paginate_response(
        shifts,
        request,
        ShiftListSerializer,
        default_page_size=50,
        max_page_size=200
    )


@api_view(['GET'])
def get_shift(request, shift_id):
    """Obtener detalle de turno"""
    if not PermissionMiddleware.check_permission(request.user, 'shifts', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        if request.user.role.name == 'cashier':
            shift = Shift.objects.get(id=shift_id, user=request.user)
        else:
            shift = Shift.objects.get(id=shift_id, company=request.user.company)
    except Shift.DoesNotExist:
        return Response({'error': 'Turno no encontrado'}, status=404)
    
    serializer = ShiftSerializer(shift)
    return Response(serializer.data)


@api_view(['GET'])
def get_current_shift(request):
    """Obtener turno actual del usuario autenticado"""
    try:
        shift = Shift.objects.get(
            user=request.user,
            status='open'
        )
        serializer = ShiftSerializer(shift)
        return Response(serializer.data)
    except Shift.DoesNotExist:
        return Response({'error': 'No hay turno abierto'}, status=404)


@api_view(['POST'])
def open_shift(request):
    """
    Abrir turno de caja
    
    Body:
        opening_cash (decimal): Dinero inicial en caja
        opening_notes (str): Notas de apertura (opcional)
    """
    user = request.user
    
    # Verificar si hay turno abierto
    existing_shift = Shift.objects.filter(user=user, status='open').first()
    
    if existing_shift:
        return Response({
            'error': 'Ya tienes un turno abierto',
            'shift_id': str(existing_shift.id),
            'shift_number': existing_shift.shift_number,
            'opened_at': existing_shift.opened_at
        }, status=400)
    
    # Validar datos
    serializer = OpenShiftSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    
    validated_data = serializer.validated_data
    
    # Crear turno
    with transaction.atomic():
        # Generar número de turno
        company = user.company
        last_shift = Shift.objects.filter(company=company).order_by('-created_at').first()
        
        if last_shift and last_shift.shift_number:
            try:
                last_number = int(last_shift.shift_number.split('-')[-1])
                new_number = last_number + 1
            except:
                new_number = 1
        else:
            new_number = 1
        
        shift = Shift.objects.create(
            company=company,
            user=user,
            shift_number=f"TUR-{new_number:06d}",
            opening_cash=validated_data['opening_cash'],
            opening_notes=validated_data.get('opening_notes', ''),
            status='open'
        )
        
        logger.info(f"Turno abierto: {shift.shift_number} por {user.email}")
        
        serializer = ShiftSerializer(shift)
        return Response(serializer.data, status=201)


@api_view(['POST'])
def close_shift(request):
    """
    Cerrar turno de caja
    
    Body:
        shift_id (uuid): ID del turno
        closing_cash (decimal): Efectivo final
        closing_card (decimal): Total tarjetas
        closing_transfer (decimal): Total transferencias
        closing_notes (str): Notas de cierre (opcional)
    """
    # Validar datos
    serializer = CloseShiftSerializer(data=request.data, context={'request': request})
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    
    validated_data = serializer.validated_data
    
    try:
        shift = Shift.objects.get(id=validated_data['shift_id'])
    except Shift.DoesNotExist:
        return Response({'error': 'Turno no encontrado'}, status=404)
    
    if shift.status == 'closed':
        return Response({'error': 'El turno ya está cerrado'}, status=400)
    
    # Calcular montos esperados
    shift.calculate_expected_amounts()
    
    # Registrar montos de cierre
    shift.closing_cash = validated_data['closing_cash']
    shift.closing_card = validated_data.get('closing_card', Decimal('0'))
    shift.closing_transfer = validated_data.get('closing_transfer', Decimal('0'))
    shift.closing_total = shift.closing_cash + shift.closing_card + shift.closing_transfer
    
    # Calcular diferencias
    shift.cash_difference = shift.closing_cash - shift.expected_cash
    shift.card_difference = shift.closing_card - shift.expected_card
    shift.transfer_difference = shift.closing_transfer - shift.expected_transfer
    shift.total_difference = shift.closing_total - shift.expected_total
    
    # Cerrar turno
    shift.status = 'closed'
    shift.closed_at = timezone.now()
    shift.closed_by = request.user
    shift.closing_notes = validated_data.get('closing_notes', '')
    shift.save()
    
    logger.info(f"Turno cerrado: {shift.shift_number} por {request.user.email}")
    
    serializer = ShiftSerializer(shift)
    return Response(serializer.data)


@api_view(['POST'])
def start_lunch_break(request):
    """Iniciar pausa de almuerzo"""
    try:
        shift = Shift.objects.get(user=request.user, status='open')
    except Shift.DoesNotExist:
        return Response({'error': 'No hay turno abierto'}, status=404)
    
    if shift.lunch_break_start:
        return Response({'error': 'Ya iniciaste la pausa de almuerzo'}, status=400)
    
    shift.lunch_break_start = timezone.now()
    shift.save()
    
    logger.info(f"Pausa de almuerzo iniciada: {shift.shift_number}")
    
    return Response({
        'message': 'Pausa de almuerzo iniciada',
        'lunch_break_start': shift.lunch_break_start
    })


@api_view(['POST'])
def end_lunch_break(request):
    """Finalizar pausa de almuerzo"""
    try:
        shift = Shift.objects.get(user=request.user, status='open')
    except Shift.DoesNotExist:
        return Response({'error': 'No hay turno abierto'}, status=404)
    
    if not shift.lunch_break_start:
        return Response({'error': 'No has iniciado la pausa de almuerzo'}, status=400)
    
    if shift.lunch_break_end:
        return Response({'error': 'Ya finalizaste la pausa de almuerzo'}, status=400)
    
    shift.lunch_break_end = timezone.now()
    shift.save()
    
    logger.info(f"Pausa de almuerzo finalizada: {shift.shift_number}")
    
    return Response({
        'message': 'Pausa de almuerzo finalizada',
        'lunch_break_end': shift.lunch_break_end
    })


@api_view(['POST'])
def register_cash_movement(request):
    """
    Registrar entrada o salida de efectivo
    
    Body:
        movement_type (str): 'income' o 'expense'
        amount (decimal): Monto
        reason (str): Motivo
        notes (str): Notas adicionales (opcional)
    """
    try:
        shift = Shift.objects.get(user=request.user, status='open')
    except Shift.DoesNotExist:
        return Response({'error': 'No hay turno abierto'}, status=404)
    
    data = request.data.copy()
    data['shift'] = shift.id
    
    serializer = CashMovementSerializer(
        data=data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        movement = serializer.save()
        logger.info(
            f"Movimiento de caja: {movement.get_movement_type_display()} "
            f"${movement.amount} en {shift.shift_number}"
        )
        return Response(serializer.data, status=201)
    
    return Response(serializer.errors, status=400)


@api_view(['POST'])
def register_cash_count(request):
    """
    Registrar conteo de efectivo
    
    Body:
        count_20000, count_10000, count_5000, count_2000, count_1000,
        count_500, count_100, count_50, count_10 (int): Cantidad de billetes/monedas
        notes (str): Notas (opcional)
    """
    try:
        shift = Shift.objects.get(user=request.user, status='open')
    except Shift.DoesNotExist:
        return Response({'error': 'No hay turno abierto'}, status=404)
    
    data = request.data.copy()
    data['shift'] = shift.id
    
    serializer = CashCountSerializer(
        data=data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        count = serializer.save()
        logger.info(f"Conteo de caja registrado: ${count.total} en {shift.shift_number}")
        return Response(serializer.data, status=201)
    
    return Response(serializer.errors, status=400)


@api_view(['GET'])
def get_shift_summary(request, shift_id):
    """
    Obtener resumen completo del turno para corte de caja
    
    Incluye:
    - Información básica del turno
    - Total de ventas y cantidad
    - Ventas por método de pago
    - Movimientos de caja (entradas/salidas)
    - Pagos de créditos
    - Ventas por departamento
    - Comparativa esperado vs real
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
    
    # Calcular estadísticas
    from api.models import Sale, SalePayment, CreditPayment
    
    # Ventas del turno
    sales = Sale.objects.filter(shift=shift, status='completed')
    total_sales = sales.count()
    sales_amount = sales.aggregate(total=Sum('total'))['total'] or Decimal('0')
    
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
    
    # Movimientos de caja
    movements = CashMovement.objects.filter(shift=shift)
    cash_income = movements.filter(movement_type='income').aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    
    cash_expense = movements.filter(movement_type='expense').aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    
    # Pagos de créditos en el turno
    credit_payments = CreditPayment.objects.filter(shift=shift)
    credit_payments_total = credit_payments.aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    
    # Ventas por departamento
    from api.models import SaleItem
    sales_by_dept = SaleItem.objects.filter(
        sale__in=sales
    ).values(
        'product__department__name'
    ).annotate(
        total=Sum(F('quantity') * F('unit_price'))
    ).order_by('-total')
    
    summary = {
        'shift_number': shift.shift_number,
        'user_name': shift.user.username,
        'opened_at': shift.opened_at,
        'closed_at': shift.closed_at,
        
        # Ventas
        'total_sales': total_sales,
        'sales_amount': float(sales_amount),
        
        # Por método de pago
        'cash_sales': float(cash_sales),
        'card_sales': float(card_sales),
        'transfer_sales': float(transfer_sales),
        
        # Movimientos
        'cash_income': float(cash_income),
        'cash_expense': float(cash_expense),
        
        # Pagos de créditos
        'credit_payments': float(credit_payments_total),
        
        # Esperado vs Real
        'expected_cash': float(shift.expected_cash),
        'closing_cash': float(shift.closing_cash) if shift.closing_cash else None,
        'cash_difference': float(shift.cash_difference),
        
        # Ventas por departamento
        'sales_by_department': [
            {
                'department': item['product__department__name'],
                'total': float(item['total'])
            }
            for item in sales_by_dept
        ]
    }
    
    serializer = ShiftSummarySerializer(data=summary)
    serializer.is_valid()
    
    return Response(serializer.validated_data)


@api_view(['POST'])
def force_close_previous_shift(request):
    """
    Forzar cierre de turno anterior sin cerrar
    (Usado cuando se pregunta si desea continuar o iniciar nuevo)
    """
    user = request.user
    
    try:
        previous_shift = Shift.objects.get(user=user, status='open')
    except Shift.DoesNotExist:
        return Response({'error': 'No hay turno anterior abierto'}, status=404)
    
    # Calcular montos esperados
    previous_shift.calculate_expected_amounts()
    
    # Cerrar automáticamente con valores esperados
    previous_shift.closing_cash = previous_shift.expected_cash
    previous_shift.closing_card = previous_shift.expected_card
    previous_shift.closing_transfer = previous_shift.expected_transfer
    previous_shift.closing_total = previous_shift.expected_total
    
    previous_shift.cash_difference = Decimal('0')
    previous_shift.card_difference = Decimal('0')
    previous_shift.transfer_difference = Decimal('0')
    previous_shift.total_difference = Decimal('0')
    
    previous_shift.status = 'closed'
    previous_shift.closed_at = timezone.now()
    previous_shift.closed_by = request.user
    previous_shift.closing_notes = 'CIERRE AUTOMÁTICO - Turno no cerrado correctamente'
    previous_shift.save()
    
    logger.warning(f"Turno cerrado forzadamente: {previous_shift.shift_number}")
    
    return Response({
        'message': 'Turno anterior cerrado automáticamente',
        'shift_number': previous_shift.shift_number
    })