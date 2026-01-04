from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.db.models import Q

from api.middleware.permission_middleware import PermissionMiddleware
from api.models import Product, Supplier
from api.models import ProductSupplier
from api.serializers.product_supplier_serializers import ProductSupplierSerializer
from api.serializers.product_supplier_serializers import ProductSuppliersByProductSerializer


@api_view(["GET"])
def get_suppliers_by_product(request, product_id):
    """
    GET /api/products/<product_id>/suppliers/
    Devuelve todos los proveedores asociados a un producto.
    """
    if not PermissionMiddleware.check_permission(request.user, "suppliers", "view"):
        return Response({"error": "Sin permisos"}, status=403)

    product_qs = Product.objects.filter(id=product_id)

    if request.user.role.name != "master_admin":
        product_qs = product_qs.filter(company=request.user.company)

    if not product_qs.exists():
        return Response({"error": "Producto no encontrado"}, status=404)

    rels = ProductSupplier.objects.select_related("supplier", "product").filter(product_id=product_id)

    if request.user.role.name != "master_admin":
        rels = rels.filter(
            product__company=request.user.company,
            supplier__company=request.user.company,
        )

    rels = rels.order_by("-is_primary", "supplier__name")

    serializer = ProductSuppliersByProductSerializer(rels, many=True)
    return Response(serializer.data)

@api_view(["GET"])
def list_product_suppliers(request):
    """
    GET /api/product-suppliers/?supplier_id=... o ?product_id=...
    Lista relaciones. Si no pasas filtros, lista todas (scoped por empresa).
    """
    if not PermissionMiddleware.check_permission(request.user, "suppliers", "view"):
        return Response({"error": "Sin permisos"}, status=403)

    qs = ProductSupplier.objects.select_related("product", "supplier")

    if request.user.role.name != "master_admin":
        qs = qs.filter(
            product__company=request.user.company,
            supplier__company=request.user.company,
        )

    supplier_id = request.GET.get("supplier_id")
    product_id = request.GET.get("product_id")

    if supplier_id:
        qs = qs.filter(supplier_id=supplier_id)
    if product_id:
        qs = qs.filter(product_id=product_id)

    qs = qs.order_by("supplier__name", "product__name")

    serializer = ProductSupplierSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@transaction.atomic
def create_product_supplier(request):
    
    if not PermissionMiddleware.check_permission(request.user, "suppliers", "edit"):
        return Response({"error": "Sin permisos"}, status=403)

    data = request.data

    products = data.get("product")
    suppliers = data.get("supplier")

    if isinstance(products, str):
        products = [products]
    if isinstance(suppliers, str):
        suppliers = [suppliers]

    if not isinstance(products, list) or not products:
        return Response({"error": "product debe ser una lista no vacía (o un uuid)"}, status=400)
    if not isinstance(suppliers, list) or not suppliers:
        return Response({"error": "supplier debe ser una lista no vacía (o un uuid)"}, status=400)

    p_len = len(products)
    s_len = len(suppliers)

    pairs = []
    if p_len == 1 and s_len >= 1:
        pairs = [(products[0], s) for s in suppliers]
    elif s_len == 1 and p_len >= 1:
        pairs = [(p, suppliers[0]) for p in products]
    else:
        if p_len != s_len:
            return Response(
                {"error": "Si envías listas de distinto largo, una de las dos debe tener largo 1."},
                status=400,
            )
        pairs = list(zip(products, suppliers))

    pairs = list(dict.fromkeys(pairs))

    supplier_product_code = data.get("supplier_product_code", "")
    is_primary = bool(data.get("is_primary", False))

    product_ids = {p for p, _ in pairs}
    supplier_ids = {s for _, s in pairs}

    prod_qs = Product.objects.filter(id__in=product_ids)
    supp_qs = Supplier.objects.filter(id__in=supplier_ids)

    if request.user.role.name != "master_admin":
        prod_qs = prod_qs.filter(company=request.user.company)
        supp_qs = supp_qs.filter(company=request.user.company)

    products_map = {str(p.id): p for p in prod_qs}
    suppliers_map = {str(s.id): s for s in supp_qs}

    missing_products = [pid for pid in product_ids if pid not in products_map]
    missing_suppliers = [sid for sid in supplier_ids if sid not in suppliers_map]

    if missing_products:
        return Response({"error": "Productos no encontrados o fuera de tu empresa", "product": missing_products}, status=400)
    if missing_suppliers:
        return Response({"error": "Suppliers no encontrados o fuera de tu empresa", "supplier": missing_suppliers}, status=400)

    created = []
    existing = []
    for p_id, s_id in pairs:
        product = products_map[p_id]
        supplier = suppliers_map[s_id]

        rel, was_created = ProductSupplier.objects.get_or_create(
            product=product,
            supplier=supplier,
            defaults={
                "supplier_product_code": supplier_product_code or "",
                "is_primary": is_primary,
            }
        )

        if was_created:
            created.append(rel)
        else:
            changed = False
            if supplier_product_code is not None and rel.supplier_product_code != supplier_product_code:
                rel.supplier_product_code = supplier_product_code
                changed = True
            if "is_primary" in data and rel.is_primary != is_primary:
                rel.is_primary = is_primary
                changed = True
            if changed:
                rel.save()
            existing.append(rel)

        if rel.is_primary:
            ProductSupplier.objects.filter(product=rel.product, is_primary=True).exclude(id=rel.id).update(is_primary=False)

    return Response(
        {
            "created_count": len(created),
            "existing_count": len(existing),
            "created_ids": [str(r.id) for r in created],
            "existing_ids": [str(r.id) for r in existing],
        },
        status=201,
    )


@api_view(["PUT", "PATCH"])
@transaction.atomic
def update_product_supplier(request, relation_id):
    """
    PUT/PATCH /api/product-suppliers/<relation_id>/
    Permite actualizar supplier_product_code e is_primary (y otros si quieres).
    """
    if not PermissionMiddleware.check_permission(request.user, "suppliers", "edit"):
        return Response({"error": "Sin permisos"}, status=403)

    try:
        rel = ProductSupplier.objects.select_related("product", "supplier").get(id=relation_id)
    except ProductSupplier.DoesNotExist:
        return Response({"error": "Relación no encontrada"}, status=404)

    # Scope por empresa (si no es master_admin)
    if request.user.role.name != "master_admin":
        if rel.product.company_id != request.user.company_id or rel.supplier.company_id != request.user.company_id:
            return Response({"error": "Sin permisos (fuera de tu empresa)"}, status=403)

    serializer = ProductSupplierSerializer(
        rel,
        data=request.data,
        partial=(request.method == "PATCH"),
        context={"request": request},
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    rel = serializer.save()

    if rel.is_primary:
        ProductSupplier.objects.filter(product=rel.product, is_primary=True).exclude(id=rel.id).update(is_primary=False)

    return Response(ProductSupplierSerializer(rel).data, status=200)


@api_view(["DELETE"])
@transaction.atomic
def delete_product_supplier(request, relation_id):
    """
    DELETE /api/product-suppliers/<relation_id>/
    """
    if not PermissionMiddleware.check_permission(request.user, "suppliers", "edit"):
        return Response({"error": "Sin permisos"}, status=403)

    try:
        rel = ProductSupplier.objects.select_related("product", "supplier").get(id=relation_id)
    except ProductSupplier.DoesNotExist:
        return Response({"error": "Relación no encontrada"}, status=404)

    if request.user.role.name != "master_admin":
        if rel.product.company_id != request.user.company_id or rel.supplier.company_id != request.user.company_id:
            return Response({"error": "Sin permisos (fuera de tu empresa)"}, status=403)

    rel.delete()
    return Response({"message": "Relación eliminada"}, status=200)

@api_view(["DELETE"])
@transaction.atomic
def delete_product_suppliers_massive(request):

    if not PermissionMiddleware.check_permission(request.user, "suppliers", "edit"):
        return Response({"error": "Sin permisos"}, status=403)

    ids = request.data.get("ids")

    if isinstance(ids, str):
        ids = [ids]

    if not isinstance(ids, list) or not ids:
        return Response({"error": "ids debe ser una lista no vacía (o un uuid)"}, status=400)

    qs = ProductSupplier.objects.select_related("product", "supplier").filter(id__in=ids)

    if request.user.role.name != "master_admin":
        qs = qs.filter(
            product__company_id=request.user.company_id,
            supplier__company_id=request.user.company_id,
        )

    found_ids = set(str(x) for x in qs.values_list("id", flat=True))
    requested_ids = set(str(x) for x in ids)
    missing_or_forbidden = sorted(list(requested_ids - found_ids))

    deleted_count, _ = qs.delete()

    return Response(
        {
            "deleted_count": deleted_count,
            "missing_or_forbidden_ids": missing_or_forbidden,
        },
        status=200,
    )
    
@api_view(["DELETE"])
@transaction.atomic
def delete_product_supplier_by_product_and_supplier(request):

    if not PermissionMiddleware.check_permission(request.user, "suppliers", "edit"):
        return Response({"error": "Sin permisos"}, status=403)

    data = request.data
    products = data.get("product")
    suppliers = data.get("supplier")

    # Normaliza: permitir string o array
    if isinstance(products, str):
        products = [products]
    if isinstance(suppliers, str):
        suppliers = [suppliers]

    if not isinstance(products, list) or not products:
        return Response({"error": "product debe ser una lista no vacía (o un uuid)"}, status=400)
    if not isinstance(suppliers, list) or not suppliers:
        return Response({"error": "supplier debe ser una lista no vacía (o un uuid)"}, status=400)

    p_len = len(products)
    s_len = len(suppliers)

    # Construye pares según reglas
    if p_len == 1 and s_len >= 1:
        pairs = [(products[0], s) for s in suppliers]
    elif s_len == 1 and p_len >= 1:
        pairs = [(p, suppliers[0]) for p in products]
    else:
        if p_len != s_len:
            return Response(
                {"error": "Si envías listas de distinto largo, una de las dos debe tener largo 1."},
                status=400,
            )
        pairs = list(zip(products, suppliers))

    # Dedup pares dentro del request
    pairs = list(dict.fromkeys(pairs))

    product_ids = {p for p, _ in pairs}
    supplier_ids = {s for _, s in pairs}

    qs = ProductSupplier.objects.filter(
        product_id__in=product_ids,
        supplier_id__in=supplier_ids,
    )

    # Scope por empresa
    if request.user.role.name != "master_admin":
        qs = qs.filter(
            product__company_id=request.user.company_id,
            supplier__company_id=request.user.company_id,
        )

    # Encontrar cuáles pares existen realmente (y están permitidos)
    existing_pairs = set(qs.values_list("product_id", "supplier_id"))
    requested_pairs = set((p, s) for p, s in pairs)
    missing_or_forbidden_pairs = sorted(
        [{"product": str(p), "supplier": str(s)} for (p, s) in (requested_pairs - existing_pairs)],
        key=lambda x: (x["product"], x["supplier"])
    )

    # Borrar SOLO los pares solicitados (no todo el cross-product)
    # (importante cuando mandas muchos ids)
    delete_qs = ProductSupplier.objects.none()
    for p, s in pairs:
        delete_qs = delete_qs | qs.filter(product_id=p, supplier_id=s)

    deleted_count, _ = delete_qs.delete()

    return Response(
        {
            "deleted_count": deleted_count,
            "missing_or_forbidden_pairs": missing_or_forbidden_pairs,
        },
        status=200,
    )