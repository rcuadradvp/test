# api/models/client.py

from django.db import models
import uuid
from .company import Company
from .user import User

class Client(models.Model):
    """Clientes"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='clients')
    
    # Datos personales
    rut = models.CharField(max_length=12, unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    
    # Configuración de crédito
    has_credit = models.BooleanField(default=False)
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)  # NULL = ilimitado
    current_debt = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Descuento
    has_discount = models.BooleanField(default=False)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Estado
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'clients'
        indexes = [
            models.Index(fields=['company', 'rut'], name='idx_client_comp_rut'),
            models.Index(fields=['has_credit'], name='idx_client_credit'),
            models.Index(fields=['is_active'], name='idx_client_active'),
        ]


class Credit(models.Model):
    """Créditos de clientes"""
    STATUS_CHOICES = [
        ('active', 'Activo'),
        ('paid', 'Pagado'),
        ('overdue', 'Vencido'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='credits')
    sale = models.OneToOneField('Sale', on_delete=models.CASCADE, related_name='credit')
    
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    remaining_amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    due_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'credits'
        indexes = [
            models.Index(fields=['client', 'status'], name='idx_cred_cli_stat'),
            models.Index(fields=['status'], name='idx_cred_status'),
            models.Index(fields=['due_date'], name='idx_cred_due'),
        ]


class CreditPayment(models.Model):
    """Pagos de créditos"""
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Efectivo'),
        ('debit', 'Débito'),
        ('credit_card', 'Tarjeta de Crédito'),
        ('transfer', 'Transferencia'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    credit = models.ForeignKey(Credit, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    
    registered_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='credit_payments')
    shift = models.ForeignKey('Shift', on_delete=models.PROTECT, null=True, related_name='credit_payments')
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'credit_payments'
        indexes = [
            models.Index(fields=['credit'], name='idx_cp_credit'),
            models.Index(fields=['created_at'], name='idx_cp_created'),
        ]