document.addEventListener("DOMContentLoaded", async () => {
    try {
        const resp = await fetch("/api/capacidade");
        const dados = await resp.json();

        if (dados.erro) {
            console.error(dados.erro);
            return;
        }

        const limite = dados.limite_kg;
        const totais = dados.social.map((v, i) => v + dados.comercial[i]);
        const maiorDemanda = Math.max(...totais);

        // O teto do gráfico será o maior valor entre a demanda e o limite + 15% de margem
        const tetoGrafico = Math.max(maiorDemanda, limite) * 1.15;
        
        // Posiciona a linha de limite baseada no teto
        const porcentagemLimite = (limite / tetoGrafico) * 100;
        document.getElementById("linha-limite").style.top = `${100 - porcentagemLimite}%`;
        document.getElementById("valor-limite").textContent = limite.toLocaleString("pt-BR");

        // Desenha as barras
        const container = document.getElementById("container-barras");
        container.innerHTML = "";

        dados.meses.forEach((mes, i) => {
            const total = totais[i];
            const alturaTotal = (total / tetoGrafico) * 100;
            
            const percComercial = (dados.comercial[i] / total) * 100;
            const percSocial = (dados.social[i] / total) * 100;

            const isEstouro = total > limite;
            const corTexto = isEstouro ? "text-orange-500 font-bold" : "text-slate-500";

            container.innerHTML += `
                <div class="flex-1 flex flex-col items-center justify-end h-full relative group">
                    <!-- Container da barra -->
                    <div class="w-full max-w-[48px] relative flex flex-col justify-end" style="height: ${alturaTotal}%;">
                        <div class="w-full bg-[#22d3ee] rounded-t-sm" style="height: ${percComercial}%;"></div>
                        <div class="w-full bg-[#a3e635] rounded-b-sm" style="height: ${percSocial}%;"></div>
                    </div>
                    <!-- Texto do mês (Fica abaixo da barra no chão) -->
                    <span class="text-[11px] mt-3 ${corTexto} whitespace-nowrap">${mes}${isEstouro ? ' (Estouro)' : ''}</span>
                </div>
            `;
        });

        // Cards de consumo
        document.getElementById("consumo-agua").textContent = `${dados.consumo.agua_litros.toLocaleString("pt-BR")} Litros`;
        document.getElementById("consumo-energia").textContent = `${dados.consumo.energia_kwh.toLocaleString("pt-BR")} kWh`;
        document.getElementById("consumo-insumo").textContent = `${dados.consumo.insumo_kg.toLocaleString("pt-BR")} kg`;

        // Texto de alerta
        const mesesComEstouro = dados.meses.filter((m, i) => totais[i] > limite);
        const textoAlerta = document.getElementById("texto-alerta");
        const tituloAlerta = textoAlerta.previousElementSibling;

        if (mesesComEstouro.length > 0) {
            textoAlerta.innerHTML = `
                Durante os meses de <strong>${mesesComEstouro.join(', ')}</strong> a demanda prevista 
                (Comercial + Social) ultrapassou a capacidade máxima das máquinas (${limite.toLocaleString("pt-BR")} kg). 
                É importante ter isso em mente para as próximas decisões.
            `;
            tituloAlerta.innerHTML = `<i data-lucide="alert-triangle" class="w-5 h-5 text-red-500"></i> Perceba o estouro de capacidade`;
        } else {
            textoAlerta.innerHTML = `
                Nenhum estouro de capacidade previsto para os próximos meses. A demanda total está dentro do limite de ${limite.toLocaleString("pt-BR")} kg.
            `;
            tituloAlerta.innerHTML = `<i data-lucide="check-circle-2" class="w-5 h-5 text-green-500"></i> Capacidade Saudável`;
        }

        lucide.createIcons();
    } catch (err) {
        console.error("Erro ao carregar dados de capacidade:", err);
    }
});