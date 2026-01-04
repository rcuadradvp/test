# api/views/configuration_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import PrinterConfiguration, BarcodeReaderConfiguration
from api.serializers.payment_serializers import (
    PrinterConfigurationSerializer,
    BarcodeReaderConfigurationSerializer
)
from api.middleware.permission_middleware import PermissionMiddleware
import logging

logger = logging.getLogger(__name__)


# ==========================================
# PRINTER CONFIGURATION
# ==========================================

@api_view(['GET'])
def list_printer_configs(request):
    """Listar configuraciones de impresora del usuario"""
    configs = PrinterConfiguration.objects.filter(
        user=request.user
    ).order_by('-created_at')
    
    serializer = PrinterConfigurationSerializer(configs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_active_printer_config(request):
    """Obtener configuración activa de impresora del usuario"""
    try:
        config = PrinterConfiguration.objects.get(
            user=request.user,
            is_active=True
        )
        serializer = PrinterConfigurationSerializer(config)
        return Response(serializer.data)
    except PrinterConfiguration.DoesNotExist:
        return Response({
            'error': 'No hay configuración de impresora activa',
            'has_config': False
        }, status=404)


@api_view(['POST'])
def create_printer_config(request):
    """
    Crear configuración de impresora
    
    Body:
        printer_name (str): Nombre de la impresora
        font_family (str): Fuente (default: Arial)
        font_size (int): Tamaño fuente (8-24, default: 12)
        columns (int): Columnas (32-80, default: 40)
        use_bold (bool): Usar negrita (default: false)
    """
    serializer = PrinterConfigurationSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        config = serializer.save()
        logger.info(f"Configuración de impresora creada: {config.printer_name} por {request.user.email}")
        return Response(serializer.data, status=201)
    
    return Response(serializer.errors, status=400)


@api_view(['PUT', 'PATCH'])
def update_printer_config(request, config_id):
    """Actualizar configuración de impresora"""
    try:
        config = PrinterConfiguration.objects.get(
            id=config_id,
            user=request.user
        )
    except PrinterConfiguration.DoesNotExist:
        return Response({'error': 'Configuración no encontrada'}, status=404)
    
    serializer = PrinterConfigurationSerializer(
        config,
        data=request.data,
        partial=(request.method == 'PATCH'),
        context={'request': request}
    )
    
    if serializer.is_valid():
        serializer.save()
        logger.info(f"Configuración de impresora actualizada por {request.user.email}")
        return Response(serializer.data)
    
    return Response(serializer.errors, status=400)


@api_view(['POST'])
def activate_printer_config(request, config_id):
    """Activar configuración de impresora (desactiva las demás)"""
    try:
        config = PrinterConfiguration.objects.get(
            id=config_id,
            user=request.user
        )
    except PrinterConfiguration.DoesNotExist:
        return Response({'error': 'Configuración no encontrada'}, status=404)
    
    # Desactivar todas las demás
    PrinterConfiguration.objects.filter(
        user=request.user,
        is_active=True
    ).update(is_active=False)
    
    # Activar esta
    config.is_active = True
    config.save()
    
    logger.info(f"Configuración de impresora activada: {config.printer_name}")
    
    serializer = PrinterConfigurationSerializer(config)
    return Response(serializer.data)


@api_view(['DELETE'])
def delete_printer_config(request, config_id):
    """Eliminar configuración de impresora"""
    try:
        config = PrinterConfiguration.objects.get(
            id=config_id,
            user=request.user
        )
    except PrinterConfiguration.DoesNotExist:
        return Response({'error': 'Configuración no encontrada'}, status=404)
    
    if config.is_active:
        return Response({
            'error': 'No se puede eliminar la configuración activa. Active otra primero.'
        }, status=400)
    
    printer_name = config.printer_name
    config.delete()
    
    logger.info(f"Configuración de impresora eliminada: {printer_name}")
    
    return Response({'message': 'Configuración eliminada exitosamente'}, status=200)


# ==========================================
# BARCODE READER CONFIGURATION
# ==========================================

@api_view(['GET'])
def list_barcode_configs(request):
    """Listar configuraciones de lector de código de barras del usuario"""
    configs = BarcodeReaderConfiguration.objects.filter(
        user=request.user
    ).order_by('-created_at')
    
    serializer = BarcodeReaderConfigurationSerializer(configs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_active_barcode_config(request):
    """Obtener configuración activa de lector de código"""
    try:
        config = BarcodeReaderConfiguration.objects.get(
            user=request.user,
            is_active=True
        )
        serializer = BarcodeReaderConfigurationSerializer(config)
        return Response(serializer.data)
    except BarcodeReaderConfiguration.DoesNotExist:
        return Response({
            'error': 'No hay configuración de lector activa',
            'has_config': False
        }, status=404)


@api_view(['POST'])
def create_barcode_config(request):
    """
    Crear configuración de lector de código de barras
    
    Body:
        port (str): Puerto COM (ej: COM1, COM3)
        baud_rate (int): Velocidad (9600, 19200, 38400, 57600, 115200)
        data_bits (int): Bits de datos (7 u 8)
        parity (str): Paridad (None, Even, Odd)
        stop_bits (int): Bits de parada (1 o 2)
        flow_control (str): Control de flujo (None, Hardware, Software)
    """
    serializer = BarcodeReaderConfigurationSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        config = serializer.save()
        logger.info(f"Configuración de lector creada: {config.port} por {request.user.email}")
        return Response(serializer.data, status=201)
    
    return Response(serializer.errors, status=400)


@api_view(['PUT', 'PATCH'])
def update_barcode_config(request, config_id):
    """Actualizar configuración de lector"""
    try:
        config = BarcodeReaderConfiguration.objects.get(
            id=config_id,
            user=request.user
        )
    except BarcodeReaderConfiguration.DoesNotExist:
        return Response({'error': 'Configuración no encontrada'}, status=404)
    
    serializer = BarcodeReaderConfigurationSerializer(
        config,
        data=request.data,
        partial=(request.method == 'PATCH'),
        context={'request': request}
    )
    
    if serializer.is_valid():
        serializer.save()
        logger.info(f"Configuración de lector actualizada por {request.user.email}")
        return Response(serializer.data)
    
    return Response(serializer.errors, status=400)


@api_view(['POST'])
def activate_barcode_config(request, config_id):
    """Activar configuración de lector (desactiva las demás)"""
    try:
        config = BarcodeReaderConfiguration.objects.get(
            id=config_id,
            user=request.user
        )
    except BarcodeReaderConfiguration.DoesNotExist:
        return Response({'error': 'Configuración no encontrada'}, status=404)
    
    # Desactivar todas las demás
    BarcodeReaderConfiguration.objects.filter(
        user=request.user,
        is_active=True
    ).update(is_active=False)
    
    # Activar esta
    config.is_active = True
    config.save()
    
    logger.info(f"Configuración de lector activada: {config.port}")
    
    serializer = BarcodeReaderConfigurationSerializer(config)
    return Response(serializer.data)


@api_view(['DELETE'])
def delete_barcode_config(request, config_id):
    """Eliminar configuración de lector"""
    try:
        config = BarcodeReaderConfiguration.objects.get(
            id=config_id,
            user=request.user
        )
    except BarcodeReaderConfiguration.DoesNotExist:
        return Response({'error': 'Configuración no encontrada'}, status=404)
    
    if config.is_active:
        return Response({
            'error': 'No se puede eliminar la configuración activa. Active otra primero.'
        }, status=400)
    
    port = config.port
    config.delete()
    
    logger.info(f"Configuración de lector eliminada: {port}")
    
    return Response({'message': 'Configuración eliminada exitosamente'}, status=200)


# ==========================================
# CONFIGURATION SUMMARY
# ==========================================

@api_view(['GET'])
def get_all_configs(request):
    """Obtener todas las configuraciones del usuario"""
    printer_config = None
    barcode_config = None
    
    try:
        printer_config = PrinterConfiguration.objects.get(
            user=request.user,
            is_active=True
        )
    except PrinterConfiguration.DoesNotExist:
        pass
    
    try:
        barcode_config = BarcodeReaderConfiguration.objects.get(
            user=request.user,
            is_active=True
        )
    except BarcodeReaderConfiguration.DoesNotExist:
        pass
    
    return Response({
        'printer': PrinterConfigurationSerializer(printer_config).data if printer_config else None,
        'barcode_reader': BarcodeReaderConfigurationSerializer(barcode_config).data if barcode_config else None,
        'has_printer_config': printer_config is not None,
        'has_barcode_config': barcode_config is not None
    })


@api_view(['POST'])
def test_printer_connection(request):
    """Probar conexión con impresora configurada"""
    try:
        config = PrinterConfiguration.objects.get(
            user=request.user,
            is_active=True
        )
    except PrinterConfiguration.DoesNotExist:
        return Response({
            'error': 'No hay configuración de impresora activa'
        }, status=404)
    
    # TODO: Implementar prueba real de conexión con impresora
    # Por ahora solo validamos que existe la configuración
    
    return Response({
        'success': True,
        'message': f'Impresora "{config.printer_name}" configurada correctamente',
        'config': PrinterConfigurationSerializer(config).data
    })


@api_view(['POST'])
def test_barcode_reader_connection(request):
    """Probar conexión con lector de código de barras"""
    try:
        config = BarcodeReaderConfiguration.objects.get(
            user=request.user,
            is_active=True
        )
    except BarcodeReaderConfiguration.DoesNotExist:
        return Response({
            'error': 'No hay configuración de lector activa'
        }, status=404)
    
    # TODO: Implementar prueba real de conexión con lector
    # Por ahora solo validamos que existe la configuración
    
    return Response({
        'success': True,
        'message': f'Lector en puerto "{config.port}" configurado correctamente',
        'config': BarcodeReaderConfigurationSerializer(config).data
    })