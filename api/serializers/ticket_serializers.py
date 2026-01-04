# project/api/serializers/ticket_serializers.py

from rest_framework import serializers
from api.models import Ticket, StockAudit, LastPrintedTicket, Sale
from django.db import transaction

class TicketSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    printed_by_name = serializers.CharField(source='printed_by.username', read_only=True, allow_null=True)
    sale_number = serializers.CharField(source='sale.sale_number', read_only=True)
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'company', 'sale', 'sale_number', 'ticket_number',
            'status', 'status_display', 'ticket_data',
            'created_by', 'created_by_name', 'created_at',
            'printed_at', 'printed_by', 'printed_by_name', 'notes'
        ]
        read_only_fields = [
            'id', 'company', 'ticket_number', 'status',
            'created_by', 'created_at', 'printed_at', 'printed_by'
        ]
    
    def validate_sale(self, value):
        """Validar que la venta exista y esté completada"""
        if value.status != 'completed':
            raise serializers.ValidationError('Solo se pueden crear tickets de ventas completadas')
        
        if value.company != self.context['request'].user.company:
            raise serializers.ValidationError('No tienes permisos para esta venta')
        
        return value
    
    @transaction.atomic
    def create(self, validated_data):
        # Generar número de ticket
        company = self.context['request'].user.company
        last_ticket = Ticket.objects.filter(company=company).order_by('-created_at').first()
        
        if last_ticket and last_ticket.ticket_number:
            try:
                last_number = int(last_ticket.ticket_number.split('-')[-1])
                new_number = last_number + 1
            except:
                new_number = 1
        else:
            new_number = 1
        
        validated_data['ticket_number'] = f"TKT-{new_number:06d}"
        validated_data['company'] = company
        validated_data['created_by'] = self.context['request'].user
        
        # Generar datos del ticket si no se proporcionaron
        if 'ticket_data' not in validated_data or not validated_data['ticket_data']:
            sale = validated_data['sale']
            validated_data['ticket_data'] = self._generate_ticket_data(sale)
        
        return super().create(validated_data)
    
    def _generate_ticket_data(self, sale):
        """Generar datos del ticket desde la venta"""
        from api.serializers.sale_serializer import SaleSerializer
        
        # Serializar la venta completa
        sale_data = SaleSerializer(sale).data
        
        # Agregar información del cajero
        ticket_data = {
            'sale': sale_data,
            'cashier': {
                'name': sale.created_by.username if sale.created_by else 'N/A',
                'email': sale.created_by.email if sale.created_by else ''
            },
            'company': {
                'name': sale.company.name if sale.company else ''
            },
            'print_date': None  # Se llenará al imprimir
        }
        
        return ticket_data


class TicketListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    sale_number = serializers.CharField(source='sale.sale_number', read_only=True)
    sale_total = serializers.DecimalField(source='sale.total', max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_number', 'sale_number', 'sale_total',
            'status', 'status_display', 'created_by_name', 'created_at'
        ]


class PrintTicketSerializer(serializers.Serializer):
    """Serializer para imprimir un ticket"""
    ticket_id = serializers.UUIDField()
    
    def validate_ticket_id(self, value):
        try:
            ticket = Ticket.objects.get(id=value)
        except Ticket.DoesNotExist:
            raise serializers.ValidationError('Ticket no encontrado')
        
        if ticket.company != self.context['request'].user.company:
            raise serializers.ValidationError('No tienes permisos para este ticket')
        
        return value


class StockAuditSerializer(serializers.ModelSerializer):
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.username', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True, allow_null=True)
    
    class Meta:
        model = StockAudit
        fields = [
            'id', 'company', 'action_type', 'action_type_display',
            'description', 'affected_products_count',
            'before_data', 'after_data',
            'performed_by', 'performed_by_name', 'performed_at',
            'ip_address', 'user_agent',
            'requires_approval', 'approved', 'approved_by', 'approved_by_name', 'approved_at'
        ]
        read_only_fields = [
            'id', 'company', 'performed_by', 'performed_at',
            'approved', 'approved_by', 'approved_at'
        ]


class StockResetSerializer(serializers.Serializer):
    """Serializer para reiniciar stock"""
    confirmation = serializers.CharField()
    reason = serializers.CharField(max_length=500)
    
    def validate_confirmation(self, value):
        if value != "CONFIRMAR_REINICIO_STOCK":
            raise serializers.ValidationError(
                'Debe escribir exactamente "CONFIRMAR_REINICIO_STOCK" para confirmar esta acción'
            )
        return value
    
    def validate(self, data):
        # Verificar que el usuario sea Master Admin
        user = self.context['request'].user
        if user.role.name != 'master_admin':
            raise serializers.ValidationError(
                'Solo el Master Admin puede reiniciar el stock'
            )
        
        return data


class BulkStockUpdateSerializer(serializers.Serializer):
    """Serializer para actualización masiva de stock"""
    updates = serializers.ListField(
        child=serializers.DictField(),
        help_text='Lista de productos con sus nuevos stocks'
    )
    reason = serializers.CharField(max_length=500)
    
    def validate_updates(self, value):
        """Validar formato de actualizaciones"""
        for update in value:
            if 'product_id' not in update:
                raise serializers.ValidationError('Cada actualización debe incluir product_id')
            
            if 'new_stock' not in update:
                raise serializers.ValidationError('Cada actualización debe incluir new_stock')
            
            try:
                new_stock = float(update['new_stock'])
                if new_stock < 0:
                    raise ValueError()
            except (ValueError, TypeError):
                raise serializers.ValidationError('new_stock debe ser un número positivo')
        
        return value


class LastPrintedTicketSerializer(serializers.ModelSerializer):
    ticket_number = serializers.CharField(source='ticket.ticket_number', read_only=True)
    ticket_data = serializers.JSONField(source='ticket.ticket_data', read_only=True)
    
    class Meta:
        model = LastPrintedTicket
        fields = ['id', 'user', 'ticket', 'ticket_number', 'ticket_data', 'updated_at']
        read_only_fields = ['id', 'updated_at']