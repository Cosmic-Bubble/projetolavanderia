// static/js/dashboard.js
(function () {
  const $ = (id) => document.getElementById(id);
  const fmtInt = v => v == null || !Number.isFinite(Number(v)) ? "—" : Number(v).toLocaleString("pt-BR");
  const fmtBRL = v => v == null || !Number.isFinite(Number(v)) ? "—" : Number(v).toLocaleString("pt-BR", {style:"currency", currency:"BRL", maximumFractionDigits:0});
  const fmtVar = (v, sufixo) => v == null ? "Sem comparação disponível" : `${v > 0 ? "+" : ""}${String(v).replace(".", ",")}% ${sufixo}`;

  function desenharGrafico(g) {
    const svg = $("grafico-demanda");
    if (!svg || !g) return;
    const meses = g.meses || [];
    const hist = g.historico_social || [];
    const prev = g.previsao_total || [];
    const valido = v => typeof v === "number" && Number.isFinite(v);
    const validos = [...hist, ...prev].filter(valido);
    const limite = valido(g.limite_kg) && g.limite_kg > 0 ? g.limite_kg : null;
    svg.replaceChildren();
    if (!meses.length || (!validos.length && limite == null)) {
      svg.setAttribute("aria-label", "Gráfico sem valores de demanda disponíveis.");
      return;
    }

    // Escala com espaço reservado para valores numéricos e nomes dos meses.
    const largura = Math.max(680, 75 * Math.max(1, meses.length - 1) + 90);
    const esquerda = 48;
    const direita = largura - 42;
    const topo = 38;
    const fundo = 212;
    const maior = Math.max(1, limite || 0, ...validos);
    const maxV = maior * 1.18;
    const x = i => esquerda + i * (direita - esquerda) / Math.max(meses.length - 1, 1);
    const y = v => fundo - (v / maxV) * (fundo - topo);
    svg.setAttribute("viewBox", `0 0 ${largura} 270`);
    svg.style.width = `${largura}px`;
    svg.style.minWidth = `${largura}px`;

    const ns = "http://www.w3.org/2000/svg";
    function el(tag, attrs, texto, parent = svg) {
      const e = document.createElementNS(ns, tag);
      for (const [k,v] of Object.entries(attrs)) e.setAttribute(k, String(v));
      if (texto !== undefined) e.textContent = texto;
      parent.appendChild(e);
      return e;
    }
    // Linhas leves auxiliam a leitura dos valores sem disputar atenção com as séries.
    for (let i = 0; i <= 3; i++) {
      const valor = maxV * i / 3;
      const yy = y(valor);
      el("line", {x1:esquerda, y1:yy, x2:direita, y2:yy, stroke:"#e2e8f0", "stroke-width":1});
      el("text", {x:esquerda-8, y:yy+4, fill:"#64748b", "font-size":10, "text-anchor":"end"}, fmtCompacto(valor));
    }
    el("text", {x:esquerda, y:15, fill:"#64748b", "font-size":11}, "Volume (kg)");

    if (limite != null) {
      el("line", {x1:esquerda, y1:y(limite), x2:direita, y2:y(limite), stroke:"#f59e0b", "stroke-width":2, "stroke-dasharray":"5 5"});
      const limiteTexto = el("text", {x:direita, y:Math.max(24, y(limite)-9), fill:"#b45309", "font-size":11, "font-weight":"600", "text-anchor":"end"}, `Capacidade: ${fmtInt(limite)} kg`);
      el("title", {}, `Capacidade operacional estimada: ${fmtInt(limite)} kg por mês`, limiteTexto);
    }

    function serie(valores, cor, tracejado, descricao, deslocamento) {
      let trecho = [];
      function fechar() {
        if (trecho.length > 1) el("polyline", {points:trecho.join(" "), fill:"none", stroke:cor, "stroke-width":3, ...(tracejado ? {"stroke-dasharray":"6 4"} : {})});
        trecho = [];
      }
      meses.forEach((mes,i) => {
        const v = valores[i];
        if (!valido(v)) { fechar(); return; }
        trecho.push(`${x(i)},${y(v).toFixed(1)}`);
      });
      fechar();
      meses.forEach((mes,i) => {
        const v = valores[i];
        if (!valido(v)) return;
        const ponto = el("circle", {cx:x(i), cy:y(v).toFixed(1), r:4, fill:cor, stroke:"#ffffff", "stroke-width":1.5});
        el("title", {}, `${mes} — ${descricao}: ${fmtInt(v)} kg`, ponto);
        // Rótulo numérico em cada ponto, sem confundir kg com porcentagem.
        const yy = Math.max(26, Math.min(231, y(v) + deslocamento));
        const rotulo = el("text", {x:x(i), y:yy, fill:cor, "font-size":10, "font-weight":600, "text-anchor":"middle"}, fmtCompacto(v));
        el("title", {}, `${mes} — ${descricao}: ${fmtInt(v)} kg`, rotulo);
      });
    }
    serie(hist, "#1685e5", false, "social realizado", -11);
    serie(prev, "#7d3c98", true, "demanda total prevista", 18);
    meses.forEach((m,i) => el("text", {x:x(i), y:245, fill:"#64748b", "font-size":11, "text-anchor":"middle"}, m));
    svg.setAttribute("aria-label", "Demanda mensal em kg. Azul contínuo: social realizado. Roxo tracejado: demanda total prevista. Laranja tracejado: capacidade estimada.");
  }

  function fmtCompacto(v) {
    if (Math.abs(v) >= 1000) return (v / 1000).toLocaleString("pt-BR", {maximumFractionDigits:1}) + " mil";
    return Number(v).toLocaleString("pt-BR", {maximumFractionDigits:0});
  }

  function preencher(d) {
    if (d.sem_dados) return;

    // Alerta
    const alerta = $("alerta-capacidade");
    if (d.alerta) {
      $("alerta-texto").textContent =
        `A demanda prevista para ${d.alerta.mes} ultrapassará a capacidade máxima instalada em ` +
        `${fmtInt(d.alerta.excesso_kg)} kg (${d.alerta.pct_acima}% acima do limite).`;
      alerta.classList.remove("hidden");
    } else {
      alerta.classList.add("hidden");
    }

    // Cards
    const c = d.cards;
    $("card-atendimentos").textContent = fmtInt(c.atendimentos.valor);
    $("card-atendimentos-var").textContent = fmtVar(c.atendimentos.variacao_pct, "famílias atendidas");
    $("card-faturamento").textContent = fmtBRL(c.faturamento.valor);
    $("card-faturamento-var").textContent = fmtVar(c.faturamento.variacao_pct, "este mês");

    const uso = c.capacidade.uso_pct;
    const usoTxt = uso == null ? "—" : `${uso}%`;
    $("card-capacidade").textContent = usoTxt;
    $("card-capacidade-texto").textContent =
      uso == null ? "Projeção ou capacidade indisponível"
        : uso >= 100 ? "Capacidade excedida"
        : uso >= 85 ? "Projeção próxima ao limite"
        : "Projeção dentro da capacidade";

    // Medidor
    const medidor = $("medidor-numero");
    if (medidor && medidor.firstChild) medidor.firstChild.nodeValue = usoTxt;
    const rotulo = medidor && medidor.querySelector("span");
    if (rotulo) {
      rotulo.textContent =
        uso == null ? "Sem dados" : uso >= 100 ? "Estouro" : uso >= 85 ? "Risco de Estouro" : "Capacidade OK";
    }
    $("medidor-wrapper")?.setAttribute("aria-label", `${usoTxt} de uso da capacidade`);

    desenharGrafico(d.grafico);
  }

  fetch("/api/dashboard")
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(preencher)
    .catch((e) => console.error("Erro ao carregar dashboard:", e));
})();