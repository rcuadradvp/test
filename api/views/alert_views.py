# api/views/alert_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import SystemAlert, UserAlert, User, Product, SupplierPayment
from api.serializers.payment_serializers import (
    SystemAlertSerializer,
    UserAlertSerializer,
    MarkAlertAsReadSerializer
)
from api.middleware.permission_middleware import PermissionMiddleware
from api.utils.pagination import Paginator
from django.db.models import Q
from django.db import transaction
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
def list_user_alerts(request):
    """
    Listar alertas del usuario actual
    
    Query Parameters:
        page (int): Número de página
        page_size (int): Items por página (default: 50)
        is_read (bool): Filtrar por leídas/no leídas
        alert_type (str): Filtrar por tipo
    """
    user_alerts = UserAlert.objects.filter(
        user=request.user
    ).select_related('alert__product', 'alert__supplier_payment')
    
    # Filtros
    is_read = request.GET.get('is_read')
    if is_read is not None:
        user_alerts = user_alerts.filter(is_read=(is_read.lower() == 'true'))
    
    alert_type = request.GET.get('alert_type')
    if alert_type:
        user_alerts = user_alerts.filter(alert__alert_type=alert_type)
    
    user_alerts = user_alerts.order_by('-created_at')
    
    return Paginator.paginate_response(
        user_alerts,
        request,
        UserAlertSerializer,
        default_page_size=50,
        max_page_size=200
    )


@api_view(['GET'])
def get_unread_alerts_count(request):
    """Obtener contador de alertas no leídas"""
    count = UserAlert.objects.filter(
        user=request.user,
        is_read=False
    ).count()
    
    return Response({
        'unread_count': count,
        'has_unread': count > 0
    })


@api_view(['GET'])
def get_alert(request, alert_id):
    """Obtener detalle de alerta"""
    try:
        user_alert = UserAlert.objects.select_related(
            'alert__product',
            'alert__supplier_payment__purchase_order__supplier'
        ).get(
            id=alert_id,
            user=request.user
        )
    except UserAlert.DoesNotExist:
        return Response({'error': 'Alerta no encontrada'}, status=404)
    
    serializer = UserAlertSerializer(user_alert)
    return Response(serializer.data)


@api_view(['POST'])
def mark_alert_as_read(request, alert_id):
    """Marcar alerta como leída"""
    try:
        user_alert = UserAlert.objects.get(
            id=alert_id,
            user=request.user
        )
    except UserAlert.DoesNotExist:
        return Response({'error': 'Alerta no encontrada'}, status=404)
    
    if not user_alert.is_read:
        user_alert.is_read = True
        user_alert.read_at = timezone.now()
        user_alert.save()
        
        logger.info(f"Alerta marcada como leída: {alert_id} por {request.user.email}")
    
    serializer = UserAlertSerializer(user_alert)
    return Response(serializer.data)


@api_view(['POST'])
def mark_alerts_as_read(request):
    """
    Marcar múltiples alertas como leídas
    
    Body:
        alert_ids (list): Lista de IDs de alertas
    """
    serializer = MarkAlertAsReadSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    
    alert_ids = serializer.validated_data['alert_ids']
    
    # Actualizar alertas
    updated = UserAlert.objects.filter(
        id__in=alert_ids,
        user=request.user,
        is_read=False
    ).update(
        is_read=True,
        read_at=timezone.now()
    )
    
    logger.info(f"{updated} alertas marcadas como leídas por {request.user.email}")
    
    return Response({
        'message': f'{updated} alerta(s) marcada(s) como leída(s)',
        'updated_count': updated
    })


@api_view(['POST'])
def mark_all_as_read(request):
    """Marcar todas las alertas como leídas"""
    updated = UserAlert.objects.filter(
        user=request.user,
        is_read=False
    ).update(
        is_read=True,
        read_at=timezone.now()
    )
    
    logger.info(f"Todas las alertas marcadas como leídas por {request.user.email}")
    
    return Response({
        'message': f'{updated} alerta(s) marcada(s) como leída(s)',
        'updated_count': updated
    })


@api_view(['DELETE'])
def delete_alert(request, alert_id):
    """Eliminar alerta del usuario"""
    try:
        user_alert = UserAlert.objects.get(
            id=alert_id,
            user=request.user
        )
    except UserAlert.DoesNotExist:
        return Response({'error': 'Alerta no encontrada'}, status=404)
    
    user_alert.delete()
    
    return Response({'message': 'Alerta eliminada exitosamente'}, status=200)


# ==========================================
# SYSTEM ALERTS (Admin only)
# ==========================================

@api_view(['GET'])
def list_system_alerts(request):
    """
    Listar alertas del sistema (solo administradores)
    
    Query Parameters:
        page (int): Número de página
        status (str): Filtrar por estado (unread, read, dismissed)
        alert_type (str): Filtrar por tipo
    """
    if not PermissionMiddleware.check_permission(request.user, 'alerts', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    alerts = SystemAlert.objects.filter(
        company=request.user.company
    ).select_related('product', 'supplier_payment')
    
    # Filtros
    alert_status = request.GET.get('status')
    if alert_status:
        alerts = alerts.filter(status=alert_status)
    
    alert_type = request.GET.get('alert_type')
    if alert_type:
        alerts = alerts.filter(alert_type=alert_type)
    
    alerts = alerts.order_by('-created_at')
    
    return Paginator.paginate_response(
        alerts,
        request,
        SystemAlertSerializer,
        default_page_size=50,
        max_page_size=200
    )


@api_view(['POST'])
def create_manual_alert(request):
    """
    Crear alerta manual (solo administradores)
    
    Body:
        alert_type (str): Tipo de alerta
        title (str): Título
        message (str): Mensaje
        target_users (list): IDs de usuarios destinatarios (opcional, si no se envía va a todos los admins)
    """
    if not PermissionMiddleware.check_permission(request.user, 'alerts', 'create'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    data = request.data
    target_user_ids = data.pop('target_users', None)
    
    # Crear alerta del sistema
    data['company'] = request.user.company.id
    data['alert_type'] = data.get('alert_type', 'system')
    
    system_serializer = SystemAlertSerializer(data=data)
    
    if not system_serializer.is_valid():
        return Response(system_serializer.errors, status=400)
    
    with transaction.atomic():
        system_alert = system_serializer.save()
        
        # Determinar usuarios destinatarios
        if target_user_ids:
            users = User.objects.filter(
                id__in=target_user_ids,
                company=request.user.company,
                is_active=True
            )
        else:
            # Por defecto: todos los administradores y administradores maestros
            users = User.objects.filter(
                company=request.user.company,
                role__name__in=['admin', 'master_admin'],
                is_active=True
            )
        
        # Crear alertas de usuario
        user_alerts = [
            UserAlert(user=user, alert=system_alert)
            for user in users
        ]
        UserAlert.objects.bulk_create(user_alerts)
        
        logger.info(
            f"Alerta manual creada: {system_alert.title} "
            f"para {len(user_alerts)} usuarios"
        )
        
        return Response({
            'message': f'Alerta creada y enviada a {len(user_alerts)} usuario(s)',
            'alert': system_serializer.data,
            'recipients_count': len(user_alerts)
        }, status=201)


# ==========================================
# AUTOMATIC ALERT CREATION
# ==========================================

def create_low_stock_alert(product):
    """
    Crear alerta de stock bajo para un producto
    Esta función se llama automáticamente cuando el stock baja del mínimo
    """
    try:
        # Verificar si ya existe una alerta activa para este producto
        existing = SystemAlert.objects.filter(
            company=product.company,
            alert_type='low_stock',
            product=product,
            status='unread'
        ).exists()
        
        if existing:
            return  # Ya hay una alerta activa
        
        # Crear alerta del sistema
        system_alert = SystemAlert.objects.create(
            company=product.company,
            alert_type='low_stock',
            title=f'Stock bajo: {product.name}',
            message=f'El producto {product.name} (código: {product.barcode}) '
                   f'tiene stock bajo. Stock actual: {product.stock_units}, '
                   f'mínimo: {product.min_stock}',
            product=product,
            status='unread'
        )
        
        # Enviar a administradores
        admins = User.objects.filter(
            company=product.company,
            role__name__in=['admin', 'master_admin'],
            is_active=True
        )
        
        user_alerts = [
            UserAlert(user=admin, alert=system_alert)
            for admin in admins
        ]
        UserAlert.objects.bulk_create(user_alerts)
        
        logger.info(f"Alerta de stock bajo creada para: {product.name}")
        
    except Exception as e:
        logger.error(f"Error creando alerta de stock bajo: {str(e)}")


def create_supplier_payment_alert(supplier_payment):
    """
    Crear alerta de pago a proveedor
    Esta función se llama automáticamente cuando se registra un pago
    """
    try:
        supplier = supplier_payment.purchase_order.supplier
        
        # Crear alerta del sistema
        system_alert = SystemAlert.objects.create(
            company=supplier_payment.purchase_order.company,
            alert_type='supplier_payment',
            title=f'Pago registrado a proveedor: {supplier.name}',
            message=f'Se ha registrado un pago de ${supplier_payment.amount:,.0f} '
                   f'al proveedor {supplier.name} para la orden {supplier_payment.purchase_order.order_number}. '
                   f'Método: {supplier_payment.get_payment_method_display()}',
            supplier_payment=supplier_payment,
            status='unread'
        )
        
        # Enviar a administradores y master admins
        admins = User.objects.filter(
            company=supplier_payment.purchase_order.company,
            role__name__in=['admin', 'master_admin'],
            is_active=True
        )
        
        user_alerts = [
            UserAlert(user=admin, alert=system_alert)
            for admin in admins
        ]
        UserAlert.objects.bulk_create(user_alerts)
        
        logger.info(f"Alerta de pago a proveedor creada: {supplier.name}")
        
    except Exception as e:
        logger.error(f"Error creando alerta de pago a proveedor: {str(e)}")


@api_view(['POST'])
def check_and_create_low_stock_alerts(request):
    """
    Verificar productos con stock bajo y crear alertas
    (Puede ejecutarse manualmente o como tarea programada)
    """
    if not PermissionMiddleware.check_permission(request.user, 'alerts', 'create'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Buscar productos con stock bajo sin alertas activas
    from django.db.models import F
    
    low_stock_products = Product.objects.filter(
        company=request.user.company,
        is_active=True,
        stock_units__lte=F('min_stock')
    ).exclude(
        id__in=SystemAlert.objects.filter(
            company=request.user.company,
            alert_type='low_stock',
            status='unread'
        ).values_list('product_id', flat=True)
    )
    
    created_count = 0
    for product in low_stock_products:
        create_low_stock_alert(product)
        created_count += 1
    
    return Response({
        'message': f'{created_count} alerta(s) de stock bajo creada(s)',
        'created_count': created_count
    })


@api_view(['GET'])
def alert_statistics(request):
    """
    Obtener estadísticas de alertas (solo administradores)
    """
    if not PermissionMiddleware.check_permission(request.user, 'alerts', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    company = request.user.company
    
    # Alertas del sistema por tipo
    system_alerts = SystemAlert.objects.filter(company=company)
    
    by_type = {}
    for alert_type, display in SystemAlert.ALERT_TYPE_CHOICES:
        count = system_alerts.filter(alert_type=alert_type).count()
        unread = system_alerts.filter(alert_type=alert_type, status='unread').count()
        by_type[alert_type] = {
            'display': display,
            'total': count,
            'unread': unread
        }
    
    # Alertas de usuario
    user_alerts = UserAlert.objects.filter(user=request.user)
    total_user_alerts = user_alerts.count()
    unread_user_alerts = user_alerts.filter(is_read=False).count()
    
    return Response({
        'system_alerts_by_type': by_type,
        'user_alerts': {
            'total': total_user_alerts,
            'unread': unread_user_alerts,
            'read': total_user_alerts - unread_user_alerts
        }
    })