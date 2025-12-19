// frontend/static/private/js/api/auth.js

const AuthAPI = {
    async getUserPermissions(options = {}) {

        const { forceRefresh = false, silent = false } = options;

        if (!window.CacheManager) {
            console.warn('[AUTH] CacheManager no disponible');
            return APIHelper.get('/api/auth/me/');
        }
        // Intentar desde caché
        if (!forceRefresh) {
            const cached = CacheManager.get('permissions');
            if (cached) {
                if (!silent) {
                    console.log('[AUTH] Permisos desde caché');
                }
                return cached;
            }
        }
        
        if (!silent) {
            console.log('[AUTH] Consultando servidor...');
        }
        
        try {
            const data = await APIHelper.get('/api/auth/me/');
            
            CacheManager.set('permissions', data);
            
            if (data.user) {
                CacheManager.set('user', data.user);
            }
            if (data.pages) {
                CacheManager.set('menu', data.pages);
            }
            
            if (!silent) {
                console.log('[AUTH] Datos cacheados');
            }
            
            return data;
        } catch (error) {
            const cached = CacheManager.get('permissions');
            if (cached) {
                console.warn('[AUTH] Usando caché expirado (error servidor)');
                return cached;
            }
            throw error;
        }
    },

    async getUser(options = {}) {
        const { forceRefresh = false, silent = false } = options;
        
        if (!window.CacheManager) {
            const data = await APIHelper.get('/api/auth/me/');
            return data.user;
        }
        
        if (!forceRefresh) {
            const cached = CacheManager.get('user');
            if (cached) {
                if (!silent) {
                    console.log('[AUTH] Usuario desde caché');
                }
                return cached;
            }
        }
        
        const data = await this.getUserPermissions({ forceRefresh, silent });
        return data.user;
    },
    
    async getMenu(options = {}) {
        const { forceRefresh = false, silent = false } = options;
        
        if (!window.CacheManager) {
            const data = await APIHelper.get('/api/auth/me/');
            return data.pages;
        }
        
        if (!forceRefresh) {
            const cached = CacheManager.get('menu');
            if (cached) {
                if (!silent) {
                    console.log('[AUTH] Menú desde caché');
                }
                return cached;
            }
        }
        
        const data = await this.getUserPermissions({ forceRefresh, silent });
        return data.pages;
    },
    
    async refreshPermissions() {
        if (window.CacheManager) {
            CacheManager.invalidate('permissions');
        }
        return await this.getUserPermissions({ forceRefresh: true });
    },
    
    async hasPermission(resource, action) {
        try {
            const data = await this.getUserPermissions({ silent: true });
            return data.permissions.some(
                p => p.resource === resource && p.action === action
            );
        } catch (error) {
            console.error('[AUTH] Error verificando permiso:', error);
            return false;
        }
    },

    async logout() {
        if (window.CacheManager) {
            CacheManager.clearAll();
        }
        
        try {
            await APIHelper.post('/api/auth/logout/');
        } catch (error) {
            console.error('[AUTH] Error en logout:', error);
        }
        
        window.location.href = '/';
    }
};

window.AuthAPI = AuthAPI;