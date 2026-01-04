# api/views/credit_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import Credit, CreditPayment, Client, Shift
from api.serializers.credit_serializers import (
    CreditSerializer,
    CreditDetailSerializer,
    CreditListSerializer,
    CreditPaymentSerializer,
    PayCreditSerializer
)
from api.middleware.permission_middleware import PermissionMiddleware
from api.utils.excel_handler import ExcelExporter
from api.utils.pagination import Paginator
from django.db.models import Sum, Q, F
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
def list_credits(request):
    """
    Listar créditos con paginación
    
    Query Parameters:
        page (int): Número de página
        page_size (int): Items por página (default: 50)
        status (str): Filtrar por estado (pending, partial, paid, cancelled)
        client_id (uuid): Filtrar por cliente
        overdue (bool): Solo créditos vencidos
        start_date (date): Desde fecha de creación
        end_date (date): Hasta fecha de creación
    """
    if not PermissionMiddleware.check_permission(request.user, 'credits', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Scope por empresa
    credits = Credit.objects.filter(
        client__company=request.user.company
    ).select_related('client', 'sale')
    
    # Filtros
    credit_status = request.GET.get('status')
    if credit_status:
        credits = credits.filter(status=credit_status)
    
    client_id = request.GET.get('client_id')
    if client_id:
        credits = credits.filter(client_id=client_id)
    
    # Filtrar vencidos
    overdue = request.GET.get('overdue')
    if overdue and overdue.lower() == 'true':
        today = timezone.now().date()
        credits = credits.filter(
            Q(status='pending') | Q(status='partial'),
            due_date__lt=today
        )
    
    start_date = request.GET.get('start_date')
    if start_date:
        credits = credits.filter(created_at__gte=start_date)
    
    end_date = request.GET.get('end_date')
    if end_date:
        credits = credits.filter(created_at__lte=end_date)
    
    credits = credits.order_by('-created_at')
    
    return Paginator.paginate_response(
        credits,
        request,
        CreditListSerializer,
        default_page_size=50,
        max_page_size=200
    )


@api_view(['GET'])
def get_credit(request, credit_id):
    """Obtener detalle completo de crédito"""
    if not PermissionMiddleware.check_permission(request.user, 'credits', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        credit = Credit.objects.select_related(
            'client', 'sale'
        ).prefetch_related(
            'payments__registered_by', 'payments__shift'
        ).get(
            id=credit_id,
            client__company=request.user.company
        )
    except Credit.DoesNotExist:
        return Response({'error': 'Crédito no encontrado'}, status=404)
    
    serializer = CreditDetailSerializer(credit)
    return Response(serializer.data)


@api_view(['GET'])
def get_client_credits(request, client_id):
    """
    Obtener todos los créditos de un cliente
    
    Query Parameters:
        status (str): Filtrar por estado
    """
    if not PermissionMiddleware.check_permission(request.user, 'credits', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        client = Client.objects.get(
            id=client_id,
            company=request.user.company
        )
    except Client.DoesNotExist:
        return Response({'error': 'Cliente no encontrado'}, status=404)
    
    credits = Credit.objects.filter(client=client)
    
    # Filtro opcional por estado
    credit_status = request.GET.get('status')
    if credit_status:
        credits = credits.filter(status=credit_status)
    
    credits = credits.order_by('-created_at')
    
    serializer = CreditListSerializer(credits, many=True)
    
    return Response({
        'client': {
            'id': str(client.id),
            'name': f"{client.first_name} {client.last_name}",
            'rut': client.rut,
            'phone': client.phone,
            'credit_limit': float(client.credit_limit) if client.credit_limit else None,
            'current_debt': float(client.current_debt)
        },
        'credits': serializer.data,
        'total_debt': float(client.current_debt),
        'active_credits': credits.filter(status__in=['pending', 'partial']).count()
    })


@api_view(['POST'])
def pay_credit(request):
    """
    Pagar o abonar a un crédito
    
    Body:
        credit_id (uuid): ID del crédito
        amount (decimal): Monto a pagar
        payment_method (str): Método de pago
        notes (str): Notas adicionales (opcional)
    """
    if not PermissionMiddleware.check_permission(request.user, 'credits', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Verificar turno abierto (solo para cajeros)
    shift = None
    if request.user.role.name == 'cashier':
        try:
            shift = Shift.objects.get(user=request.user, status='open')
        except Shift.DoesNotExist:
            return Response({
                'error': 'Debes abrir un turno antes de registrar pagos'
            }, status=400)
    
    # Validar datos
    serializer = PayCreditSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    
    validated_data = serializer.validated_data
    
    try:
        credit = Credit.objects.select_for_update().get(
            id=validated_data['credit_id'],
            client__company=request.user.company
        )
    except Credit.DoesNotExist:
        return Response({'error': 'Crédito no encontrado'}, status=404)
    
    if credit.status == 'paid':
        return Response({'error': 'Este crédito ya está pagado'}, status=400)
    
    if credit.status == 'cancelled':
        return Response({'error': 'No se puede pagar un crédito cancelado'}, status=400)
    
    amount = validated_data['amount']
    
    # Validar que el monto no exceda la deuda
    if amount > credit.remaining_amount:
        return Response({
            'error': f'El monto excede la deuda restante (${credit.remaining_amount:,.0f})'
        }, status=400)
    
    with transaction.atomic():
        # Crear registro de pago
        payment = CreditPayment.objects.create(
            credit=credit,
            amount=amount,
            payment_method=validated_data['payment_method'],
            registered_by=request.user,
            shift=shift,
            notes=validated_data.get('notes', '')
        )
        
        # Actualizar crédito
        credit.paid_amount += amount
        credit.remaining_amount -= amount
        
        # Actualizar estado
        if credit.remaining_amount <= Decimal('0.01'):  # Tolerancia de 1 centavo
            credit.status = 'paid'
            credit.remaining_amount = Decimal('0')
        else:
            credit.status = 'partial'
        
        credit.save()
        
        # Actualizar deuda del cliente
        client = credit.client
        client.current_debt -= amount
        if client.current_debt < Decimal('0'):
            client.current_debt = Decimal('0')
        client.save()
        
        logger.info(
            f"Pago de crédito registrado: {client.first_name} {client.last_name} "
            f"- ${amount} por {request.user.email}"
        )
        
        # Preparar respuesta
        credit_serializer = CreditDetailSerializer(credit)
        payment_serializer = CreditPaymentSerializer(payment)
        
        return Response({
            'message': 'Pago registrado exitosamente',
            'payment': payment_serializer.data,
            'credit': credit_serializer.data,
            'remaining_debt': float(credit.remaining_amount)
        }, status=201)


@api_view(['GET'])
def list_credit_payments(request):
    """
    Listar pagos de créditos
    
    Query Parameters:
        page (int): Número de página
        credit_id (uuid): Filtrar por crédito
        client_id (uuid): Filtrar por cliente
        start_date (date): Desde fecha
        end_date (date): Hasta fecha
        payment_method (str): Filtrar por método de pago
    """
    if not PermissionMiddleware.check_permission(request.user, 'credits', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Scope por empresa
    payments = CreditPayment.objects.filter(
        credit__client__company=request.user.company
    ).select_related('credit__client', 'registered_by', 'shift')
    
    # Filtros
    credit_id = request.GET.get('credit_id')
    if credit_id:
        payments = payments.filter(credit_id=credit_id)
    
    client_id = request.GET.get('client_id')
    if client_id:
        payments = payments.filter(credit__client_id=client_id)
    
    start_date = request.GET.get('start_date')
    if start_date:
        payments = payments.filter(created_at__gte=start_date)
    
    end_date = request.GET.get('end_date')
    if end_date:
        payments = payments.filter(created_at__lte=end_date)
    
    payment_method = request.GET.get('payment_method')
    if payment_method:
        payments = payments.filter(payment_method=payment_method)
    
    payments = payments.order_by('-created_at')
    
    return Paginator.paginate_response(
        payments,
        request,
        CreditPaymentSerializer,
        default_page_size=50,
        max_page_size=200
    )


@api_view(['GET'])
def credits_summary(request):
    """
    Resumen general de créditos
    
    Incluye:
    - Total de créditos activos
    - Monto total adeudado
    - Créditos vencidos
    - Top clientes con mayor deuda
    """
    if not PermissionMiddleware.check_permission(request.user, 'credits', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    company = request.user.company
    today = timezone.now().date()
    
    # Créditos activos
    active_credits = Credit.objects.filter(
        client__company=company,
        status__in=['pending', 'partial']
    )
    
    total_active = active_credits.count()
    total_debt = active_credits.aggregate(
        total=Sum('remaining_amount')
    )['total'] or Decimal('0')
    
    # Créditos vencidos
    overdue_credits = active_credits.filter(due_date__lt=today)
    total_overdue = overdue_credits.count()
    overdue_debt = overdue_credits.aggregate(
        total=Sum('remaining_amount')
    )['total'] or Decimal('0')
    
    # Clientes con mayor deuda
    top_debtors = Client.objects.filter(
        company=company,
        current_debt__gt=0
    ).order_by('-current_debt')[:10]
    
    top_debtors_list = [
        {
            'client_id': str(client.id),
            'client_name': f"{client.first_name} {client.last_name}",
            'client_rut': client.rut,
            'client_phone': client.phone,
            'debt': float(client.current_debt),
            'credit_limit': float(client.credit_limit) if client.credit_limit else None
        }
        for client in top_debtors
    ]
    
    # Pagos del mes actual
    first_day_month = today.replace(day=1)
    payments_this_month = CreditPayment.objects.filter(
        credit__client__company=company,
        created_at__gte=first_day_month
    )
    
    total_collected = payments_this_month.aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    
    return Response({
        'total_active_credits': total_active,
        'total_debt': float(total_debt),
        'total_overdue_credits': total_overdue,
        'overdue_debt': float(overdue_debt),
        'collected_this_month': float(total_collected),
        'top_debtors': top_debtors_list
    })


@api_view(['GET'])
def export_credits(request):
    """Exportar créditos a Excel"""
    if not PermissionMiddleware.check_permission(request.user, 'credits', 'export'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Aplicar mismos filtros que en list
    credits = Credit.objects.filter(
        client__company=request.user.company
    ).select_related('client', 'sale')
    
    credit_status = request.GET.get('status')
    if credit_status:
        credits = credits.filter(status=credit_status)
    
    client_id = request.GET.get('client_id')
    if client_id:
        credits = credits.filter(client_id=client_id)
    
    overdue = request.GET.get('overdue')
    if overdue and overdue.lower() == 'true':
        today = timezone.now().date()
        credits = credits.filter(
            Q(status='pending') | Q(status='partial'),
            due_date__lt=today
        )
    
    credits = credits.order_by('-created_at')
    
    # Preparar datos
    data = []
    for credit in credits:
        client = credit.client
        
        # Calcular días de atraso
        days_overdue = 0
        if credit.status in ['pending', 'partial'] and credit.due_date:
            today = timezone.now().date()
            if today > credit.due_date:
                days_overdue = (today - credit.due_date).days
        
        data.append({
            'Cliente': f"{client.first_name} {client.last_name}",
            'RUT': client.rut,
            'Teléfono': client.phone or '',
            'Dirección': client.address or '',
            'Monto Total': float(credit.total_amount),
            'Monto Pagado': float(credit.paid_amount),
            'Saldo Pendiente': float(credit.remaining_amount),
            'Estado': credit.get_status_display(),
            'Fecha Crédito': credit.created_at.strftime('%Y-%m-%d'),
            'Fecha Vencimiento': credit.due_date.strftime('%Y-%m-%d') if credit.due_date else '',
            'Días Atraso': days_overdue,
            'Número Venta': credit.sale.sale_number if credit.sale else ''
        })
    
    filename = f'creditos_{request.user.company.name}_{timezone.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    
    try:
        file_path = ExcelExporter.export_to_excel(
            data=data,
            filename=filename,
            sheet_name='Créditos'
        )
        
        with open(file_path, 'rb') as f:
            response = Response(
                f.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
    
    except Exception as e:
        logger.error(f"Error exportando créditos: {str(e)}")
        return Response({'error': 'Error al exportar'}, status=500)


@api_view(['GET'])
def overdue_credits_report(request):
    """
    Reporte detallado de créditos vencidos
    
    Query Parameters:
        days_overdue (int): Mínimo de días vencidos (default: 1)
    """
    if not PermissionMiddleware.check_permission(request.user, 'credits', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    min_days = int(request.GET.get('days_overdue', 1))
    today = timezone.now().date()
    cutoff_date = today - timezone.timedelta(days=min_days)
    
    # Créditos vencidos
    overdue_credits = Credit.objects.filter(
        client__company=request.user.company,
        status__in=['pending', 'partial'],
        due_date__lte=cutoff_date
    ).select_related('client', 'sale').order_by('due_date')
    
    # Preparar datos detallados
    credits_data = []
    for credit in overdue_credits:
        days_overdue = (today - credit.due_date).days
        client = credit.client
        
        credits_data.append({
            'credit_id': str(credit.id),
            'client': {
                'id': str(client.id),
                'name': f"{client.first_name} {client.last_name}",
                'rut': client.rut,
                'phone': client.phone,
                'address': client.address
            },
            'total_amount': float(credit.total_amount),
            'paid_amount': float(credit.paid_amount),
            'remaining_amount': float(credit.remaining_amount),
            'due_date': credit.due_date.strftime('%Y-%m-%d'),
            'days_overdue': days_overdue,
            'created_at': credit.created_at.strftime('%Y-%m-%d'),
            'sale_number': credit.sale.sale_number if credit.sale else None
        })
    
    total_overdue_debt = sum(c['remaining_amount'] for c in credits_data)
    
    return Response({
        'total_credits': len(credits_data),
        'total_debt': total_overdue_debt,
        'min_days_overdue': min_days,
        'report_date': today.isoformat(),
        'credits': credits_data
    })