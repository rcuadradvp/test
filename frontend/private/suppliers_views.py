# frontend/private/suppliers_views.py

from django.shortcuts import render
from .views import check_auth

def suppliers_list_view(request):
    """
    Lista de proveedores - Admin, Super Admin, Master Admin
    Permite ver, crear, editar y desactivar proveedores
    """
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/suppliers/index.html')

def supplier_detail_view(request, supplier_id):
    """
    Detalle de un proveedor específico por UUID
    URL: /proveedores/<uuid:supplier_id>/
    """
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    context = {
        'supplier_id': str(supplier_id),
    }
    return render(request, 'private/suppliers/detail.html', context)