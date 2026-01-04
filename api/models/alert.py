# api/models/alert.py

from django.db import models
import uuid
from .company import Company
from .user import User
from .product import Product

class SystemAlert(models.Model):
    """Alertas del sistema"""
    TYPE_CHOICES = [
        ('low_stock', 'Stock Bajo'),
        ('supplier_payment', 'Pago a Proveedor'),
        ('overdue_credit', 'Crédito Vencido'),
        ('system', 'Sistema'),
    ]
    
    STATUS_CHOICES = [
        ('unread', 'No Leída'),
        ('read', 'Leída'),
        ('dismissed', 'Descartada'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='alerts')
    alert_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    
    # Contenido
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Relaciones opcionales
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True)
    supplier_payment = models.ForeignKey('SupplierPayment', on_delete=models.CASCADE, null=True, blank=True)
    
    # Estado
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unread')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'system_alerts'
        indexes = [
            models.Index(fields=['company', 'status'], name='idx_alert_comp_st'),
            models.Index(fields=['alert_type'], name='idx_alert_type'),
            models.Index(fields=['created_at'], name='idx_alert_created'),
        ]


class UserAlert(models.Model):
    """Relación de alertas con usuarios específicos"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    alert = models.ForeignKey(SystemAlert, on_delete=models.CASCADE, related_name='user_alerts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alerts')
    
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'user_alerts'
        unique_together = [['alert', 'user']]
        indexes = [
            models.Index(fields=['user', 'is_read'], name='idx_ua_usr_read'),
        ]