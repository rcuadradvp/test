# api/serializers/product_serializers.py

from rest_framework import serializers
from api.models import Product, Department, Promotion, DefectiveProduct
from api.utils.validators import BarcodeValidator
from api.utils.helpers import StockCalculator, PriceCalculator
from decimal import Decimal

class ProductListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listas"""
    department_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    stock_display = serializers.SerializerMethodField()
    price_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'barcode', 'name', 'department_name',
            'category_name',
            'stock_units', 'stock_display', 'min_stock',
            'unit_price', 'price_display', 'is_active'
        ]

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None

    def get_category_name(self, obj):
        """Retorna el nombre de la categoría o None si no tiene"""
        return obj.category.name if obj.category else None   
    
    def get_stock_display(self, obj):
        return StockCalculator.format_stock_display(obj)
    
    def get_price_display(self, obj):
        from api.utils.helpers import MoneyHelper
        return MoneyHelper.format_currency(obj.unit_price)


class ProductSerializer(serializers.ModelSerializer):
    department_name = serializers.SerializerMethodField()
    suppliers = serializers.SerializerMethodField()
    stock_display = serializers.SerializerMethodField()
    calculated_price_package = serializers.SerializerMethodField()
    price_with_iva = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'barcode', 'barcode_package', 'name', 'description',
            'department', 'department_name',
            'category',
            'stock_units', 'stock_display', 'min_stock',
            'is_package', 'units_per_package','is_tray', 'packages_per_tray',
            'unit_price', 'package_price', 'tray_price', 'cost_price',
            'calculated_price_package', 'price_with_iva',
            'is_tax_exempt', 'variable_tax_rate',
            'has_returnable_container', 'container_price',
            'suppliers', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_department_name(self, obj):
        return obj.department.name if obj.department else None

    def get_suppliers(self, obj):
        return [
            {
                'id': str(ps.supplier.id),
                'name': ps.supplier.name,
                'is_primary': ps.is_primary
            }
            for ps in obj.supplier_relations.all()
        ]
    
    def get_stock_display(self, obj):
        return StockCalculator.format_stock_display(obj)
    
    def get_calculated_price_package(self, obj):
        """Calcular precio de paquete si no está definido"""
        if obj.package_price:
            return int(obj.package_price)

        if obj.is_package and obj.units_per_package:
            return int(obj.unit_price * obj.units_per_package)

        return None
    
    def get_price_with_iva(self, obj):
        """Calcular precio con IVA"""
        if obj.is_tax_exempt:
            return int(obj.unit_price)

        tax = obj.variable_tax_rate if obj.variable_tax_rate is not None else Decimal('19')
        price_with_iva = PriceCalculator.calculate_with_iva(
            obj.unit_price,
            tax
        )

        return int(price_with_iva)


    def validate_barcode(self, value):
        """Validar código de barras"""
        BarcodeValidator.validate_format(value)
        
        # Verificar duplicados
        company = self.context.get('company')
        instance = self.instance
        
        query = Product.objects.filter(
            company=company,
            barcode=value
        )
        
        if instance:
            query = query.exclude(id=instance.id)
        
        if query.exists():
            raise serializers.ValidationError("Ya existe un producto con este código de barras")
        
        return value
    
    def validate_barcode_package(self, value):
        """Validar código de barras de paquete"""
        if value:
            BarcodeValidator.validate_format(value)
        return value
    
    def validate(self, data):
        """Validaciones generales"""
        # Si es paquete, debe tener units_per_package
        if data.get('is_package') and not data.get('units_per_package'):
            raise serializers.ValidationError({
                'units_per_package': 'Debe especificar las unidades por paquete'
            })
        
        # Validar que el stock mínimo no sea negativo
        if data.get('min_stock') and data['min_stock'] < 0:
            raise serializers.ValidationError({
                'min_stock': 'El stock mínimo no puede ser negativo'
            })
        
        # Validar precios
        if data.get('unit_price') and data['unit_price'] < 0:
            raise serializers.ValidationError({
                'unit_price': 'El precio no puede ser negativo'
            })
        
        # Validar IVA
        if not data.get('is_tax_exempt'):
            variable_tax_rate = data.get('variable_tax_rate', 19)
            if variable_tax_rate < 0 or variable_tax_rate > 100:
                raise serializers.ValidationError({
                    'variable_tax_rate': 'El IVA debe estar entre 0 y 100'
                })
        
        return data


class DefectiveProductSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_barcode = serializers.CharField(source='product.barcode', read_only=True)
    registered_by_name = serializers.SerializerMethodField()
    resolved_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = DefectiveProduct
        fields = [
            'id', 'product', 'product_name', 'product_barcode',
            'quantity', 'reason', 'status',
            'registered_by', 'registered_by_name', 'registered_at',
            'resolved_by', 'resolved_by_name', 'resolved_at',
            'notes'
        ]
        read_only_fields = ['id', 'registered_at', 'resolved_at']
    
    def get_registered_by_name(self, obj):
        return f"{obj.registered_by.first_name} {obj.registered_by.last_name}"
    
    def get_resolved_by_name(self, obj):
        if obj.resolved_by:
            return f"{obj.resolved_by.first_name} {obj.resolved_by.last_name}"
        return None


class ProductImportSerializer(serializers.Serializer):
    file = serializers.FileField()
    
    
class PromotionSerializer(serializers.ModelSerializer):
    products = ProductListSerializer(many=True, read_only=True)
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Promotion
        fields = [
            'id', 'name', 'description', 'promotion_type',
            'discount_percentage', 'quantity_required', 'quantity_free',
            'start_date', 'end_date', 'is_active',
            'product_count', 'products',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_product_count(self, obj):
        return obj.promotion_products.count()