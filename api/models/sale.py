from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
import uuid

class Sale(models.Model):
    """Modelo principal para ventas en el punto de venta"""
    
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('completed', 'Completada'),
        ('cancelled', 'Cancelada'),
        ('refunded', 'Reembolsada'),
    ]
    
    SALE_TYPES = [
        ('regular', 'Venta Regular'),
        ('credit', 'Venta a Crédito'),
        ('consignment', 'Consignación'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('Company', on_delete=models.CASCADE, related_name='sales')
    
    # Referencias
    sale_number = models.CharField(max_length=50, unique=True, db_index=True)
    invoice_number = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    
    # Cliente (opcional para ventas sin cliente registrado)
    client = models.ForeignKey('Client', on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    
    # Tipo de venta
    sale_type = models.CharField(max_length=20, choices=SALE_TYPES, default='regular', db_index=True)
    
    # Montos
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    
    # Estado
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    
    # Turno y caja
    shift = models.ForeignKey('Shift', on_delete=models.SET_NULL, null=True, related_name='sales')
    
    # Fechas
    sale_date = models.DateTimeField(auto_now_add=True, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    # Notas
    notes = models.TextField(blank=True, null=True)
    cancellation_reason = models.TextField(blank=True, null=True)
    
    # Auditoría
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='sales_created')
    cancelled_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='sales_cancelled')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sales'
        ordering = ['-sale_date']
        indexes = [
            models.Index(fields=['company', 'sale_date'], name='idx_sale_co_date'),
            models.Index(fields=['status', 'sale_type'], name='idx_sale_st_type'),
            models.Index(fields=['client', 'sale_date'], name='idx_sale_cu_date'),
            models.Index(fields=['shift'], name='idx_sale_shift'),
        ]
    
    def __str__(self):
        return f"Venta {self.sale_number} - ${self.total}"
    
    def calculate_totals(self):
        """Recalcula los totales de la venta basándose en los items"""
        items = self.items.all()
        
        self.subtotal = sum(item.subtotal for item in items)
        self.discount_amount = sum(item.discount_amount for item in items)
        self.tax_amount = sum(item.tax_amount for item in items)
        self.total = sum(item.total for item in items)
    
    def apply_promotions(self):
        """Aplica promociones aplicables a los items de la venta"""
        from django.utils import timezone
        now = timezone.now()
        
        # Obtener promociones activas
        promotions = self.company.promotions.filter(
            status='active',
            start_date__lte=now,
            end_date__gte=now
        ).order_by('-priority')
        
        for item in self.items.all():
            applicable_promotions = [
                promo for promo in promotions
                if promo.can_apply_to_product(item.product)
            ]
            
            if applicable_promotions:
                # Aplicar la promoción de mayor prioridad
                best_promotion = applicable_promotions[0]
                discount = best_promotion.calculate_discount(item.quantity, item.unit_price)
                
                if discount > 0:
                    item.promotion = best_promotion
                    item.discount_amount = discount
                    item.save()
    
    def complete_sale(self):
        """Completa la venta y actualiza inventario"""
        if self.status != 'pending':
            raise ValidationError('Solo se pueden completar ventas pendientes')
        
        # Verificar que hay suficiente stock
        for item in self.items.all():
            if item.product.track_inventory:
                if item.product.stock < item.quantity:
                    raise ValidationError(f'Stock insuficiente para {item.product.name}')
        
        # Actualizar stock
        for item in self.items.all():
            if item.product.track_inventory:
                item.product.stock -= item.quantity
                item.product.save()
        
        # Actualizar estado
        from django.utils import timezone
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()
    
    def cancel_sale(self, reason, user):
        """Cancela la venta y restaura inventario"""
        if self.status != 'completed':
            raise ValidationError('Solo se pueden cancelar ventas completadas')
        
        # Restaurar stock
        for item in self.items.all():
            if item.product.track_inventory:
                item.product.stock += item.quantity
                item.product.save()
        
        # Actualizar estado
        from django.utils import timezone
        self.status = 'cancelled'
        self.cancelled_at = timezone.now()
        self.cancellation_reason = reason
        self.cancelled_by = user
        self.save()


class SaleItem(models.Model):
    """Items individuales de una venta"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('Product', on_delete=models.PROTECT, related_name='sale_items')
    
    # Cantidades y precios
    quantity = models.DecimalField(
        max_digits=10, 
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))]
    )
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Montos calculados
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Promoción aplicada
    promotion = models.ForeignKey('Promotion', on_delete=models.SET_NULL, null=True, blank=True, related_name='sale_items')
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sale_items'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['sale', 'product'], name='idx_sitem_sal_pro'),
        ]
    
    def save(self, *args, **kwargs):
        # Calcular montos
        self.subtotal = self.quantity * self.unit_price
        
        # Calcular impuestos si el producto es taxable
        if self.product.taxable:
            # IVA 19% en Chile
            self.tax_amount = self.subtotal * Decimal('0.19')
        else:
            self.tax_amount = 0
        
        # Total = subtotal + impuestos - descuentos
        self.total = self.subtotal + self.tax_amount - self.discount_amount
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.quantity} x {self.product.name} - ${self.total}"


class SalePayment(models.Model):
    """Pagos asociados a una venta (puede haber múltiples métodos de pago)"""
    
    PAYMENT_METHODS = [
        ('cash', 'Efectivo'),
        ('debit', 'Débito'),
        ('credit_card', 'Tarjeta de Crédito'),
        ('transfer', 'Transferencia'),
        ('check', 'Cheque'),
        ('credit', 'Crédito'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='payments')
    
    # Información del pago
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, db_index=True)
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    
    # Para pagos con tarjeta o transferencia
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'sale_payments'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['sale', 'payment_method'], name='idx_spay_sal_meth'),
        ]
    
    def __str__(self):
        return f"{self.get_payment_method_display()} - ${self.amount}"