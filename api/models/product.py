# api/models/product.py
from django.db import models
from django.utils.text import slugify
import uuid
from .company import Company
from .user import User


class Department(models.Model):
    """Departamentos/Categorías de productos"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'departments'
        unique_together = [['company', 'name'], ['company', 'slug']]
        indexes = [
            models.Index(fields=['company', 'name'], name='idx_dept_comp_name'),
            models.Index(fields=['slug'], name='idx_dept_slug'),
        ]
    def save(self, *args, **kwargs):
        # Auto-generar slug si no existe
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            
            # Asegurar slug único en la empresa
            while Department.objects.filter(
                company=self.company, 
                slug=slug
            ).exclude(id=self.id).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            
            self.slug = slug
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name


class Product(models.Model):
    """Productos del inventario"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='products')
    department = models.ForeignKey(Department,on_delete=models.PROTECT,related_name='products',null=True,blank=True)
    category = models.ForeignKey('Category', on_delete=models.SET_NULL, related_name='products', null=True, blank=True)
    
    # Identificación
    barcode = models.CharField(max_length=50, unique=True)
    barcode_package = models.CharField(max_length=50, blank=True, null=True)  # Código paquete
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Inventario
    stock_units = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    min_stock = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    
    # Sistema de paquetes y bandejas
    is_package = models.BooleanField(default=False)
    units_per_package = models.IntegerField(null=True, blank=True)  # Cuántas unidades tiene un paquete
    is_tray = models.BooleanField(default=False)
    packages_per_tray = models.IntegerField(null=True, blank=True)  # Cuántos paquetes tiene una bandeja
    
    # Precios
    unit_price = models.DecimalField(max_digits=10, decimal_places=0)
    package_price = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    tray_price = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    cost_price = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    
    # Características especiales
    has_returnable_container = models.BooleanField(default=False)
    container_price = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    
    # IVA
    is_tax_exempt = models.BooleanField(default=False)
    variable_tax_rate = models.DecimalField(max_digits=5, decimal_places=0, null=True, blank=True)
    
    # Estado
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'products'
        indexes = [
            models.Index(fields=['company', 'barcode'], name='idx_prod_comp_bar'),
            models.Index(fields=['name'], name='idx_prod_name'),
            models.Index(fields=['department'], name='idx_prod_dept'),
            models.Index(fields=['is_active'], name='idx_prod_active'),
        ]


class ProductSupplier(models.Model):
    """Relación Producto-Proveedor"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='supplier_relations')
    supplier = models.ForeignKey('Supplier', on_delete=models.CASCADE, related_name='product_relations')
    supplier_product_code = models.CharField(max_length=100, blank=True)
    is_primary = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'product_suppliers'
        unique_together = [['product', 'supplier']]
        indexes = [
            models.Index(fields=['product', 'supplier'], name='idx_ps_prod_supp'),
        ]


class DefectiveProduct(models.Model):
    """Productos defectuosos temporalmente fuera de inventario"""
    STATUS_CHOICES = [
        ('defective', 'Defectuoso'),
        ('replaced', 'Reemplazado'),
        ('removed', 'Eliminado'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='defective_records')
    quantity = models.DecimalField(max_digits=10, decimal_places=0)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='defective')
    registered_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='registered_defectives')
    registered_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.PROTECT, null=True, related_name='resolved_defectives')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'defective_products'
        indexes = [
            models.Index(fields=['product', 'status'], name='idx_def_prod_stat'),
            models.Index(fields=['registered_at'], name='idx_def_reg_at'),
        ]

class Promotion(models.Model):
    """Promociones y descuentos"""
    TYPE_CHOICES = [
        ('quantity_discount', 'Descuento por Cantidad'),
        ('free_units', 'Unidades Gratis (2x1, 3x2, etc.)'),
        ('percentage', 'Porcentaje de Descuento'),
        ('fixed_price', 'Precio Fijo'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='promotions')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    promotion_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    
    # Fechas de vigencia
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    
    # Configuración de descuento por cantidad
    min_quantity = models.IntegerField(null=True, blank=True)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Configuración unidades gratis (ej: 2x1)
    buy_quantity = models.IntegerField(null=True, blank=True)  # Compra X
    free_quantity = models.IntegerField(null=True, blank=True)  # Lleva Y gratis
    
    # Precio fijo
    fixed_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'promotions'
        indexes = [
            models.Index(fields=['company', 'is_active'], name='idx_prom_comp_act'),
            models.Index(fields=['start_date', 'end_date'], name='idx_prom_dates'),
        ]


class PromotionProduct(models.Model):
    """Productos incluidos en promociones"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    promotion = models.ForeignKey(Promotion, on_delete=models.CASCADE, related_name='products')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='promotions')
    
    class Meta:
        db_table = 'promotion_products'
        unique_together = [['promotion', 'product']]
        indexes = [
            models.Index(fields=['promotion', 'product'], name='idx_pp_prom_prod'),
        ]