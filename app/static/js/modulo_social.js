// ============================================================
// modulo_social.js
// Busca previsões de todos os KPIs e popula:
// - os 4 cards do topo (visitas, banhos, kits, lavagens)
// - a seção "Comparativo: Previsto vs. Realizado"
// ============================================================

const KPIS_CARDS = [
    { id: "kpi-visitas",  badgeId: "badge-visitas",  subId: "kpi-visitas-sub",  chave: "visitas_qtd",           sufixo: "" },
    { id: "kpi-banhos",   badgeId: "badge-banhos",   subId: "kpi-banhos-sub",   chave: "banhos_qtd",            sufixo: "" },
    { id: "kpi-kits",     badgeId: "badge-kits",     subId: "kpi-kits-sub",     chave: "kits_distribuidos_qtd", sufixo: "" },
    { id: "kpi-lavagens", badgeId: "badge-lavagens", subId: "kpi-lavagens-sub", chave: "social_peso_kg",        sufixo: " kg" },
];

const KPIS_COMPARATIVO = [
    { chave: "social_peso_kg",        label: "Lavagens Comunitárias (Avulsas)", unidade: "kg" },
    { chave: "banhos_qtd",            label: "Banhos e Higiene",                unidade: "banhos" },
    { chave: "kits_distribuidos_qtd", label: "Kits de Higiene Entregues",       unidade: "un" },
    { chave: "social_atendimentos_qtd", label: "Atendimentos Sociais",          unidade: "atend." },
];


// ============================================================
// Helpers
// ============================================================

function formatarNumero(valor, casas = 0) {
    if (valor === null || valor === undefined) return "—";
    return Number(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas,
    });
}

function formatarVariacao(pct) {
    if (pct === null || pct === undefined || isNaN(pct)) return { texto: "—", classe: "text-slate-500" };
    const sinal = pct > 0 ? "+" : "";
    const classe = pct > 0 ? "text-green-600" : pct < 0 ? "text-red-600" : "text-slate-500";
    return { texto: `${sinal}${pct.toFixed(1)}%`, classe };
}


// ============================================================
// Cards do topo
// ============================================================


function atualizarCards(previsoes) {
    for (const kpi of KPIS_CARDS) {
        const elValor = document.getElementById(kpi.id);
        const elSub = document.getElementById(kpi.subId);
        const elBadge = document.getElementById(kpi.badgeId);
        
        if (!elValor || !elSub || !elBadge) continue;

        const dados = previsoes[kpi.chave];
        if (!dados || dados.erro) {
            elValor.textContent = "—";
            elBadge.textContent = "Sem dados";
            elBadge.className = "text-[11px] font-bold px-2 py-0.5 rounded-md self-start bg-slate-500 text-white";
            elSub.textContent = dados?.erro === "sem dados"
                ? "Aguardando primeiras importações"
                : (dados?.erro || "Erro ao carregar");
            continue;
        }

        const ultimo = dados.ultimo_valor ?? 0;
        const proximo = dados.previsao_proximo ?? 0;
        const pct = ultimo > 0 ? ((proximo - ultimo) / ultimo) * 100 : 0;
        const casas = Number.isInteger(ultimo) ? 0 : 1;

        elValor.textContent = formatarNumero(ultimo, casas) + kpi.sufixo;

        // Configurar Badge baseado na variação
                // Configurar Badge baseado na variação
        let badgeText = "Estável";
        let badgeClass = "bg-purple-700 text-white"; // Roxo Escuro (Estável)
        
        if (pct > 2) {
            badgeText = "Alta Variação";
            badgeClass = "bg-orange-500 text-white"; // Laranja
        } else if (pct < -2) {
            badgeText = "Baixa Variação";
            badgeClass = "bg-red-500 text-white"; // Vermelho
        }

        elBadge.textContent = badgeText;
        elBadge.className = `text-[11px] font-bold px-2 py-0.5 rounded-md self-start ${badgeClass}`;


        // Configurar subtexto (ex: +12% vs mês anterior)
        const sinal = pct > 0 ? "+" : "";
        const corTexto = pct > 0 ? "text-green-600" : (pct < 0 ? "text-red-600" : "text-slate-500");
        
        elSub.innerHTML = `<strong class="${corTexto}">${sinal}${pct.toFixed(1)}%</strong> vs. mês anterior · Prev: ${formatarNumero(proximo, casas)}${kpi.sufixo}`;
    }
}


// ============================================================
// Comparativo: Previsto vs. Realizado
// ============================================================

async function carregarComparativo() {
    const container = document.getElementById("lista-comparativo");
    if (!container) return;

    // Busca em paralelo
    const promessas = KPIS_COMPARATIVO.map((kpi) =>
        fetch(`/api/comparativo/${kpi.chave}`)
            .then((r) => r.json())
            .then((d) => ({ ...kpi, ...d }))
            .catch(() => ({ ...kpi, erro: "falha ao buscar" }))
    );

    const resultados = await Promise.all(promessas);

    const linhas = resultados
        .map((r) => {
            if (r.erro) {
                return `
                    <div class="comparativo-linha">
                        <h3 class="text-sm font-semibold text-slate-800">${r.label}</h3>
                        <div><small>PREVISTO</small><strong>—</strong></div>
                        <div><small>REALIZADO</small><strong>—</strong></div>
                        <div><small>DESVIO</small><strong class="text-slate-400">${r.erro}</strong></div>
                    </div>`;
            }

            const variacao = formatarVariacao(r.desvio_pct);
            const casas = Number.isInteger(r.previsto) && Number.isInteger(r.realizado) ? 0 : 1;

            return `
                <div class="comparativo-linha">
                    <h3 class="text-sm font-semibold text-slate-800">${r.label}</h3>
                    <div><small>PREVISTO</small><strong>${formatarNumero(r.previsto, casas)} ${r.unidade}</strong></div>
                    <div><small>REALIZADO</small><strong>${formatarNumero(r.realizado, casas)} ${r.unidade}</strong></div>
                    <div><small>DESVIO</small><strong class="${variacao.classe}">${variacao.texto}</strong></div>
                </div>`;
        })
        .join("");

    container.innerHTML = linhas;
}


// ============================================================
// Boot
// ============================================================

async function carregarTudo() {
    try {
        const resp = await fetch("/api/previsoes?periodos=3");
        const previsoes = await resp.json();
        console.log("[social] previsões:", previsoes);
        atualizarCards(previsoes);
    } catch (erro) {
        console.error("[social] erro ao buscar previsões:", erro);
        for (const kpi of KPIS_CARDS) {
            const el = document.getElementById(kpi.subId);
            if (el) el.textContent = "Erro ao carregar previsões";
        }
    }

    await carregarComparativo();

    if (window.lucide?.createIcons) {
        window.lucide.createIcons();
    }
}

document.addEventListener("DOMContentLoaded", carregarTudo);