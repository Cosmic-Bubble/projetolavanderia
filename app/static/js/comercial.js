lucide.createIcons();

// 1. GRÁFICO DE FATURAMENTO (SVG)
const ns = 'http://www.w3.org/2000/svg';
const linha = document.getElementById('linha-faturamento');
const pontos = document.getElementById('pontos-faturamento');
const rotulos = document.getElementById('rotulos-meses');

const LARGURA_SVG = 740; 
const ALTURA_MAX = 160; 
const OFFSET_Y = 20;    

let dadosComerciais = null;

async function carregarDadosComerciais() {
    try {
        const resp = await fetch("/api/previsoes?periodos=12");
        const dados = await resp.json();
        
        if (dados && dados.comercial_receita && dados.comercial_receita.historico) {
            dadosComerciais = dados.comercial_receita;
            desenharGrafico('semestre');
        } else {
            console.warn("Sem dados de faturamento comercial no banco.");
            desenharGraficoVazio();
        }
    } catch (erro) {
        console.error("Erro ao carregar dados comerciais:", erro);
        desenharGraficoVazio();
    }
}

function desenharGraficoVazio() {
    if (linha) linha.setAttribute('d', '');
    if (pontos) pontos.replaceChildren();
    if (rotulos) rotulos.replaceChildren();
}

function desenharGrafico(periodo) {
    if (!dadosComerciais || !linha) return;

    const historicoOriginal = dadosComerciais.historico || [];
    const previsoesOriginal = dadosComerciais.previsoes || [];
    const mesesOriginal = dadosComerciais.meses_historico || [];
    const mesesFuturosOriginal = dadosComerciais.meses_futuros || [];

    let qtdHist = periodo === 'ano' ? 6 : 3;
    let qtdPrev = periodo === 'ano' ? 6 : 3;

    qtdHist = Math.min(qtdHist, historicoOriginal.length);
    qtdPrev = Math.min(qtdPrev, previsoesOriginal.length);

    let histExibido = historicoOriginal.slice(-qtdHist);
    let mesesHistExibidos = mesesOriginal.slice(-qtdHist);
    
    let prevExibida = previsoesOriginal.slice(0, qtdPrev);
    let mesesPrevExibidos = mesesFuturosOriginal.slice(0, qtdPrev);

    let valoresExibidos = [...histExibido, ...prevExibida];
    let mesesExibidos = [...mesesHistExibidos, ...mesesPrevExibidos];

    if (valoresExibidos.length === 0) {
        desenharGraficoVazio();
        return;
    }

    let maiorValor = Math.max(...valoresExibidos);
    let menorValor = Math.min(...valoresExibidos);
    
    if (maiorValor === menorValor) {
        maiorValor = maiorValor + 100; 
        menorValor = Math.max(0, menorValor - 100);
    }

    let margem = (maiorValor - menorValor) * 0.10;
    let topo = maiorValor + margem;
    let base = Math.max(0, menorValor - margem);

    const qtdPontos = valoresExibidos.length;
    const passoX = qtdPontos > 1 ? LARGURA_SVG / (qtdPontos - 1) : LARGURA_SVG; 

    const posicoesX = [];
    const posicoesY = [];

    valoresExibidos.forEach((valor, i) => {
        posicoesX.push(i * passoX);
        let proporcao = (valor - base) / (topo - base);
        let y = (ALTURA_MAX - (proporcao * ALTURA_MAX)) + OFFSET_Y;
        posicoesY.push(y);
    });

    pontos.replaceChildren();
    rotulos.replaceChildren();

    // Remove tooltip antigo se existir
    let tooltip = document.querySelector('.chart-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip';
        // Adiciona no container do gráfico
        linha.closest('svg').parentElement.appendChild(tooltip);
    }

    // Desenha a linha
    const d = posicoesY.map((y, i) => `${i === 0 ? 'M' : 'L'} ${posicoesX[i]} ${y}`).join(' ');
    linha.setAttribute('d', d);

    valoresExibidos.forEach((valor, i) => {
        const isPrevisao = i >= histExibido.length;
        
        // Desenha o ponto
        const circulo = document.createElementNS(ns, 'circle');
        circulo.setAttribute('cx', String(posicoesX[i]));
        circulo.setAttribute('cy', String(posicoesY[i]));
        circulo.setAttribute('r', '4');
        circulo.setAttribute('fill', isPrevisao ? '#a855f7' : '#7d3c98');
        
        // Adiciona as interações do mouse no círculo
        circulo.addEventListener('mouseenter', (e) => {
            tooltip.textContent = `R$ ${Number(valor).toLocaleString('pt-BR')}`;
            
            // Pega a posição do círculo na tela
            const rect = e.target.getBoundingClientRect();
            const containerRect = e.target.closest('.grafico-scroll').getBoundingClientRect();
            
            // Posiciona o tooltip em cima do ponto
            tooltip.style.left = (rect.left - containerRect.left + rect.width / 2) + 'px';
            tooltip.style.top = (rect.top - containerRect.top) + 'px';
            
            tooltip.classList.add('visible');
        });
        
        circulo.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
        });

        pontos.appendChild(circulo);

        // Texto do mês
        const textoMes = document.createElementNS(ns, 'text');
        textoMes.setAttribute('x', String(posicoesX[i]));
        textoMes.setAttribute('y', '196');
        textoMes.setAttribute('text-anchor', 'middle');
        
        let [ano, mes] = mesesExibidos[i].split('-');
        const nomesMeses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        let nomeMesFormatado = `${nomesMeses[parseInt(mes)-1]}/${ano.slice(2)}`;
        
        if (isPrevisao) {
            nomeMesFormatado = `${nomesMeses[parseInt(mes)-1]} (Prev)`;
        }

        textoMes.textContent = nomeMesFormatado;
        textoMes.setAttribute('fill', '#64748b');
        textoMes.setAttribute('font-size', '11');
        textoMes.setAttribute('font-weight', '500');
        rotulos.appendChild(textoMes);
    });
}

const botoesPeriodo = document.querySelectorAll('[data-periodo]');

botoesPeriodo.forEach((botao) => {
    // Remove qualquer listener antigo antes de adicionar o novo - evita o acúmulo de eventos e o bug de renderização dupla
    const novoBotao = botao.cloneNode(true);
    botao.parentNode.replaceChild(novoBotao, botao);
});

document.querySelectorAll('[data-periodo]').forEach((botao) => {
    botao.addEventListener('click', (e) => {
        e.preventDefault();

        document.querySelectorAll('[data-periodo]').forEach((item) => {
            item.classList.remove('periodo-ativo');
            item.setAttribute('aria-pressed', 'false');
        });

        botao.classList.add('periodo-ativo');
        botao.setAttribute('aria-pressed', 'true');

        desenharGrafico(botao.dataset.periodo);
    });
});

// 2. TABELA DE CONTRATOS E MODAL
const tbody = document.getElementById("tabela-contratos");
const modal = document.getElementById("modal-contrato");
const form = document.getElementById("form-contrato");
const modalTitulo = document.getElementById("modal-titulo");

function abrirModal(contrato = null) {
    if(!form) return;
    form.reset(); 
    document.getElementById("input-id-contrato").value = ""; 

    if (contrato) {
        modalTitulo.textContent = "Editar Contrato";
        document.getElementById("input-id-contrato").value = contrato.id;
        document.getElementById("input-razao").value = contrato.cliente_razao_social;
        document.getElementById("input-cnpj").value = contrato.cliente_cnpj;
        document.getElementById("input-data").value = contrato.data_inicio;
        document.getElementById("input-valor").value = contrato.valor_mensal_contratado;
        document.getElementById("input-data-fim").value = contrato.data_fim || "";
        document.getElementById("input-franquia-kg").value = contrato.franquia_kg_mes || "";
        document.getElementById("input-franquia-pecas").value = contrato.franquia_pecas_mes || "";
    } else {
        modalTitulo.textContent = "Novo Contrato";
    }

    modal.classList.remove("hidden");
    lucide.createIcons(); 
}

function fecharModal() {
    if(modal) modal.classList.add("hidden");
}

document.getElementById("btn-novo-contrato")?.addEventListener("click", () => abrirModal());
document.getElementById("btn-cancelar-modal")?.addEventListener("click", fecharModal);
document.getElementById("btn-fechar-modal")?.addEventListener("click", fecharModal);

modal?.addEventListener("click", (e) => {
    if (e.target === modal) fecharModal();
});

async function carregarContratosAtivos() {
    if (!tbody) return;

    try {
        const resposta = await fetch("/api/contratos");
        const contratos = await resposta.json();

        if (!Array.isArray(contratos) || contratos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-gray-400">Nenhum contrato ativo encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = contratos.map((c) => {
            const volume = Number(c.volume_previsto || 0).toLocaleString("pt-BR");
            const badgeText = c.status_visual || "Vigente";
            const badgeClass = c.status_cor || "bg-[#7d3c98]";

            // Formatação de datas
            const dataInicio = c.data_inicio ? new Date(c.data_inicio + 'T00:00:00').toLocaleDateString("pt-BR") : "—";
            const dataFim = c.data_fim ? new Date(c.data_fim + 'T00:00:00').toLocaleDateString("pt-BR") : "Indeterminado";

            const contratoJSON = encodeURIComponent(JSON.stringify(c));

            return `
                <tr class="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td class="py-3 px-4 font-semibold text-slate-800">${c.cliente_razao_social || "Sem nome"}</td>
                    <td class="py-3 px-4 text-slate-500">${dataInicio}</td>
                    <td class="py-3 px-4 text-slate-500">${dataFim}</td>
                    <td class="py-3 px-4 text-slate-500 font-semibold">${volume} kg</td>
                    <td class="py-3 px-4">
                        <span class="text-xs font-bold text-white px-3 py-1 rounded-md ${badgeClass}">
                            ${badgeText}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-center flex justify-center gap-2">
                        <button onclick="window.editarContrato('${contratoJSON}')" class="text-blue-500 hover:bg-blue-50 p-1.5 rounded transition" title="Editar">
                            <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>
                        <button onclick="window.deletarContrato(${c.id})" class="text-red-500 hover:bg-red-50 p-1.5 rounded transition" title="Apagar">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        lucide.createIcons();
    } catch (erro) {
        console.error("Erro ao carregar contratos:", erro);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-red-500">Não foi possível carregar os contratos.</td></tr>`;
    }
}

// 3. AÇÕES GLOBAIS (Editar / Deletar / Salvar)
window.editarContrato = function(contratoString) {
    const contrato = JSON.parse(decodeURIComponent(contratoString));
    abrirModal(contrato);
};

window.deletarContrato = async function(id) {
    if (!confirm("Tem certeza que deseja apagar este contrato?")) return;
    try {
        const resp = await fetch(`/api/contratos/${id}`, { method: "DELETE" });
        if (resp.ok) await carregarContratosAtivos();
        else alert("Erro ao apagar o contrato.");
    } catch (erro) {
        alert("Erro de rede ao tentar apagar.");
    }
};

form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-salvar-modal");
    btn.disabled = true;
    btn.innerHTML = "Salvando...";

    const formData = new FormData(form);
    const dados = Object.fromEntries(formData.entries());

    try {
        const resp = await fetch("/api/contratos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });
        
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.erro || "Erro ao salvar");
        }

        fecharModal();
        await carregarContratosAtivos();
    } catch (erro) {
        alert(erro.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Salvar Contrato';
        lucide.createIcons();
    }
});

// 4. INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", () => {
    carregarDadosComerciais();
    carregarContratosAtivos();
});