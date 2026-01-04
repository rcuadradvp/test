from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
import uuid

class Consignment(models.Model):
    """
    Modelo para gestionar consignaciones (mercadería entregada a un cliente
    para su venta, con posibilidad de devolución de lo no vendido)
    """
    
    STATUS_CHOICES = [
        ('active', 'Activa'),
        ('partially_settled', 'Liquidada Parcialmente'),
        ('settled', 'Liquidada'),
        ('cancelled', 'Cancelada'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('Company', on_delete=models.CASCADE, related_name='consignments')
    client = models.ForeignKey('Client', on_delete=models.PROTECT, related_name='consignments', null=True, blank=True)
    
    # Referencias
    consignment_number = models.CharField(max_length=50, unique=True, db_index=True, default='TEMP-00000', blank=True)
    
    # Estado
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='active', db_index=True)
    
    # Fechas
    delivery_date = models.DateTimeField(auto_now_add=True)
    expected_return_date = models.DateField()
    settlement_date = models.DateTimeField(null=True, blank=True)
    
    # Montos totales (calculados desde los items)
    total_delivered_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_sold_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_returned_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Notas
    delivery_notes = models.TextField(blank=True, null=True)
    settlement_notes = models.TextField(blank=True, null=True)
    
    # Auditoría
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='consignments_created')
    settled_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='consignments_settled')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'consignments'
        ordering = ['-delivery_date']
        indexes = [
            models.Index(fields=['company', 'client'], name='idx_cons_comp_cus'),
            models.Index(fields=['status', 'delivery_date'], name='idx_cons_st_date'),
            models.Index(fields=['consignment_number'], name='idx_cons_number'),
        ]
    
    def __str__(self):
        return f"Consignación {self.consignment_number} - {self.client.name}"
    
    def calculate_totals(self):
        """Recalcula los totales basándose en los items"""
        items = self.items.all()
        
        self.total_delivered_value = sum(
            item.delivered_quantity * item.unit_price for item in items
        )
        self.total_sold_value = sum(
            item.sold_quantity * item.unit_price for item in items
        )
        self.total_returned_value = sum(
            item.returned_quantity * item.unit_price for item in items
        )
    
    def can_settle(self):
        """Verifica si la consignación puede ser liquidada"""
        if self.status in ['settled', 'cancelled']:
            return False
        
        # Verificar que todos los items tengan cantidades definidas
        for item in self.items.all():
            if item.sold_quantity + item.returned_quantity != item.delivered_quantity:
                return False
        
        return True
    
    def settle(self, user, notes=''):
        """Liquida la consignación"""
        if not self.can_settle():
            raise ValidationError('La consignación no puede ser liquidada')
        
        # Actualizar inventario (devolver productos no vendidos)
        for item in self.items.all():
            if item.returned_quantity > 0 and item.product.track_inventory:
                item.product.stock += item.returned_quantity
                item.product.save()
        
        # Crear venta si hubo productos vendidos
        if self.total_sold_value > 0:
            from django.utils import timezone
            
            sale = Sale.objects.create(
                company=self.company,
                client=self.client,
                sale_type='consignment',
                subtotal=self.total_sold_value,
                total=self.total_sold_value,
                status='completed',
                completed_at=timezone.now(),
                created_by=user,
                notes=f'Liquidación de consignación {self.consignment_number}'
            )
            
            # Crear items de venta
            for item in self.items.all():
                if item.sold_quantity > 0:
                    SaleItem.objects.create(
                        sale=sale,
                        product=item.product,
                        quantity=item.sold_quantity,
                        unit_price=item.unit_price
                    )
        
        # Actualizar estado de consignación
        from django.utils import timezone
        self.status = 'settled'
        self.settlement_date = timezone.now()
        self.settlement_notes = notes
        self.settled_by = user
        self.save()
    
    def is_overdue(self):
        """Verifica si la consignación está vencida"""
        from django.utils import timezone
        return (
            self.status == 'active' and
            self.expected_return_date < timezone.now().date()
        )


class ConsignmentItem(models.Model):
    """Items individuales de una consignación"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consignment = models.ForeignKey(Consignment, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('Product', on_delete=models.PROTECT, related_name='consignment_items')
    
    # Cantidades
    delivered_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))],
        help_text='Cantidad entregada al cliente'
    )
    sold_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Cantidad vendida por el cliente'
    )
    returned_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Cantidad devuelta por el cliente'
    )
    
    # Precio unitario
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'consignment_items'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['consignment', 'product'], name='idx_citem_con_pro'),
        ]
    
    def clean(self):
        # Validar que sold + returned no sea mayor que delivered
        total_accounted = self.sold_quantity + self.returned_quantity
        if total_accounted > self.delivered_quantity:
            raise ValidationError(
                f'La suma de vendido ({self.sold_quantity}) y devuelto ({self.returned_quantity}) '
                f'no puede ser mayor a lo entregado ({self.delivered_quantity})'
            )
        
        # Validar que el producto tenga suficiente stock al crear
        if not self.pk and self.product.track_inventory:
            if self.product.stock < self.delivered_quantity:
                raise ValidationError(f'Stock insuficiente para {self.product.name}')
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        
        super().save(*args, **kwargs)
        
        # Reducir stock al crear (entregar al cliente)
        if is_new and self.product.track_inventory:
            self.product.stock -= self.delivered_quantity
            self.product.save()
    
    def __str__(self):
        return f"{self.delivered_quantity} x {self.product.name}"
    
    @property
    def pending_quantity(self):
        """Cantidad pendiente de liquidar"""
        return self.delivered_quantity - (self.sold_quantity + self.returned_quantity)


# Importar Sale y SaleItem al final para evitar imports circulares
from api.models.sale import Sale, SaleItem