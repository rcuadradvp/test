// frontend/static/private/js/api/index.js

const APIHelper = {

    async request(url, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken()
            },
            credentials: 'include'
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        try {
            const response = await fetch(url, options);
            
            if (response.status === 401) {
                if (window.CacheManager) {
                    CacheManager.clearAll();
                }
                window.location.href = '/';
                return null;
            }
            
            const contentType = response.headers.get('content-type');
            let data = null;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                data = { message: text };
            }
            
            if (!response.ok) {
                const errorMsg = data?.error || data?.message || 'Error en la petición';
                throw new Error(errorMsg);
            }
            
            return data;
            
        } catch (error) {
            console.error('[API] Error:', error);
            throw error;
        }
    },

    getCSRFToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) return meta.getAttribute('content');
        
        const cookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='));
        return cookie ? cookie.split('=')[1] : '';
    },


    //Helpers para métodos
    
    async get(url) {
        return this.request(url, 'GET');
    },

    async post(url, body) {
        return this.request(url, 'POST', body);
    },

    async put(url, body) {
        return this.request(url, 'PUT', body);
    },

    async patch(url, body) {
        return this.request(url, 'PATCH', body);
    },

    async delete(url) {
        return this.request(url, 'DELETE');
    },
};

window.APIHelper = APIHelper;