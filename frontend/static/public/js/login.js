// frontend/static/public/js/login.js

console.log('[LOGIN] Página de login cargada');

document.addEventListener('DOMContentLoaded', function() {
    console.log('[LOGIN] DOM cargado, inicializando formulario...');
    
    const form = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const loginText = document.getElementById('login-text');
    const loginLoading = document.getElementById('login-loading');
    const messageContainer = document.getElementById('message-container');
    
    if (!form) {
        console.error('[LOGIN] No se encontró el formulario #login-form');
        return;
    }
    
    console.log('[LOGIN] Formulario encontrado, adjuntando event listener');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('[LOGIN] Submit interceptado correctamente');
        
        const formData = new FormData(form);
        const email = formData.get('email');
        const password = formData.get('password');
        
        console.log(`[LOGIN] Intentando login con: ${email}`);
        
        loginBtn.disabled = true;
        loginText.classList.add('hidden');
        loginLoading.classList.remove('hidden');
        messageContainer.innerHTML = '';
        
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';            
            const response = await fetch('/api/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });
            
            console.log(`[LOGIN] Response status: ${response.status}`);
            
            const data = await response.json();
            console.log('[LOGIN] Response data:', data);
            
            if (response.ok) {
                messageContainer.innerHTML = `
                    <div class="alert alert-success">
                        <i data-lucide="check-circle" class="w-5 h-5"></i>
                        <span>Inicio de sesión exitoso. Redirigiendo...</span>
                    </div>
                `;
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                await new Promise(resolve => setTimeout(resolve, 500));
                window.location.href = '/panel-de-control/';
            } else {
                console.error('Login fallido:', data.error);
                messageContainer.innerHTML = `
                    <div class="alert alert-error">
                        <i data-lucide="alert-circle" class="w-5 h-5"></i>
                        <span>${data.error || 'Error al iniciar sesión'}</span>
                    </div>
                `;
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                loginBtn.disabled = false;
                loginText.classList.remove('hidden');
                loginLoading.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            
            messageContainer.innerHTML = `
                <div class="alert alert-error">
                    <i data-lucide="wifi-off" class="w-5 h-5"></i>
                    <span>Error de conexión. Verifica tu internet.</span>
                </div>
            `;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            loginBtn.disabled = false;
            loginText.classList.remove('hidden');
            loginLoading.classList.add('hidden');
        }
    });
});