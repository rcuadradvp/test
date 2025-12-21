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