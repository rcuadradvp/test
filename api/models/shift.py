from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
import uuid

class Shift(models.Model):
    """Modelo para gestionar turnos de caja"""
    
    STATUS_CHOICES = [
        ('open', 'Abierto'),
        ('closed', 'Cerrado'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('Company', on_delete=models.CASCADE, related_name='shifts')
    user = models.ForeignKey('User', on_delete=models.PROTECT, related_name='shifts')
    
    # Información del turno
    shift_number = models.CharField(max_length=50, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open', db_index=True)
    
    # Montos de apertura
    opening_cash = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Efectivo inicial en caja'
    )
    
    # Montos esperados (calculados)
    expected_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_card = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_transfer = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Montos reales de cierre
    closing_cash = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    closing_card = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    closing_transfer = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    closing_total = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Diferencias
    cash_difference = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    card_difference = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transfer_difference = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_difference = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Fechas
    opened_at = models.DateTimeField(auto_now_add=True, db_index=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    # Notas
    opening_notes = models.TextField(blank=True, null=True)
    closing_notes = models.TextField(blank=True, null=True)

    lunch_break_start = models.DateTimeField(null=True, blank=True)
    lunch_break_end = models.DateTimeField(null=True, blank=True)
    
    # Auditoría
    closed_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='shifts_closed')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'shifts'
        ordering = ['-opened_at']
        indexes = [
            models.Index(fields=['company', 'user', 'status'], name='idx_shift_co_us_s'),
            models.Index(fields=['opened_at'], name='idx_shift_opened'),
        ]
    
    def __str__(self):
        return f"Turno {self.shift_number} - {self.user.username}"
    
    def calculate_expected_amounts(self):
        """Calcula los montos esperados basándose en ventas y movimientos"""
        from django.db.models import Sum, Q
        
        # Ventas del turno
        sales = self.sales.filter(status='completed')
        
        # Pagos por método
        cash_payments = sales.aggregate(
            total=Sum('payments__amount', filter=Q(payments__payment_method='cash'))
        )['total'] or Decimal('0')
        
        card_payments = sales.aggregate(
            total=Sum('payments__amount', filter=Q(payments__payment_method__in=['debit', 'credit_card']))
        )['total'] or Decimal('0')
        
        transfer_payments = sales.aggregate(
            total=Sum('payments__amount', filter=Q(payments__payment_method='transfer'))
        )['total'] or Decimal('0')
        
        # Movimientos de caja
        cash_movements = self.cash_movements.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        
        # Calcular esperados
        self.expected_cash = self.opening_cash + cash_payments + cash_movements
        self.expected_card = card_payments
        self.expected_transfer = transfer_payments
        self.expected_total = self.expected_cash + self.expected_card + self.expected_transfer
    
    def close_shift(self, closing_amounts, closed_by, notes=''):
        """Cierra el turno y calcula diferencias"""
        if self.status != 'open':
            raise ValidationError('Solo se pueden cerrar turnos abiertos')
        
        # Verificar que no haya otro turno abierto para el mismo usuario
        open_shifts = Shift.objects.filter(
            company=self.company,
            user=self.user,
            status='open'
        ).exclude(id=self.id)
        
        if open_shifts.exists():
            raise ValidationError('El usuario tiene otro turno abierto')
        
        # Calcular montos esperados
        self.calculate_expected_amounts()
        
        # Registrar montos de cierre
        self.closing_cash = closing_amounts.get('cash', 0)
        self.closing_card = closing_amounts.get('card', 0)
        self.closing_transfer = closing_amounts.get('transfer', 0)
        self.closing_total = self.closing_cash + self.closing_card + self.closing_transfer
        
        # Calcular diferencias
        self.cash_difference = self.closing_cash - self.expected_cash
        self.card_difference = self.closing_card - self.expected_card
        self.transfer_difference = self.closing_transfer - self.expected_transfer
        self.total_difference = self.closing_total - self.expected_total
        
        # Actualizar estado
        from django.utils import timezone
        self.status = 'closed'
        self.closed_at = timezone.now()
        self.closed_by = closed_by
        self.closing_notes = notes
        
        self.save()
    
    def has_active_sales(self):
        """Verifica si el turno tiene ventas pendientes"""
        return self.sales.filter(status='pending').exists()


class CashMovement(models.Model):
    """Modelo para registrar movimientos de efectivo (retiros, ingresos)"""
    
    MOVEMENT_TYPES = [
        ('income', 'Ingreso'),
        ('expense', 'Egreso'),
        ('withdrawal', 'Retiro'),
        ('deposit', 'Depósito'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name='cash_movements')
    
    # Información del movimiento
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES, db_index=True)
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    
    # Descripción y razón
    reason = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Referencia (número de comprobante, factura, etc.)
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    
    # Auditoría
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='cash_movements_created')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'cash_movements'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['shift', 'movement_type'], name='idx_cmov_sh_type'),
            models.Index(fields=['created_at'], name='idx_cmov_created'),
        ]
    
    def save(self, *args, **kwargs):
        # Convertir egresos y retiros a negativos
        if self.movement_type in ['expense', 'withdrawal'] and self.amount > 0:
            self.amount = -self.amount
        
        # Asegurar que ingresos y depósitos sean positivos
        if self.movement_type in ['income', 'deposit'] and self.amount < 0:
            self.amount = abs(self.amount)
        
        super().save(*args, **kwargs)
    
    def clean(self):
        # Validar que el turno esté abierto
        if self.shift.status != 'open':
            raise ValidationError('No se pueden registrar movimientos en un turno cerrado')
    
    def __str__(self):
        return f"{self.get_movement_type_display()} - ${abs(self.amount)}"


class CashCount(models.Model):
    """Modelo para registrar el arqueo de caja (conteo de billetes y monedas)"""
    
    DENOMINATIONS = [
        (20000, '$20.000'),
        (10000, '$10.000'),
        (5000, '$5.000'),
        (2000, '$2.000'),
        (1000, '$1.000'),
        (500, '$500'),
        (100, '$100'),
        (50, '$50'),
        (10, '$10'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name='cash_counts')
    
    # Conteo por denominación
    count_20000 = models.PositiveIntegerField(default=0, verbose_name='$20.000')
    count_10000 = models.PositiveIntegerField(default=0, verbose_name='$10.000')
    count_5000 = models.PositiveIntegerField(default=0, verbose_name='$5.000')
    count_2000 = models.PositiveIntegerField(default=0, verbose_name='$2.000')
    count_1000 = models.PositiveIntegerField(default=0, verbose_name='$1.000')
    count_500 = models.PositiveIntegerField(default=0, verbose_name='$500')
    count_100 = models.PositiveIntegerField(default=0, verbose_name='$100')
    count_50 = models.PositiveIntegerField(default=0, verbose_name='$50')
    count_10 = models.PositiveIntegerField(default=0, verbose_name='$10')
    
    # Total calculado
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Notas
    notes = models.TextField(blank=True, null=True)
    
    # Auditoría
    counted_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='cash_counts')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'cash_counts'
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        # Calcular total automáticamente
        self.total = (
            self.count_20000 * 20000 +
            self.count_10000 * 10000 +
            self.count_5000 * 5000 +
            self.count_2000 * 2000 +
            self.count_1000 * 1000 +
            self.count_500 * 500 +
            self.count_100 * 100 +
            self.count_50 * 50 +
            self.count_10 * 10
        )
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Arqueo - ${self.total}"