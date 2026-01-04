from rest_framework import serializers
from api.models import Sale, SaleItem, SalePayment, Product, Client, Promotion
from django.db import transaction
from decimal import Decimal

class SalePaymentSerializer(serializers.ModelSerializer):
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    
    class Meta:
        model = SalePayment
        fields = [
            'id', 'sale', 'payment_method', 'payment_method_display',
            'amount', 'reference_number', 'created_at'
        ]
        read_only_fields = ['id', 'sale', 'created_at']
    
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('El monto debe ser mayor a 0')
        return value


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_barcode = serializers.CharField(source='product.barcode', read_only=True)
    promotion_name = serializers.CharField(source='promotion.name', read_only=True, allow_null=True)
    
    class Meta:
        model = SaleItem
        fields = [
            'id', 'sale', 'product', 'product_name', 'product_barcode',
            'quantity', 'unit_price', 'subtotal', 'discount_amount',
            'tax_amount', 'total', 'promotion', 'promotion_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'sale', 'subtotal', 'discount_amount', 'tax_amount',
            'total', 'created_at', 'updated_at'
        ]
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('La cantidad debe ser mayor a 0')
        return value
    
    def validate(self, data):
        product = data.get('product')
        quantity = data.get('quantity')
        
        # Verificar stock si el producto lo requiere
        if product and product.track_inventory:
            if product.stock < quantity:
                raise serializers.ValidationError({
                    'quantity': f'Stock insuficiente. Disponible: {product.stock}'
                })
        
        # Usar precio del producto si no se especifica
        if 'unit_price' not in data or not data['unit_price']:
            data['unit_price'] = product.sale_price
        
        return data


class SaleSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    sale_type_display = serializers.CharField(source='get_sale_type_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True, allow_null=True)
    client_rut = serializers.CharField(source='client.rut', read_only=True, allow_null=True)
    shift_number = serializers.CharField(source='shift.shift_number', read_only=True, allow_null=True)
    
    items = SaleItemSerializer(many=True, required=False)
    payments = SalePaymentSerializer(many=True, required=False)
    
    class Meta:
        model = Sale
        fields = [
            'id', 'company', 'sale_number', 'invoice_number',
            'client', 'client_name', 'client_rut',
            'sale_type', 'sale_type_display',
            'subtotal', 'discount_amount', 'tax_amount', 'total',
            'status', 'status_display',
            'shift', 'shift_number',
            'sale_date', 'completed_at', 'cancelled_at',
            'notes', 'cancellation_reason',
            'created_by', 'created_by_name', 'cancelled_by',
            'created_at', 'updated_at',
            'items', 'payments'
        ]
        read_only_fields = [
            'id', 'company', 'sale_number', 'subtotal', 'discount_amount',
            'tax_amount', 'status', 'sale_date', 'completed_at',
            'cancelled_at', 'created_by', 'cancelled_by',
            'created_at', 'updated_at'
        ]
    
    def validate_client(self, value):
        # Si es venta a crédito, el cliente es obligatorio
        sale_type = self.initial_data.get('sale_type', 'regular')
        if sale_type == 'credit' and not value:
            raise serializers.ValidationError('El cliente es obligatorio para ventas a crédito')
        
        # Verificar límite de crédito
        if sale_type == 'credit' and value:
            if not value.unlimited_credit:
                total_pending = value.get_total_pending_credit()
                if total_pending >= value.credit_limit:
                    raise serializers.ValidationError(
                        f'El cliente ha alcanzado su límite de crédito'
                    )
        
        return value
    
    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        payments_data = validated_data.pop('payments', [])
        
        # Generar número de venta
        company = self.context['request'].user.company
        last_sale = Sale.objects.filter(company=company).order_by('-created_at').first()
        
        if last_sale and last_sale.sale_number:
            try:
                last_number = int(last_sale.sale_number.split('-')[-1])
                new_number = last_number + 1
            except:
                new_number = 1
        else:
            new_number = 1
        
        validated_data['sale_number'] = f"VEN-{new_number:06d}"
        validated_data['company'] = company
        validated_data['created_by'] = self.context['request'].user
        
        # Asignar turno activo del usuario
        active_shift = self.context['request'].user.shifts.filter(status='open').first()
        if active_shift:
            validated_data['shift'] = active_shift
        
        # Crear venta
        sale = Sale.objects.create(**validated_data)
        
        # Crear items
        for item_data in items_data:
            SaleItem.objects.create(sale=sale, **item_data)
        
        # Aplicar promociones
        sale.apply_promotions()
        
        # Recalcular totales
        sale.calculate_totals()
        sale.save()
        
        # Crear pagos
        for payment_data in payments_data:
            SalePayment.objects.create(sale=sale, **payment_data)
        
        # Validar que los pagos cubran el total si es venta regular
        if sale.sale_type == 'regular':
            total_paid = sum(p['amount'] for p in payments_data)
            if total_paid < sale.total:
                raise serializers.ValidationError({
                    'payments': f'Los pagos ({total_paid}) no cubren el total de la venta ({sale.total})'
                })
        
        return sale
    
    @transaction.atomic
    def update(self, instance, validated_data):
        # Solo permitir actualizar notas si la venta está pendiente
        if instance.status != 'pending':
            allowed_fields = ['notes']
            for field in validated_data.keys():
                if field not in allowed_fields:
                    raise serializers.ValidationError(
                        f'No se puede modificar el campo "{field}" en una venta {instance.get_status_display().lower()}'
                    )
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class SaleListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados"""
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    sale_type_display = serializers.CharField(source='get_sale_type_display', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True, allow_null=True)
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Sale
        fields = [
            'id', 'sale_number', 'client_name',
            'sale_type', 'sale_type_display',
            'total', 'status', 'status_display',
            'sale_date', 'items_count'
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()


class CompleteSaleSerializer(serializers.Serializer):
    """Serializer para completar una venta"""
    
    sale_id = serializers.UUIDField()
    
    def validate_sale_id(self, value):
        try:
            sale = Sale.objects.get(id=value)
        except Sale.DoesNotExist:
            raise serializers.ValidationError('La venta no existe')
        
        if sale.status != 'pending':
            raise serializers.ValidationError('Solo se pueden completar ventas pendientes')
        
        if sale.company != self.context['request'].user.company:
            raise serializers.ValidationError('No tienes permisos para esta venta')
        
        return value


class CancelSaleSerializer(serializers.Serializer):
    """Serializer para cancelar una venta"""
    
    sale_id = serializers.UUIDField()
    reason = serializers.CharField(max_length=500)
    
    def validate_sale_id(self, value):
        try:
            sale = Sale.objects.get(id=value)
        except Sale.DoesNotExist:
            raise serializers.ValidationError('La venta no existe')
        
        if sale.status != 'completed':
            raise serializers.ValidationError('Solo se pueden cancelar ventas completadas')
        
        if sale.company != self.context['request'].user.company:
            raise serializers.ValidationError('No tienes permisos para esta venta')
        
        return value