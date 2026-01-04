# api/serializers/client_serializers.py

from rest_framework import serializers
from api.models import Client
from api.utils.validators import RutValidator, PhoneValidator, EmailValidator
from decimal import Decimal

class ClientSerializer(serializers.ModelSerializer):
    credit_status = serializers.SerializerMethodField()
    available_credit = serializers.SerializerMethodField()
    
    class Meta:
        model = Client
        fields = [
            'id', 'rut', 'first_name', 'last_name', 'phone', 'email', 'address',
            'has_credit', 'credit_limit', 'current_debt', 'credit_status', 'available_credit',
            'has_discount', 'discount_percentage',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'current_debt', 'created_at', 'updated_at']
    
    def get_credit_status(self, obj):
        """Obtener estado del crédito"""
        if not obj.has_credit:
            return "Sin crédito"
        
        if obj.current_debt == 0:
            return "Sin deuda"
        
        if obj.credit_limit is None:
            return f"Deuda: ${obj.current_debt:,.0f} (Ilimitado)"
        
        percentage = (obj.current_debt / obj.credit_limit * 100) if obj.credit_limit > 0 else 0
        
        if percentage >= 90:
            return f"Crítico ({percentage:.1f}%)"
        elif percentage >= 70:
            return f"Alto ({percentage:.1f}%)"
        elif percentage >= 50:
            return f"Medio ({percentage:.1f}%)"
        else:
            return f"Bajo ({percentage:.1f}%)"
    
    def get_available_credit(self, obj):
        """Calcular crédito disponible"""
        if not obj.has_credit:
            return 0
        
        if obj.credit_limit is None:
            return None  # Ilimitado
        
        available = obj.credit_limit - obj.current_debt
        return max(available, 0)
    
    def validate_rut(self, value):
        """Validar RUT chileno"""
        RutValidator.validate(value)
        
        # Formatear RUT
        formatted_rut = RutValidator.format_rut(value)
        
        # Verificar duplicados
        company = self.context.get('company')
        instance = self.instance
        
        query = Client.objects.filter(
            company=company,
            rut=formatted_rut
        )
        
        if instance:
            query = query.exclude(id=instance.id)
        
        if query.exists():
            raise serializers.ValidationError("Ya existe un cliente con este RUT")
        
        return formatted_rut
    
    def validate_phone(self, value):
        """Validar teléfono"""
        if value:
            PhoneValidator.validate(value)
        return value
    
    def validate_email(self, value):
        """Validar email"""
        if value:
            EmailValidator.validate(value)
        return value
    
    def validate(self, data):
        """Validaciones generales"""
        # Si tiene crédito con límite, validar que el límite sea positivo
        if data.get('has_credit') and data.get('credit_limit') is not None:
            if data['credit_limit'] <= 0:
                raise serializers.ValidationError({
                    'credit_limit': 'El límite de crédito debe ser mayor a 0'
                })
        
        # Si tiene descuento, validar porcentaje
        if data.get('has_discount'):
            discount = data.get('discount_percentage', 0)
            if discount < 0 or discount > 100:
                raise serializers.ValidationError({
                    'discount_percentage': 'El descuento debe estar entre 0 y 100'
                })
        
        return data


class ClientDetailSerializer(ClientSerializer):
    """Serializer con información detallada de créditos"""
    active_credits = serializers.SerializerMethodField()
    total_purchases = serializers.SerializerMethodField()
    last_purchase = serializers.SerializerMethodField()
    
    class Meta(ClientSerializer.Meta):
        fields = ClientSerializer.Meta.fields + [
            'active_credits', 'total_purchases', 'last_purchase'
        ]
    
    def get_active_credits(self, obj):
        """Obtener créditos activos"""
        from api.models import Credit
        credits = Credit.objects.filter(
            client=obj,
            status__in=['pending', 'partial']
        ).order_by('-created_at')[:5]
        
        return [{
            'id': str(credit.id),
            'total_amount': float(credit.total_amount),
            'paid_amount': float(credit.paid_amount),
            'remaining_amount': float(credit.remaining_amount),
            'due_date': credit.due_date.isoformat() if credit.due_date else None,
            'status': credit.status,
            'created_at': credit.created_at.isoformat()
        } for credit in credits]
    
    def get_total_purchases(self, obj):
        """Total de compras del cliente"""
        from api.models import Sale
        return Sale.objects.filter(client=obj, status='completed').count()
    
    def get_last_purchase(self, obj):
        """Última compra"""
        from api.models import Sale
        last_sale = Sale.objects.filter(
            client=obj, 
            status='completed'
        ).order_by('-created_at').first()
        
        if last_sale:
            return {
                'date': last_sale.created_at.isoformat(),
                'total': float(last_sale.total_amount)
            }
        return None


class ClientCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear clientes"""
    
    class Meta:
        model = Client
        fields = [
            'rut', 'first_name', 'last_name', 'phone', 'email', 'address',
            'has_credit', 'credit_limit',
            'has_discount', 'discount_percentage',
            'company'
        ]
    
    def validate_rut(self, value):
        RutValidator.validate(value)
        return RutValidator.format_rut(value)
    
    def validate_phone(self, value):
        if value:
            PhoneValidator.validate(value)
        return value
    
    def validate_email(self, value):
        if value:
            EmailValidator.validate(value)
        return value
    
    def validate(self, data):
        # Validar límite de crédito
        if data.get('has_credit') and data.get('credit_limit') is not None:
            if data['credit_limit'] <= 0:
                raise serializers.ValidationError({
                    'credit_limit': 'El límite de crédito debe ser mayor a 0'
                })
        
        # Si no tiene crédito, credit_limit debe ser None
        if not data.get('has_credit'):
            data['credit_limit'] = None
        
        # Validar descuento
        if data.get('has_discount'):
            discount = data.get('discount_percentage', 0)
            if discount < 0 or discount > 100:
                raise serializers.ValidationError({
                    'discount_percentage': 'El descuento debe estar entre 0 y 100'
                })
        else:
            data['discount_percentage'] = 0
        
        return data