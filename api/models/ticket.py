# project/api/models/ticket.py

from django.db import models
from django.core.validators import MinValueValidator
import uuid

class Ticket(models.Model):
    """
    Modelo para gestionar tickets de venta pendientes de impresión
    Permite crear múltiples tickets y eliminarlos antes de imprimir
    """
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('printed', 'Impreso'),
        ('cancelled', 'Cancelado'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('Company', on_delete=models.CASCADE, related_name='tickets')
    sale = models.ForeignKey('Sale', on_delete=models.CASCADE, related_name='tickets')
    
    # Número de ticket para identificación
    ticket_number = models.CharField(max_length=50, unique=True, db_index=True)
    
    # Estado
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    
    # Contenido del ticket (guardado como JSON para fácil reproducción)
    ticket_data = models.JSONField(help_text='Datos del ticket en formato JSON')
    
    # Control de impresión
    created_by = models.ForeignKey('User', on_delete=models.PROTECT, related_name='created_tickets')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    printed_at = models.DateTimeField(null=True, blank=True)
    printed_by = models.ForeignKey('User', on_delete=models.PROTECT, null=True, blank=True, related_name='printed_tickets')
    
    # Notas
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'tickets'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'status'], name='idx_ticket_comp_st'),
            models.Index(fields=['sale'], name='idx_ticket_sale'),
            models.Index(fields=['created_at'], name='idx_ticket_created'),
        ]
    
    def __str__(self):
        return f"Ticket {self.ticket_number} - {self.get_status_display()}"
    
    def mark_as_printed(self, user):
        """Marcar ticket como impreso"""
        from django.utils import timezone
        self.status = 'printed'
        self.printed_at = timezone.now()
        self.printed_by = user
        self.save()


class StockAudit(models.Model):
    """
    Modelo para auditar cambios críticos en el inventario
    Especialmente importante para el reinicio de stock
    """
    ACTION_CHOICES = [
        ('reset', 'Reinicio de Stock'),
        ('adjustment', 'Ajuste Manual'),
        ('bulk_update', 'Actualización Masiva'),
        ('import', 'Importación'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('Company', on_delete=models.CASCADE, related_name='stock_audits')
    
    # Tipo de acción
    action_type = models.CharField(max_length=30, choices=ACTION_CHOICES, db_index=True)
    
    # Detalles
    description = models.TextField()
    affected_products_count = models.IntegerField(default=0)
    
    # Datos antes/después (guardado como JSON)
    before_data = models.JSONField(null=True, blank=True, help_text='Estado antes del cambio')
    after_data = models.JSONField(null=True, blank=True, help_text='Estado después del cambio')
    
    # Usuario responsable
    performed_by = models.ForeignKey('User', on_delete=models.PROTECT, related_name='stock_audits')
    performed_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # IP y metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    
    # Aprobación (para acciones críticas)
    requires_approval = models.BooleanField(default=False)
    approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey('User', on_delete=models.PROTECT, null=True, blank=True, related_name='approved_audits')
    approved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'stock_audits'
        ordering = ['-performed_at']
        indexes = [
            models.Index(fields=['company', 'action_type'], name='idx_audit_comp_act'),
            models.Index(fields=['performed_at'], name='idx_audit_date'),
            models.Index(fields=['performed_by'], name='idx_audit_user'),
        ]
    
    def __str__(self):
        return f"{self.get_action_type_display()} - {self.performed_at.strftime('%Y-%m-%d %H:%M')}"


class LastPrintedTicket(models.Model):
    """
    Modelo para rastrear el último ticket impreso por usuario
    Permite la función de "reimprimir último ticket"
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField('User', on_delete=models.CASCADE, related_name='last_printed_ticket')
    ticket = models.ForeignKey(Ticket, on_delete=models.SET_NULL, null=True, related_name='last_printed_by_users')
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'last_printed_tickets'
    
    def __str__(self):
        return f"Último ticket de {self.user.username}"