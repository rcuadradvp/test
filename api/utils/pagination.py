# api/utils/pagination.py

from rest_framework.response import Response
from math import ceil

class Paginator:
    """
    Utilidad para paginar querysets de Django
    """
    
    @staticmethod
    def paginate(queryset, request, default_page_size=50, max_page_size=500):
        """
        Pagina un queryset basado en los parámetros de la request
        
        Args:
            queryset: QuerySet de Django a paginar
            request: Request object de DRF
            default_page_size: Tamaño de página por defecto (50)
            max_page_size: Tamaño máximo permitido (500)
            
        Returns:
            dict con los datos paginados y metadata
        """
        # Obtener parámetros de paginación
        try:
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', default_page_size))
        except (ValueError, TypeError):
            page = 1
            page_size = default_page_size
        
        # Validar parámetros
        if page < 1:
            page = 1
        
        if page_size < 1:
            page_size = default_page_size
        elif page_size > max_page_size:
            page_size = max_page_size
        
        # Contar total de items
        total_items = queryset.count()
        
        # Calcular total de páginas
        total_pages = ceil(total_items / page_size) if total_items > 0 else 1
        
        # Ajustar página si está fuera de rango
        if page > total_pages:
            page = total_pages
        
        # Calcular offset
        offset = (page - 1) * page_size
        
        # Obtener items de la página actual
        items = list(queryset[offset:offset + page_size])
        
        # Construir URLs de navegación
        base_url = request.build_absolute_uri(request.path)
        query_params = request.GET.copy()
        
        # URL página siguiente
        next_url = None
        if page < total_pages:
            query_params['page'] = page + 1
            query_params['page_size'] = page_size
            next_url = f"{base_url}?{'&'.join([f'{k}={v}' for k, v in query_params.items()])}"
        
        # URL página anterior
        previous_url = None
        if page > 1:
            query_params['page'] = page - 1
            query_params['page_size'] = page_size
            previous_url = f"{base_url}?{'&'.join([f'{k}={v}' for k, v in query_params.items()])}"
        
        return {
            'count': total_items,
            'total_pages': total_pages,
            'current_page': page,
            'page_size': page_size,
            'next': next_url,
            'previous': previous_url,
            'results': items
        }
    
    @staticmethod
    def paginate_response(queryset, request, serializer_class, default_page_size=50, max_page_size=500):
        """
        Pagina un queryset y devuelve una Response serializada
        
        Args:
            queryset: QuerySet de Django a paginar
            request: Request object de DRF
            serializer_class: Clase del serializer a usar
            default_page_size: Tamaño de página por defecto
            max_page_size: Tamaño máximo permitido
            
        Returns:
            Response de DRF con datos paginados
        """
        paginated_data = Paginator.paginate(
            queryset, 
            request, 
            default_page_size, 
            max_page_size
        )
        
        # Serializar los resultados
        serializer = serializer_class(paginated_data['results'], many=True)
        paginated_data['results'] = serializer.data
        
        return Response(paginated_data)