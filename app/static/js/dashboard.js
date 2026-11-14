// static/js/dashboard.js
(function () {
  const $ = (id) => document.getElementById(id);
  const fmtInt = (v) => Number(v).toLocaleString("pt-BR");
  const fmtBRL = (v) =>
    Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const fmtVar = (v, sufixo) =>
    v == null ? sufixo : `${v > 0 ? "+" : ""}${String(v).replace(".", ",")}% ${sufixo}`;

  function desenharGrafico(g) {
    const svg = $("grafico-demanda");
    if (!svg || !g.valores.length) return;

    const X0 = 35, X1 = 635, YTOP = 40, YBASE = 190;
    const maxV = Math.max(g.limite_kg || 0, ...g.valores) * 1.1 || 1;
    const x = (i) => X0 + (i * (X1 - X0)) / Math.max(g.valores.length - 1, 1);
    const y = (v) => YBASE - (v / maxV) * (YBASE - YTOP);

    const pts = g.valores.map((v, i) => `${x(i)},${y(v).toFixed(1)}`);
    const iPrev = Math.max(g.qtd_historico - 1, 0);   // liga o último real à previsão
    const yLim = y(g.limite_kg || 0).toFixed(1);

    let html = "";
    if (g.limite_kg > 0) {
      html += `<line x1="35" y1="${yLim}" x2="650" y2="${yLim}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5 5"/>`;
      html += `<text x="38" y="${yLim - 10}" fill="#f59e0b" font-size="10">CAPACIDADE MÁXIMA: ${fmtInt(g.limite_kg)} KG</text>`;
    }
    html += `<polyline points="${pts.join(" ")}" fill="none" stroke="#1685e5" stroke-width="3"/>`;
    html += `<polyline points="${pts.slice(iPrev).join(" ")}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5 4"/>`;
    html += `<g fill="#1685e5">${g.valores
      .map((v, i) => `<circle cx="${x(i)}" cy="${y(v).toFixed(1)}" r="4"/>`)
      .join("")}</g>`;
    html += `<g fill="#64748b" font-size="12" text-anchor="middle">${g.meses
      .map((m, i) => `<text x="${x(i)}" y="215">${m}</text>`)
      .join("")}</g>`;
    svg.innerHTML = html;
    svg.setAttribute(
      "aria-label",
      "Demanda total em azul e limite de capacidade em laranja, de " + g.meses[0] + " a " + g.meses[g.meses.length - 1]
    );
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
      uso == null ? "Capacidade não cadastrada"
        : uso >= 100 ? "Capacidade excedida"
        : uso >= 85 ? "Algumas máquinas quase cheias"
        : "Dentro da capacidade";

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