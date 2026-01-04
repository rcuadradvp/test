# project/api/views/ticket_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import Ticket, LastPrintedTicket, Sale
from api.serializers.ticket_serializers import (
    TicketSerializer, 
    TicketListSerializer,
    PrintTicketSerializer,
    LastPrintedTicketSerializer
)
from api.middleware.permission_middleware import PermissionMiddleware
from django.db import transaction
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
def list_tickets(request):
    """
    Listar tickets
    Query params:
        - status: pending, printed, cancelled
        - sale_id: filtrar por venta específica
    """
    if not PermissionMiddleware.check_permission(request.user, 'sales', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    tickets = Ticket.objects.filter(
        company=request.user.company
    ).select_related('sale', 'created_by', 'printed_by').order_by('-created_at')
    
    # Filtros
    status_filter = request.GET.get('status')
    if status_filter:
        tickets = tickets.filter(status=status_filter)
    
    sale_id = request.GET.get('sale_id')
    if sale_id:
        tickets = tickets.filter(sale_id=sale_id)
    
    # Limitar a últimos 100 tickets para performance
    tickets = tickets[:100]
    
    serializer = TicketListSerializer(tickets, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def create_ticket(request):
    """Crear un nuevo ticket para una venta"""
    if not PermissionMiddleware.check_permission(request.user, 'sales', 'create'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    serializer = TicketSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        ticket = serializer.save()
        logger.info(f"Ticket creado: {ticket.ticket_number} por {request.user.email}")
        return Response(serializer.data, status=201)
    
    return Response(serializer.errors, status=400)


@api_view(['GET'])
def get_ticket(request, ticket_id):
    """Obtener detalle de un ticket"""
    if not PermissionMiddleware.check_permission(request.user, 'sales', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        ticket = Ticket.objects.select_related('sale', 'created_by', 'printed_by').get(
            id=ticket_id,
            company=request.user.company
        )
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket no encontrado'}, status=404)
    
    serializer = TicketSerializer(ticket)
    return Response(serializer.data)


@api_view(['POST'])
def print_ticket(request):
    """
    Marcar un ticket como impreso
    Body: { "ticket_id": "uuid" }
    """
    if not PermissionMiddleware.check_permission(request.user, 'sales', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    serializer = PrintTicketSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    
    ticket_id = serializer.validated_data['ticket_id']
    
    try:
        with transaction.atomic():
            ticket = Ticket.objects.select_for_update().get(id=ticket_id)
            
            # Marcar como impreso
            ticket.mark_as_printed(request.user)
            
            # Actualizar último ticket impreso del usuario
            LastPrintedTicket.objects.update_or_create(
                user=request.user,
                defaults={'ticket': ticket}
            )
            
            logger.info(f"Ticket impreso: {ticket.ticket_number} por {request.user.email}")
            
            response_serializer = TicketSerializer(ticket)
            return Response(response_serializer.data)
            
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket no encontrado'}, status=404)


@api_view(['POST'])
def reprint_last_ticket(request):
    """Reimprimir el último ticket del usuario"""
    if not PermissionMiddleware.check_permission(request.user, 'sales', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        last_printed = LastPrintedTicket.objects.select_related('ticket').get(
            user=request.user
        )
        
        ticket = last_printed.ticket
        
        if not ticket:
            return Response({
                'error': 'No tienes un último ticket para reimprimir'
            }, status=404)
        
        # Retornar los datos del ticket para reimpresión
        serializer = TicketSerializer(ticket)
        
        logger.info(f"Reimpresión de ticket: {ticket.ticket_number} por {request.user.email}")
        
        return Response({
            'message': 'Ticket listo para reimprimir',
            'ticket': serializer.data
        })
        
    except LastPrintedTicket.DoesNotExist:
        return Response({
            'error': 'No tienes un último ticket para reimprimir'
        }, status=404)


@api_view(['DELETE'])
def delete_ticket(request, ticket_id):
    """Eliminar un ticket pendiente"""
    if not PermissionMiddleware.check_permission(request.user, 'sales', 'delete'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        ticket = Ticket.objects.get(
            id=ticket_id,
            company=request.user.company
        )
        
        # Solo se pueden eliminar tickets pendientes
        if ticket.status != 'pending':
            return Response({
                'error': 'Solo se pueden eliminar tickets pendientes'
            }, status=400)
        
        ticket_number = ticket.ticket_number
        ticket.status = 'cancelled'
        ticket.save()
        
        logger.info(f"Ticket cancelado: {ticket_number} por {request.user.email}")
        
        return Response({
            'message': f'Ticket {ticket_number} cancelado exitosamente'
        })
        
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket no encontrado'}, status=404)


@api_view(['GET'])
def get_pending_tickets(request):
    """Obtener todos los tickets pendientes del usuario actual"""
    if not PermissionMiddleware.check_permission(request.user, 'sales', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    tickets = Ticket.objects.filter(
        company=request.user.company,
        created_by=request.user,
        status='pending'
    ).select_related('sale').order_by('-created_at')
    
    serializer = TicketListSerializer(tickets, many=True)
    return Response({
        'count': tickets.count(),
        'tickets': serializer.data
    })


@api_view(['POST'])
def create_ticket_for_sale(request, sale_id):
    """
    Crear un ticket automáticamente al completar una venta
    Endpoint de conveniencia
    """
    if not PermissionMiddleware.check_permission(request.user, 'sales', 'create'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        sale = Sale.objects.get(
            id=sale_id,
            company=request.user.company
        )
        
        if sale.status != 'completed':
            return Response({
                'error': 'La venta debe estar completada para crear un ticket'
            }, status=400)
        
        # Crear ticket
        data = {'sale': str(sale.id)}
        serializer = TicketSerializer(
            data=data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            ticket = serializer.save()
            logger.info(f"Ticket creado automáticamente: {ticket.ticket_number} para venta {sale.sale_number}")
            return Response(serializer.data, status=201)
        
        return Response(serializer.errors, status=400)
        
    except Sale.DoesNotExist:
        return Response({'error': 'Venta no encontrada'}, status=404)