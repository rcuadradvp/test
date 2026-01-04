from rest_framework import serializers
from api.models import Shift, CashMovement, CashCount
from django.db.models import Sum, Q, Count

class CashMovementSerializer(serializers.ModelSerializer):
    movement_type_display = serializers.CharField(source='get_movement_type_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = CashMovement
        fields = [
            'id', 'shift', 'movement_type', 'movement_type_display',
            'amount', 'reason', 'description', 'reference_number',
            'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'shift', 'created_by', 'created_at']
    
    def validate_amount(self, value):
        if value == 0:
            raise serializers.ValidationError('El monto no puede ser 0')
        return abs(value)  # Asegurar que sea positivo, el modelo lo manejará
    
    def validate(self, data):
        shift = data.get('shift') or (self.instance.shift if self.instance else None)
        
        if shift and shift.status != 'open':
            raise serializers.ValidationError('No se pueden registrar movimientos en un turno cerrado')
        
        return data
    
    def create(self, validated_data):
        # Asignar el turno activo del usuario si no se especifica
        if 'shift' not in validated_data:
            active_shift = self.context['request'].user.shifts.filter(status='open').first()
            if not active_shift:
                raise serializers.ValidationError({'shift': 'No tienes un turno abierto'})
            validated_data['shift'] = active_shift
        
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class CashCountSerializer(serializers.ModelSerializer):
    counted_by_name = serializers.CharField(source='counted_by.username', read_only=True)
    
    class Meta:
        model = CashCount
        fields = [
            'id', 'shift', 'count_20000', 'count_10000', 'count_5000',
            'count_2000', 'count_1000', 'count_500', 'count_100',
            'count_50', 'count_10', 'total', 'notes',
            'counted_by', 'counted_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'shift', 'total', 'counted_by', 'created_at']
    
    def create(self, validated_data):
        validated_data['counted_by'] = self.context['request'].user
        return super().create(validated_data)


class ShiftSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    closed_by_name = serializers.CharField(source='closed_by.username', read_only=True, allow_null=True)
    
    cash_movements = CashMovementSerializer(many=True, read_only=True)
    cash_counts = CashCountSerializer(many=True, read_only=True)
    
    sales_count = serializers.SerializerMethodField()
    total_sales = serializers.SerializerMethodField()
    
    class Meta:
        model = Shift
        fields = [
            'id', 'company', 'user', 'user_name', 'shift_number', 'status', 'status_display',
            'opening_cash', 'expected_cash', 'expected_card', 'expected_transfer', 'expected_total',
            'closing_cash', 'closing_card', 'closing_transfer', 'closing_total',
            'cash_difference', 'card_difference', 'transfer_difference', 'total_difference',
            'opened_at', 'closed_at', 'opening_notes', 'closing_notes',
            'closed_by', 'closed_by_name', 'created_at', 'updated_at',
            'cash_movements', 'cash_counts', 'sales_count', 'total_sales'
        ]
        read_only_fields = [
            'id', 'company', 'shift_number', 'status',
            'expected_cash', 'expected_card', 'expected_transfer', 'expected_total',
            'closing_cash', 'closing_card', 'closing_transfer', 'closing_total',
            'cash_difference', 'card_difference', 'transfer_difference', 'total_difference',
            'opened_at', 'closed_at', 'closed_by', 'created_at', 'updated_at'
        ]
    
    def get_sales_count(self, obj):
        return obj.sales.filter(status='completed').count()
    
    def get_total_sales(self, obj):
        return obj.sales.filter(status='completed').aggregate(
            total=Sum('total')
        )['total'] or 0
    
    def validate_opening_cash(self, value):
        if value < 0:
            raise serializers.ValidationError('El efectivo inicial no puede ser negativo')
        return value
    
    def validate(self, data):
        user = self.context['request'].user
        
        # Verificar que el usuario no tenga otro turno abierto
        if not self.instance:  # Solo en creación
            open_shifts = Shift.objects.filter(user=user, status='open')
            if open_shifts.exists():
                raise serializers.ValidationError({
                    'user': 'Ya tienes un turno abierto. Cierra el turno actual antes de abrir uno nuevo.'
                })
        
        return data
    
    def create(self, validated_data):
        # Generar número de turno
        company = self.context['request'].user.company
        last_shift = Shift.objects.filter(company=company).order_by('-created_at').first()
        
        if last_shift and last_shift.shift_number:
            try:
                last_number = int(last_shift.shift_number.split('-')[-1])
                new_number = last_number + 1
            except:
                new_number = 1
        else:
            new_number = 1
        
        validated_data['shift_number'] = f"TUR-{new_number:06d}"
        validated_data['company'] = company
        validated_data['user'] = self.context['request'].user
        
        return super().create(validated_data)


class ShiftListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados"""
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    sales_count = serializers.SerializerMethodField()
    total_sales = serializers.SerializerMethodField()
    
    class Meta:
        model = Shift
        fields = [
            'id', 'shift_number', 'user_name', 'status', 'status_display',
            'opening_cash', 'expected_total', 'closing_total', 'total_difference',
            'opened_at', 'closed_at', 'sales_count', 'total_sales'
        ]
    
    def get_sales_count(self, obj):
        return obj.sales.filter(status='completed').count()
    
    def get_total_sales(self, obj):
        return obj.sales.filter(status='completed').aggregate(
            total=Sum('total')
        )['total'] or 0


class OpenShiftSerializer(serializers.Serializer):
    """Serializer para abrir un turno"""
    
    opening_cash = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    opening_notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)


class CloseShiftSerializer(serializers.Serializer):
    """Serializer para cerrar un turno"""
    
    shift_id = serializers.UUIDField()
    closing_cash = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    closing_card = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, default=0)
    closing_transfer = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, default=0)
    closing_notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    
    def validate_shift_id(self, value):
        try:
            shift = Shift.objects.get(id=value)
        except Shift.DoesNotExist:
            raise serializers.ValidationError('El turno no existe')
        
        if shift.status != 'open':
            raise serializers.ValidationError('El turno ya está cerrado')
        
        if shift.user != self.context['request'].user and not self.context['request'].user.is_superuser:
            raise serializers.ValidationError('Solo puedes cerrar tus propios turnos')
        
        if shift.company != self.context['request'].user.company:
            raise serializers.ValidationError('No tienes permisos para este turno')
        
        return value


class ShiftSummarySerializer(serializers.Serializer):
    """Serializer para resumen del turno"""
    
    shift_number = serializers.CharField()
    user_name = serializers.CharField()
    opened_at = serializers.DateTimeField()
    closed_at = serializers.DateTimeField(allow_null=True)
    
    # Totales de ventas
    total_sales = serializers.IntegerField()
    sales_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Por método de pago
    cash_sales = serializers.DecimalField(max_digits=12, decimal_places=2)
    card_sales = serializers.DecimalField(max_digits=12, decimal_places=2)
    transfer_sales = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Movimientos de caja
    cash_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    cash_expense = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Esperado vs Real
    expected_cash = serializers.DecimalField(max_digits=12, decimal_places=2)
    closing_cash = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    cash_difference = serializers.DecimalField(max_digits=12, decimal_places=2)