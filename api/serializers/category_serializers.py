# api/serializers/category_serializers.py

from rest_framework import serializers
from api.models import Category, Product

class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_slug = serializers.CharField(source='department.slug', read_only=True)
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'description', 
            'department', 'department_name', 'department_slug',
            'product_count', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']
    
    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()
    
    def validate_name(self, value):
        """Validar que el nombre no exista en el departamento"""
        company = self.context.get('company')
        department = self.context.get('department') or self.initial_data.get('department')
        instance = self.instance
        
        query = Category.objects.filter(
            company=company,
            department_id=department,
            name__iexact=value
        )
        
        if instance:
            query = query.exclude(id=instance.id)
        
        if query.exists():
            raise serializers.ValidationError(
                "Ya existe una categoría con este nombre en este departamento"
            )
        
        return value


class CategoryDetailSerializer(serializers.ModelSerializer):
    """Serializer con productos incluidos"""
    products = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_slug = serializers.CharField(source='department.slug', read_only=True)
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'description', 
            'department', 'department_name', 'department_slug',
            'product_count', 'products', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at']
    
    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()
    
    def get_products(self, obj):
        from api.serializers.product_serializers import ProductListSerializer
        products = obj.products.filter(is_active=True).order_by('name')[:100]
        return ProductListSerializer(products, many=True).data