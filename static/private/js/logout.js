// frontend/static/private/js/logout.js

document.addEventListener('DOMContentLoaded', function() {
    // Crear el modal dinámicamente
    createLogoutModal();
    
    const logoutButtons = document.querySelectorAll('#logout-btn');
    const logoutModal = document.getElementById('logout-modal');
    const confirmLogoutBtn = document.getElementById('confirm-logout-btn');
    
    // Abrir modal cuando se hace clic en logout
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            logoutModal.showModal();
            
            // Reinicializar iconos de Lucide en el modal
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });
    });
    
    // Confirmar logout
    confirmLogoutBtn.addEventListener('click', async function() {
        // Guardar contenido original del botón
        const originalContent = confirmLogoutBtn.innerHTML;
        
        // Deshabilitar el botón y mostrar loading
        confirmLogoutBtn.disabled = true;
        confirmLogoutBtn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Cerrando sesión...';
        
        try {
            // Limpiar caché
            if (window.CacheManager) {
                CacheManager.clearAll();
            }
            
            // Hacer logout en el servidor
            if (window.APIHelper) {
                await AuthAPI.logout();
            } else {
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
                
                await fetch('/api/auth/logout/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    },
                    credentials: 'include'
                });
                
                // Redirigir al login
                window.location.href = '/';
            }
        } catch (error) {
            console.error('[LOGOUT] Error:', error);
            
            // Mostrar error pero redirigir de todas formas
            confirmLogoutBtn.innerHTML = '<i data-lucide="alert-circle" class="w-4 h-4"></i> Error, redirigiendo...';
            
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        }
    });
    
    // Restaurar botón cuando se cierra el modal sin confirmar
    logoutModal.addEventListener('close', function() {
        if (!confirmLogoutBtn.disabled) return;
        
        confirmLogoutBtn.disabled = false;
        confirmLogoutBtn.innerHTML = '<i data-lucide="log-out" class="w-4 h-4"></i> Cerrar Sesión';
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    });
});

/**
 * Crea el modal de logout dinámicamente
 */
function createLogoutModal() {
    // Verificar si ya existe
    if (document.getElementById('logout-modal')) {
        return;
    }
    
    const modalHTML = `
        <dialog id="logout-modal" class="modal">
            <div class="modal-box">
                <h3 class="font-bold text-lg flex items-center gap-2">
                    <i data-lucide="log-out" class="w-5 h-5"></i>
                    Cerrar Sesión
                </h3>
                <p class="py-4">¿Estás seguro de que deseas cerrar sesión?</p>
                <div class="modal-action">
                    <div class="flex gap-2 w-full justify-end">
                        <button class="btn btn-ghost" type="button" onclick="document.getElementById('logout-modal').close()">
                            Cancelar
                        </button>
                        <button class="btn btn-error" type="button" id="confirm-logout-btn">
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button type="button">close</button>
            </form>
        </dialog>
    `;
    
    // Insertar al final del body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}