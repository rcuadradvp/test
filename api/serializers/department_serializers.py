# api/serializers/department_serializers.py

from rest_framework import serializers
from api.models import Department, Product

class DepartmentSerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = ['id', 'company', 'name', 'slug', 'description', 'product_count', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'company', 'slug', 'created_at', 'updated_at']
    
    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()
    
    def validate_name(self, value):
        """Validar que el nombre no exista en la empresa"""
        company = self.context.get('company')
        instance = self.instance
        
        # Verificar duplicados
        query = Department.objects.filter(
            company=company,
            name__iexact=value
        )
        
        # Excluir la instancia actual si estamos editando
        if instance:
            query = query.exclude(id=instance.id)
        
        if query.exists():
            raise serializers.ValidationError("Ya existe un departamento con este nombre")
        
        return value


class DepartmentDetailSerializer(serializers.ModelSerializer):
    """Serializer con productos incluidos"""
    products = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'product_count', 'products', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()
    
    def get_products(self, obj):
        from api.serializers.product_serializers import ProductListSerializer
        products = obj.products.filter(is_active=True).order_by('name')[:100]  # Limitar a 100
        return ProductListSerializer(products, many=True).data