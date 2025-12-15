document.addEventListener('DOMContentLoaded', () => {
  const KEY = 'sidebar_expanded_state';
  const root = document.documentElement;
  const sidebar = document.querySelector('.sidebar-container');
  const btn = document.querySelector('[data-sidebar-toggle]');
  const isDesktop = () => window.innerWidth >= 1024;

  const getSaved = () => {
    try {
      const v = sessionStorage.getItem(KEY);
      return v === null ? true : v === 'true';
    } catch { return true; }
  };

  const apply = (expanded) => {
    root.classList.toggle('sidebar-expanded', expanded);
    root.classList.toggle('sidebar-collapsed', !expanded);
    sidebar?.setAttribute('data-expanded', expanded ? 'true' : 'false');
    try { sessionStorage.setItem(KEY, expanded ? 'true' : 'false'); } catch {}
    if (typeof lucide !== 'undefined') lucide.createIcons();
  };

  // Estado inicial (coincide con lo que ya inyectaste en <head>)
  apply(isDesktop() ? getSaved() : true);

  // Ya podemos permitir transiciones normales
  root.classList.remove('initializing');

  btn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!isDesktop()) return;
    const expanded = sidebar?.getAttribute('data-expanded') === 'true';
    apply(!expanded);
  });

  window.addEventListener('resize', () => {
    apply(isDesktop() ? getSaved() : true);
  });
});
