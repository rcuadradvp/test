# api/models/user.py

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
import uuid
from .company import Company
from .role_permission import Role, Page, Permission

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El usuario debe tener un email')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # Usará bcrypt
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Usuario personalizado del sistema"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='users')
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name='users')
    
    # Datos básicos
    email = models.EmailField(unique=True, max_length=255)
    username = models.CharField(max_length=150, unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    rut = models.CharField(max_length=12, unique=True)
    phone = models.CharField(max_length=20, blank=True)
    
    # Estado
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='created_users')
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'user'  # Django compatible
        indexes = [
            models.Index(fields=['company', 'email'], name='idx_usr_comp_email'),
            models.Index(fields=['rut'], name='idx_usr_rut'),
            models.Index(fields=['is_active'], name='idx_usr_active'),
            models.Index(fields=['role'], name='idx_usr_role'),
        ]


class UserPageAccess(models.Model):
    """Acceso personalizado a páginas por usuario (override del rol)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='custom_page_accesses')
    page = models.ForeignKey(Page, on_delete=models.CASCADE)
    can_access = models.BooleanField(default=False)  # Solo para QUITAR acceso
    
    class Meta:
        db_table = 'user_page_access'
        unique_together = [['user', 'page']]
        indexes = [
            models.Index(fields=['user', 'page'], name='idx_upa_usr_page'),
        ]


class UserPermission(models.Model):
    """Permisos personalizados por usuario (override del rol)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='custom_permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)
    is_granted = models.BooleanField(default=False)  # Solo para QUITAR permisos
    
    class Meta:
        db_table = 'user_permissions'
        unique_together = [['user', 'permission']]
        indexes = [
            models.Index(fields=['user', 'permission'], name='idx_up_usr_perm'),
        ]