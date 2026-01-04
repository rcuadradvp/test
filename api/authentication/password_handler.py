# api/authentication/password_handler.py

import bcrypt

class PasswordHandler:
    """Manejador de contraseñas con bcrypt"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hashear contraseña con bcrypt"""
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """Verificar contraseña"""
        password_bytes = password.encode('utf-8')
        hashed_bytes = hashed.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)