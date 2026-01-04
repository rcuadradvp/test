from rest_framework import serializers
from api.models import ProductSupplier

class ProductSupplierSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = ProductSupplier
        fields = [
            "id",
            "product",
            "product_name",
            "supplier",
            "supplier_name",
            "supplier_product_code",
            "is_primary",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        """
        Evita que relacionen productos/proveedores de otra empresa (excepto master_admin).
        """
        request = self.context.get("request")
        if not request:
            return attrs

        user = request.user
        product = attrs.get("product") or getattr(self.instance, "product", None)
        supplier = attrs.get("supplier") or getattr(self.instance, "supplier", None)

        if user.role.name != "master_admin":
            if product and product.company_id != user.company_id:
                raise serializers.ValidationError({"product": "Producto fuera de tu empresa"})
            if supplier and supplier.company_id != user.company_id:
                raise serializers.ValidationError({"supplier": "Proveedor fuera de tu empresa"})

        return attrs

    def create(self, validated_data):
        rel = super().create(validated_data)

        # si es primary, desmarcar otros primarios del mismo producto
        if rel.is_primary:
            ProductSupplier.objects.filter(product=rel.product, is_primary=True).exclude(id=rel.id).update(is_primary=False)

        return rel

    def update(self, instance, validated_data):
        rel = super().update(instance, validated_data)

        if rel.is_primary:
            ProductSupplier.objects.filter(product=rel.product, is_primary=True).exclude(id=rel.id).update(is_primary=False)

        return rel
    
    
class ProductSuppliersByProductSerializer(serializers.ModelSerializer):
    supplier_id = serializers.UUIDField(source="supplier.id", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    supplier_rut = serializers.CharField(source="supplier.rut", read_only=True)
    supplier_email_1 = serializers.EmailField(source="supplier.email_1", read_only=True)
    supplier_phone_1 = serializers.CharField(source="supplier.phone_1", read_only=True)

    class Meta:
        model = ProductSupplier
        fields = [
            "id",  # id de la relación product_suppliers
            "supplier_id",
            "supplier_name",
            "supplier_rut",
            "supplier_email_1",
            "supplier_phone_1",
            "supplier_product_code",
            "is_primary",
        ]
