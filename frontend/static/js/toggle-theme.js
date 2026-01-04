// frontend/static/js/toggle-theme.js
const themeSwitch = document.getElementById('toggle-theme');
const logo = document.getElementById('logo');
const saveTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const defaultTheme = prefersDark ? 'dark' : 'light';
const currentTheme = saveTheme || defaultTheme;

document.documentElement.setAttribute('data-theme', currentTheme);
themeSwitch && (themeSwitch.checked = currentTheme === 'dark');

const logoUrls = {
    light: '/static/assets/images/logoPetroleo.png',
    dark: '/static/assets/images/logoSand.png'
};

if (logo) {
    logo.src = currentTheme === 'dark' ? logoUrls.dark : logoUrls.light;
}

themeSwitch.addEventListener('change', () => {
    const isChecked = themeSwitch.checked;
    const newTheme = isChecked ? 'dark' : 'light';
    
    if (logo) {
        logo.src = isChecked ? logoUrls.dark : logoUrls.light;
    }
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});