# api/serializers/credit_serializers.py

from rest_framework import serializers
from api.models import Credit, CreditPayment, Client
from decimal import Decimal
from django.utils import timezone


class CreditPaymentSerializer(serializers.ModelSerializer):
    """Serializer para pagos de crédito"""
    
    registered_by_name = serializers.CharField(source='registered_by.username', read_only=True)
    shift_number = serializers.CharField(source='shift.shift_number', read_only=True, allow_null=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    
    class Meta:
        model = CreditPayment
        fields = [
            'id', 'credit', 'amount', 
            'payment_method', 'payment_method_display',
            'registered_by', 'registered_by_name',
            'shift', 'shift_number',
            'notes', 'created_at'
        ]
        read_only_fields = ['id', 'credit', 'registered_by', 'shift', 'created_at']
    
    def validate_amount(self, value):
        """Validar que el monto sea positivo"""
        if value <= 0:
            raise serializers.ValidationError('El monto debe ser mayor a 0')
        return value
    
    def validate(self, data):
        """Validar que el pago no exceda la deuda"""
        credit = self.context.get('credit')
        amount = data.get('amount')
        
        if credit and amount:
            if amount > credit.remaining_amount:
                raise serializers.ValidationError({
                    'amount': f'El monto excede la deuda restante (${credit.remaining_amount:,.0f})'
                })
        
        return data


class CreditSerializer(serializers.ModelSerializer):
    """Serializer para créditos"""
    
    client_name = serializers.SerializerMethodField()
    client_rut = serializers.CharField(source='client.rut', read_only=True)
    sale_number = serializers.CharField(source='sale.sale_number', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    payments = CreditPaymentSerializer(many=True, read_only=True)
    
    days_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = Credit
        fields = [
            'id', 'client', 'client_name', 'client_rut',
            'sale', 'sale_number',
            'total_amount', 'paid_amount', 'remaining_amount',
            'status', 'status_display',
            'due_date', 'days_overdue',
            'created_at', 'updated_at',
            'notes', 'payments'
        ]
        read_only_fields = ['id', 'paid_amount', 'remaining_amount', 'status', 'created_at', 'updated_at']
    
    def get_client_name(self, obj):
        """Obtener nombre completo del cliente"""
        return f"{obj.client.first_name} {obj.client.last_name}"
    
    def get_days_overdue(self, obj):
        """Calcular días de atraso"""
        if obj.status in ['pending', 'partial'] and obj.due_date:
            today = timezone.now().date()
            if today > obj.due_date:
                return (today - obj.due_date).days
        return 0


class CreditDetailSerializer(CreditSerializer):
    """Serializer con detalle completo del crédito"""
    
    sale_items = serializers.SerializerMethodField()
    client_info = serializers.SerializerMethodField()
    payment_history = serializers.SerializerMethodField()
    
    class Meta(CreditSerializer.Meta):
        fields = CreditSerializer.Meta.fields + [
            'sale_items', 'client_info', 'payment_history'
        ]
    
    def get_sale_items(self, obj):
        """Obtener items de la venta asociada"""
        if obj.sale:
            from api.serializers.sale_serializer import SaleItemSerializer
            return SaleItemSerializer(obj.sale.items.all(), many=True).data
        return []
    
    def get_client_info(self, obj):
        """Información detallada del cliente"""
        client = obj.client
        return {
            'id': str(client.id),
            'rut': client.rut,
            'name': f"{client.first_name} {client.last_name}",
            'phone': client.phone,
            'email': client.email,
            'address': client.address,
            'credit_limit': float(client.credit_limit) if client.credit_limit else None,
            'current_debt': float(client.current_debt)
        }
    
    def get_payment_history(self, obj):
        """Historial de pagos ordenado"""
        payments = obj.payments.all().order_by('-created_at')
        return CreditPaymentSerializer(payments, many=True).data


class CreditListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listados"""
    
    client_name = serializers.SerializerMethodField()
    client_rut = serializers.CharField(source='client.rut', read_only=True)
    client_phone = serializers.CharField(source='client.phone', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = Credit
        fields = [
            'id', 'client_name', 'client_rut', 'client_phone',
            'total_amount', 'remaining_amount',
            'status', 'status_display',
            'due_date', 'days_overdue', 'created_at'
        ]
    
    def get_client_name(self, obj):
        return f"{obj.client.first_name} {obj.client.last_name}"
    
    def get_days_overdue(self, obj):
        if obj.status in ['pending', 'partial'] and obj.due_date:
            today = timezone.now().date()
            if today > obj.due_date:
                return (today - obj.due_date).days
        return 0


class PayCreditSerializer(serializers.Serializer):
    """Serializer para procesar pago de crédito"""
    
    credit_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    payment_method = serializers.ChoiceField(choices=CreditPayment.PAYMENT_METHOD_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    
    def validate_credit_id(self, value):
        """Validar que el crédito existe y está pendiente"""
        try:
            credit = Credit.objects.get(id=value)
        except Credit.DoesNotExist:
            raise serializers.ValidationError('Crédito no encontrado')
        
        if credit.status == 'paid':
            raise serializers.ValidationError('Este crédito ya está pagado')
        
        return value
    
    def validate(self, data):
        """Validar que el monto no exceda la deuda"""
        try:
            credit = Credit.objects.get(id=data['credit_id'])
            if data['amount'] > credit.remaining_amount:
                raise serializers.ValidationError({
                    'amount': f'El monto excede la deuda restante (${credit.remaining_amount:,.0f})'
                })
        except Credit.DoesNotExist:
            pass  # Ya validado en validate_credit_id
        
        return data