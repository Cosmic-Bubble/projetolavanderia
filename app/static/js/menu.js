
// Inicializa os ícones do Lucide
if (window.lucide) lucide.createIcons();

document.addEventListener("DOMContentLoaded", () => {
    // Busca os dados do perfil
    carregarPerfilMenu();

    const menu = document.getElementById('menu-lateral');
    const overlay = document.getElementById('menu-overlay');
    const abrir = document.getElementById('abrir-menu');
    const fechar = document.getElementById('fechar-menu');

    // Destaca automaticamente a página atual
if (menu) {

    const normalizar = (caminho) => {
        return caminho.replace(/\/+$/, '') || '/';
    };

    const atual = normalizar(window.location.pathname);

    menu.querySelectorAll('.menu-links a[href]').forEach(link => {

        const url = new URL(link.href, window.location.origin);

        const caminhoLink = normalizar(url.pathname);

        const ativo = atual === caminhoLink ||
            (caminhoLink !== '/' && atual.startsWith(caminhoLink + '/'));

        link.classList.toggle('ativo', ativo);

        if (ativo) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }

    });
}

    // Configura os controles do menu mobile
    if (!menu || !overlay || !abrir || !fechar) {
        if (window.lucide) lucide.createIcons();
        return;
    }

    function definirMenu(aberto) {
        menu.classList.toggle('-translate-x-full', !aberto);
        overlay.classList.toggle('hidden', !aberto);
        abrir.setAttribute('aria-expanded', String(aberto));

        document.body.classList.toggle(
            'overflow-hidden',
            aberto && window.innerWidth < 1024
        );
    }

    abrir.addEventListener('click', () => definirMenu(true));
    fechar.addEventListener('click', () => definirMenu(false));
    overlay.addEventListener('click', () => definirMenu(false));

    menu.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', () => definirMenu(false));
    });

    document.addEventListener('keydown', evento => {
        if (evento.key === 'Escape') {
            definirMenu(false);
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            definirMenu(false);
        }
    });

    if (window.lucide) lucide.createIcons();
});


// --- Função que busca os dados do perfil ---
async function carregarPerfilMenu() {
    try {
        const resposta = await fetch('/api/meu-perfil');
        if (!resposta.ok) return;

        const dados = await resposta.json();

        // 1. Atualiza o Nome
        const nomeEl = document.getElementById('menu-nome');

        if (nomeEl && dados.nome) {
            nomeEl.textContent = dados.nome + ' ' + (dados.sobrenome || '');
        }

        // 2. Atualiza o Cargo
        const cargoEl = document.getElementById('menu-cargo');

        if (cargoEl && dados.cargo) {
            cargoEl.textContent = dados.cargo;
        }

        // 3. Atualiza a Foto
        const avatarEl = document.getElementById('menu-avatar');

        if (avatarEl && dados.foto_url) {
            avatarEl.innerHTML = `<img src="${dados.foto_url}" alt="Foto de perfil" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        }

    } catch (erro) {
        console.error("Erro ao carregar perfil do menu:", erro);
    }
}
