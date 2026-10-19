// Módulo Comercial: interações demonstrativas, sem conexão com Flask.
lucide.createIcons();


// Os valores abaixo são fictícios e servem apenas para demonstrar a troca de período.
const periodos = {
  semestre: {
    meses: ['Mar', 'Abr', 'Mai', 'Jun (Prev)', 'Jul (Prev)', 'Ago (Prev)'],
    alturas: [153, 146, 143, 130, 109, 91]
  },
  ano: {
    meses: ['Mar', 'Mai', 'Jul (Prev)', 'Set (Prev)', 'Nov (Prev)', 'Jan (Prev)'],
    alturas: [153, 143, 109, 124, 98, 82]
  }
};
const posicoes = [20, 164, 308, 452, 596, 720];
const ns = 'http://www.w3.org/2000/svg';
const linha = document.getElementById('linha-faturamento');
const pontos = document.getElementById('pontos-faturamento');
const rotulos = document.getElementById('rotulos-meses');

function desenharGrafico(periodo) {
  const dados = periodos[periodo];
  linha.setAttribute('d', dados.alturas.map((y, i) => `${i === 0 ? 'M' : 'L'} ${posicoes[i]} ${y}`).join(' '));
  pontos.replaceChildren();
  rotulos.replaceChildren();
  dados.alturas.forEach((y, i) => {
    const circulo = document.createElementNS(ns, 'circle');
    circulo.setAttribute('cx', String(posicoes[i]));
    circulo.setAttribute('cy', String(y));
    circulo.setAttribute('r', '4');
    pontos.appendChild(circulo);
    const texto = document.createElementNS(ns, 'text');
    texto.setAttribute('x', String(posicoes[i]));
    texto.setAttribute('y', '196');
    texto.setAttribute('text-anchor', 'middle');
    texto.textContent = dados.meses[i];
    rotulos.appendChild(texto);
  });
}

document.querySelectorAll('[data-periodo]').forEach((botao) => {
  botao.addEventListener('click', () => {
    document.querySelectorAll('[data-periodo]').forEach((item) => {
      const ativo = item === botao;
      item.classList.toggle('periodo-ativo', ativo);
      item.setAttribute('aria-pressed', String(ativo));
    });
    desenharGrafico(botao.dataset.periodo);
  });
});
