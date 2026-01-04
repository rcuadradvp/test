from rest_framework import serializers
from api.models import Consignment, ConsignmentItem, Product, Client
from django.db import transaction

class ConsignmentItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_barcode = serializers.CharField(source='product.barcode', read_only=True)
    pending_quantity = serializers.DecimalField(max_digits=10, decimal_places=3, read_only=True)
    
    class Meta:
        model = ConsignmentItem
        fields = [
            'id', 'consignment', 'product', 'product_name', 'product_barcode',
            'delivered_quantity', 'sold_quantity', 'returned_quantity',
            'pending_quantity', 'unit_price', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'consignment', 'created_at', 'updated_at']
    
    def validate_delivered_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('La cantidad entregada debe ser mayor a 0')
        return value
    
    def validate_sold_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError('La cantidad vendida no puede ser negativa')
        return value
    
    def validate_returned_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError('La cantidad devuelta no puede ser negativa')
        return value
    
    def validate(self, data):
        product = data.get('product')
        delivered_quantity = data.get('delivered_quantity')
        sold_quantity = data.get('sold_quantity', 0)
        returned_quantity = data.get('returned_quantity', 0)
        
        # Verificar stock
        if product and delivered_quantity and product.track_inventory:
            if product.stock < delivered_quantity:
                raise serializers.ValidationError({
                    'delivered_quantity': f'Stock insuficiente. Disponible: {product.stock}'
                })
        
        # Validar que sold + returned no sea mayor que delivered
        total_accounted = sold_quantity + returned_quantity
        if total_accounted > delivered_quantity:
            raise serializers.ValidationError(
                f'La suma de vendido ({sold_quantity}) y devuelto ({returned_quantity}) '
                f'no puede ser mayor a lo entregado ({delivered_quantity})'
            )
        
        # Usar precio del producto si no se especifica
        if 'unit_price' not in data or not data['unit_price']:
            data['unit_price'] = product.sale_price
        
        return data


class ConsignmentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    client_rut = serializers.CharField(source='client.rut', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    settled_by_name = serializers.CharField(source='settled_by.username', read_only=True, allow_null=True)
    is_overdue_now = serializers.SerializerMethodField()
    can_be_settled = serializers.SerializerMethodField()
    
    items = ConsignmentItemSerializer(many=True, required=False)
    
    class Meta:
        model = Consignment
        fields = [
            'id', 'company', 'client', 'client_name', 'client_rut',
            'consignment_number', 'status', 'status_display',
            'delivery_date', 'expected_return_date', 'settlement_date',
            'total_delivered_value', 'total_sold_value', 'total_returned_value',
            'delivery_notes', 'settlement_notes',
            'created_by', 'created_by_name', 'settled_by', 'settled_by_name',
            'created_at', 'updated_at', 'is_overdue_now', 'can_be_settled',
            'items'
        ]
        read_only_fields = [
            'id', 'company', 'consignment_number', 'status', 'delivery_date',
            'settlement_date', 'total_delivered_value', 'total_sold_value',
            'total_returned_value', 'created_by', 'settled_by',
            'created_at', 'updated_at'
        ]
    
    def get_is_overdue_now(self, obj):
        return obj.is_overdue()
    
    def get_can_be_settled(self, obj):
        return obj.can_settle()
    
    def validate_expected_return_date(self, value):
        from django.utils import timezone
        if value < timezone.now().date():
            raise serializers.ValidationError('La fecha esperada de retorno no puede ser en el pasado')
        return value
    
    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        
        # Generar número de consignación
        company = self.context['request'].user.company
        last_consignment = Consignment.objects.filter(company=company).order_by('-created_at').first()
        
        if last_consignment and last_consignment.consignment_number:
            try:
                last_number = int(last_consignment.consignment_number.split('-')[-1])
                new_number = last_number + 1
            except:
                new_number = 1
        else:
            new_number = 1
        
        validated_data['consignment_number'] = f"CONS-{new_number:06d}"
        validated_data['company'] = company
        validated_data['created_by'] = self.context['request'].user
        
        # Crear consignación
        consignment = Consignment.objects.create(**validated_data)
        
        # Crear items
        for item_data in items_data:
            ConsignmentItem.objects.create(consignment=consignment, **item_data)
        
        # Calcular totales
        consignment.calculate_totals()
        consignment.save()
        
        return consignment
    
    @transaction.atomic
    def update(self, instance, validated_data):
        # Solo permitir actualizar items si está activa
        if instance.status not in ['active', 'partially_settled']:
            allowed_fields = ['delivery_notes']
            for field in validated_data.keys():
                if field not in allowed_fields:
                    raise serializers.ValidationError(
                        f'No se puede modificar el campo "{field}" en una consignación {instance.get_status_display().lower()}'
                    )
        
        items_data = validated_data.pop('items', None)
        
        # Actualizar campos básicos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        # Actualizar items si se proporcionaron
        if items_data is not None:
            for item_data in items_data:
                item_id = item_data.get('id')
                if item_id:
                    # Actualizar item existente
                    try:
                        item = instance.items.get(id=item_id)
                        for attr, value in item_data.items():
                            setattr(item, attr, value)
                        item.save()
                    except ConsignmentItem.DoesNotExist:
                        pass
        
        # Recalcular totales
        instance.calculate_totals()
        instance.save()
        
        return instance


class ConsignmentListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados"""
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    client_rut = serializers.CharField(source='client.rut', read_only=True)
    is_overdue_now = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Consignment
        fields = [
            'id', 'consignment_number', 'client_name', 'client_rut',
            'status', 'status_display', 'delivery_date', 'expected_return_date',
            'total_delivered_value', 'total_sold_value', 'total_returned_value',
            'is_overdue_now', 'items_count'
        ]
    
    def get_is_overdue_now(self, obj):
        return obj.is_overdue()
    
    def get_items_count(self, obj):
        return obj.items.count()


class SettleConsignmentSerializer(serializers.Serializer):
    """Serializer para liquidar una consignación"""
    
    consignment_id = serializers.UUIDField()
    settlement_notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    items = serializers.ListField(
        child=serializers.DictField(),
        help_text='Lista de items con sold_quantity y returned_quantity'
    )
    
    def validate_consignment_id(self, value):
        try:
            consignment = Consignment.objects.get(id=value)
        except Consignment.DoesNotExist:
            raise serializers.ValidationError('La consignación no existe')
        
        if consignment.status not in ['active', 'partially_settled']:
            raise serializers.ValidationError('La consignación ya está liquidada o cancelada')
        
        if consignment.company != self.context['request'].user.company:
            raise serializers.ValidationError('No tienes permisos para esta consignación')
        
        return value
    
    def validate_items(self, value):
        for item_data in value:
            if 'id' not in item_data:
                raise serializers.ValidationError('Cada item debe incluir su ID')
            
            if 'sold_quantity' not in item_data and 'returned_quantity' not in item_data:
                raise serializers.ValidationError('Debe especificar sold_quantity o returned_quantity')
        
        return value
    
    def validate(self, data):
        consignment_id = data.get('consignment_id')
        items_data = data.get('items', [])
        
        try:
            consignment = Consignment.objects.get(id=consignment_id)
        except Consignment.DoesNotExist:
            raise serializers.ValidationError({'consignment_id': 'La consignación no existe'})
        
        # Validar cada item
        for item_data in items_data:
            try:
                item = consignment.items.get(id=item_data['id'])
                sold = item_data.get('sold_quantity', item.sold_quantity)
                returned = item_data.get('returned_quantity', item.returned_quantity)
                
                if sold + returned != item.delivered_quantity:
                    raise serializers.ValidationError({
                        'items': f'El producto {item.product.name} debe tener todas las cantidades contabilizadas'
                    })
            except ConsignmentItem.DoesNotExist:
                raise serializers.ValidationError({
                    'items': f'El item {item_data["id"]} no existe en esta consignación'
                })
        
        return data