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
    const validos = [...hist, ...prev].filter(v => typeof v === "number" && Number.isFinite(v));
    const limite = typeof g.limite_kg === "number" && Number.isFinite(g.limite_kg) && g.limite_kg > 0 ? g.limite_kg : null;
    svg.replaceChildren();
    if (!meses.length || (!validos.length && limite == null)) return;
    const maxV = Math.max(1, limite || 0, ...validos) * 1.1;
    const x = i => 35 + i * 600 / Math.max(meses.length - 1, 1);
    const y = v => 190 - v / maxV * 150;
    const ns = "http://www.w3.org/2000/svg";
    function el(tag, attrs, texto, parent = svg) {
      const e = document.createElementNS(ns, tag);
      for (const [k,v] of Object.entries(attrs)) e.setAttribute(k, String(v));
      if (texto !== undefined) e.textContent = texto;
      parent.appendChild(e);
      return e;
    }
    if (limite != null) {
      el("line", {x1:35, y1:y(limite), x2:635, y2:y(limite), stroke:"#f59e0b", "stroke-width":2, "stroke-dasharray":"5 5"});
      el("text", {x:38, y:Math.max(12,y(limite)-9), fill:"#b45309", "font-size":10}, `CAPACIDADE: ${fmtInt(limite)} kg`);
    }
    function serie(valores, cor, tracejado) {
      let trecho = [];
      function fechar() {
        if (trecho.length > 1) el("polyline", {points:trecho.join(" "), fill:"none", stroke:cor, "stroke-width":3, ...(tracejado ? {"stroke-dasharray":"6 4"} : {})});
        trecho = [];
      }
      meses.forEach((mes,i) => {
        const v = valores[i];
        if (typeof v !== "number" || !Number.isFinite(v)) { fechar(); return; }
        trecho.push(`${x(i)},${y(v).toFixed(1)}`);
      });
      fechar();
      meses.forEach((mes,i) => {
        const v = valores[i];
        if (typeof v === "number" && Number.isFinite(v)) {
          const ponto = el("circle", {cx:x(i), cy:y(v).toFixed(1), r:4, fill:cor});
          el("title", {}, `${mes}: ${fmtInt(v)} kg`, ponto);
        }
      });
    }
    serie(hist, "#1685e5", false);
    serie(prev, "#7d3c98", true);
    meses.forEach((m,i) => el("text", {x:x(i), y:215, fill:"#64748b", "font-size":11, "text-anchor":"middle"}, m));
    svg.setAttribute("aria-label", "Azul: peso social realizado. Roxo tracejado: demanda total prevista. Laranja: capacidade. Histórico comercial indisponível.");
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