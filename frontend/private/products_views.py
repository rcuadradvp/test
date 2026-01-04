from django.shortcuts import render
from .views import check_auth

# ===== PRODUCTOS - VISTAS =====

def departments_list_view(request):
    """Lista de departamentos - Admin, Super Admin, Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/products/departament/index.html')

def categories_detail_view(request, department_slug):
    """Detalle de un departamento - Admin, Super Admin, Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    context = {
        'department_slug': department_slug
    }
    return render(request, 'private/products/categories/index.html', context)

def products_detail_view(request, department_slug, categories_slug):
    """Detalle de una categoría (lista de productos asociados) - Admin, Super Admin, Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    context = {
        'department_slug': department_slug,
        'category_slug': categories_slug,
    }
    return render(request, 'private/products/products-associated/index.html', context)

def unassociated_products_view(request):
    """Productos no asociados a ningún departamento - Admin, Super Admin, Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/products/products-unassociated/index.html')

def unassociated_category_products_view(request, department_slug):
    """Productos de un departamento sin categoría asignada - Admin, Super Admin, Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    context = {
        'department_slug': department_slug,
        'filter_type': 'category',  # Indica que filtramos por categoría
    }
    return render(request, 'private/products/products-unassociated/index.html', context)

# ========== NUEVO: Detalle de producto individual ==========
def product_detail_view(request, product_id):
    """
    Detalle de un producto específico por UUID
    URL: /productos/detalle/<uuid:product_id>/
    """
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    context = {
        'product_id': str(product_id),
    }
    return render(request, 'private/products/product-detail/index.html', context)


def product_managment_view(request):
    """Gestión de Productos - Solo Admin, Super Admin, Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/product_management/index.html')

# ========== NUEVO: Crear producto ==========
def product_create_view(request, department_slug=None, category_slug=None):
    """
    Crear un nuevo producto
    URLs:
    - /crear-nuevo-producto/ (sin departamento ni categoría)
    - /crear-nuevo-producto/<department_slug>/ (con departamento, sin categoría)
    - /crear-nuevo-producto/<department_slug>/<category_slug>/ (con ambos)
    """
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    
    # Construir la URL de retorno según el contexto
    if department_slug and category_slug:
        back_url = f'/productos/{department_slug}/{category_slug}/'
    elif department_slug:
        back_url = f'/productos/{department_slug}/no-asociados/'
    else:
        back_url = '/productos/no-asociados/'
    
    context = {
        'department_slug': department_slug or '',
        'category_slug': category_slug or '',
        'back_url': back_url,
    }
    return render(request, 'private/products/product-create/index.html', context)