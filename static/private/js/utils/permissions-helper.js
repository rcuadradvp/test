// frontend/static/private/js/utils/permissions-helper.js

const PermissionsHelper = {
    permissions: [],
    
    async init() {
        try {
            const data = await AuthAPI.getUserPermissions({ silent: true });
            this.permissions = data.permissions || [];            
            this.initializeUI();
            return this.permissions;
        } catch (error) {
            console.error('[PERMISSIONS] Error inicializando:', error);
            this.permissions = [];
            throw error;
        }
    },
    
    /**
     * Verifica si el usuario tiene un permiso específico
     * @param {string} resource - Recurso (ej: 'products')
     * @param {string} action - Acción (ej: 'create', 'edit', 'delete', 'view')
     * @returns {boolean}
     */
    hasPermission(resource, action) {
        if (!this.permissions || this.permissions.length === 0) {
            console.warn('[PERMISSIONS] Sin permisos cargados');
            return false;
        }
        
        const permissionKey = `${resource}.${action}`;
        const hasIt = this.permissions.some(p => p.name === permissionKey);
        
        return hasIt;
    },
    
    /**
     * Verifica si tiene alguno de varios permisos
     * @param {string} resource - Recurso
     * @param {string[]} actions - Array de acciones
     * @returns {boolean}
     */
    hasAnyPermission(resource, actions) {
        return actions.some(action => this.hasPermission(resource, action));
    },
    
    /**
     * Verifica si tiene todos los permisos
     * @param {string} resource - Recurso
     * @param {string[]} actions - Array de acciones
     * @returns {boolean}
     */
    hasAllPermissions(resource, actions) {
        return actions.every(action => this.hasPermission(resource, action));
    },
    
    /**
     * Obtiene todos los permisos para un recurso
     * @param {string} resource - Recurso
     * @returns {string[]} Array de acciones permitidas
     */
    getResourcePermissions(resource) {
        return this.permissions
            .filter(p => p.resource === resource)
            .map(p => p.action);
    },
    
    initializeUI() {
        // Buscar elementos con data-permission
        document.querySelectorAll('[data-permission]').forEach(element => {
            const permission = element.getAttribute('data-permission');
            const [resource, action] = permission.split('.');
            
            if (this.hasPermission(resource, action)) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        });
        
        // Buscar elementos con data-permission-any
        document.querySelectorAll('[data-permission-any]').forEach(element => {
            const permissions = element.getAttribute('data-permission-any').split(',');
            let hasAny = false;
            
            for (const perm of permissions) {
                const [resource, action] = perm.trim().split('.');
                if (this.hasPermission(resource, action)) {
                    hasAny = true;
                    break;
                }
            }
            
            if (hasAny) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        });
        
        // Buscar elementos con data-permission-all
        document.querySelectorAll('[data-permission-all]').forEach(element => {
            const permissions = element.getAttribute('data-permission-all').split(',');
            let hasAll = true;
            
            for (const perm of permissions) {
                const [resource, action] = perm.trim().split('.');
                if (!this.hasPermission(resource, action)) {
                    hasAll = false;
                    break;
                }
            }
            
            if (hasAll) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        });
    },
    
    /**
     * Muestra alerta de permiso denegado
     * @param {string} action - Acción intentada
     */
    showPermissionDenied(action = 'realizar esta acción') {
        if (window.showMessage) {
            showMessage(`No tienes permisos para ${action}`, 'error');
        } else {
            alert(`No tienes permisos para ${action}`);
        }
    },
    
    /**
     * Verifica permiso y ejecuta callback si tiene permiso
     * @param {string} resource - Recurso
     * @param {string} action - Acción
     * @param {Function} callback - Función a ejecutar
     * @param {string} deniedMessage - Mensaje personalizado si se deniega
     */
    executeWithPermission(resource, action, callback, deniedMessage = null) {
        if (this.hasPermission(resource, action)) {
            return callback();
        } else {
            this.showPermissionDenied(deniedMessage || `${action} ${resource}`);
            return false;
        }
    },
    
};

window.PermissionsHelper = PermissionsHelper;