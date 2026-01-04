# api/views/product_views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import Product, Department, DefectiveProduct
from api.serializers.product_serializers import (
    ProductSerializer,
    ProductListSerializer,
    DefectiveProductSerializer,
    ProductImportSerializer
)
from api.middleware.permission_middleware import PermissionMiddleware
from api.utils.excel_handler import ExcelExporter, ExcelImporter
from django.db.models import Q
from django.db import transaction
import logging
from django.db.models import F
from api.utils.pagination import Paginator
from api.models import Category
from api.serializers.department_serializers import DepartmentSerializer
from api.serializers.category_serializers import CategorySerializer 

logger = logging.getLogger(__name__)

@api_view(['GET'])
def list_products(request):
    """
    Listar productos con paginación opcional
    
    Query Parameters:
        page (int): Número de página (default: sin paginación)
        page_size (int): Items por página (default: 50, max: 500)
        department (uuid): Filtrar por departamento
        low_stock (bool): Filtrar productos con stock bajo
    """
    if not PermissionMiddleware.check_permission(request.user, 'products', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Determinar scope según rol
    if request.user.role.name == 'master_admin':
        products = Product.objects.filter(is_active=True)
    else:
        products = Product.objects.filter(
            company=request.user.company,
            is_active=True
        )
    
    # Aplicar filtros opcionales (mantener para rendimiento)
    department = request.GET.get('department')
    if department:
        products = products.filter(department_id=department)
    
    low_stock = request.GET.get('low_stock')
    if low_stock and low_stock.lower() == 'true':
        products = products.filter(stock_units__lte=F('min_stock'))
    
    products = products.select_related('department').order_by('name')
    
    # Verificar si se solicita paginación
    if 'page' in request.GET:
        # Devolver respuesta paginada
        return Paginator.paginate_response(
            products, 
            request, 
            ProductListSerializer,
            default_page_size=50,
            max_page_size=500
        )
    
    # Sin paginación: devolver todos los items
    serializer = ProductListSerializer(products, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_product(request, product_id):
    """Obtener detalle de producto"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        product = Product.objects.select_related('department').get(
            id=product_id,
            company=request.user.company
        )
    except Product.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=404)
    
    serializer = ProductSerializer(product)
    return Response(serializer.data)


@api_view(['GET'])
def get_product_by_barcode(request, barcode):
    """Buscar producto por código de barras"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        # Buscar por barcode o barcode_package
        product = Product.objects.select_related('department').get(
            Q(barcode=barcode) | Q(barcode_package=barcode),
            company=request.user.company,
            is_active=True
        )
        
        serializer = ProductSerializer(product)
        return Response(serializer.data)
        
    except Product.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=404)
    except Product.MultipleObjectsReturned:
        return Response({'error': 'Código de barras duplicado'}, status=400)


@api_view(['POST'])
def create_product(request):
    """Crear producto"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'create'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    data = request.data.copy()
    data['company'] = request.user.company.id
    
    serializer = ProductSerializer(
        data=data,
        context={'company': request.user.company}
    )
    
    if serializer.is_valid():
        product = serializer.save(company=request.user.company)
        logger.info(f"Producto creado: {product.barcode} - {product.name} por {request.user.email}")
        return Response(serializer.data, status=201)
    
    return Response(serializer.errors, status=400)


@api_view(['PUT'])
def update_product(request, product_id):
    """Actualizar producto"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        product = Product.objects.get(
            id=product_id,
            company=request.user.company
        )
    except Product.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=404)
    
    serializer = ProductSerializer(
        product,
        data=request.data,
        partial=True,
        context={'company': request.user.company}
    )
    
    if serializer.is_valid():
        serializer.save()
        logger.info(f"Producto actualizado: {product.barcode} - {product.name} por {request.user.email}")
        return Response(serializer.data)
    
    return Response(serializer.errors, status=400)


@api_view(['DELETE'])
def delete_product(request, product_id):
    """Eliminar (desactivar) producto"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'delete'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        product = Product.objects.get(
            id=product_id,
            company=request.user.company
        )
    except Product.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=404)
    
    # Desactivar en lugar de eliminar
    product.is_active = False
    product.save()
    
    logger.info(f"Producto eliminado: {product.barcode} - {product.name} por {request.user.email}")
    return Response({'message': 'Producto eliminado exitosamente'})


@api_view(['POST'])
def reset_stock(request):
    """Reiniciar stock de todos los productos a 0"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Solo Master Admin o Super Admin pueden hacer esto
    if request.user.role.name not in ['master_admin', 'super_admin']:
        return Response({'error': 'Solo administradores pueden reiniciar el stock'}, status=403)
    
    company = request.user.company
    
    with transaction.atomic():
        updated = Product.objects.filter(
            company=company,
            is_active=True
        ).update(stock_units=0)
    
    logger.warning(f"Stock reiniciado: {updated} productos por {request.user.email}")
    return Response({
        'message': f'Stock reiniciado exitosamente',
        'products_updated': updated
    })


@api_view(['GET'])
def export_products(request):
    """Exportar productos a Excel"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'view'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    # Master Admin exporta de todas las companies
    if request.user.role.name == 'master_admin':
        products = Product.objects.filter(is_active=True)
        company_name = "Todas las empresas"
    else:
        products = Product.objects.filter(
            company=request.user.company,
            is_active=True
        )
        company_name = request.user.company.name
    
    products = products.select_related('department').order_by('name')
    
    logger.info(f"Exportando {products.count()} productos por {request.user.email}")
    return ExcelExporter.export_products(products, company_name)


@api_view(['POST'])
def import_products(request):
    """Importar productos desde Excel"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'create'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    serializer = ProductImportSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    
    file = serializer.validated_data['file']
    company = request.user.company
    
    # Crear mapa de departamentos
    departments = Department.objects.filter(company=company, is_active=True)
    department_map = {dept.name.lower(): dept for dept in departments}
    
    # Importar
    result = ExcelImporter.import_products(file, company, department_map)
    
    if result['success'] > 0:
        # Crear productos
        created_count = 0
        with transaction.atomic():
            for product_data in result['products']:
                # Buscar o crear departamento
                dept_name = product_data.pop('department_name', None)
                if dept_name:
                    dept = department_map.get(dept_name.lower())
                    if dept:
                        product_data['department'] = dept
                
                try:
                    Product.objects.create(**product_data)
                    created_count += 1
                except Exception as e:
                    result['errors'].append(f"Error creando producto: {str(e)}")
        
        logger.info(f"Productos importados: {created_count} por {request.user.email}")
        
        return Response({
            'message': f'{created_count} productos importados exitosamente',
            'created': created_count,
            'errors': result['errors']
        })
    
    return Response({
        'error': 'No se pudo importar ningún producto',
        'errors': result['errors']
    }, status=400)


# ===== PRODUCTOS DEFECTUOSOS =====

@api_view(['GET'])
def list_defective_products(request):
    """Listar productos defectuosos"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'view'):
        return Response({'error': 'Sin permisos'}, status=status.HTTP_403_FORBIDDEN)
    
    company = request.user.company
    status_filter = request.GET.get('status', None)
    
    defectives = DefectiveProduct.objects.filter(
        product__company=company
    ).select_related('product', 'registered_by', 'resolved_by')
    
    if status_filter:
        defectives = defectives.filter(status=status_filter)
    
    defectives = defectives.order_by('-created_at')
    
    # Aplicar paginación
    if 'page' in request.GET:
        return Paginator.paginate_response(
            defectives,
            request,
            DefectiveProductSerializer,
            default_page_size=50
        )
    
    serializer = DefectiveProductSerializer(defectives, many=True)
    return Response(serializer.data)


from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import Product, DefectiveProduct
from api.middleware.permission_middleware import PermissionMiddleware
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
def register_defective_product(request):
    """
    Registrar un producto defectuoso
    """
    if not PermissionMiddleware.check_permission(request.user, 'products', 'update'):
        return Response({'error': 'Sin permisos'}, status=status.HTTP_403_FORBIDDEN)
    
    data = request.data

    product_id = data.get('product')
    if not product_id:
        return Response({'error': 'El campo "product" es requerido'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        product = Product.objects.get(id=product_id, company=request.user.company)
    except Product.DoesNotExist:
        return Response({'error': 'Producto no encontrado en tu empresa'}, status=status.HTTP_404_NOT_FOUND)

    quantity = data.get('quantity')
    if not quantity:
        return Response({'error': 'El campo "quantity" es requerido'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        from decimal import Decimal
        quantity_dec = Decimal(str(quantity))
        if quantity_dec <= 0:
            raise ValueError()
    except Exception:
        return Response({'error': 'La cantidad debe ser un número mayor a 0'}, status=status.HTTP_400_BAD_REQUEST)

    reason = data.get('reason', '').strip()
    if not reason:
        return Response({'error': 'El campo "reason" es requerido'}, status=status.HTTP_400_BAD_REQUEST)

    status_value = data.get('status', 'defective')
    if status_value not in ['defective', 'replaced', 'removed']:
        return Response({'error': 'Estado inválido'}, status=status.HTTP_400_BAD_REQUEST)

    notes = data.get('notes', '')

    defective = DefectiveProduct.objects.create(
        product=product,
        quantity=quantity_dec,
        reason=reason,
        status=status_value,
        registered_by=request.user,
        notes=notes
    )

    logger.info(f"[DEFECTIVE] Registrado producto defectuoso {product.barcode} ({quantity_dec}) por {request.user.email}")

    from api.serializers.product_serializers import DefectiveProductSerializer
    return Response(DefectiveProductSerializer(defective).data, status=status.HTTP_201_CREATED)



@api_view(['POST'])
def resolve_defective_product(request, defective_id):
    """Resolver un producto defectuoso"""
    if not PermissionMiddleware.check_permission(request.user, 'products', 'manage'):
        return Response({'error': 'Sin permisos'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        defective = DefectiveProduct.objects.get(
            id=defective_id,
            product__company=request.user.company
        )
    except DefectiveProduct.DoesNotExist:
        return Response({'error': 'Registro no encontrado'}, status=status.HTTP_404_NOT_FOUND)
    
    if defective.status != 'pending':
        return Response({'error': 'Este registro ya fue resuelto'}, status=status.HTTP_400_BAD_REQUEST)
    
    resolution = request.data.get('resolution')  # 'changed' o 'discarded'
    resolution_notes = request.data.get('resolution_notes', '')
    
    if resolution not in ['changed', 'discarded']:
        return Response({'error': 'Resolución inválida'}, status=status.HTTP_400_BAD_REQUEST)
    
    with transaction.atomic():
        defective.status = resolution
        defective.resolution_notes = resolution_notes
        defective.resolved_by = request.user
        defective.save()
        
        # Si fue cambiado, restaurar stock
        if resolution == 'changed':
            product = defective.product
            product.stock_units += defective.quantity
            product.save()
    
    logger.info(f"Producto defectuoso resuelto: {defective.product.name} - {resolution} por {request.user.email}")
    
    serializer = DefectiveProductSerializer(defective)
    return Response(serializer.data)

@api_view(['GET'])
def products_by_navigation(request, department_slug=None, category_slug=None):
    """
    Endpoint de navegación jerárquica usando slugs:
    - /api/products/navigation/ -> Todos los productos + departamentos
    - /api/products/navigation/{department_slug}/ -> Solo categorías del departamento
    - /api/products/navigation/{department_slug}/{category_slug}/ -> Solo productos filtrados
    
    MEJORA: Maneja slugs no encontrados con respuestas JSON apropiadas
    """
    if not PermissionMiddleware.check_permission(request.user, 'products', 'view'):
        return Response({'error': 'Sin permisos'}, status=status.HTTP_403_FORBIDDEN)
    
    company = request.user.company
    response_data = {}
    
    # Caso 1: Sin filtros - mostrar todos los productos + departamentos
    if not department_slug:
        products = Product.objects.filter(
            company=company,
            is_active=True
        ).select_related('department', 'category').order_by('name')
        
        departments = Department.objects.filter(
            company=company,
            is_active=True
        ).order_by('name')
        
        response_data['departments'] = DepartmentSerializer(departments, many=True).data
        
        # Aplicar paginación si se solicita
        if 'page' in request.GET:
            return Paginator.paginate_response(
                products,
                request,
                ProductListSerializer,
                default_page_size=50,
                extra_data=response_data
            )
       
        response_data['products'] = ProductListSerializer(products, many=True).data
        return Response(response_data)
    
    # Caso 2: Con departamento - SOLO mostrar categorías (sin departamento ni productos)
    elif department_slug and not category_slug:
        try:
            department = Department.objects.get(
                company=company,
                slug=department_slug,
                is_active=True
            )
        except Department.DoesNotExist:
            return Response({
                'error': 'Departamento no encontrado',
                'message': f'No se encontró ningún departamento con el slug "{department_slug}"',
                'slug': department_slug,
                'type': 'department'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Solo obtener las categorías asociadas al departamento
        categories = Category.objects.filter(
            company=company,
            department=department,
            is_active=True
        ).order_by('name')
        
        # Contar productos del departamento sin categoría
        products_without_category_count = Product.objects.filter(
            company=company,
            department=department,
            category__isnull=True,
            is_active=True
        ).count()
        
        # SOLO retornar las categorías, sin department ni products
        response_data['categories'] = CategorySerializer(categories, many=True).data
        
        # Siempre agregar la opción "no-category"
        if products_without_category_count > 0:
            response_data['no_category'] = {
                'id': 'no-category',
                'name': 'Sin Categoría',
                'slug': 'no-category',
                'product_count': products_without_category_count,
                'description': f'{products_without_category_count} producto(s) sin categoría asignada'
            }
        else:
            response_data['no_category'] = {
                'id': 'no-category',
                'name': 'Sin Categoría',
                'slug': 'no-category',
                'product_count': 0,
                'description': f'No hay productos sin categoría en {department.name}'
            }
        
        response_data['department'] = {
            'id': str(department.id),
            'name': department.name,
            'slug': department.slug
        }
        return Response(response_data)
    
    # Caso 3: Con departamento y categoría - SOLO mostrar productos
    elif department_slug and category_slug:
        
        try:
            department = Department.objects.get(
                company=company,
                slug=department_slug,
                is_active=True
            )
        except Department.DoesNotExist:
            return Response({
                'error': 'Departamento no encontrado',
                'message': f'No se encontró ningún departamento con el slug "{department_slug}"',
                'slug': department_slug,
                'type': 'department'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Caso especial: "no-category" muestra productos sin categoría
        if category_slug == 'no-category':
            products = Product.objects.filter(
                company=company,
                department=department,
                category__isnull=True,
                is_active=True
            ).order_by('name')
            
            # Aplicar paginación si se solicita
            if 'page' in request.GET:
                return Paginator.paginate_response(
                    products,
                    request,
                    ProductListSerializer,
                    default_page_size=50,
                    extra_data={
                        'department': {
                            'id': str(department.id),
                            'name': department.name,
                            'slug': department.slug
                        },
                        'category': {
                            'id': 'no-category',
                            'name': 'Sin Categoría',
                            'slug': 'no-category'
                        }
                    }
                )
            
            # Convertir a lista para evitar paginación automática
            products_list = list(products)
            
            # Serializar
            try:
                serializer = ProductListSerializer(products_list, many=True)
                serialized_data = serializer.data
            except Exception as e:
                return Response({
                    'error': f'Error en serialización: {str(e)}',
                    'products': [],
                    'department': {
                        'id': str(department.id),
                        'name': department.name,
                        'slug': department.slug
                    },
                    'category': {
                        'id': 'no-category',
                        'name': 'Sin Categoría',
                        'slug': 'no-category'
                    }
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Construir respuesta
            response_data = {
                'products': serialized_data,
                'department': {
                    'id': str(department.id),
                    'name': department.name,
                    'slug': department.slug
                },
                'category': {
                    'id': 'no-category',
                    'name': 'Sin Categoría',
                    'slug': 'no-category'
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
        
        # Caso normal: buscar categoría real
        try:
            category = Category.objects.get(
                company=company,
                department=department,
                slug=category_slug,
                is_active=True
            )
        except Category.DoesNotExist:
            return Response({
                'error': 'Categoría no encontrada',
                'message': f'No se encontró ninguna categoría con el slug "{category_slug}" en el departamento "{department.name}"',
                'department_slug': department_slug,
                'category_slug': category_slug,
                'type': 'category'
            }, status=status.HTTP_404_NOT_FOUND)
        
    
        # Esto permite que se muestren productos aunque el department_id no coincida
        products = Product.objects.filter(
            company=company,
            category=category,  # Solo filtrar por categoría
            is_active=True
        ).order_by('name')
        
        
        # Aplicar paginación si se solicita
        if 'page' in request.GET:
            return Paginator.paginate_response(
                products,
                request,
                ProductListSerializer,
                default_page_size=50
            )
        
        # Convertir a lista para evitar paginación automática
        products_list = list(products)
        
        # Serializar
        try:
            serializer = ProductListSerializer(products_list, many=True)
            serialized_data = serializer.data
        except Exception as e:
            return Response({
                'error': f'Error en serialización: {str(e)}',
                'products': [],
                'department': {
                    'id': str(department.id),
                    'name': department.name,
                    'slug': department.slug
                },
                'category': {
                    'id': str(category.id),
                    'name': category.name,
                    'slug': category.slug
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Construir respuesta
        response_data = {
            'products': serialized_data,
            'department': {
                'id': str(department.id),
                'name': department.name,
                'slug': department.slug
            },
            'category': {
                'id': str(category.id),
                'name': category.name,
                'slug': category.slug
            }
        }
        
        
        return Response(response_data, status=status.HTTP_200_OK)
    
@api_view(['GET'])
def products_not_associated(request):
    """
    NUEVO ENDPOINT: Listar productos que no tienen department o category asignados
    
    Query params:
    - filter: 'department', 'category', 'both', 'any' (default: 'both')
    - department: UUID del departamento (opcional) - filtra productos de un departamento específico
    - page: número de página para paginación
    - page_size: tamaño de página (default: 50)
    """
    if not PermissionMiddleware.check_permission(request.user, 'products', 'view'):
        return Response({'error': 'Sin permisos'}, status=status.HTTP_403_FORBIDDEN)
    
    company = request.user.company
    filter_type = request.GET.get('filter', 'both')
    department_param = request.GET.get('department')
    
    # Construir filtros
    if filter_type == 'department':
        query_filter = Q(department__isnull=True)
    elif filter_type == 'category':
        query_filter = Q(category__isnull=True)
    elif filter_type == 'both':
        query_filter = Q(department__isnull=True) & Q(category__isnull=True)
    else:
        query_filter = Q(department__isnull=True) | Q(category__isnull=True)
    
    # Obtener productos
    products = Product.objects.filter(
        company=company,
        is_active=True
    ).filter(query_filter)
    
    # Aplicar filtro por departamento si se proporciona
    department_obj = None
    if department_param:
        try:
            department_obj = Department.objects.get(
                id=department_param,
                company=company,
                is_active=True
            )
            products = products.filter(department=department_obj)
        except Department.DoesNotExist:
            return Response({
                'error': 'Departamento no encontrado',
                'message': f'No se encontró un departamento con el ID proporcionado',
                'department_id': department_param
            }, status=status.HTTP_404_NOT_FOUND)
    
    products = products.order_by('name')
    
    # Estadísticas
    total_without_department = Product.objects.filter(
        company=company,
        is_active=True,
        department__isnull=True
    ).count()
    
    total_without_category = Product.objects.filter(
        company=company,
        is_active=True,
        category__isnull=True
    ).count()
    
    total_without_both = Product.objects.filter(
        company=company,
        is_active=True,
        department__isnull=True,
        category__isnull=True
    ).count()
    
    extra_data = {
        'filter_applied': filter_type,
        'statistics': {
            'without_department': total_without_department,
            'without_category': total_without_category,
            'without_both': total_without_both,
            'total_found': products.count()
        }
    }
    
    # Agregar información del departamento filtrado si aplica
    if department_obj:
        extra_data['department_filter'] = {
            'applied': True,
            'department_id': str(department_obj.id),
            'department_name': department_obj.name
        }
    
    # Paginación si se solicita
    if 'page' in request.GET:
        return Paginator.paginate_response(
            products,
            request,
            ProductListSerializer,
            default_page_size=50,
            extra_data=extra_data
        )
    
    # Convertir a lista primero
    products_list = list(products)
    
    # Intentar serializar con manejo de errores
    try:
        serializer = ProductListSerializer(products_list, many=True)
        serialized_data = serializer.data
    except Exception as e:
        return Response({
            'error': f'Error en serialización: {str(e)}',
            **extra_data,
            'products': []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    response_data = {
        **extra_data,
        'products': serialized_data
    }
    
    return Response(response_data, status=status.HTTP_200_OK)

@api_view(['PUT'])
def bulk_update_products(request):
    """
    Actualizar múltiples productos a la vez (departamento y/o categoría)
    
    Body:
    {
        "products": ["uuid1", "uuid2", "uuid3"],
        "department": "uuid_department",  // opcional
        "category": "uuid_category"       // opcional o null
    }
    """
    if not PermissionMiddleware.check_permission(request.user, 'products', 'edit'):
        return Response({'error': 'Sin permisos'}, status=403)
    
    try:
        company = request.user.company
        data = request.data
        
        # Validar que se envió la lista de productos
        product_ids = data.get('products', [])
        if not product_ids or not isinstance(product_ids, list):
            return Response(
                {'error': 'Debe proporcionar una lista de IDs de productos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar que se proporcionó al menos un campo para actualizar
        if 'department' not in data and 'category' not in data:
            return Response(
                {'error': 'Debe proporcionar al menos un campo para actualizar (department o category)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        department_id = data.get('department')
        category_id = data.get('category')
        
        # Obtener los productos de la empresa
        products = Product.objects.filter(
            id__in=product_ids,
            company=company
        )
        
        if not products.exists():
            return Response(
                {'error': 'No se encontraron productos válidos'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Preparar los campos a actualizar
        update_fields = {}

        # Validar departamento si se proporcionó la clave en el request
        if 'department' in data:
            department_id = data.get('department')
    
            if department_id:  # Si tiene un valor (no es null ni "")
                try:
                    department = Department.objects.get(id=department_id, company=company)
                    update_fields['department'] = department
                except Department.DoesNotExist:
                    return Response(
                        {'error': 'Departamento no encontrado'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                # Si department_id es null o "", establecer el departamento como null
                update_fields['department'] = None

        # Validar categoría si se proporcionó la clave en el request
        if 'category' in data:
            category_id = data.get('category')
    
            if category_id:  # Si tiene un valor (no es null ni "")
                try:
                    category = Category.objects.get(id=category_id, company=company)
                    update_fields['category'] = category
                except Category.DoesNotExist:
                    return Response(
                        {'error': 'Categoría no encontrada'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                # Si category_id es null o "", establecer la categoría como null
                update_fields['category'] = None
        
        # Realizar la actualización masiva
        updated_count = 0
        for product in products:
            for field, value in update_fields.items():
                setattr(product, field, value)
            product.save()
            updated_count += 1
        
        return Response({
            'message': f'Se actualizaron {updated_count} productos exitosamente',
            'updated_count': updated_count,
            'total_requested': len(product_ids)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error al actualizar productos: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )