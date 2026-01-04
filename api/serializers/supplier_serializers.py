# api/serializers/supplier_serializers.py

from rest_framework import serializers
from api.models import Supplier, PurchaseOrder, PurchaseOrderItem, SupplierPayment, Product, Department
from decimal import Decimal
from django.db import transaction


class SupplierSerializer(serializers.ModelSerializer):
    """Serializer para proveedores"""
    
    total_purchases = serializers.SerializerMethodField()
    pending_orders = serializers.SerializerMethodField()
    total_debt = serializers.SerializerMethodField()
    
    class Meta:
        model = Supplier
        fields = [
            'id', 'company', 'name','rut', 'representative',
            'phone_1', 'phone_2', 'email_1', 'email_2', 'website',
            'address',
            'is_active', 'created_at', 'updated_at',
            'total_purchases', 'pending_orders', 'total_debt'
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']
    
    def get_total_purchases(self, obj):
        """Total de compras realizadas"""
        return obj.purchase_orders.filter(status__in=['completed', 'paid']).count()
    
    def get_pending_orders(self, obj):
        """Órdenes de compra pendientes"""
        return obj.purchase_orders.filter(status='pending').count()
    
    def get_total_debt(self, obj):
        """Deuda total con el proveedor"""
        orders = obj.purchase_orders.filter(status__in=['pending', 'partial', 'paid'])
        total_debt = sum(order.total_amount - order.paid_amount for order in orders)
        return float(total_debt)
    
    def validate_name(self, value):
        """Validar nombre único por empresa"""
        company = self.context.get('company')
        if company:
            exists = Supplier.objects.filter(
                company=company,
                name__iexact=value,
                is_active=True
            )
            if self.instance:
                exists = exists.exclude(id=self.instance.id)
            
            if exists.exists():
                raise serializers.ValidationError(
                    f'Ya existe un proveedor con el nombre "{value}"'
                )
        return value
    
    def create(self, validated_data):
        validated_data['company'] = self.context['request'].user.company
        return super().create(validated_data)


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    """Serializer para items de orden de compra"""
    
    product_name = serializers.CharField(source='product.name', read_only=True, allow_null=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'purchase_order', 'product', 'product_name', 'product_code',
            'department', 'department_name',
            'quantity', 'unit_price', 'subtotal',
            'tax_rate', 'tax_amount', 'total'
        ]
        read_only_fields = ['id', 'purchase_order', 'subtotal', 'tax_amount', 'total']
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('La cantidad debe ser mayor a 0')
        return value
    
    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError('El precio no puede ser negativo')
        return value

class PurchaseOrderSerializer(serializers.ModelSerializer):
    """Serializer para órdenes de compra"""

    supplier_id = serializers.UUIDField(write_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    items = PurchaseOrderItemSerializer(many=True, required=False)
    payments = serializers.SerializerMethodField()
    
    remaining_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'id','rut', 'company', 'order_number', 'supplier_id', 'supplier_name',
            'total_amount', 'paid_amount', 'remaining_amount',
            'status', 'status_display',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'notes', 'items', 'payments'
        ]
        read_only_fields = [
            'id', 'company', 'order_number',
            'total_amount', 'paid_amount',
            'status', 'created_by', 'created_at', 'updated_at'
        ]
    
    def get_payments(self, obj):
        """Obtener pagos de la orden"""
        from api.serializers.payment_serializers import SupplierPaymentSerializer
        return SupplierPaymentSerializer(obj.payments.all(), many=True).data
    
    def get_remaining_amount(self, obj):
        """Calcular monto restante"""
        return float(obj.total_amount - obj.paid_amount)
    
    @transaction.atomic
    def create(self, validated_data):
        """Crear orden de compra con items"""
        items_data = validated_data.pop('items', [])
        
        # Generar número de orden
        company = self.context['request'].user.company
        last_order = PurchaseOrder.objects.filter(company=company).order_by('-created_at').first()
        
        if last_order and last_order.order_number:
            try:
                last_number = int(last_order.order_number.split('-')[-1])
                new_number = last_number + 1
            except Exception:
                new_number = 1
        else:
            new_number = 1
        
        validated_data['order_number'] = f"OC-{new_number:06d}"
        validated_data['company'] = company
        validated_data['created_by'] = self.context['request'].user
        
        # Crear orden base (sin totales aún)
        order = PurchaseOrder.objects.create(**validated_data)
        
        # Crear items
        total_subtotal = Decimal('0')
        total_tax = Decimal('0')
        
        for item_data in items_data:
            quantity = item_data['quantity']
            unit_price = item_data['unit_price']
            tax_rate = item_data.get('tax_rate', Decimal('19.00'))
            
            subtotal = quantity * unit_price
            tax_amount = subtotal * (tax_rate / 100)
            total = subtotal + tax_amount
            
            PurchaseOrderItem.objects.create(
                purchase_order=order,
                subtotal=subtotal,
                tax_amount=tax_amount,
                total=total,
                **item_data
            )
            
            total_subtotal += subtotal
            total_tax += tax_amount
        
        # Actualizar total_amount de la orden
        order.total_amount = total_subtotal + total_tax
        order.save()
        
        return order
    
    def update(self, instance, validated_data):
        """Actualizar orden (solo si está pendiente)"""
        if instance.status != 'pending':
            raise serializers.ValidationError(
                'Solo se pueden editar órdenes pendientes'
            )
        
        items_data = validated_data.pop('items', None)
        
        # Actualizar campos simples de la orden
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Si hay items, actualizar
        if items_data is not None:
            # Eliminar items existentes
            instance.items.all().delete()
            
            # Crear nuevos items
            total_subtotal = Decimal('0')
            total_tax = Decimal('0')
            
            for item_data in items_data:
                quantity = item_data['quantity']
                unit_price = item_data['unit_price']
                tax_rate = item_data.get('tax_rate', Decimal('19.00'))
                
                subtotal = quantity * unit_price
                tax_amount = subtotal * (tax_rate / 100)
                total = subtotal + tax_amount
                
                PurchaseOrderItem.objects.create(
                    purchase_order=instance,
                    subtotal=subtotal,
                    tax_amount=tax_amount,
                    total=total,
                    **item_data
                )
                
                total_subtotal += subtotal
                total_tax += tax_amount
            
            # Actualizar total_amount
            instance.total_amount = total_subtotal + total_tax
            instance.save()
        
        return instance

class SupplierListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listados"""
    
    pending_orders_count = serializers.SerializerMethodField()
    total_debt = serializers.SerializerMethodField()
    
    class Meta:
        model = Supplier
        fields = [
            'id','rut', 'company', 'name', 'representative',
            'phone_1', 'phone_2', 'email_1', 'email_2', 'website',
            'address','is_active', 'pending_orders_count', 'total_debt'
        ]
    
    def get_pending_orders_count(self, obj):
        return obj.purchase_orders.filter(status='pending').count()
    
    def get_total_debt(self, obj):
        orders = obj.purchase_orders.filter(status__in=['pending', 'partial', 'paid'])
        return float(sum(order.total_amount - order.paid_amount for order in orders))


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listados de órdenes"""
    
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items_count = serializers.SerializerMethodField()
    order_date = serializers.DateTimeField(source='created_at', read_only=True)
    total = serializers.DecimalField(source='total_amount', max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'order_number', 'supplier_name', 'order_date',
            'total', 'paid_amount', 'status', 'status_display',
            'items_count', 'created_at'
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()

class SuggestedPurchaseSerializer(serializers.Serializer):
    """Serializer para compras sugeridas"""
    
    product_id = serializers.UUIDField()
    product_name = serializers.CharField()
    product_barcode = serializers.CharField()
    current_stock = serializers.DecimalField(max_digits=10, decimal_places=2)
    min_stock = serializers.DecimalField(max_digits=10, decimal_places=2)
    suggested_quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    primary_supplier_id = serializers.UUIDField(allow_null=True)
    primary_supplier_name = serializers.CharField(allow_null=True)