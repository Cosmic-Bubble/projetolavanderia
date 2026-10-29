
document.addEventListener("DOMContentLoaded", () => {
    
    // Dados fictícios para testes do Front-end.
    // Serão substituídos pelos dados reais do Back-end.
    const notificacoes = [
        {
            id: 1,
            mensagem: "Capacidade da lavanderia próxima do limite.",
            lida: false
        },
        {
            id: 2,
            mensagem: "Novo atendimento social registrado.",
            lida: false
        },
        {
            id: 3,
            mensagem: "Relatório mensal disponível.",
            lida: true
        }
    ];
    
    // Recupera as notificações marcadas como lidas neste navegador
    const notificacoesLidas = JSON.parse(
        localStorage.getItem("lavanderia_notificacoes_lidas") || "[]"
    );

    notificacoes.forEach((notificacao) => {
        if (notificacoesLidas.includes(notificacao.id)) {
            notificacao.lida = true;
        }
    });
    
const botao = document.getElementById("abrir-notificacoes");

let painel = document.getElementById("painel-notificacoes");

if (botao && !painel) {
    painel = document.createElement("div");
    painel.id = "painel-notificacoes";
    painel.className = "hidden absolute right-6 top-20 z-50 w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-lg";

    painel.innerHTML = `
        <h2 class="text-lg font-semibold mb-3">
            Notificações
        </h2>

        <div class="flex gap-2 mb-4">
            <button id="filtro-todas" type="button"
                    class="text-sm font-semibold text-blue-600">
                Todas
            </button>

            <button id="filtro-nao-lidas" type="button"
                    class="text-sm text-gray-500">
                Não lidas
            </button>

            <button id="filtro-lidas" type="button"
                    class="text-sm text-gray-500">
                Lidas
            </button>
        </div>

       <div id="lista-notificacoes"
     class="space-y-2 text-sm text-gray-700">
</div>
    `;

    botao.insertAdjacentElement("afterend", painel);
}

    if (!botao || !painel) return;
    
    // Localiza a bolinha vermelha dentro do botão do sino
    const indicador = botao.querySelector(".bg-red-500");

    function atualizarIndicador() {
        if (!indicador) return;

        const existemNaoLidas = notificacoes.some(
            (notificacao) => !notificacao.lida
        );

        indicador.classList.toggle("hidden", !existemNaoLidas);
    }

    // Atualiza o indicador ao carregar a página
    atualizarIndicador();

    
    // Exibe as notificações no painel
    const lista = painel.querySelector("#lista-notificacoes");

    function exibirNotificacoes(filtro = "todas") {
        if (!lista) return;

        const filtradas = notificacoes.filter((notificacao) => {
            if (filtro === "naoLidas") return !notificacao.lida;
            if (filtro === "lidas") return notificacao.lida;
            return true;
        });

        lista.replaceChildren();

        if (filtradas.length === 0) {
            const mensagem = document.createElement("p");
            mensagem.textContent = "Nenhuma notificação encontrada.";
            mensagem.className = "text-sm text-gray-500";
            lista.appendChild(mensagem);
            return;
        }

        filtradas.forEach((notificacao) => {
            const item = document.createElement("div");

            item.className = notificacao.lida
                ? "p-3 rounded-lg bg-gray-50 text-gray-500"
                : "p-3 rounded-lg bg-blue-50 text-gray-800 font-semibold";

            item.textContent = notificacao.mensagem;
            item.dataset.id = notificacao.id;
            
if (!notificacao.lida) {
    item.classList.add("cursor-pointer");
    item.title = "Clique para marcar como lida";

    item.addEventListener("click", () => {
    notificacao.lida = true;

    // Salva as notificações lidas no navegador
    const idsLidas = notificacoes
        .filter((n) => n.lida)
        .map((n) => n.id);

    localStorage.setItem(
        "lavanderia_notificacoes_lidas",
        JSON.stringify(idsLidas)
    );
    atualizarIndicador();
    exibirNotificacoes(filtro);
});
}
            lista.appendChild(item);
        });
    }

    exibirNotificacoes();

    // Abre e fecha o painel
    botao.addEventListener("click", () => {
        painel.classList.toggle("hidden");
    });

    // Botões dos filtros
    const filtros = {
        todas: document.getElementById("filtro-todas"),
        naoLidas: document.getElementById("filtro-nao-lidas"),
        lidas: document.getElementById("filtro-lidas")
    };

    function selecionarFiltro(filtroSelecionado) {
        Object.entries(filtros).forEach(([nome, elemento]) => {
            if (!elemento) return;

            const ativo = nome === filtroSelecionado;

            elemento.classList.toggle("text-blue-600", ativo);
            elemento.classList.toggle("font-semibold", ativo);
            elemento.classList.toggle("text-gray-500", !ativo);
        });
    }

    Object.entries(filtros).forEach(([nome, elemento]) => {
        if (elemento) {
            elemento.addEventListener("click", () => {
                selecionarFiltro(nome);
                exibirNotificacoes(nome);
            });
        }
    });
});