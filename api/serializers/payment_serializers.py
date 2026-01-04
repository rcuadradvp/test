# api/serializers/payment_serializers.py

from rest_framework import serializers
from api.models import SupplierPayment, PurchaseOrder
from decimal import Decimal


class SupplierPaymentSerializer(serializers.ModelSerializer):
    """Serializer para pagos a proveedores"""
    
    purchase_order_number = serializers.CharField(source='purchase_order.order_number', read_only=True)
    supplier_name = serializers.CharField(source='purchase_order.supplier.name', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    payment_source_display = serializers.CharField(source='get_payment_source_display', read_only=True)
    
    delivered_by_name = serializers.CharField(source='delivered_by.username', read_only=True, allow_null=True)
    registered_by_name = serializers.CharField(source='delivery_registered_by.username', read_only=True)
    shift_number = serializers.CharField(source='shift.shift_number', read_only=True, allow_null=True)
    
    class Meta:
        model = SupplierPayment
        fields = [
            'id', 'purchase_order', 'purchase_order_number', 'supplier_name',
            'amount', 'payment_method', 'payment_method_display',
            'payment_source', 'payment_source_display',
            'shift', 'shift_number',
            'delivered_by', 'delivered_by_name',
            'delivery_registered_by', 'registered_by_name',
            'notes', 'payment_date'
        ]
        read_only_fields = ['id', 'delivery_registered_by', 'payment_date']
    
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('El monto debe ser mayor a 0')
        return value
    
    def validate(self, data):
        """Validar según la fuente del pago"""
        payment_source = data.get('payment_source')
        
        # Si es desde caja, debe tener shift
        if payment_source == 'cash_register':
            if not data.get('shift'):
                raise serializers.ValidationError({
                    'shift': 'Debe especificar el turno para pagos desde caja'
                })
            data['delivered_by'] = None
        
        # Si es entrega externa, debe tener delivered_by
        elif payment_source == 'external':
            if not data.get('delivered_by'):
                raise serializers.ValidationError({
                    'delivered_by': 'Debe especificar quién entregó el dinero'
                })
            data['shift'] = None
        
        # Validar que el pago no exceda la deuda
        purchase_order = data.get('purchase_order')
        amount = data.get('amount')
        
        if purchase_order and amount:
            remaining = purchase_order.total - purchase_order.paid_amount
            if amount > remaining:
                raise serializers.ValidationError({
                    'amount': f'El monto excede la deuda restante (${remaining:,.0f})'
                })
        
        return data
    
    def create(self, validated_data):
        """Crear pago y actualizar orden de compra"""
        validated_data['delivery_registered_by'] = self.context['request'].user
        
        payment = super().create(validated_data)
        
        # Actualizar monto pagado en la orden
        order = payment.purchase_order
        order.paid_amount += payment.amount
        
        # Actualizar estado si está completamente pagado
        if order.paid_amount >= order.total:
            order.status = 'paid'
        elif order.paid_amount > 0:
            order.status = 'completed'
        
        order.save()
        
        return payment


class RegisterSupplierPaymentSerializer(serializers.Serializer):
    """Serializer para registrar pago a proveedor"""
    
    purchase_order_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    payment_method = serializers.ChoiceField(choices=SupplierPayment.PAYMENT_METHOD_CHOICES)
    payment_source = serializers.ChoiceField(choices=SupplierPayment.PAYMENT_SOURCE_CHOICES)
    delivered_by_id = serializers.UUIDField(required=False, allow_null=True)
    shift_id = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    
    def validate_purchase_order_id(self, value):
        try:
            order = PurchaseOrder.objects.get(id=value)
        except PurchaseOrder.DoesNotExist:
            raise serializers.ValidationError('Orden de compra no encontrada')
        
        if order.status == 'cancelled':
            raise serializers.ValidationError('No se puede pagar una orden cancelada')
        
        if order.status == 'paid':
            raise serializers.ValidationError('Esta orden ya está pagada completamente')
        
        return value


# ==========================================
# CONFIGURATION SERIALIZERS
# ==========================================

from api.models import PrinterConfiguration, BarcodeReaderConfiguration


class PrinterConfigurationSerializer(serializers.ModelSerializer):
    """Serializer para configuración de impresora"""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = PrinterConfiguration
        fields = [
            'id', 'company', 'user', 'user_name',
            'printer_name', 'font_family', 'font_size',
            'columns', 'use_bold',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']
    
    def validate_font_size(self, value):
        if value < 8 or value > 24:
            raise serializers.ValidationError('El tamaño de fuente debe estar entre 8 y 24')
        return value
    
    def validate_columns(self, value):
        if value < 32 or value > 80:
            raise serializers.ValidationError('Las columnas deben estar entre 32 y 80')
        return value
    
    def create(self, validated_data):
        """Crear configuración y desactivar otras del usuario"""
        user = self.context['request'].user
        validated_data['company'] = user.company
        validated_data['user'] = user
        
        # Desactivar otras configuraciones del usuario
        PrinterConfiguration.objects.filter(user=user, is_active=True).update(is_active=False)
        
        return super().create(validated_data)


class BarcodeReaderConfigurationSerializer(serializers.ModelSerializer):
    """Serializer para configuración de lector de código de barras"""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = BarcodeReaderConfiguration
        fields = [
            'id', 'company', 'user', 'user_name',
            'port', 'baud_rate', 'data_bits', 'parity',
            'stop_bits', 'flow_control',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']
    
    def validate_baud_rate(self, value):
        valid_rates = [9600, 19200, 38400, 57600, 115200]
        if value not in valid_rates:
            raise serializers.ValidationError(
                f'Baud rate debe ser uno de: {", ".join(map(str, valid_rates))}'
            )
        return value
    
    def validate_data_bits(self, value):
        if value not in [7, 8]:
            raise serializers.ValidationError('Data bits debe ser 7 u 8')
        return value
    
    def validate_stop_bits(self, value):
        if value not in [1, 2]:
            raise serializers.ValidationError('Stop bits debe ser 1 o 2')
        return value
    
    def create(self, validated_data):
        """Crear configuración y desactivar otras del usuario"""
        user = self.context['request'].user
        validated_data['company'] = user.company
        validated_data['user'] = user
        
        # Desactivar otras configuraciones del usuario
        BarcodeReaderConfiguration.objects.filter(user=user, is_active=True).update(is_active=False)
        
        return super().create(validated_data)


# ==========================================
# ALERT SERIALIZERS
# ==========================================

from api.models import SystemAlert, UserAlert


class SystemAlertSerializer(serializers.ModelSerializer):
    """Serializer para alertas del sistema"""
    
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True, allow_null=True)
    
    class Meta:
        model = SystemAlert
        fields = [
            'id', 'company', 'alert_type', 'alert_type_display',
            'title', 'message', 'status', 'status_display',
            'product', 'product_name',
            'supplier_payment', 'created_at'
        ]
        read_only_fields = ['id', 'company', 'created_at']


class UserAlertSerializer(serializers.ModelSerializer):
    """Serializer para alertas de usuario"""
    
    alert_title = serializers.CharField(source='alert.title', read_only=True)
    alert_message = serializers.CharField(source='alert.message', read_only=True)
    alert_type = serializers.CharField(source='alert.alert_type', read_only=True)
    is_read_display = serializers.SerializerMethodField()
    
    class Meta:
        model = UserAlert
        fields = [
            'id', 'user', 'alert', 'alert_title', 'alert_message', 'alert_type',
            'is_read', 'is_read_display', 'read_at', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'alert', 'read_at', 'created_at']
    
    def get_is_read_display(self, obj):
        return 'Leída' if obj.is_read else 'No leída'


class MarkAlertAsReadSerializer(serializers.Serializer):
    """Serializer para marcar alertas como leídas"""
    
    alert_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False
    )