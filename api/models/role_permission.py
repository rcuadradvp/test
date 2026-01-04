# api/models/role_permission.py
from django.db import models
from .company import Company
import uuid

class Role(models.Model):
    """Roles del sistema"""
    MASTER_ADMIN = 'master_admin'
    SUPER_ADMIN = 'super_admin'
    ADMIN = 'admin'
    CASHIER = 'cashier'
    EMPLOYEE = 'employee'
    
    ROLE_CHOICES = [
        (MASTER_ADMIN, 'Master Admin'),
        (SUPER_ADMIN, 'Super Admin'),
        (ADMIN, 'Administrador'),
        (CASHIER, 'Cajero'),
        (EMPLOYEE, 'Empleado'),
    ]
    
    HIERARCHY = {
        MASTER_ADMIN: 5,
        SUPER_ADMIN: 4,
        ADMIN: 3,
        CASHIER: 2,
        EMPLOYEE: 1,
    }
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='roles')
    name = models.CharField(max_length=50, choices=ROLE_CHOICES)
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    hierarchy_level = models.IntegerField()  # Para control de jerarquía
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'roles'
        unique_together = [['company', 'name']]
        indexes = [
            models.Index(fields=['company', 'name'], name='idx_role_comp_nm'),
            models.Index(fields=['hierarchy_level'], name='idx_role_hier'),
        ]


class Page(models.Model):
    """Páginas/Vistas del sistema"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=100)
    route = models.CharField(max_length=200)
    association = models.CharField(max_length=100, null=True, blank=True)
    icon_association = models.CharField(max_length=100, null=True, blank=True)
    icon = models.CharField(max_length=50, null=True, blank=True)
    parent_page = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'pages'
        indexes = [
            models.Index(fields=['name'], name='idx_page_name'),
            models.Index(fields=['route'], name='idx_page_route'),
        ]


class Permission(models.Model):
    """Permisos granulares del sistema"""
    # Tipos de acciones
    VIEW = 'view'
    CREATE = 'create'
    EDIT = 'edit'
    DELETE = 'delete'
    EXPORT = 'export'
    IMPORT = 'import'
    APPROVE = 'approve'
    
    ACTION_CHOICES = [
        (VIEW, 'Ver'),
        (CREATE, 'Crear'),
        (EDIT, 'Editar'),
        (DELETE, 'Eliminar'),
        (EXPORT, 'Exportar'),
        (IMPORT, 'Importar'),
        (APPROVE, 'Aprobar'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=100)
    resource = models.CharField(max_length=50)  # products, sales, clients, etc.
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.TextField(blank=True)
    
    class Meta:
        db_table = 'permissions'
        unique_together = [['resource', 'action']]
        indexes = [
            models.Index(fields=['resource', 'action'], name='idx_perm_res_act'),
        ]


class RolePageAccess(models.Model):
    """
    Acceso base de un rol a una página.
    Esto es lo que tu vista interpreta como `role_has_access`.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='page_accesses')
    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name='page_accesses')
    can_access = models.BooleanField(default=True)

    class Meta:
        db_table = 'role_page_access'
        unique_together = [['role', 'page']]

    def __str__(self):
        return f'{self.role} -> {self.page} ({self.can_access})'


class RolePermission(models.Model):
    """
    Permisos base de un rol.
    Esto es lo que tu vista usa con `perm.role_permissions`.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='role_permissions')
    is_granted = models.BooleanField(default=True)

    class Meta:
        db_table = 'role_permissions'
        unique_together = [['role', 'permission']]

    def __str__(self):
        return f'{self.role} -> {self.permission} ({self.is_granted})'