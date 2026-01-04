# api/models/company.py

from django.db import models
import uuid

class Company(models.Model):
    """Modelo para multi-empresa"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name="Nombre Empresa")
    rut = models.CharField(max_length=12, unique=True, verbose_name="RUT")
    address = models.TextField(verbose_name="Dirección")
    phone = models.CharField(max_length=20)
    email = models.EmailField(unique=True)
    logo = models.ImageField(upload_to='company_logos/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Configuraciones específicas de la empresa
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=19.00)  # IVA
    currency = models.CharField(max_length=3, default='CLP')
    
    class Meta:
        db_table = 'companies'
        verbose_name = 'Empresa'
        verbose_name_plural = 'Empresas'
        indexes = [
            models.Index(fields=['rut'], name='idx_comp_rut'),
            models.Index(fields=['is_active'], name='idx_comp_active'),
        ]