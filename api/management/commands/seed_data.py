# api/management/commands/seed_data.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import (
    Company, Role, Page, Permission, 
    RolePageAccess, RolePermission, User,
    Department, Category, Product
)
from api.authentication.password_handler import PasswordHandler
from decimal import Decimal

class Command(BaseCommand):
    help = 'Crea datos iniciales del sistema incluyendo departamentos, categorías y productos'

    def handle(self, *args, **options):
        self.stdout.write('Creando datos iniciales...')
        
        # 1. Crear empresa
        company, created = Company.objects.get_or_create(
            rut='76123456-7',
            defaults={
                'name': 'Distribuidora Cunaco',
                'address': 'Santiago, Chile',
                'phone': '+56912345678',
                'email': 'contacto@cunaco.cl',
                'tax_rate': 19.00,
                'currency': 'CLP'
            }
        )
        self.stdout.write(f'✓ Empresa: {company.name}')

        # 2. Crear roles
        roles_data = [
            {'name': 'master_admin', 'display_name': 'Master Admin', 'hierarchy_level': 5, 
             'description': 'Acceso total al sistema - Solo desarrolladores'},
            {'name': 'super_admin', 'display_name': 'Super Admin', 'hierarchy_level': 4,
             'description': 'Acceso total empresarial - Dueños de empresa'},
            {'name': 'admin', 'display_name': 'Administrador', 'hierarchy_level': 3,
             'description': 'Gestión operativa de la tienda'},
            {'name': 'cashier', 'display_name': 'Cajero', 'hierarchy_level': 2,
             'description': 'Operaciones de venta y caja'},
        ]
        
        roles = {}
        for role_data in roles_data:
            role, created = Role.objects.get_or_create(
                company=company,
                name=role_data['name'],
                defaults={
                    'display_name': role_data['display_name'],
                    'hierarchy_level': role_data['hierarchy_level'],
                    'description': role_data['description']
                }
            )
            roles[role_data['name']] = role
            self.stdout.write(f'✓ Rol: {role.display_name}')

        # 3. Crear páginas
        pages_data = [
            # Página principal
            {'name': 'dashboard', 'display_name': 'Panel de Control', 'route': '/panel-de-control', 
             'association': None, 'icon_association': None, 'icon': 'layout-dashboard', 'order': 0, 'min_role': 'cashier'},
            
            # Páginas para Cashier
            {'name': 'cashiers', 'display_name': 'Caja', 'route': '/caja', 
             'association': None, 'icon_association': None, 'icon': 'monitor', 'order': 1, 'min_role': 'cashier'},
            
            # Páginas para Admin
            {'name': 'products', 'display_name': 'Gestión de Productos', 'route': '/productos', 
             'association': None, 'icon_association': None, 'icon': 'package-search', 'order': 2, 'min_role': 'admin'},
            {'name': 'clients', 'display_name': 'Clientes', 'route': '/clientes', 
             'association': None, 'icon_association': None, 'icon': 'book-user', 'order': 3, 'min_role': 'admin'},
            {'name': 'suppliers', 'display_name': 'Proveedores', 'route': '/proveedores', 
             'association': None, 'icon_association': None, 'icon': 'package', 'order': 4, 'min_role': 'admin'},
            
            # Grupo "Registros"
            {'name': 'sales', 'display_name': 'Ventas', 'route': '/ventas', 
             'association': 'Registros', 'icon_association': 'file-pen-line', 'icon': 'banknote-arrow-up', 'order': 5, 'min_role': 'cashier'},
            {'name': 'credits', 'display_name': 'Créditos', 'route': '/creditos', 
             'association': 'Registros', 'icon_association': 'file-pen-line', 'icon': 'credit-card', 'order': 6, 'min_role': 'admin'},
            {'name': 'credit_payments', 'display_name': 'Pago de Créditos', 'route': '/pago-de-creditos/', 
             'association': 'Registros', 'icon_association': 'file-pen-line', 'icon': 'hand-coins', 'order': 7, 'min_role': 'cashier'},
            {'name': 'reports', 'display_name': 'Reportes', 'route': '/reportes', 
             'association': 'Registros', 'icon_association': 'file-pen-line', 'icon': 'file-spreadsheet', 'order': 8, 'min_role': 'admin'},
            
            # Grupo "Personal de Trabajo"
            {'name': 'users', 'display_name': 'Usuarios', 'route': '/usuarios', 
             'association': 'Personal de Trabajo', 'icon_association': 'contact-round', 'icon': 'users', 'order': 9, 'min_role': 'super_admin'},
            {'name': 'roles', 'display_name': 'Roles', 'route': '/roles/', 
             'association': 'Personal de Trabajo', 'icon_association': 'contact-round', 'icon': 'shield-user', 'order': 10, 'min_role': 'super_admin'},
            
            # Grupo "Configuraciones"
            {'name': 'system_config', 'display_name': 'Sistema', 'route': '/configuracion-de-sistema/', 
             'association': 'Configuraciones', 'icon_association': 'cog', 'icon': 'monitor-cog', 'order': 11, 'min_role': 'master_admin'},
            {'name': 'permissions_config', 'display_name': 'Permisos', 'route': '/permisos/', 
             'association': 'Configuraciones', 'icon_association': 'cog', 'icon': 'book-lock', 'order': 12, 'min_role': 'master_admin'},
            {'name': 'settings', 'display_name': 'General', 'route': '/configuraciones', 
             'association': 'Configuraciones', 'icon_association': 'cog', 'icon': 'settings', 'order': 13, 'min_role': 'super_admin'},
        ]
        
        pages = {}
        for page_data in pages_data:
            page, created = Page.objects.get_or_create(
                name=page_data['name'],
                defaults={
                    'display_name': page_data['display_name'],
                    'route': page_data['route'],
                    'icon': page_data.get('icon', ''),
                    'association': page_data.get('association'),
                    'icon_association': page_data.get('icon_association'),
                    'order': page_data.get('order', 0)
                }
            )
            pages[page_data['name']] = page
            page.min_role = page_data['min_role']  # Guardamos temporalmente para asignar accesos

        # 4. Crear permisos
        resources = ['products', 'sales', 'clients', 'suppliers', 'credits', 'reports', 'users', 'system']
        actions = ['view', 'create', 'edit', 'delete', 'export']
        
        permissions = {}
        for resource in resources:
            for action in actions:
                perm_name = f'{resource}.{action}'
                perm, created = Permission.objects.get_or_create(
                    name=perm_name,
                    defaults={
                        'display_name': f'{action.title()} {resource.title()}',
                        'resource': resource,
                        'action': action
                    }
                )
                permissions[perm_name] = perm

        # 5. Asignar páginas a roles según jerarquía
        role_hierarchy = {
            'master_admin': 5,
            'super_admin': 4,
            'admin': 3,
            'cashier': 2,
        }
        
        for page_name, page in pages.items():
            min_role = page.min_role
            min_level = role_hierarchy[min_role]
            
            # Asignar a todos los roles con nivel mayor o igual
            for role_name, role in roles.items():
                if role_hierarchy[role_name] >= min_level:
                    RolePageAccess.objects.get_or_create(
                        role=role,
                        page=page,
                        defaults={'can_access': True}
                    )

        # 6. Asignar permisos a roles
        
        # Master Admin - TODOS los permisos
        for perm in permissions.values():
            RolePermission.objects.get_or_create(
                role=roles['master_admin'],
                permission=perm,
                defaults={'is_granted': True}
            )
        
        # Super Admin - Todos excepto system
        for perm_name, perm in permissions.items():
            if not perm_name.startswith('system.'):
                RolePermission.objects.get_or_create(
                    role=roles['super_admin'],
                    permission=perm,
                    defaults={'is_granted': True}
                )
        
        # Admin - Operaciones sin usuarios
        admin_perms = [
            'products.view', 'products.create', 'products.edit', 'products.export',
            'sales.view', 'sales.create', 'sales.export',
            'clients.view', 'clients.create', 'clients.edit', 'clients.export',
            'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.export',
            'credits.view', 'credits.create', 'credits.edit',
            'reports.view', 'reports.export'
        ]
        for perm_name in admin_perms:
            if perm_name in permissions:
                RolePermission.objects.get_or_create(
                    role=roles['admin'],
                    permission=permissions[perm_name],
                    defaults={'is_granted': True}
                )
        
        # Cajero - Solo operaciones básicas
        cashier_perms = [
            'sales.view', 'sales.create',
            'products.view',
            'clients.view', 'clients.create',
            'credits.view', 'credits.create'
        ]
        for perm_name in cashier_perms:
            if perm_name in permissions:
                RolePermission.objects.get_or_create(
                    role=roles['cashier'],
                    permission=permissions[perm_name],
                    defaults={'is_granted': True}
                )

        # 7. Crear usuarios de prueba
        test_users = [
            # Master Admin (desarrollador)
            {
                'email': 'dev@cunaco.cl',
                'username': 'developer',
                'first_name': 'Master',
                'last_name': 'Developer',
                'rut': '11111111-1',
                'phone': '+56912345678',
                'role': 'master_admin',
                'password': 'dev123'
            },
            # Super Admin (dueño)
            {
                'email': 'dueno@cunaco.cl',
                'username': 'dueno',
                'first_name': 'Carlos',
                'last_name': 'Propietario',
                'rut': '22222222-2',
                'phone': '+56912345679',
                'role': 'super_admin',
                'password': 'dueno123'
            },
            # Administradores
            {
                'email': 'admin1@cunaco.cl',
                'username': 'admin1',
                'first_name': 'María',
                'last_name': 'Administrador',
                'rut': '33333333-3',
                'phone': '+56912345680',
                'role': 'admin',
                'password': 'admin123'
            },
            {
                'email': 'admin2@cunaco.cl',
                'username': 'admin2',
                'first_name': 'Pedro',
                'last_name': 'Gerente',
                'rut': '44444444-4',
                'phone': '+56912345681',
                'role': 'admin',
                'password': 'admin123'
            },
            # Cajeros
            {
                'email': 'cajero1@cunaco.cl',
                'username': 'cajero1',
                'first_name': 'Ana',
                'last_name': 'Cajera',
                'rut': '55555555-5',
                'phone': '+56912345682',
                'role': 'cashier',
                'password': 'cajero123'
            },
            {
                'email': 'cajero2@cunaco.cl',
                'username': 'cajero2',
                'first_name': 'Luis',
                'last_name': 'Cajero',
                'rut': '66666666-6',
                'phone': '+56912345683',
                'role': 'cashier',
                'password': 'cajero123'
            },
        ]
        
        self.stdout.write('\n📝 Creando usuarios de prueba...')
        for user_data in test_users:
            password = user_data.pop('password')
            role_name = user_data.pop('role')
            
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults={
                    **user_data,
                    'company': company,
                    'role': roles[role_name],
                    'password': PasswordHandler.hash_password(password),
                    'is_active': True,
                    'is_staff': role_name == 'master_admin',
                    'is_superuser': role_name == 'master_admin'
                }
            )
            
            if created:
                self.stdout.write(f'  ✓ {user.role.display_name}: {user.email} / {password}')

        # 8. Crear Departamentos
        self.stdout.write('\n🏪 Creando departamentos...')
        departments_data = [
            {'name': 'Lácteos', 'description': 'Productos lácteos y derivados'},
            {'name': 'Carnes y Embutidos', 'description': 'Carnes frescas, congeladas y embutidos'},
            {'name': 'Bebidas', 'description': 'Bebidas con y sin alcohol'},
            {'name': 'Abarrotes', 'description': 'Productos secos y enlatados'},
            {'name': 'Panadería', 'description': 'Productos de panadería y pastelería'},
            {'name': 'Frutas y Verduras', 'description': 'Productos frescos'},
            {'name': 'Limpieza', 'description': 'Artículos de limpieza y cuidado personal'},
            {'name': 'Snacks y Dulces', 'description': 'Snacks, dulces y confitería'},
        ]
        
        departments = {}
        for dept_data in departments_data:
            dept, created = Department.objects.get_or_create(
                company=company,
                name=dept_data['name'],
                defaults={
                    'description': dept_data['description'],
                    'is_active': True
                }
            )
            departments[dept_data['name']] = dept
            if created:
                self.stdout.write(f'  ✓ Departamento: {dept.name}')

        # 9. Crear Categorías por Departamento
        self.stdout.write('\n📂 Creando categorías...')
        categories_data = {
            'Lácteos': [
                {'name': 'Leches', 'description': 'Leche entera, descremada, sin lactosa'},
                {'name': 'Quesos', 'description': 'Quesos de todo tipo'},
                {'name': 'Yogures', 'description': 'Yogures y postres lácteos'},
                {'name': 'Mantequillas y Cremas', 'description': 'Mantequilla, margarina y cremas'},
            ],
            'Carnes y Embutidos': [
                {'name': 'Carnes Rojas', 'description': 'Vacuno, cerdo, cordero'},
                {'name': 'Aves', 'description': 'Pollo, pavo y otras aves'},
                {'name': 'Embutidos', 'description': 'Jamón, salame, mortadela'},
                {'name': 'Congelados', 'description': 'Carnes y productos congelados'},
            ],
            'Bebidas': [
                {'name': 'Gaseosas', 'description': 'Bebidas gaseosas y carbonatadas'},
                {'name': 'Jugos', 'description': 'Jugos naturales y néctares'},
                {'name': 'Aguas', 'description': 'Agua mineral y purificada'},
                {'name': 'Bebidas Alcohólicas', 'description': 'Cervezas, vinos y licores'},
            ],
            'Abarrotes': [
                {'name': 'Granos y Legumbres', 'description': 'Arroz, lentejas, porotos'},
                {'name': 'Pastas', 'description': 'Fideos y pastas secas'},
                {'name': 'Enlatados', 'description': 'Conservas y productos enlatados'},
                {'name': 'Aceites y Condimentos', 'description': 'Aceites, salsas y especias'},
            ],
            'Panadería': [
                {'name': 'Panes', 'description': 'Pan fresco y envasado'},
                {'name': 'Pasteles y Tortas', 'description': 'Productos de pastelería'},
                {'name': 'Galletas', 'description': 'Galletas dulces y saladas'},
            ],
            'Frutas y Verduras': [
                {'name': 'Frutas', 'description': 'Frutas frescas de temporada'},
                {'name': 'Verduras', 'description': 'Verduras frescas'},
                {'name': 'Hortalizas', 'description': 'Lechugas, espinacas, acelgas'},
            ],
            'Limpieza': [
                {'name': 'Limpieza del Hogar', 'description': 'Detergentes, desinfectantes'},
                {'name': 'Cuidado Personal', 'description': 'Jabones, shampoo, pasta dental'},
                {'name': 'Papel', 'description': 'Papel higiénico, toallas, servilletas'},
            ],
            'Snacks y Dulces': [
                {'name': 'Snacks Salados', 'description': 'Papas fritas, nachos, maní'},
                {'name': 'Dulces', 'description': 'Caramelos, chicles, gomitas'},
                {'name': 'Chocolates', 'description': 'Chocolates y bombones'},
            ],
        }
        
        categories = {}
        for dept_name, cats in categories_data.items():
            department = departments[dept_name]
            for cat_data in cats:
                cat, created = Category.objects.get_or_create(
                    company=company,
                    department=department,
                    name=cat_data['name'],
                    defaults={
                        'description': cat_data['description'],
                        'is_active': True
                    }
                )
                categories[f"{dept_name}_{cat_data['name']}"] = cat
                if created:
                    self.stdout.write(f'  ✓ Categoría: {department.name} > {cat.name}')

        # 10. Crear Productos de Ejemplo
        self.stdout.write('\n📦 Creando productos de ejemplo...')
        products_data = [
            # LÁCTEOS
            {'barcode': '7800001000001', 'name': 'Leche Entera Colun 1L', 'department': 'Lácteos', 'category': 'Leches', 'price': 990},
            {'barcode': '7800001000002', 'name': 'Leche Sin Lactosa Soprole 1L', 'department': 'Lácteos', 'category': 'Leches', 'price': 1290},
            {'barcode': '7800001000003', 'name': 'Leche Descremada Surlat 1L', 'department': 'Lácteos', 'category': 'Leches', 'price': 950},
            {'barcode': '7800001000004', 'name': 'Queso Mantecoso Colun 500g', 'department': 'Lácteos', 'category': 'Quesos', 'price': 3490},
            {'barcode': '7800001000005', 'name': 'Queso Gauda Laminado 200g', 'department': 'Lácteos', 'category': 'Quesos', 'price': 2290},
            {'barcode': '7800001000006', 'name': 'Yogurt Natural Soprole 1L', 'department': 'Lácteos', 'category': 'Yogures', 'price': 1690},
            {'barcode': '7800001000007', 'name': 'Mantequilla Colun 250g', 'department': 'Lácteos', 'category': 'Mantequillas y Cremas', 'price': 1990},
            
            # CARNES Y EMBUTIDOS
            {'barcode': '7800002000001', 'name': 'Posta Rosada kg', 'department': 'Carnes y Embutidos', 'category': 'Carnes Rojas', 'price': 6990},
            {'barcode': '7800002000002', 'name': 'Pollo Entero kg', 'department': 'Carnes y Embutidos', 'category': 'Aves', 'price': 3290},
            {'barcode': '7800002000003', 'name': 'Jamón de Pierna PF 200g', 'department': 'Carnes y Embutidos', 'category': 'Embutidos', 'price': 2490},
            {'barcode': '7800002000004', 'name': 'Vienesas Preferida 500g', 'department': 'Carnes y Embutidos', 'category': 'Embutidos', 'price': 1990},
            
            # BEBIDAS
            {'barcode': '7800003000001', 'name': 'Coca Cola 1.5L', 'department': 'Bebidas', 'category': 'Gaseosas', 'price': 1490},
            {'barcode': '7800003000002', 'name': 'Sprite 1.5L', 'department': 'Bebidas', 'category': 'Gaseosas', 'price': 1490},
            {'barcode': '7800003000003', 'name': 'Jugo Watts Naranja 1.5L', 'department': 'Bebidas', 'category': 'Jugos', 'price': 1290},
            {'barcode': '7800003000004', 'name': 'Agua Cachantun 1.6L', 'department': 'Bebidas', 'category': 'Aguas', 'price': 890},
            {'barcode': '7800003000005', 'name': 'Cerveza Cristal 1L', 'department': 'Bebidas', 'category': 'Bebidas Alcohólicas', 'price': 1690},
            
            # ABARROTES
            {'barcode': '7800004000001', 'name': 'Arroz Miraflores 1kg', 'department': 'Abarrotes', 'category': 'Granos y Legumbres', 'price': 1290},
            {'barcode': '7800004000002', 'name': 'Lentejas 1kg', 'department': 'Abarrotes', 'category': 'Granos y Legumbres', 'price': 1590},
            {'barcode': '7800004000003', 'name': 'Fideos Carozzi 400g', 'department': 'Abarrotes', 'category': 'Pastas', 'price': 890},
            {'barcode': '7800004000004', 'name': 'Atún Lomitos Robinson 160g', 'department': 'Abarrotes', 'category': 'Enlatados', 'price': 1390},
            {'barcode': '7800004000005', 'name': 'Aceite Miraflores 1L', 'department': 'Abarrotes', 'category': 'Aceites y Condimentos', 'price': 2290},
            
            # PANADERÍA
            {'barcode': '7800005000001', 'name': 'Pan de Molde Ideal', 'department': 'Panadería', 'category': 'Panes', 'price': 1690},
            {'barcode': '7800005000002', 'name': 'Marraqueta Unidad', 'department': 'Panadería', 'category': 'Panes', 'price': 190},
            {'barcode': '7800005000003', 'name': 'Galletas Tritón 300g', 'department': 'Panadería', 'category': 'Galletas', 'price': 990},
            
            # FRUTAS Y VERDURAS
            {'barcode': '7800006000001', 'name': 'Manzana Roja kg', 'department': 'Frutas y Verduras', 'category': 'Frutas', 'price': 1290},
            {'barcode': '7800006000002', 'name': 'Plátano kg', 'department': 'Frutas y Verduras', 'category': 'Frutas', 'price': 990},
            {'barcode': '7800006000003', 'name': 'Tomate kg', 'department': 'Frutas y Verduras', 'category': 'Verduras', 'price': 1190},
            {'barcode': '7800006000004', 'name': 'Lechuga Unidad', 'department': 'Frutas y Verduras', 'category': 'Hortalizas', 'price': 890},
            
            # LIMPIEZA
            {'barcode': '7800007000001', 'name': 'Detergente Drive 1kg', 'department': 'Limpieza', 'category': 'Limpieza del Hogar', 'price': 2490},
            {'barcode': '7800007000002', 'name': 'Cloro Clorinda 1L', 'department': 'Limpieza', 'category': 'Limpieza del Hogar', 'price': 990},
            {'barcode': '7800007000003', 'name': 'Shampoo Head & Shoulders 400ml', 'department': 'Limpieza', 'category': 'Cuidado Personal', 'price': 3990},
            {'barcode': '7800007000004', 'name': 'Papel Higiénico Elite 4 rollos', 'department': 'Limpieza', 'category': 'Papel', 'price': 2490},
            
            # SNACKS Y DULCES
            {'barcode': '7800008000001', 'name': 'Papas Lays 180g', 'department': 'Snacks y Dulces', 'category': 'Snacks Salados', 'price': 1690},
            {'barcode': '7800008000002', 'name': 'Ramitas 100g', 'department': 'Snacks y Dulces', 'category': 'Snacks Salados', 'price': 690},
            {'barcode': '7800008000003', 'name': 'Super 8 Chocolate 27g', 'department': 'Snacks y Dulces', 'category': 'Chocolates', 'price': 390},
            {'barcode': '7800008000004', 'name': 'Ambrosoli Menta 80g', 'department': 'Snacks y Dulces', 'category': 'Dulces', 'price': 590},
        ]
        
        for prod_data in products_data:
            dept = departments[prod_data['department']]
            cat = categories[f"{prod_data['department']}_{prod_data['category']}"]
            
            prod, created = Product.objects.get_or_create(
                company=company,
                barcode=prod_data['barcode'],
                defaults={
                    'name': prod_data['name'],
                    'department': dept,
                    'category': cat,
                    'unit_price': Decimal(str(prod_data['price'])),
                    'stock_units': Decimal('0.00'),
                    'min_stock': Decimal('5.00'),
                    'is_package': False,
                    'is_active': True
                }
            )
            
            if created:
                self.stdout.write(f'  ✓ Producto: {prod.name} ({dept.name} > {cat.name})')

        self.stdout.write(self.style.SUCCESS(f'\n✅ Sistema inicializado correctamente!'))
        self.stdout.write(self.style.SUCCESS('\n📋 USUARIOS DE PRUEBA:'))
        self.stdout.write('  Master Admin: dev@cunaco.cl / dev123')
        self.stdout.write('  Super Admin:  dueno@cunaco.cl / dueno123')
        self.stdout.write('  Admin 1:      admin1@cunaco.cl / admin123')
        self.stdout.write('  Admin 2:      admin2@cunaco.cl / admin123')
        self.stdout.write('  Cajero 1:     cajero1@cunaco.cl / cajero123')
        self.stdout.write('  Cajero 2:     cajero2@cunaco.cl / cajero123')
        
        self.stdout.write(self.style.SUCCESS('\n📄 PÁGINAS DEL SISTEMA: 14'))
        self.stdout.write(self.style.SUCCESS('🏪 DEPARTAMENTOS CREADOS: 8'))
        self.stdout.write(self.style.SUCCESS('📂 CATEGORÍAS CREADAS: 27'))
        self.stdout.write(self.style.SUCCESS('📦 PRODUCTOS DE EJEMPLO: 35'))