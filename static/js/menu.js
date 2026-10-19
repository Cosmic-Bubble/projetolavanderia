// Menu lateral compartilhado pelas páginas do painel.
// No Live Server, menu.html é carregado como um fragmento HTML.
// Na integração com Flask, a equipe pode substituí-lo por {% include 'menu.html' %}.
(async function iniciarMenu() {
  const recipiente = document.getElementById('menu-compartilhado');
  if (!recipiente) return;
  try {
    const resposta = await fetch('menu.html');
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    recipiente.innerHTML = await resposta.text();
  } catch (erro) {
    console.error('Não foi possível carregar o menu:', erro);
    recipiente.innerHTML = '<p role="alert" class="p-3 text-sm text-red-700">Menu indisponível. Abra o projeto pelo Live Server.</p>';
    return;
  }

  const menu = document.getElementById('menu-lateral');
  const overlay = document.getElementById('menu-overlay');
  const abrir = document.getElementById('abrir-menu');
  const fechar = document.getElementById('fechar-menu');
  if (!menu || !overlay || !abrir || !fechar) return;

  // Destaca automaticamente a página atual.
  const atual = location.pathname.split('/').pop() || 'dashboard.html';
  menu.querySelectorAll('nav a[href]').forEach(link => {
    const ativo = link.getAttribute('href') === atual;
    link.classList.toggle('bg-cyan-500', ativo);
    link.classList.toggle('text-white', ativo);
    link.classList.toggle('text-slate-500', !ativo);
    link.classList.toggle('hover:bg-gray-100', !ativo);
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
})();
