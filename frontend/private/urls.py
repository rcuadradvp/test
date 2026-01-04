# frontend/private/urls.py
from django.urls import path
from . import views
from . import suppliers_views 
from . import products_views
from . import clients_views  # NUEVO: Importar vistas de clientes

app_name = 'private'

urlpatterns = [
    # Dashboard
    path('panel-de-control/', views.dashboard_view, name='dashboard'),
    
    # Páginas de Cashier (nivel 2+)
    path('ventas/', views.sales_view, name='sales'),
    path('credit-payments/', views.credit_payments_view, name='credit-payments'),
    
    # Productos no asociados (general - sin departamento ni categoría)
    path('productos/no-asociados/', products_views.unassociated_products_view, name='unassociated-products'),
    
    # Lista de departamentos
    path('productos/', products_views.departments_list_view, name='departments'),
    
    # Detalle de producto por UUID
    path('productos/detalle/<uuid:product_id>/', products_views.product_detail_view, name='product-detail'),
    
    # Productos sin categoría dentro de un departamento
    path('productos/<slug:department_slug>/no-asociados/', products_views.unassociated_category_products_view, name='unassociated-category-products'),
    
    # Categorías de un departamento
    path('productos/<slug:department_slug>/', products_views.categories_detail_view, name='categories-detail'),
    
    # Productos de una categoría
    path('productos/<slug:department_slug>/<slug:categories_slug>/', products_views.products_detail_view, name='products-detail'),
    
    # Crear producto
    path('crear-nuevo-producto/', products_views.product_create_view, name='product-create'),
    path('crear-nuevo-producto/<slug:department_slug>/', products_views.product_create_view, name='product-create-department'),
    path('crear-nuevo-producto/<slug:department_slug>/<slug:category_slug>/', products_views.product_create_view, name='product-create-full'),
    
    # ========== CLIENTES (NUEVO) ==========
    path('clientes/', clients_views.clients_list_view, name='clients'),
    path('clientes/<uuid:client_id>/', clients_views.client_detail_view, name='client-detail'),
    
    # Páginas de Super Admin (nivel 4+)
    path('usuarios/', views.users_view, name='users'),
    path('roles/', views.roles_view, name='roles'),
    
    # Páginas de Master Admin (nivel 5)
    path('system-config/', views.system_config_view, name='system-config'),
    path('permissions/', views.permissions_view, name='permissions'),
    
    # Gestión de Productos
    path('gestion-de-productos/', products_views.product_managment_view, name='product-management'),
    
    # ========== PROVEEDORES ==========
    path('proveedores/', suppliers_views.suppliers_list_view, name='suppliers'),
    path('proveedores/<uuid:supplier_id>/', suppliers_views.supplier_detail_view, name='supplier-detail'),
]