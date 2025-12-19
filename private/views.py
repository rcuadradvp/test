# frontend/private/views.py
from django.shortcuts import render, redirect
from rest_framework_simplejwt.tokens import AccessToken, TokenError

def check_auth(request):
    """Verifica autenticación por cookie"""
    token = request.COOKIES.get('access_token')
    if not token:
        return redirect('public:login')
    try:
        AccessToken(token)
        return None
    except TokenError:
        resp = redirect('public:login')
        resp.delete_cookie('access_token')
        resp.delete_cookie('refresh_token')
        return resp

def dashboard_view(request):
    """Dashboard principal - Todos los roles"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/dashboard/index.html')

def users_view(request):
    """Gestión de usuarios - Solo Super Admin y Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/users/index.html')

def roles_view(request):
    """Ver roles - Solo Super Admin y Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/roles.html')

def permissions_view(request):
    """Ver permisos del usuario"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/permissions.html')

# ===== NUEVAS PÁGINAS DE PRUEBA =====

def sales_view(request):
    """Ventas/POS - Cashier, Admin, Super Admin, Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/sales/index.html')

def credit_payments_view(request):
    """Pago de Créditos - Cashier, Admin, Super Admin, Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/credit_payments.html')

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

# ===== RESTO DE VISTAS =====

def clients_view(request):
    """Clientes - Admin, Super Admin, Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/clients.html')

def system_config_view(request):
    """Configuración del Sistema - Solo Master Admin"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/system_config.html')

def template_view(request):
    """Página de plantilla para pruebas"""
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/plantilla/index.html')

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