# frontend/private/urls.py
from django.urls import path
from . import views

app_name = 'private'

urlpatterns = [
    # Dashboard
    path('panel-de-control/', views.dashboard_view, name='dashboard'),
    
    # Páginas de Cashier (nivel 2+)
    path('ventas/', views.sales_view, name='sales'),
    path('credit-payments/', views.credit_payments_view, name='credit-payments'),
    
    # Productos no asociados (general - sin departamento ni categoría)
    path('productos/no-asociados/', views.unassociated_products_view, name='unassociated-products'),
    
    # Lista de departamentos
    path('productos/', views.departments_list_view, name='departments'),
    
    # Detalle de producto por UUID
    path('productos/detalle/<uuid:product_id>/', views.product_detail_view, name='product-detail'),
    
    # Productos sin categoría dentro de un departamento
    path('productos/<slug:department_slug>/no-asociados/', views.unassociated_category_products_view, name='unassociated-category-products'),
    
    # Categorías de un departamento
    path('productos/<slug:department_slug>/', views.categories_detail_view, name='categories-detail'),
    
    # Productos de una categoría
    path('productos/<slug:department_slug>/<slug:categories_slug>/', views.products_detail_view, name='products-detail'),
    
    # ========== NUEVO: Crear producto ==========
    path('crear-nuevo-producto/', views.product_create_view, name='product-create'),
    path('crear-nuevo-producto/<slug:department_slug>/', views.product_create_view, name='product-create-department'),
    path('crear-nuevo-producto/<slug:department_slug>/<slug:category_slug>/', views.product_create_view, name='product-create-full'),
    
    path('clients/', views.clients_view, name='clients'),
    
    # Páginas de Super Admin (nivel 4+)
    path('usuarios/', views.users_view, name='users'),
    path('roles/', views.roles_view, name='roles'),
    
    # Páginas de Master Admin (nivel 5)
    path('system-config/', views.system_config_view, name='system-config'),
    path('permissions/', views.permissions_view, name='permissions'),
    
    # Plantilla
    path('plantilla/', views.template_view, name='plantilla'),

    # Gestión de Productos
    path('gestion-de-productos/', views.product_managment_view, name='product-management'),
]