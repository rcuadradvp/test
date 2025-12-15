document.addEventListener('DOMContentLoaded', async function() {
    console.log('[SIDEBAR] Cargando menús...');
    
    const loadingEl = document.getElementById('sidebar-loading');
    const menuEl = document.getElementById('sidebar-menu-items');
    const errorEl = document.getElementById('sidebar-error');
    const configItem = document.getElementById('config-menu-item');
    
    try {
        // Obtener permisos (usa caché automáticamente)
        const perms = await AuthAPI.getUserPermissions({ silent: true });

        // Renderizar menús
        if (perms.pages && perms.pages.length > 0) {
            const currentPath = window.location.pathname;
            
            menuEl.innerHTML = perms.pages.map(page => {
                const normalizedCurrent = currentPath.endsWith('/') ? currentPath : currentPath + '/';
                const normalizedRoute = page.route.endsWith('/') ? page.route : page.route + '/';
                const isActive = normalizedCurrent === normalizedRoute;
                
                return `
                    <li>
                        <a href="${page.route}" title="${page.display_name}"
                           class="tooltip tooltip-right flex items-center gap-3 p-2 hover:bg-[var(--color-text-hover)] rounded-sm transition-colors text-[var(--color-text-sidebar)] ${isActive ? 'bg-[var(--color-text-hover)] text-[var(--color-text-sidebar)] hover:bg-[var(--color-text-hover)]' : ''}">
                            <i data-lucide="${page.icon}" class="w-5 h-5 flex-shrink-0"></i>
                            <span class="sidebar-text">${page.display_name}</span>
                        </a>
                    </li>
                `;
            }).join('');
            
            // Mostrar menú
            loadingEl.classList.add('hidden');
            menuEl.classList.remove('hidden');
            
        } else {
            // No hay páginas
            menuEl.innerHTML = `
                <li>
                    <a href="/panel-de-control/" 
                       class="flex items-center gap-3 p-3 hover:bg-base-300 rounded-lg transition-colors ${window.location.pathname.includes('/panel-de-control') ? 'bg-primary text-white hover:bg-primary' : ''}"
                       title="Panel de control">
                        <i data-lucide="home" class="w-5 h-5 flex-shrink-0"></i>
                        <span class="sidebar-text">Panel de control</span>
                    </a>
                </li>
                <li>
                    <div class="p-3 text-center text-base-content/50">
                        <i data-lucide="alert-circle" class="w-5 h-5 mx-auto mb-1"></i>
                        <p class="text-xs sidebar-text">No hay menús configurados</p>
                    </div>
                </li>
            `;
            
            loadingEl.classList.add('hidden');
            menuEl.classList.remove('hidden');
        }
        if (perms.permissions?.some(p => p.resource === 'users' && p.action === 'view')) {
            configItem.classList.remove('hidden');
        }
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }        
    } catch (error) {        
        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');
                menuEl.innerHTML = `
            <li>
                <a href="/panel-de-control/" 
                   class="flex items-center gap-3 p-3 hover:bg-base-300 rounded-lg transition-colors"
                   title="Panel de control">
                    <i data-lucide="home" class="w-5 h-5 flex-shrink-0"></i>
                    <span class="sidebar-text">Panel de control</span>
                </a>
            </li>
        `;
        menuEl.classList.remove('hidden');
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
});