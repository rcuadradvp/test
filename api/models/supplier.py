# api/models/supplier.py

from django.db import models
import uuid
from .company import Company
from .user import User
from .product import Product, Department

class Supplier(models.Model):
    """Proveedores"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='suppliers')
    rut = models.CharField(max_length=20, blank=True, default="", unique=True)

    name = models.CharField(max_length=200)
    representative = models.CharField(max_length=200, blank=True)
    phone_1 = models.CharField(max_length=20, blank=True)
    phone_2 = models.CharField(max_length=20, blank=True)
    email_1 = models.EmailField(blank=True)
    email_2 = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    address = models.TextField(blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'suppliers'
        indexes = [
            models.Index(fields=['company', 'name'], name='idx_supp_comp_name'),
            models.Index(fields=['is_active'], name='idx_supp_active'),
        ]


class PurchaseOrder(models.Model):
    """Órdenes de compra"""
    STATUS_CHOICES = [
        ('pending', 'En Espera'),
        ('cancelled', 'Cancelada'),
        ('paid', 'Pagada'),
        ('partial', 'Pago Parcial'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='purchase_orders')
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='purchase_orders')
    
    order_number = models.CharField(max_length=50, unique=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_purchase_orders')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'purchase_orders'
        indexes = [
            models.Index(fields=['company', 'status'], name='idx_po_comp_stat'),
            models.Index(fields=['supplier'], name='idx_po_supplier'),
            models.Index(fields=['created_at'], name='idx_po_created'),
        ]


class PurchaseOrderItem(models.Model):
    """Items de órdenes de compra"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    
    # Puede ser un producto existente o uno nuevo
    product = models.ForeignKey(Product, on_delete=models.PROTECT, null=True, blank=True, related_name='purchase_items')
    product_name = models.CharField(max_length=200)  # Nombre (existente o nuevo)
    product_code = models.CharField(max_length=100, blank=True)
    
    department = models.ForeignKey(Department, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    
    # IVA
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=19.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    
    class Meta:
        db_table = 'purchase_order_items'
        indexes = [
            models.Index(fields=['purchase_order'], name='idx_poi_po'),
        ]


class SupplierPayment(models.Model):
    """Pagos a proveedores"""
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Efectivo'),
        ('check', 'Cheque'),
        ('card', 'Tarjeta'),
        ('transfer', 'Transferencia'),
    ]
    
    PAYMENT_SOURCE_CHOICES = [
        ('cash_register', 'Caja'),
        ('external', 'Entrega Externa'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='payments')
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    payment_source = models.CharField(max_length=20, choices=PAYMENT_SOURCE_CHOICES)
    
    # Si es pago desde caja
    shift = models.ForeignKey('Shift', on_delete=models.PROTECT, null=True, blank=True, related_name='supplier_payments')
    
    # Si es entrega externa
    delivered_by = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, related_name='delivered_payments')
    delivery_registered_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='registered_payments')
    
    notes = models.TextField(blank=True)
    payment_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'supplier_payments'
        indexes = [
            models.Index(fields=['purchase_order'], name='idx_sp_po'),
            models.Index(fields=['payment_date'], name='idx_sp_date'),
        ]