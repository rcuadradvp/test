# project/api/views/stock_management_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import Product, StockAudit, Supplier, ProductSupplier
from api.serializers.ticket_serializers import (
    StockAuditSerializer,
    StockResetSerializer,
    BulkStockUpdateSerializer
)
from api.serializers.product_serializers import ProductListSerializer
from django.db import transaction
from django.db.models import F, Q
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
def reset_stock(request):
    """
    Reiniciar todo el stock a 0
    SOLO MASTER ADMIN
    Requiere confirmación explícita
    """
    # Verificar permisos
    if request.user.role.name != 'master_admin':
        return Response({
            'error': 'Solo el Master Admin puede reiniciar el stock'
        }, status=403)
    
    serializer = StockResetSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    
    reason = serializer.validated_data['reason']
    
    try:
        with transaction.atomic():
            company = request.user.company
            
            # Obtener todos los productos activos
            products = Product.objects.filter(
                company=company,
                is_active=True
            )
            
            # Guardar estado antes del cambio
            before_data = []
            for product in products:
                before_data.append({
                    'product_id': str(product.id),
                    'barcode': product.barcode,
                    'name': product.name,
                    'stock_units': float(product.stock_units)
                })
            
            # Reiniciar stock
            affected_count = products.update(stock_units=0)
            
            # Crear auditoría
            audit = StockAudit.objects.create(
                company=company,
                action_type='reset',
                description=f"Reinicio completo de stock. Razón: {reason}",
                affected_products_count=affected_count,
                before_data={'products': before_data},
                after_data={'stock_units': 0},
                performed_by=request.user,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                requires_approval=False,
                approved=True,
                approved_by=request.user
            )
            
            logger.warning(
                f"⚠️ STOCK REINICIADO: {affected_count} productos afectados. "
                f"Realizado por: {request.user.email}. Razón: {reason}"
            )
            
            return Response({
                'success': True,
                'message': f'Stock reiniciado exitosamente. {affected_count} productos afectados',
                'audit_id': str(audit.id),
                'affected_products': affected_count
            })
            
    except Exception as e:
        logger.error(f"Error al reiniciar stock: {str(e)}")
        return Response({
            'error': f'Error al reiniciar stock: {str(e)}'
        }, status=500)


@api_view(['POST'])
def bulk_update_stock(request):
    """
    Actualización masiva de stock
    Requiere permisos de edición de productos
    """
    if not request.user.role.name in ['master_admin', 'super_admin', 'admin']:
        return Response({'error': 'Sin permisos'}, status=403)
    
    serializer = BulkStockUpdateSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    
    updates = serializer.validated_data['updates']
    reason = serializer.validated_data['reason']
    
    try:
        with transaction.atomic():
            company = request.user.company
            
            before_data = []
            after_data = []
            updated_count = 0
            
            for update in updates:
                product_id = update['product_id']
                new_stock = Decimal(str(update['new_stock']))
                
                try:
                    product = Product.objects.select_for_update().get(
                        id=product_id,
                        company=company
                    )
                    
                    # Guardar estado anterior
                    before_data.append({
                        'product_id': str(product.id),
                        'barcode': product.barcode,
                        'name': product.name,
                        'old_stock': float(product.stock_units)
                    })
                    
                    # Actualizar stock
                    product.stock_units = new_stock
                    product.save()
                    
                    # Guardar estado después
                    after_data.append({
                        'product_id': str(product.id),
                        'barcode': product.barcode,
                        'name': product.name,
                        'new_stock': float(new_stock)
                    })
                    
                    updated_count += 1
                    
                except Product.DoesNotExist:
                    logger.warning(f"Producto {product_id} no encontrado en actualización masiva")
                    continue
            
            # Crear auditoría
            audit = StockAudit.objects.create(
                company=company,
                action_type='bulk_update',
                description=f"Actualización masiva de stock. Razón: {reason}",
                affected_products_count=updated_count,
                before_data={'products': before_data},
                after_data={'products': after_data},
                performed_by=request.user,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
            )
            
            logger.info(
                f"Actualización masiva de stock: {updated_count} productos. "
                f"Realizado por: {request.user.email}"
            )
            
            return Response({
                'success': True,
                'message': f'Stock actualizado exitosamente para {updated_count} productos',
                'audit_id': str(audit.id),
                'updated_products': updated_count
            })
            
    except Exception as e:
        logger.error(f"Error en actualización masiva: {str(e)}")
        return Response({
            'error': f'Error en actualización masiva: {str(e)}'
        }, status=500)


@api_view(['GET'])
def suggested_purchases(request):
    """
    Generar lista de compras sugeridas basada en stock mínimo
    Incluye información de proveedores
    """
    if not request.user.role.name in ['master_admin', 'super_admin', 'admin']:
        return Response({'error': 'Sin permisos'}, status=403)
    
    company = request.user.company
    
    # Productos con stock bajo o agotado
    products_low_stock = Product.objects.filter(
        company=company,
        is_active=True,
        stock_units__lte=F('min_stock')
    ).select_related('department', 'category').prefetch_related(
        'supplier_relations__supplier'
    ).order_by('department', 'name')
    
    # Calcular cantidad sugerida
    suggestions = []
    
    for product in products_low_stock:
        # Cantidad sugerida: reponer hasta el doble del mínimo
        current_stock = float(product.stock_units)
        min_stock = float(product.min_stock)
        suggested_quantity = max(0, (min_stock * 2) - current_stock)
        
        # Obtener proveedores
        suppliers_list = []
        primary_supplier = None
        
        for ps in product.supplier_relations.all():
            supplier_info = {
                'id': str(ps.supplier.id),
                'name': ps.supplier.name,
                'is_primary': ps.is_primary,
                'supplier_product_code': ps.supplier_product_code
            }
            suppliers_list.append(supplier_info)
            
            if ps.is_primary:
                primary_supplier = supplier_info
        
        # Calcular costo estimado
        estimated_cost = float(product.unit_price) * suggested_quantity
        
        suggestion = {
            'product_id': str(product.id),
            'barcode': product.barcode,
            'name': product.name,
            'department': product.department.name,
            'category': product.category.name if product.category else None,
            'current_stock': current_stock,
            'min_stock': min_stock,
            'suggested_quantity': suggested_quantity,
            'unit_price': float(product.unit_price),
            'estimated_cost': estimated_cost,
            'primary_supplier': primary_supplier,
            'all_suppliers': suppliers_list,
            'urgency': 'critical' if current_stock == 0 else 'high' if current_stock < (min_stock * 0.5) else 'medium'
        }
        
        suggestions.append(suggestion)
    
    # Agrupar por proveedor principal
    by_supplier = {}
    no_supplier = []
    
    for suggestion in suggestions:
        if suggestion['primary_supplier']:
            supplier_id = suggestion['primary_supplier']['id']
            supplier_name = suggestion['primary_supplier']['name']
            
            if supplier_id not in by_supplier:
                by_supplier[supplier_id] = {
                    'supplier_id': supplier_id,
                    'supplier_name': supplier_name,
                    'products': [],
                    'total_estimated_cost': 0
                }
            
            by_supplier[supplier_id]['products'].append(suggestion)
            by_supplier[supplier_id]['total_estimated_cost'] += suggestion['estimated_cost']
        else:
            no_supplier.append(suggestion)
    
    # Calcular totales
    total_products = len(suggestions)
    total_estimated_cost = sum(s['estimated_cost'] for s in suggestions)
    critical_count = len([s for s in suggestions if s['urgency'] == 'critical'])
    
    logger.info(
        f"Compras sugeridas generadas: {total_products} productos. "
        f"Usuario: {request.user.email}"
    )
    
    return Response({
        'summary': {
            'total_products': total_products,
            'critical_count': critical_count,
            'total_estimated_cost': total_estimated_cost,
            'suppliers_count': len(by_supplier)
        },
        'by_supplier': list(by_supplier.values()),
        'without_supplier': no_supplier,
        'all_suggestions': suggestions
    })


@api_view(['GET'])
def stock_audit_history(request):
    """
    Historial de auditorías de stock
    Query params:
        - action_type: reset, adjustment, bulk_update, import
        - start_date, end_date: filtros de fecha
        - limit: cantidad de resultados (default: 50)
    """
    if request.user.role.name not in ['master_admin', 'super_admin']:
        return Response({'error': 'Sin permisos'}, status=403)
    
    audits = StockAudit.objects.filter(
        company=request.user.company
    ).select_related('performed_by', 'approved_by').order_by('-performed_at')
    
    # Filtros
    action_type = request.GET.get('action_type')
    if action_type:
        audits = audits.filter(action_type=action_type)
    
    start_date = request.GET.get('start_date')
    if start_date:
        audits = audits.filter(performed_at__gte=start_date)
    
    end_date = request.GET.get('end_date')
    if end_date:
        audits = audits.filter(performed_at__lte=end_date)
    
    # Limitar resultados
    limit = int(request.GET.get('limit', 50))
    audits = audits[:limit]
    
    serializer = StockAuditSerializer(audits, many=True)
    
    return Response({
        'count': audits.count(),
        'audits': serializer.data
    })


@api_view(['GET'])
def stock_summary(request):
    """
    Resumen general del estado del stock
    """
    if not request.user.role.name in ['master_admin', 'super_admin', 'admin']:
        return Response({'error': 'Sin permisos'}, status=403)
    
    company = request.user.company
    
    # Productos totales
    total_products = Product.objects.filter(
        company=company,
        is_active=True
    ).count()
    
    # Productos con stock bajo
    low_stock = Product.objects.filter(
        company=company,
        is_active=True,
        stock_units__lte=F('min_stock'),
        stock_units__gt=0
    ).count()
    
    # Productos agotados
    out_of_stock = Product.objects.filter(
        company=company,
        is_active=True,
        stock_units=0
    ).count()
    
    # Productos con stock óptimo
    optimal_stock = Product.objects.filter(
        company=company,
        is_active=True,
        stock_units__gt=F('min_stock')
    ).count()
    
    # Valor total del inventario
    from django.db.models import Sum
    inventory_value = Product.objects.filter(
        company=company,
        is_active=True
    ).aggregate(
        total=Sum(F('stock_units') * F('unit_price'))
    )['total'] or 0
    
    return Response({
        'total_products': total_products,
        'low_stock': low_stock,
        'out_of_stock': out_of_stock,
        'optimal_stock': optimal_stock,
        'inventory_value': float(inventory_value),
        'stock_alerts': low_stock + out_of_stock
    })