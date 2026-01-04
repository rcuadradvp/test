# api/management/commands/seed_data2.py

from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import (
    User, UserPageAccess, UserPermission,
    RolePageAccess, RolePermission
)
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Inicializa permisos de usuario basados en sus roles existentes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Eliminar todos los permisos de usuario existentes antes de crear nuevos',
        )
        parser.add_argument(
            '--user-email',
            type=str,
            help='Aplicar solo a un usuario específico por email',
        )

    def handle(self, *args, **options):
        reset = options['reset']
        target_email = options.get('user_email')
        
        self.stdout.write(self.style.SUCCESS('='*70))
        self.stdout.write(self.style.SUCCESS('🚀 INICIALIZANDO PERMISOS POR USUARIO'))
        self.stdout.write(self.style.SUCCESS('='*70))
        
        # Paso 1: Reset si se solicita
        if reset:
            self.stdout.write('\n🗑️  Eliminando permisos de usuario existentes...')
            deleted_pages = UserPageAccess.objects.all().delete()[0]
            deleted_perms = UserPermission.objects.all().delete()[0]
            self.stdout.write(
                self.style.WARNING(
                    f'   Eliminados: {deleted_pages} accesos a páginas, {deleted_perms} permisos'
                )
            )
        
        # Paso 2: Obtener usuarios
        users_query = User.objects.select_related('role', 'company').filter(is_active=True)
        
        if target_email:
            users_query = users_query.filter(email=target_email)
            if not users_query.exists():
                self.stdout.write(self.style.ERROR(f'❌ Usuario {target_email} no encontrado'))
                return
        
        users = list(users_query)
        
        if not users:
            self.stdout.write(self.style.ERROR('❌ No hay usuarios para procesar'))
            return
        
        self.stdout.write(f'\n👥 Usuarios a procesar: {len(users)}')
        
        # Contadores globales
        total_pages_created = 0
        total_perms_created = 0
        total_pages_skipped = 0
        total_perms_skipped = 0
        
        # Paso 3: Procesar cada usuario
        for user in users:
            self.stdout.write(f'\n📋 Procesando: {user.email} ({user.role.display_name})')
            
            # Master Admin no necesita permisos en user_permissions/user_page_access
            if user.role.name == 'master_admin':
                self.stdout.write(
                    self.style.WARNING('   ⏭️  Master Admin - No requiere permisos individuales')
                )
                continue
            
            try:
                with transaction.atomic():
                    # Obtener páginas del rol
                    role_pages = RolePageAccess.objects.filter(
                        role=user.role,
                        can_access=True
                    ).select_related('page')
                    
                    # Obtener permisos del rol
                    role_permissions = RolePermission.objects.filter(
                        role=user.role,
                        is_granted=True
                    ).select_related('permission')
                    
                    pages_created = 0
                    pages_skipped = 0
                    perms_created = 0
                    perms_skipped = 0
                    
                    # Crear accesos a páginas
                    for rp in role_pages:
                        _, created = UserPageAccess.objects.get_or_create(
                            user=user,
                            page=rp.page,
                            defaults={'can_access': True}
                        )
                        if created:
                            pages_created += 1
                        else:
                            pages_skipped += 1
                    
                    # Crear permisos
                    for rp in role_permissions:
                        _, created = UserPermission.objects.get_or_create(
                            user=user,
                            permission=rp.permission,
                            defaults={'is_granted': True}
                        )
                        if created:
                            perms_created += 1
                        else:
                            perms_skipped += 1
                    
                    # Actualizar contadores globales
                    total_pages_created += pages_created
                    total_perms_created += perms_created
                    total_pages_skipped += pages_skipped
                    total_perms_skipped += perms_skipped
                    
                    # Mostrar resultado
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'   ✅ Páginas: {pages_created} creadas, {pages_skipped} ya existían'
                        )
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'   ✅ Permisos: {perms_created} creados, {perms_skipped} ya existían'
                        )
                    )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'   ❌ Error procesando {user.email}: {str(e)}')
                )
                logger.error(f"Error en seed_data2 para usuario {user.email}", exc_info=True)
                continue
        
        # Resumen final
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('📊 RESUMEN DE EJECUCIÓN'))
        self.stdout.write('='*70)
        self.stdout.write(f'👥 Usuarios procesados: {len(users)}')
        self.stdout.write(f'📄 Accesos a páginas creados: {total_pages_created}')
        self.stdout.write(f'🔐 Permisos creados: {total_perms_created}')
        
        if total_pages_skipped > 0 or total_perms_skipped > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'⚠️  Ya existían: {total_pages_skipped} páginas, {total_perms_skipped} permisos'
                )
            )
        
        self.stdout.write('\n' + self.style.SUCCESS('✅ PROCESO COMPLETADO CON ÉXITO'))
        self.stdout.write('='*70 + '\n')
        
        # Instrucciones finales
        self.stdout.write(self.style.WARNING('📝 SIGUIENTES PASOS:'))
        self.stdout.write('   1. Verificar que auth/me/ esté actualizado')
        self.stdout.write('   2. Probar login con diferentes roles')
        self.stdout.write('   3. Verificar que los permisos se apliquen correctamente')
        self.stdout.write('   4. Monitorear logs para detectar problemas\n')


# Comando adicional para verificar permisos
class VerifyCommand(BaseCommand):
    """Comando para verificar permisos de un usuario específico"""
    help = 'Verificar permisos de un usuario'
    
    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email del usuario')
    
    def handle(self, *args, **options):
        email = options['email']
        
        try:
            user = User.objects.select_related('role').get(email=email)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ Usuario {email} no encontrado'))
            return
        
        self.stdout.write(f'\n👤 Usuario: {user.email}')
        self.stdout.write(f'🎭 Rol: {user.role.display_name}')
        
        # Permisos de páginas
        user_pages = UserPageAccess.objects.filter(user=user).select_related('page')
        self.stdout.write(f'\n📄 Páginas ({user_pages.count()}):')
        for up in user_pages:
            icon = '✅' if up.can_access else '❌'
            self.stdout.write(f'   {icon} {up.page.display_name}')
        
        # Permisos
        user_perms = UserPermission.objects.filter(user=user).select_related('permission')
        self.stdout.write(f'\n🔐 Permisos ({user_perms.count()}):')
        for up in user_perms:
            icon = '✅' if up.is_granted else '❌'
            self.stdout.write(f'   {icon} {up.permission.name}')