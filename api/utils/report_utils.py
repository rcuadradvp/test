# project/api/utils/report_utils.py

from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone
from typing import Dict, List, Tuple


class IVACalculator:
    """Utilidades para cálculo de IVA en reportes"""
    
    IVA_STANDARD = Decimal('19.00')  # IVA estándar en Chile
    
    @staticmethod
    def calculate_base_and_iva(total: Decimal, iva_rate: Decimal = None) -> Tuple[Decimal, Decimal]:
        """
        Calcula base imponible e IVA desde un monto total
        
        Args:
            total: Monto total con IVA incluido
            iva_rate: Tasa de IVA (default: 19%)
        
        Returns:
            Tuple (base_imponible, iva_amount)
        """
        if iva_rate is None:
            iva_rate = IVACalculator.IVA_STANDARD
        
        divisor = 1 + (iva_rate / 100)
        base = total / divisor
        iva = total - base
        
        return base, iva
    
    @staticmethod
    def calculate_iva_from_base(base: Decimal, iva_rate: Decimal = None) -> Decimal:
        """
        Calcula IVA desde la base imponible
        
        Args:
            base: Monto base sin IVA
            iva_rate: Tasa de IVA (default: 19%)
        
        Returns:
            Monto del IVA
        """
        if iva_rate is None:
            iva_rate = IVACalculator.IVA_STANDARD
        
        return base * (iva_rate / 100)
    
    @staticmethod
    def format_iva_breakdown(breakdown: Dict) -> Dict:
        """
        Formatea el desglose de IVA para presentación
        
        Args:
            breakdown: Diccionario con información de IVA
        
        Returns:
            Diccionario formateado
        """
        return {
            'subtotal_neto': f"${breakdown.get('total_base_imponible', 0):,.2f}",
            'iva_19': f"${breakdown.get('iva_19_percent', 0):,.2f}",
            'iva_variable': f"${breakdown.get('iva_variable', 0):,.2f}",
            'total_iva': f"${breakdown.get('total_iva', 0):,.2f}",
            'exento': f"${breakdown.get('total_exempt', 0):,.2f}",
            'total_con_iva': f"${breakdown.get('total_with_iva', 0):,.2f}"
        }


class DateRangeHelper:
    """Utilidades para manejo de rangos de fechas en reportes"""
    
    @staticmethod
    def get_current_week() -> Tuple[datetime, datetime]:
        """Obtiene el rango de la semana actual (Lunes a Domingo)"""
        today = timezone.now()
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        
        return (
            start.replace(hour=0, minute=0, second=0, microsecond=0),
            end.replace(hour=23, minute=59, second=59, microsecond=999999)
        )
    
    @staticmethod
    def get_current_month() -> Tuple[datetime, datetime]:
        """Obtiene el rango del mes actual"""
        today = timezone.now()
        start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Último día del mes
        if today.month == 12:
            end = today.replace(month=12, day=31, hour=23, minute=59, second=59, microsecond=999999)
        else:
            next_month = today.replace(month=today.month + 1, day=1)
            end = (next_month - timedelta(days=1)).replace(hour=23, minute=59, second=59, microsecond=999999)
        
        return start, end
    
    @staticmethod
    def get_last_month() -> Tuple[datetime, datetime]:
        """Obtiene el rango del mes anterior"""
        today = timezone.now()
        
        # Primer día del mes anterior
        if today.month == 1:
            start = today.replace(year=today.year - 1, month=12, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            start = today.replace(month=today.month - 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Último día del mes anterior
        end = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(microseconds=1)
        
        return start, end
    
    @staticmethod
    def get_current_year() -> Tuple[datetime, datetime]:
        """Obtiene el rango del año actual"""
        today = timezone.now()
        start = today.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = today.replace(month=12, day=31, hour=23, minute=59, second=59, microsecond=999999)
        
        return start, end
    
    @staticmethod
    def parse_date_range(start_date: str = None, end_date: str = None, 
                         preset: str = None) -> Tuple[datetime, datetime]:
        """
        Parsea rango de fechas desde strings o preset
        
        Args:
            start_date: Fecha inicio (ISO format)
            end_date: Fecha fin (ISO format)
            preset: 'week', 'month', 'last_month', 'year'
        
        Returns:
            Tuple (start, end)
        """
        if preset:
            if preset == 'week':
                return DateRangeHelper.get_current_week()
            elif preset == 'month':
                return DateRangeHelper.get_current_month()
            elif preset == 'last_month':
                return DateRangeHelper.get_last_month()
            elif preset == 'year':
                return DateRangeHelper.get_current_year()
        
        # Parse manual dates
        start = None
        end = None
        
        if start_date:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        
        if end_date:
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        # Defaults si no se especifica
        if not start:
            start = timezone.now() - timedelta(days=30)
        
        if not end:
            end = timezone.now()
        
        return start, end


class ReportFormatter:
    """Utilidades para formatear datos de reportes"""
    
    @staticmethod
    def format_currency(amount: Decimal) -> str:
        """Formatea cantidad como moneda chilena"""
        return f"${amount:,.0f}".replace(',', '.')
    
    @staticmethod
    def format_percentage(value: Decimal, decimals: int = 2) -> str:
        """Formatea como porcentaje"""
        return f"{value:.{decimals}f}%"
    
    @staticmethod
    def calculate_growth(current: Decimal, previous: Decimal) -> Dict:
        """
        Calcula crecimiento entre dos periodos
        
        Returns:
            Dict con 'amount', 'percentage', 'trend' ('up', 'down', 'stable')
        """
        if previous == 0:
            if current > 0:
                return {'amount': current, 'percentage': 100, 'trend': 'up'}
            else:
                return {'amount': 0, 'percentage': 0, 'trend': 'stable'}
        
        diff = current - previous
        percentage = (diff / previous) * 100
        
        trend = 'stable'
        if diff > 0:
            trend = 'up'
        elif diff < 0:
            trend = 'down'
        
        return {
            'amount': float(diff),
            'percentage': float(percentage),
            'trend': trend
        }
    
    @staticmethod
    def group_by_period(data: List[Dict], date_field: str, period: str = 'day') -> Dict:
        """
        Agrupa datos por periodo (día, semana, mes)
        
        Args:
            data: Lista de diccionarios con datos
            date_field: Campo que contiene la fecha
            period: 'day', 'week', 'month'
        
        Returns:
            Diccionario agrupado por periodo
        """
        grouped = {}
        
        for item in data:
            date = item.get(date_field)
            if not date:
                continue
            
            if isinstance(date, str):
                date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            
            # Determinar clave del grupo
            if period == 'day':
                key = date.strftime('%Y-%m-%d')
            elif period == 'week':
                key = f"{date.year}-W{date.isocalendar()[1]:02d}"
            elif period == 'month':
                key = date.strftime('%Y-%m')
            else:
                key = date.strftime('%Y-%m-%d')
            
            if key not in grouped:
                grouped[key] = []
            
            grouped[key].append(item)
        
        return grouped


class StockAnalyzer:
    """Utilidades para análisis de stock"""
    
    @staticmethod
    def calculate_stock_status(current: Decimal, minimum: Decimal) -> str:
        """
        Determina el estado del stock
        
        Returns:
            'critical', 'low', 'medium', 'optimal'
        """
        if current == 0:
            return 'critical'
        
        percentage = (current / minimum * 100) if minimum > 0 else 100
        
        if percentage <= 50:
            return 'low'
        elif percentage <= 100:
            return 'medium'
        else:
            return 'optimal'
    
    @staticmethod
    def calculate_turnover_rate(sold_quantity: Decimal, average_stock: Decimal, 
                                days: int = 30) -> Decimal:
        """
        Calcula la rotación de inventario
        
        Args:
            sold_quantity: Cantidad vendida en el periodo
            average_stock: Stock promedio
            days: Días del periodo
        
        Returns:
            Tasa de rotación (ventas por día / stock promedio)
        """
        if average_stock == 0:
            return Decimal('0')
        
        daily_sales = sold_quantity / days
        return daily_sales / average_stock
    
    @staticmethod
    def calculate_days_of_stock(current_stock: Decimal, daily_sales: Decimal) -> int:
        """
        Calcula días de stock disponible
        
        Returns:
            Número de días aproximados
        """
        if daily_sales == 0:
            return 999  # Stock infinito si no hay ventas
        
        return int(current_stock / daily_sales)


class ExportHelper:
    """Utilidades para exportación de reportes"""
    
    @staticmethod
    def prepare_for_excel(data: List[Dict]) -> List[List]:
        """
        Convierte lista de diccionarios en formato para Excel
        
        Returns:
            Lista de listas (filas)
        """
        if not data:
            return []
        
        # Headers de las columnas
        headers = list(data[0].keys())
        rows = [headers]
        
        # Datos
        for item in data:
            row = [item.get(header, '') for header in headers]
            rows.append(row)
        
        return rows
    
    @staticmethod
    def sanitize_for_csv(value: any) -> str:
        """
        Sanitiza valores para CSV (elimina comas, saltos de línea, etc.)
        """
        if value is None:
            return ''
        
        value_str = str(value)
        
        # Remover caracteres problemáticos
        value_str = value_str.replace('\n', ' ').replace('\r', ' ')
        value_str = value_str.replace(',', ';')
        
        return value_str
    
    @staticmethod
    def generate_filename(report_type: str, company_name: str, 
                         start_date: datetime = None, end_date: datetime = None) -> str:
        """
        Genera nombre de archivo para reporte
        
        Args:
            report_type: 'ventas', 'inventario', 'creditos', etc.
            company_name: Nombre de la empresa
            start_date: Fecha inicio
            end_date: Fecha fin
        
        Returns:
            Nombre de archivo
        """
        # Sanitizar nombre de empresa
        safe_company = company_name.replace(' ', '_').replace('/', '_')
        
        # Timestamp
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        
        # Rango de fechas si está disponible
        date_range = ''
        if start_date and end_date:
            date_range = f"_{start_date.strftime('%Y%m%d')}_to_{end_date.strftime('%Y%m%d')}"
        
        return f"{report_type}_{safe_company}{date_range}_{timestamp}.xlsx"