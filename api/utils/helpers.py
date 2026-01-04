# api/utils/helpers.py

from decimal import Decimal
from django.utils import timezone
from datetime import datetime, timedelta

class PriceCalculator:
    """Calculadora de precios con IVA"""
    
    @staticmethod
    def calculate_with_iva(price, iva_percentage=19):
        """Calcular precio con IVA"""
        if not price:
            return Decimal('0.00')
        
        price = Decimal(str(price))
        iva_percentage = Decimal(str(iva_percentage))
        
        iva_multiplier = Decimal('1') + (iva_percentage / Decimal('100'))
        return (price * iva_multiplier).quantize(Decimal('0.01'))
    
    @staticmethod
    def calculate_iva_amount(price, iva_percentage=19):
        """Calcular solo el monto del IVA"""
        if not price:
            return Decimal('0.00')
        
        price = Decimal(str(price))
        iva_percentage = Decimal(str(iva_percentage))
        
        return (price * iva_percentage / Decimal('100')).quantize(Decimal('0.01'))
    
    @staticmethod
    def calculate_without_iva(price_with_iva, iva_percentage=19):
        """Calcular precio sin IVA a partir del precio con IVA"""
        if not price_with_iva:
            return Decimal('0.00')
        
        price_with_iva = Decimal(str(price_with_iva))
        iva_percentage = Decimal(str(iva_percentage))
        
        divisor = Decimal('1') + (iva_percentage / Decimal('100'))
        return (price_with_iva / divisor).quantize(Decimal('0.01'))


class StockCalculator:
    """Calculadora de stock con paquetes y bandejas"""
    
    @staticmethod
    def calculate_total_units(stock_units, is_package=False, units_per_package=None):
        """Calcular total de unidades"""
        if not is_package or not units_per_package:
            return stock_units
        
        # Si es paquete, convertir a unidades
        stock_units = Decimal(str(stock_units))
        units_per_package = Decimal(str(units_per_package))
        
        return stock_units * units_per_package
    
    @staticmethod
    def calculate_packages(total_units, units_per_package):
        """Calcular cuántos paquetes completos hay"""
        if not units_per_package or units_per_package == 0:
            return 0, total_units
        
        total_units = Decimal(str(total_units))
        units_per_package = Decimal(str(units_per_package))
        
        complete_packages = int(total_units // units_per_package)
        remaining_units = total_units % units_per_package
        
        return complete_packages, remaining_units
    
    @staticmethod
    def has_open_package(total_units, units_per_package):
        """Verificar si hay un paquete abierto"""
        if not units_per_package or units_per_package == 0:
            return False
        
        total_units = Decimal(str(total_units))
        units_per_package = Decimal(str(units_per_package))
        
        return (total_units % units_per_package) != 0
    
    @staticmethod
    def format_stock_display(product):
        """Formatear display de stock según configuración"""
        stock_units = product.stock_units or Decimal('0')

        stock_units_int = int(stock_units)

        if not product.is_package or not product.units_per_package:
            return f"{stock_units_int} unidades"

        packages, remaining = StockCalculator.calculate_packages(
            stock_units,
            product.units_per_package
        )

        packages = int(packages)
        remaining = int(remaining)

        if remaining > 0:
            return (
                f"{packages} paquetes + {remaining} unidades "
                f"(Total: {stock_units_int} unidades)"
            )
        else:
            return f"{packages} paquetes ({stock_units_int} unidades)"


class DateHelper:
    """Helper para manejo de fechas"""
    
    @staticmethod
    def get_week_range():
        """Obtener rango de la semana actual"""
        today = timezone.now().date()
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        return start, end
    
    @staticmethod
    def get_month_range():
        """Obtener rango del mes actual"""
        today = timezone.now().date()
        start = today.replace(day=1)
        
        # Último día del mes
        if today.month == 12:
            end = today.replace(day=31)
        else:
            next_month = today.replace(month=today.month + 1, day=1)
            end = next_month - timedelta(days=1)
        
        return start, end
    
    @staticmethod
    def get_previous_month_range():
        """Obtener rango del mes anterior"""
        today = timezone.now().date()
        
        if today.month == 1:
            start = today.replace(year=today.year - 1, month=12, day=1)
            end = start.replace(day=31)
        else:
            start = today.replace(month=today.month - 1, day=1)
            next_month = today.replace(day=1)
            end = next_month - timedelta(days=1)
        
        return start, end
    
    @staticmethod
    def get_year_range():
        """Obtener rango del año actual"""
        today = timezone.now().date()
        start = today.replace(month=1, day=1)
        end = today.replace(month=12, day=31)
        return start, end


class MoneyHelper:
    """Helper para manejo de dinero"""
    
    @staticmethod
    def calculate_change(paid, total):
        """Calcular vuelto"""
        paid = Decimal(str(paid))
        total = Decimal(str(total))
        
        change = paid - total
        return change.quantize(Decimal('0.01')) if change > 0 else Decimal('0.00')
    
    @staticmethod
    def format_currency(amount):
        """Formatear como moneda chilena"""
        if not amount:
            return "$0"
        
        amount = Decimal(str(amount))
        # Formatear con separador de miles
        return f"${amount:,.0f}".replace(',', '.')


class PermissionHelper:
    """Helper para verificación de permisos"""
    
    @staticmethod
    def can_user_edit_target(requesting_user, target_user):
        """Verificar si un usuario puede editar a otro basado en jerarquía"""
        # Master Admin puede editar a todos
        if requesting_user.role.name == 'master_admin':
            return True
        
        # Nadie puede editar a Master Admin
        if target_user.role.name == 'master_admin':
            return False
        
        # Super Admin puede editar Admin y Cashier
        if requesting_user.role.name == 'super_admin':
            return target_user.role.name in ['admin', 'cashier', 'employee']
        
        # Admin puede editar Cashier y Employee
        if requesting_user.role.name == 'admin':
            return target_user.role.name in ['cashier', 'employee']
        
        # Los demás no pueden editar a nadie
        return False
    
    @staticmethod
    def get_editable_roles(requesting_user):
        """Obtener lista de roles que el usuario puede asignar"""
        role_name = requesting_user.role.name
        
        if role_name == 'master_admin':
            return ['super_admin', 'admin', 'cashier', 'employee']
        elif role_name == 'super_admin':
            return ['admin', 'cashier', 'employee']
        elif role_name == 'admin':
            return ['cashier', 'employee']
        else:
            return []