// frontend/static/private/js/dashboard/index.js

document.addEventListener('DOMContentLoaded', async function() {
    
    try {
        const perms = await AuthAPI.getUserPermissions({ silent: true });
                
        document.getElementById('user-name').textContent = perms.user.email.split('@')[0];
        document.getElementById('user-role').textContent = perms.user.role;
        document.getElementById('permissions-count').textContent = perms.permissions.length;
        document.getElementById('pages-count').textContent = perms.pages.length;
        
        document.getElementById('user-email').textContent = perms.user.email;
        document.getElementById('user-type').textContent = perms.user.role;
        document.getElementById('is-master').textContent = perms.is_master_admin ? 'Sí' : 'No';
        
        
        const quickAccessList = document.getElementById('quick-access-list');
        if (perms.pages && perms.pages.length > 0) {
            quickAccessList.innerHTML = perms.pages.map(page => {
                return `
                    <a href="${page.route}" class="flex items-center gap-3 p-3 hover:bg-base-200 rounded-lg transition-colors">
                        <i data-lucide="${page.icon}" class="w-5 h-5 text-primary"></i>
                        <span class="font-medium">${page.display_name}</span>
                        <i data-lucide="arrow-right" class="w-4 h-4 ml-auto text-base-content/50"></i>
                    </a>
                `;
            }).join('');
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } else {
            quickAccessList.innerHTML = `
                <div class="alert alert-info">
                    <i data-lucide="info" class="w-5 h-5"></i>
                    <span>No hay páginas configuradas para tu rol</span>
                </div>
            `;
        }
        
        const cacheStatus = document.getElementById('cache-status');
        const stats = window.CacheManager ? CacheManager.getStats() : null;
        if (stats && stats.permissions && stats.permissions.status === 'valid') {
            cacheStatus.textContent = '';
            cacheStatus.parentElement.querySelector('.stat-desc').textContent = 'Usando caché';
        } else {
            cacheStatus.textContent = '';
            cacheStatus.parentElement.querySelector('.stat-desc').textContent = 'Servidor';
        }
        
        
    } catch (error) {        
        document.getElementById('message-container').innerHTML = `
            <div class="alert alert-error mb-4">
                <i data-lucide="alert-circle" class="w-5 h-5"></i>
                <span>Error cargando datos: ${error.message}</span>
            </div>
        `;
        
        document.getElementById('user-name').textContent = 'Error';
        document.getElementById('user-role').textContent = '-';
        document.getElementById('quick-access-list').innerHTML = `
            <div class="alert alert-error">
                <i data-lucide="x-circle" class="w-5 h-5"></i>
                <span>No se pudieron cargar los módulos</span>
            </div>
        `;
    }
});