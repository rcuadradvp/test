# api/models/configuration.py

from django.db import models
import uuid
from .company import Company
from .user import User

class PrinterConfiguration(models.Model):
    """Configuración de impresoras"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='printer_configs')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='printer_configs')
    
    printer_name = models.CharField(max_length=200)
    font_family = models.CharField(max_length=100, default='Arial')
    font_size = models.IntegerField(default=12)
    columns = models.IntegerField(default=40)
    use_bold = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'printer_configurations'
        indexes = [
            models.Index(fields=['user', 'is_active'], name='idx_pc_usr_active'),
        ]


class BarcodeReaderConfiguration(models.Model):
    """Configuración de lector de códigos de barra"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='barcode_configs')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='barcode_configs')
    
    port = models.CharField(max_length=50)
    baud_rate = models.IntegerField(default=9600)
    data_bits = models.IntegerField(default=8)
    parity = models.CharField(max_length=10, default='None')
    stop_bits = models.IntegerField(default=1)
    flow_control = models.CharField(max_length=20, default='None')
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'barcode_configurations'
        indexes = [
            models.Index(fields=['user', 'is_active'], name='idx_bc_usr_active'),
        ]