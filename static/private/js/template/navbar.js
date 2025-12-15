// frontend/static/private/js/template/navbar.js

const NavbarHelper = {

    async updateUserData(forceRefresh = false) {
        try {
            const user = await AuthAPI.getUser({ forceRefresh, silent: true });
            const avatarEl = document.getElementById('user-avatar');
            if (avatarEl) {
                const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || user.email[0].toUpperCase());
                avatarEl.textContent = initials;
            }
            const fullNameEl = document.getElementById('user-fullname');
            if (fullNameEl) {
                const fullName = user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}` 
                    : user.email.split('@')[0];
                fullNameEl.textContent = fullName;
            }
            const emailEl = document.getElementById('user-email');
            if (emailEl) {
                emailEl.textContent = user.email;
            }
            
            console.log('[NAVBAR] Datos de usuario actualizados');
            
        } catch (error) {
            console.error('[NAVBAR] Error actualizando usuario:', error);
        }
    },
    init() {
        window.addEventListener('user-data-updated', () => {
            console.log('[NAVBAR] Evento de actualización detectado');
            this.updateUserData(true);
        });
    },

    startPeriodicCheck() {
        setInterval(() => {
            this.updateUserData(false);
        }, 5 * 60 * 1000);
    }
};

window.NavbarHelper = NavbarHelper;

document.addEventListener('DOMContentLoaded', function() {
    NavbarHelper.init();
});