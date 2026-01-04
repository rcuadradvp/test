# api/utils/validators.py

import re
from rest_framework import serializers

class RutValidator:
    """Validador de RUT chileno"""
    
    @staticmethod
    def clean_rut(rut):
        """Limpiar RUT dejando solo números y K"""
        if not rut:
            return None
        return re.sub(r'[^0-9kK]', '', str(rut)).upper()
    
    @staticmethod
    def format_rut(rut):
        """Formatear RUT al estilo XX.XXX.XXX-X"""
        if not rut:
            return None
        
        rut = RutValidator.clean_rut(rut)
        if not rut:
            return None
        
        # Separar dígito verificador
        if len(rut) < 2:
            return rut
        
        dv = rut[-1]
        num = rut[:-1]
        
        # Formatear con puntos
        formatted = ""
        for i, digit in enumerate(reversed(num)):
            if i > 0 and i % 3 == 0:
                formatted = "." + formatted
            formatted = digit + formatted
        
        return f"{formatted}-{dv}"
    
    @staticmethod
    def calculate_dv(rut_number):
        """Calcular dígito verificador"""
        rut = str(rut_number)
        reversed_digits = map(int, reversed(rut))
        factors = [2, 3, 4, 5, 6, 7]
        s = sum(d * factors[i % 6] for i, d in enumerate(reversed_digits))
        remainder = s % 11
        dv = 11 - remainder
        
        if dv == 11:
            return '0'
        elif dv == 10:
            return 'K'
        else:
            return str(dv)
    
    @staticmethod
    def validate(rut):
        """Validar RUT completo"""
        if not rut:
            raise serializers.ValidationError("RUT es requerido")
        
        # Limpiar RUT
        clean = RutValidator.clean_rut(rut)
        
        # Validar formato básico
        if not clean or len(clean) < 2:
            raise serializers.ValidationError("RUT inválido: formato incorrecto")
        
        # Separar número y dígito verificador
        dv_provided = clean[-1]
        rut_number = clean[:-1]
        
        # Validar que el número sea numérico
        if not rut_number.isdigit():
            raise serializers.ValidationError("RUT inválido: debe contener solo números")
        
        # Validar longitud (mínimo 7 dígitos, máximo 8 + DV)
        if len(rut_number) < 7 or len(rut_number) > 8:
            raise serializers.ValidationError("RUT inválido: longitud incorrecta")
        
        # Calcular dígito verificador esperado
        dv_calculated = RutValidator.calculate_dv(rut_number)
        
        # Comparar
        if dv_provided != dv_calculated:
            raise serializers.ValidationError(
                f"RUT inválido: dígito verificador incorrecto. "
                f"Se esperaba {dv_calculated}, se recibió {dv_provided}"
            )
        
        return True
    
    @staticmethod
    def validate_and_format(rut):
        """Validar y retornar RUT formateado"""
        RutValidator.validate(rut)
        return RutValidator.format_rut(rut)


class BarcodeValidator:
    """Validador de códigos de barra"""
    
    @staticmethod
    def validate_format(barcode):
        """Validar formato básico del código de barras"""
        if not barcode:
            raise serializers.ValidationError("Código de barras es requerido")
        
        # Limpiar espacios
        barcode = str(barcode).strip()
        
        # Validar longitud (códigos comunes: EAN-8, EAN-13, UPC-A)
        valid_lengths = [8, 12, 13, 14]
        if len(barcode) not in valid_lengths:
            raise serializers.ValidationError(
                f"Código de barras inválido: longitud debe ser {', '.join(map(str, valid_lengths))}"
            )
        
        # Validar que sea numérico (para EAN/UPC)
        if not barcode.isdigit():
            raise serializers.ValidationError("Código de barras debe contener solo números")
        
        return barcode
    
    @staticmethod
    def validate_ean13(barcode):
        """Validar código EAN-13 con dígito de control"""
        if len(barcode) != 13:
            raise serializers.ValidationError("EAN-13 debe tener 13 dígitos")
        
        # Calcular dígito de control
        odd_sum = sum(int(barcode[i]) for i in range(0, 12, 2))
        even_sum = sum(int(barcode[i]) for i in range(1, 12, 2))
        total = odd_sum + (even_sum * 3)
        check_digit = (10 - (total % 10)) % 10
        
        # Comparar con el dígito proporcionado
        if int(barcode[-1]) != check_digit:
            raise serializers.ValidationError("EAN-13 inválido: dígito de control incorrecto")
        
        return True


class PhoneValidator:
    """Validador de teléfonos chilenos"""
    
    @staticmethod
    def validate(phone):
        """Validar formato de teléfono chileno"""
        if not phone:
            return True  # Opcional
        
        # Limpiar
        clean = re.sub(r'[^\d+]', '', str(phone))
        
        # Formatos válidos:
        # +56912345678 (celular con código país)
        # 912345678 (celular)
        # 221234567 (fijo Santiago)
        
        patterns = [
            r'^\+56\d{9}$',  # +56912345678
            r'^9\d{8}$',     # 912345678
            r'^2\d{8}$',     # 221234567
            r'^\d{7,9}$'     # Genérico 7-9 dígitos
        ]
        
        for pattern in patterns:
            if re.match(pattern, clean):
                return True
        
        raise serializers.ValidationError(
            "Teléfono inválido. Formatos válidos: +56912345678, 912345678, 221234567"
        )


class EmailValidator:
    """Validador de email"""
    
    @staticmethod
    def validate(email):
        """Validar formato básico de email"""
        if not email:
            raise serializers.ValidationError("Email es requerido")
        
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            raise serializers.ValidationError("Email inválido")
        
        return True