document.addEventListener("DOMContentLoaded", () => {
    const botao = document.getElementById("abrir-notificacoes");
    if (!botao) return;

    // 1. Cria o painel se não existir
    let painel = document.getElementById("painel-notificacoes");
    if (!painel) {
        painel = document.createElement("div");
        painel.id = "painel-notificacoes";
        painel.className = "hidden absolute right-4 sm:right-10 top-20 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-xl";
        
        painel.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h2 class="text-base font-bold text-slate-800">Notificações</h2>
            </div>
            <div class="flex gap-3 mb-4 border-b border-gray-100 pb-2">
                <button id="filtro-todas" type="button" class="text-xs font-semibold text-[#7d3c98]">Todas</button>
                <button id="filtro-nao-lidas" type="button" class="text-xs text-gray-500 hover:text-slate-800">Não lidas</button>
                <button id="filtro-lidas" type="button" class="text-xs text-gray-500 hover:text-slate-800">Lidas</button>
            </div>
            <div id="lista-notificacoes" class="space-y-2 text-sm max-h-64 overflow-y-auto">
                <p class="text-center text-gray-400 py-4 text-xs">Carregando...</p>
            </div>
        `;
        botao.insertAdjacentElement("afterend", painel);
    }

    const lista = document.getElementById("lista-notificacoes");
    const indicador = botao.querySelector(".bg-red-500");
    let notificacoes = [];

    function atualizarIndicador() {
        if (!indicador) return;
        const temNaoLido = notificacoes.some(n => !n.lido);
        indicador.classList.toggle("hidden", !temNaoLido);
    }

    function renderizarNotificacoes(filtro = "todas") {
        if (!lista) return;
        
        const filtradas = notificacoes.filter(n => {
            if (filtro === "naoLidas") return !n.lido;
            if (filtro === "lidas") return n.lido;
            return true;
        });

        lista.innerHTML = ""; 
        if (filtradas.length === 0) {
            lista.innerHTML = `<p class="text-center text-gray-400 py-4 text-xs">Nenhuma notificação encontrada.</p>`;
            return;
        }

        filtradas.forEach(n => {
            const item = document.createElement("div");
            item.className = n.lido 
                ? "p-3 rounded-lg bg-gray-50 text-gray-500 text-xs" 
                : "p-3 rounded-lg bg-blue-50 text-slate-800 font-semibold text-xs cursor-pointer hover:bg-blue-100 transition";
            
            item.textContent = n.titulo || n.mensagem;

            if (!n.lido) {
                item.addEventListener("click", async () => {
                    try {
                        const resp = await fetch(`/api/alertas/${n.id}/ler`, { 
                            method: "POST",
                            credentials: 'same-origin'
                        });
                        
                        if (!resp.ok) {
                            const err = await resp.json();
                            alert("Erro ao salvar: " + (err.erro || resp.status));
                            return;
                        }
                        
                        n.lido = true;
                        atualizarIndicador();
                        renderizarNotificacoes(filtro);
                    } catch (e) {
                        console.error("Erro ao marcar alerta como lido", e);
                    }
                });
            }

            lista.appendChild(item);
        });
    }

    async function carregarAlertas() {
        try {
            const resp = await fetch("/api/alertas", { credentials: 'same-origin' });
            
            if (!resp.ok) {
                console.warn("Falha ao buscar alertas:", resp.status);
                if (lista) lista.innerHTML = `<p class="text-center text-gray-400 py-4 text-xs">Faça login para ver notificações.</p>`;
                return;
            }

            notificacoes = await resp.json();
            atualizarIndicador();
            renderizarNotificacoes("todas");
        } catch (erro) {
            console.error("Erro ao carregar alertas:", erro);
            if (lista) lista.innerHTML = `<p class="text-center text-red-500 py-4 text-xs">Erro de conexão.</p>`;
        }
    }

    botao.addEventListener("click", (e) => {
        e.stopPropagation();
        painel.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
        if (!painel.contains(e.target) && !botao.contains(e.target)) {
            painel.classList.add("hidden");
        }
    });

    const botoesFiltro = {
        todas: document.getElementById("filtro-todas"),
        naoLidas: document.getElementById("filtro-nao-lidas"),
        lidas: document.getElementById("filtro-lidas")
    };

    function selecionarFiltro(ativo) {
        Object.entries(botoesFiltro).forEach(([nome, btn]) => {
            if (!btn) return;
            btn.className = nome === ativo 
                ? "text-xs font-semibold text-[#7d3c98]" 
                : "text-xs text-gray-500 hover:text-slate-800";
        });
    }

    Object.entries(botoesFiltro).forEach(([nome, btn]) => {
        if (btn) {
            btn.addEventListener("click", () => {
                selecionarFiltro(nome);
                renderizarNotificacoes(nome);
            });
        }
    });

    carregarAlertas();
    if (window.lucide) window.lucide.createIcons();
});