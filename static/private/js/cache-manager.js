// frontend/static/private/js/cache-manager.js
const CacheManager = {
    CACHE_VERSION: '1.0',
    
    CONFIG: {
        user: {
            ttl: 10 * 60 * 1000,     
            storage: 'session',       
            critical: true
        },
        permissions: {
            ttl: 10 * 60 * 1000,     
            storage: 'session',
            critical: true
        },
        menu: {
            ttl: 10 * 60 * 1000,      
            storage: 'session',
            critical: false
        }
    },
    
    _getStorageKey(key) {
        return `cache_v${this.CACHE_VERSION}_${key}`;
    },
    
    _getStorage(key) {
        const config = this.CONFIG[key];
        if (!config) return sessionStorage;
        
        return config.storage === 'local' ? localStorage : sessionStorage;
    },
    
    get(key) {
        try {
            const config = this.CONFIG[key];
            if (!config) {
                console.warn(`[CACHE] No config for key: ${key}`);
                return null;
            }
            
            const storage = this._getStorage(key);
            const storageKey = this._getStorageKey(key);
            const cached = storage.getItem(storageKey);
            
            if (!cached) {
                return null;
            }
            
            const { data, timestamp, version } = JSON.parse(cached);
            
            if (version !== this.CACHE_VERSION) {
                this.clear(key);
                return null;
            }
            
            const age = Date.now() - timestamp;
            if (age > config.ttl) {
                this.clear(key);
                return null;
            }
            
            return data;
            
        } catch (error) {
            console.error(`[CACHE] Error reading ${key}:`, error);
            this.clear(key);
            return null;
        }
    },
    
    set(key, data) {
        try {
            const config = this.CONFIG[key];
            if (!config) {
                console.warn(`[CACHE] No config for key: ${key}`);
                return;
            }
            
            const storage = this._getStorage(key);
            const storageKey = this._getStorageKey(key);
            
            const cacheEntry = {
                data,
                timestamp: Date.now(),
                version: this.CACHE_VERSION
            };
            
            storage.setItem(storageKey, JSON.stringify(cacheEntry));
            
        } catch (error) {
            console.error(`[CACHE] ❌ Error writing ${key}:`, error);
            
            if (error.name === 'QuotaExceededError') {
                console.warn('[CACHE] Quota exceeded, clearing old cache...');
                this.clearAll();
                
                try {
                    const storage = this._getStorage(key);
                    const storageKey = this._getStorageKey(key);
                    storage.setItem(storageKey, JSON.stringify({
                        data,
                        timestamp: Date.now(),
                        version: this.CACHE_VERSION
                    }));
                } catch (retryError) {
                    console.error('[CACHE] Failed retry:', retryError);
                }
            }
        }
    },
    
    clear(key) {
        try {
            const storage = this._getStorage(key);
            const storageKey = this._getStorageKey(key);
            storage.removeItem(storageKey);
        } catch (error) {
            console.error(`[CACHE] Error clearing ${key}:`, error);
        }
    },
    
    clearAll() {
        try {
            Object.keys(this.CONFIG).forEach(key => this.clear(key));
        } catch (error) {
            console.error('[CACHE] Error clearing all:', error);
        }
    },

    invalidate(key) {
        this.clear(key);
        
        if (key === 'user') {
            this.clear('permissions');
            this.clear('menu');
        } else if (key === 'permissions') {
            this.clear('menu');
        }
    },

    getStats() {
        const stats = {};
        
        Object.keys(this.CONFIG).forEach(key => {
            try {
                const storage = this._getStorage(key);
                const storageKey = this._getStorageKey(key);
                const cached = storage.getItem(storageKey);
                
                if (!cached) {
                    stats[key] = { status: 'empty' };
                    return;
                }
                
                const { timestamp, version } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                const config = this.CONFIG[key];
                const ttl = config.ttl;
                const expired = age > ttl;
                
                stats[key] = {
                    status: expired ? 'expired' : 'valid',
                    age: Math.round(age / 1000),
                    ttl: Math.round(ttl / 1000),
                    version,
                    size: cached.length
                };
                
            } catch (error) {
                stats[key] = { status: 'error', error: error.message };
            }
        });
        
        return stats;
    },

    debug() {
        console.table(this.getStats());
    }
};

window.CacheManager = CacheManager;

document.addEventListener('DOMContentLoaded', async function() {    
    try {
        await AuthAPI.getUserPermissions({ silent: true });
    } catch (error) {
        console.error('precargando permisos:', error);
    }
    
    window.debugCache = function() {
        if (window.CacheManager) {
            CacheManager.debug();
        } else {
            console.error('CacheManager no disponible');
        }
    };
});
