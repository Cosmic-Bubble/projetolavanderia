document.addEventListener("DOMContentLoaded", async () => {
    try {
        const resp = await fetch("/api/capacidade");
        const dados = await resp.json();

        if (dados.erro) {
            console.error(dados.erro);
            return;
        }

        const limite = dados.limite_kg;
        const capacidadeDisponivel =
            typeof limite === "number" &&
            Number.isFinite(limite) &&
            limite > 0;

        const totais = dados.social.map((valorSocial, i) => {
    const valorComercial = dados.comercial[i];

    // Não calcula demanda total quando uma parcela é desconhecida.
    if (
        !Number.isFinite(valorSocial) ||
        !Number.isFinite(valorComercial)
    ) {
        return null;
    }

    return valorSocial + valorComercial;
        });

        const totaisValidos = totais.filter(
            valor => Number.isFinite(valor)
        );

        const maiorDemanda = Math.max(0, ...totaisValidos);

        // Define uma escala válida, mesmo quando não há demanda ou capacidade
        const tetoGrafico = Math.max(
            maiorDemanda,
            capacidadeDisponivel ? limite : 0,
            1
        ) * 1.15;

        // Exibe a linha de capacidade apenas quando existe um limite válido
        const linhaLimite = document.getElementById("linha-limite");
        const valorLimite = document.getElementById("valor-limite");

        if (capacidadeDisponivel) {
            const porcentagemLimite = (limite / tetoGrafico) * 100;

            linhaLimite.style.display = "";
            linhaLimite.style.top = `${100 - porcentagemLimite}%`;

            valorLimite.textContent = limite.toLocaleString("pt-BR");
        } else {
            linhaLimite.style.display = "none";
            valorLimite.textContent = "Indisponível";
        }

        // Desenha as barras
        const container = document.getElementById("container-barras");
        container.innerHTML = "";

        dados.meses.forEach((mes, i) => {
            const total = totais[i];
            const dadosCompletos = Number.isFinite(total);

            const alturaTotal = dadosCompletos
                ? (total / tetoGrafico) * 100
                : 0;

            const percComercial = dadosCompletos && total > 0
                ? (dados.comercial[i] / total) * 100
                : 0;

            const percSocial = dadosCompletos && total > 0
                ? (dados.social[i] / total) * 100
                : 0;

            const isEstouro =
                dadosCompletos &&
                capacidadeDisponivel &&
                total > limite;
            const corTexto = isEstouro ? "text-orange-500 font-bold" : "text-slate-500";

            container.innerHTML += `
                <div class="flex-1 flex flex-col items-center justify-end h-full relative group">
                    <!-- Container da barra -->
                    <div class="w-full max-w-[48px] relative flex flex-col justify-end" style="height: ${alturaTotal}%;">
                        <div class="w-full bg-[#22d3ee] rounded-t-sm" style="height: ${percComercial}%;"></div>
                        <div class="w-full bg-[#a3e635] rounded-b-sm" style="height: ${percSocial}%;"></div>
                    </div>
                    <!-- Texto do mês (Fica abaixo da barra no chão) -->
                    <span class="text-[11px] mt-3 ${corTexto} whitespace-nowrap">
                        ${mes}
                        ${!dadosCompletos ? ' (Sem dados)' : isEstouro ? ' (Estouro)' : ''}
                    </span>
                </div>
            `;
        });

        // Cards de consumo
        // Exibe "Indisponível" quando não há dados suficientes.

        const formatarConsumo = (valor, unidade) => {
            if (typeof valor !== "number" || !Number.isFinite(valor)) {
                return "Indisponível";
            }

            return `${valor.toLocaleString("pt-BR")} ${unidade}`;
        };

        document.getElementById("consumo-agua").textContent =
            formatarConsumo(dados.consumo.agua_litros, "Litros");

        document.getElementById("consumo-energia").textContent =
            formatarConsumo(dados.consumo.energia_kwh, "kWh");

        document.getElementById("consumo-insumo").textContent =
            formatarConsumo(dados.consumo.insumo_kg, "kg");

        // Texto de alerta
        const mesesComEstouro = capacidadeDisponivel
            ? dados.meses.filter(
                (m, i) =>
                    Number.isFinite(totais[i]) &&
                    totais[i] > limite
            )
            : [];

        const mesesSemDados = dados.meses.filter(
            (m, i) => !Number.isFinite(totais[i])
        );       
        const textoAlerta = document.getElementById("texto-alerta");
        const tituloAlerta = textoAlerta.previousElementSibling;

        if (!capacidadeDisponivel) {
            textoAlerta.textContent =
                "Não foi possível determinar a capacidade operacional. " +
                "Verifique o cadastro e os dados das máquinas antes de avaliar possíveis estouros.";

            tituloAlerta.innerHTML = `
                <i data-lucide="info" class="w-5 h-5 text-amber-500"></i>
                Capacidade não disponível
            `;
        } else if (mesesComEstouro.length > 0) {
        textoAlerta.innerHTML = `
            Nos meses de <strong>${mesesComEstouro.join(", ")}</strong>,
            a soma do volume social previsto com a franquia comercial
            contratada ultrapassa a capacidade operacional estimada
            de <strong>${limite.toLocaleString("pt-BR")} kg</strong>.

            ${mesesSemDados.length > 0
                ? `<br><br>Não foi possível avaliar a demanda total
                nos seguintes meses por ausência de dados comerciais:
                <strong>${mesesSemDados.join(", ")}</strong>.`
                : ""}
        `;

        tituloAlerta.innerHTML = `
            <i data-lucide="alert-triangle"
            class="w-5 h-5 text-red-500"></i>
            Possível estouro de capacidade
        `;} else if (mesesSemDados.length > 0) {
            textoAlerta.textContent =
                "Não foi possível avaliar todos os meses porque existem " +
                "dados de demanda incompletos. " +
                "Meses afetados: " + mesesSemDados.join(", ") + ".";

            tituloAlerta.innerHTML = `
                <i data-lucide="info" class="w-5 h-5 text-amber-500"></i>
                Avaliação de capacidade incompleta
            `;
        } else {
            textoAlerta.textContent =
                "Nenhum estouro identificado nos meses avaliados. " +
                "A demanda estimada permanece dentro do limite de " +
                limite.toLocaleString("pt-BR") + " kg.";

            tituloAlerta.innerHTML = `
                <i data-lucide="check-circle-2" class="w-5 h-5 text-green-500"></i>
                Capacidade dentro do limite
            `;
        }

        lucide.createIcons();
    } catch (err) {
        console.error("Erro ao carregar dados de capacidade:", err);
    }
});