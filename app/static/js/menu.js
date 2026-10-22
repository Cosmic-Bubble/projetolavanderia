// Inicializa os ícones do Lucide
lucide.createIcons();

document.addEventListener("DOMContentLoaded", () => {
  const menu = document.getElementById('menu-lateral');
  const overlay = document.getElementById('menu-overlay');
  const abrir = document.getElementById('abrir-menu');
  const fechar = document.getElementById('fechar-menu');
  
  if (!menu || !overlay || !abrir || !fechar) return;

  // Destaca automaticamente a página atual com base no URL
  const atual = location.pathname.split('/').pop() || 'dashboard';
  menu.querySelectorAll('nav a[href]').forEach(link => {
    const href = link.getAttribute('href');
    const ativo = href.includes(atual);
    link.classList.toggle('bg-cyan-500', ativo);
    link.classList.toggle('text-white', ativo);
    link.classList.toggle('text-slate-500', !ativo);
    if (ativo) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  function definirMenu(aberto) {
    menu.classList.toggle('-translate-x-full', !aberto);
    overlay.classList.toggle('hidden', !aberto);
    abrir.setAttribute('aria-expanded', String(aberto));
    document.body.classList.toggle('overflow-hidden', aberto && innerWidth < 1024);
  }

  abrir.addEventListener('click', () => definirMenu(true));
  fechar.addEventListener('click', () => definirMenu(false));
  overlay.addEventListener('click', () => definirMenu(false));
  menu.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => definirMenu(false)));
  
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape') definirMenu(false);
  });
  
  window.addEventListener('resize', () => {
    if (innerWidth >= 1024) definirMenu(false);
  });

  if (window.lucide) lucide.createIcons();
});
