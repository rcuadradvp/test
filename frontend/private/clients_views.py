# frontend/private/clients_views.py

from django.shortcuts import render
from .views import check_auth

def clients_list_view(request):
    """
    Lista de clientes - Admin, Super Admin, Master Admin
    Permite ver, crear, editar y desactivar clientes
    """
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    return render(request, 'private/clients/index.html')

def client_detail_view(request, client_id):
    """
    Detalle de un cliente específico por UUID
    URL: /clientes/<uuid:client_id>/
    """
    redirect_response = check_auth(request)
    if redirect_response:
        return redirect_response
    context = {
        'client_id': str(client_id),
    }
    return render(request, 'private/clients/detail.html', context)