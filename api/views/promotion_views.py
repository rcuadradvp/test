# api/views/promotion_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import Promotion, PromotionProduct, Product
from api.serializers.product_serializers import PromotionSerializer
from api.middleware.permission_middleware import PermissionMiddleware
from api.utils.excel_handler import ExcelExporter
from api.utils.pagination import Paginator
from django.db.models import Q
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
def list_promotions(request):
    """
    Listar promociones con paginación
    
    Query Parameters:
        page (int): Número de página
        page_size (int): Items por página (default: 50)
        is_active (bool): Filtrar por activas/inactivas
        promotion_type (str): Filtrar por tipo
        current (bool): Solo promociones vigentes
    """
    if not PermissionMiddleware.check_permission(request.user, 'promotions', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    promotions = Promotion.objects.filter(
        company=request.user.company
    ).prefetch_related('products__product')
    
    # Filtros
    is_active = request.GET.get('is_active')
    if is_active is not None:
        promotions = promotions.filter(is_active=(is_active.lower() == 'true'))
    
    promotion_type = request.GET.get('promotion_type')
    if promotion_type:
        promotions = promotions.filter(promotion_type=promotion_type)
    
    # Solo promociones vigentes (dentro del rango de fechas)
    current = request.GET.get('current')
    if current and current.lower() == 'true':
        now = timezone.now()
        promotions = promotions.filter(
            is_active=True,
            start_date__lte=now,
            end_date__gte=now
        )
    
    promotions = promotions.order_by('-created_at')
    
    return Paginator.paginate_response(
        promotions,
        request,
        PromotionSerializer,
        default_page_size=50,
        max_page_size=200
    )


@api_view(['GET'])
def get_promotion(request, promotion_id):
    """Obtener detalle de promoción"""
    if not PermissionMiddleware.check_permission(request.user, 'promotions', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        promotion = Promotion.objects.prefetch_related(
            'products__product'
        ).get(
            id=promotion_id,
            company=request.user.company
        )
    except Promotion.DoesNotExist:
        return Response({'error': 'Promoción no encontrada'}, status=404)
    
    serializer = PromotionSerializer(promotion)
    return Response(serializer.data)


@api_view(['POST'])
def create_promotion(request):
    """
    Crear promoción
    
    Body:
        name (str): Nombre de la promoción
        description (str): Descripción
        promotion_type (str): Tipo (quantity_discount, free_units, percentage, fixed_price)
        start_date (datetime): Fecha de inicio
        end_date (datetime): Fecha de fin
        product_ids (list): IDs de productos incluidos
        
        # Según el tipo:
        # quantity_discount:
        min_quantity (int): Cantidad mínima
        discount_percentage (decimal): Porcentaje de descuento
        
        # free_units (2x1, 3x2):
        buy_quantity (int): Cantidad a comprar
        free_quantity (int): Cantidad gratis
        
        # percentage:
        discount_percentage (decimal): Porcentaje de descuento
        
        # fixed_price:
        fixed_price (decimal): Precio fijo
    """
    if not PermissionMiddleware.check_permission(request.user, 'promotions', 'create'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    data = request.data.copy()
    product_ids = data.pop('product_ids', [])
    
    if not product_ids:
        return Response({
            'error': 'Debe seleccionar al menos un producto'
        }, status=400)
    
    # Validar fechas
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    
    if not start_date or not end_date:
        return Response({
            'error': 'Debe especificar fechas de inicio y fin'
        }, status=400)
    
    if end_date <= start_date:
        return Response({
            'error': 'La fecha de fin debe ser posterior a la fecha de inicio'
        }, status=400)
    
    # Validar campos según tipo de promoción
    promotion_type = data.get('promotion_type')
    
    if promotion_type == 'quantity_discount':
        if not data.get('min_quantity') or not data.get('discount_percentage'):
            return Response({
                'error': 'Debe especificar cantidad mínima y porcentaje de descuento'
            }, status=400)
    
    elif promotion_type == 'free_units':
        if not data.get('buy_quantity') or not data.get('free_quantity'):
            return Response({
                'error': 'Debe especificar cantidad a comprar y cantidad gratis'
            }, status=400)
    
    elif promotion_type == 'percentage':
        if not data.get('discount_percentage'):
            return Response({
                'error': 'Debe especificar porcentaje de descuento'
            }, status=400)
    
    elif promotion_type == 'fixed_price':
        if not data.get('fixed_price'):
            return Response({
                'error': 'Debe especificar precio fijo'
            }, status=400)
    
    with transaction.atomic():
        # Crear promoción
        data['company'] = request.user.company.id
        
        serializer = PromotionSerializer(data=data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        promotion = serializer.save()
        
        # Asociar productos
        for product_id in product_ids:
            try:
                product = Product.objects.get(
                    id=product_id,
                    company=request.user.company
                )
                PromotionProduct.objects.create(
                    promotion=promotion,
                    product=product
                )
            except Product.DoesNotExist:
                # Revertir transacción si un producto no existe
                return Response({
                    'error': f'Producto no encontrado: {product_id}'
                }, status=404)
        
        logger.info(f"Promoción creada: {promotion.name} por {request.user.email}")
        
        # Recargar con productos
        promotion = Promotion.objects.prefetch_related('products__product').get(id=promotion.id)
        serializer = PromotionSerializer(promotion)
        
        return Response(serializer.data, status=201)


@api_view(['PUT', 'PATCH'])
def update_promotion(request, promotion_id):
    """Actualizar promoción"""
    if not PermissionMiddleware.check_permission(request.user, 'promotions', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        promotion = Promotion.objects.get(
            id=promotion_id,
            company=request.user.company
        )
    except Promotion.DoesNotExist:
        return Response({'error': 'Promoción no encontrada'}, status=404)
    
    data = request.data.copy()
    product_ids = data.pop('product_ids', None)
    
    # Validar fechas si se proporcionan
    start_date = data.get('start_date', promotion.start_date)
    end_date = data.get('end_date', promotion.end_date)
    
    if end_date <= start_date:
        return Response({
            'error': 'La fecha de fin debe ser posterior a la fecha de inicio'
        }, status=400)
    
    with transaction.atomic():
        serializer = PromotionSerializer(
            promotion,
            data=data,
            partial=(request.method == 'PATCH')
        )
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        promotion = serializer.save()
        
        # Actualizar productos si se proporcionan
        if product_ids is not None:
            # Eliminar asociaciones actuales
            PromotionProduct.objects.filter(promotion=promotion).delete()
            
            # Crear nuevas asociaciones
            for product_id in product_ids:
                try:
                    product = Product.objects.get(
                        id=product_id,
                        company=request.user.company
                    )
                    PromotionProduct.objects.create(
                        promotion=promotion,
                        product=product
                    )
                except Product.DoesNotExist:
                    return Response({
                        'error': f'Producto no encontrado: {product_id}'
                    }, status=404)
        
        logger.info(f"Promoción actualizada: {promotion.name} por {request.user.email}")
        
        # Recargar con productos
        promotion = Promotion.objects.prefetch_related('products__product').get(id=promotion.id)
        serializer = PromotionSerializer(promotion)
        
        return Response(serializer.data)


@api_view(['DELETE'])
def delete_promotion(request, promotion_id):
    """Eliminar promoción (soft delete - desactivar)"""
    if not PermissionMiddleware.check_permission(request.user, 'promotions', 'delete'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        promotion = Promotion.objects.get(
            id=promotion_id,
            company=request.user.company
        )
    except Promotion.DoesNotExist:
        return Response({'error': 'Promoción no encontrada'}, status=404)
    
    promotion.is_active = False
    promotion.save()
    
    logger.info(f"Promoción desactivada: {promotion.name} por {request.user.email}")
    
    return Response({'message': 'Promoción desactivada exitosamente'}, status=200)


@api_view(['POST'])
def activate_promotion(request, promotion_id):
    """Activar promoción"""
    if not PermissionMiddleware.check_permission(request.user, 'promotions', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        promotion = Promotion.objects.get(
            id=promotion_id,
            company=request.user.company
        )
    except Promotion.DoesNotExist:
        return Response({'error': 'Promoción no encontrada'}, status=404)
    
    # Validar que las fechas sean válidas
    now = timezone.now()
    
    if promotion.end_date < now:
        return Response({
            'error': 'No se puede activar una promoción vencida'
        }, status=400)
    
    promotion.is_active = True
    promotion.save()
    
    logger.info(f"Promoción activada: {promotion.name} por {request.user.email}")
    
    serializer = PromotionSerializer(promotion)
    return Response(serializer.data)


@api_view(['POST'])
def deactivate_promotion(request, promotion_id):
    """Desactivar promoción"""
    if not PermissionMiddleware.check_permission(request.user, 'promotions', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        promotion = Promotion.objects.get(
            id=promotion_id,
            company=request.user.company
        )
    except Promotion.DoesNotExist:
        return Response({'error': 'Promoción no encontrada'}, status=404)
    
    promotion.is_active = False
    promotion.save()
    
    logger.info(f"Promoción desactivada: {promotion.name} por {request.user.email}")
    
    serializer = PromotionSerializer(promotion)
    return Response(serializer.data)


@api_view(['GET'])
def get_active_promotions_for_product(request, product_id):
    """
    Obtener promociones activas para un producto específico
    Usado en el punto de venta para aplicar automáticamente
    """
    try:
        product = Product.objects.get(
            id=product_id,
            company=request.user.company,
            is_active=True
        )
    except Product.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=404)
    
    # Promociones vigentes para el producto
    now = timezone.now()
    
    promotions = Promotion.objects.filter(
        company=request.user.company,
        is_active=True,
        start_date__lte=now,
        end_date__gte=now,
        products__product=product
    ).distinct()
    
    serializer = PromotionSerializer(promotions, many=True)
    
    return Response({
        'product_id': str(product.id),
        'product_name': product.name,
        'active_promotions': serializer.data,
        'has_promotions': promotions.exists()
    })


@api_view(['POST'])
def calculate_promotion_price(request):
    """
    Calcular precio con promoción aplicada
    
    Body:
        product_id (uuid): ID del producto
        quantity (decimal): Cantidad a comprar
        promotion_id (uuid): ID de la promoción (opcional, si no se envía busca la mejor)
    """
    data = request.data
    
    try:
        product = Product.objects.get(
            id=data.get('product_id'),
            company=request.user.company,
            is_active=True
        )
    except Product.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=404)
    
    quantity = Decimal(str(data.get('quantity', 0)))
    
    if quantity <= 0:
        return Response({'error': 'Cantidad inválida'}, status=400)
    
    # Precio original
    original_price = product.unit_price * quantity
    
    # Buscar promoción
    promotion_id = data.get('promotion_id')
    
    if promotion_id:
        try:
            promotion = Promotion.objects.get(
                id=promotion_id,
                company=request.user.company,
                is_active=True
            )
        except Promotion.DoesNotExist:
            return Response({'error': 'Promoción no encontrada'}, status=404)
    else:
        # Buscar mejor promoción activa para el producto
        now = timezone.now()
        promotion = Promotion.objects.filter(
            company=request.user.company,
            is_active=True,
            start_date__lte=now,
            end_date__gte=now,
            products__product=product
        ).first()
    
    if not promotion:
        return Response({
            'product_id': str(product.id),
            'quantity': float(quantity),
            'original_price': float(original_price),
            'final_price': float(original_price),
            'discount': 0.0,
            'has_promotion': False
        })
    
    # Calcular precio según tipo de promoción
    final_price = original_price
    discount = Decimal('0')
    free_units = 0
    
    if promotion.promotion_type == 'quantity_discount':
        if quantity >= promotion.min_quantity:
            discount = original_price * (promotion.discount_percentage / 100)
            final_price = original_price - discount
    
    elif promotion.promotion_type == 'free_units':
        # Ejemplo: 2x1 (buy_quantity=2, free_quantity=1)
        sets = int(quantity // promotion.buy_quantity)
        free_units = sets * promotion.free_quantity
        charged_units = quantity - free_units
        final_price = product.unit_price * charged_units
        discount = original_price - final_price
    
    elif promotion.promotion_type == 'percentage':
        discount = original_price * (promotion.discount_percentage / 100)
        final_price = original_price - discount
    
    elif promotion.promotion_type == 'fixed_price':
        final_price = promotion.fixed_price * quantity
        discount = original_price - final_price
    
    return Response({
        'product_id': str(product.id),
        'quantity': float(quantity),
        'original_price': float(original_price),
        'final_price': float(final_price),
        'discount': float(discount),
        'free_units': free_units,
        'has_promotion': True,
        'promotion': {
            'id': str(promotion.id),
            'name': promotion.name,
            'type': promotion.promotion_type,
            'description': promotion.description
        }
    })


@api_view(['GET'])
def export_promotions(request):
    """Exportar promociones a Excel"""
    if not PermissionMiddleware.check_permission(request.user, 'promotions', 'export'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    promotions = Promotion.objects.filter(
        company=request.user.company
    ).prefetch_related('products__product').order_by('-created_at')
    
    # Preparar datos
    data = []
    for promo in promotions:
        products_count = promo.products.count()
        products_names = ', '.join([
            pp.product.name for pp in promo.products.all()[:5]
        ])
        if products_count > 5:
            products_names += f' ... (+{products_count - 5} más)'
        
        data.append({
            'Nombre': promo.name,
            'Descripción': promo.description or '',
            'Tipo': promo.get_promotion_type_display(),
            'Fecha Inicio': promo.start_date.strftime('%Y-%m-%d %H:%M'),
            'Fecha Fin': promo.end_date.strftime('%Y-%m-%d %H:%M'),
            'Activa': 'Sí' if promo.is_active else 'No',
            'Productos': products_names,
            'Cantidad Productos': products_count,
            'Descuento %': float(promo.discount_percentage) if promo.discount_percentage else '',
            'Cantidad Mínima': promo.min_quantity or '',
            'Comprar': promo.buy_quantity or '',
            'Gratis': promo.free_quantity or '',
            'Precio Fijo': float(promo.fixed_price) if promo.fixed_price else ''
        })
    
    filename = f'promociones_{request.user.company.name}_{timezone.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    
    try:
        file_path = ExcelExporter.export_to_excel(
            data=data,
            filename=filename,
            sheet_name='Promociones'
        )
        
        with open(file_path, 'rb') as f:
            response = Response(
                f.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
    
    except Exception as e:
        logger.error(f"Error exportando promociones: {str(e)}")
        return Response({'error': 'Error al exportar'}, status=500)