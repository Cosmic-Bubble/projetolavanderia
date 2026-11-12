const lucide = window.lucide || {};
const { createIcons, icons } = lucide;

if (!window.lucide || !window.lucide.createIcons) {
    console.warn("[importacao] Lucide não carregou; os ícones não serão renderizados.");
}

function renderIcons() {
    if (typeof createIcons === "function") {
        try {
            createIcons({ icons });
        } catch (e) {
            console.warn("[importacao] erro ao renderizar ícones:", e);
        }
    }
}


function iniciarImportacao() {
    const dropZone            = document.getElementById("drop-zone");
    const inputArquivo        = document.getElementById("arquivo-excel");
    const arquivoSelecionado  = document.getElementById("arquivo-selecionado");
    const acaoImportar        = document.getElementById("acao-importar");
    const btnImportar         = document.getElementById("btn-importar");
    const btnCancelar         = document.getElementById("btn-cancelar");
    const resultadoImportacao = document.getElementById("resultado-importacao");
    const listaHistorico      = document.getElementById("lista-historico");

    console.log("[importacao] DOM pronto. dropzone:", !!dropZone, "| input:", !!inputArquivo);

    if (!dropZone || !inputArquivo) {
        console.error("[importacao] elementos essenciais não encontrados. Abortando.");
        return;
    }

    let arquivoAtual = null;

    function mostrarEstadoArquivo(tipo, mensagem) {
        arquivoSelecionado.classList.remove("hidden");
        arquivoSelecionado.className = `mt-4 p-3 rounded-lg text-sm ${
            tipo === "sucesso" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`;
        arquivoSelecionado.innerHTML = mensagem;
    }

    function limparSelecao() {
        acaoImportar.classList.add("hidden");
        arquivoSelecionado.classList.add("hidden");
        arquivoSelecionado.innerHTML = "";
        inputArquivo.value = "";
        arquivoAtual = null;
    }

    function limparResultado() {
        resultadoImportacao.classList.add("hidden");
        resultadoImportacao.innerHTML = "";
    }

    function prepararArquivo(arquivo) {
        if (!arquivo) return;

        if (!arquivo.name.toLowerCase().endsWith(".xlsx")) {
            arquivoAtual = null;
            mostrarEstadoArquivo("erro", "Formato inválido. Selecione um arquivo .xlsx.");
            acaoImportar.classList.add("hidden");
            return;
        }

        const tamanhoKb = (arquivo.size / 1024).toFixed(1);
        arquivoAtual = arquivo;

        mostrarEstadoArquivo(
            "sucesso",
            `<span class="font-semibold">Arquivo selecionado:</span> ${arquivo.name} (${tamanhoKb} KB)`
        );
        acaoImportar.classList.remove("hidden");
        renderIcons();
    }

    function calcularTempo(dataImportacao) {
        if (!dataImportacao) return "Hoje";

        const data = new Date(dataImportacao);
        if (Number.isNaN(data.getTime())) return "Hoje";

        const diferencaDias = Math.floor((Date.now() - data.getTime()) / 86400000);
        if (diferencaDias <= 0) return "Hoje";
        if (diferencaDias === 1) return "Ontem";
        return `Há ${diferencaDias} dias`;
    }

    async function carregarHistorico() {
        try {
            const resposta = await fetch("/api/historico-importacoes");
            const dados = await resposta.json();

            if (!Array.isArray(dados) || dados.length === 0) {
                listaHistorico.innerHTML =
                    '<p class="text-sm text-gray-400 text-center py-6">Nenhuma importação registrada ainda.</p>';
                renderIcons();
                return;
            }

            listaHistorico.innerHTML = dados
                .map((item) => {
                    const status = item.status === "Processado" ? "Processado" : "Substituído";
                    const badgeClass = status === "Processado" ? "text-cyan-500" : "text-orange-500";

                    return `
                        <div class="border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3">
                            <div class="flex items-center gap-3 min-w-0">
                                <i data-lucide="file-text" class="w-5 h-5 text-[#586864] shrink-0"></i>
                                <div class="min-w-0">
                                    <p class="text-sm font-semibold break-all">${item.nome_arquivo || "Arquivo importado"}</p>
                                    <p class="text-xs text-gray-400">${calcularTempo(item.data_importacao)}</p>
                                </div>
                            </div>
                            <span class="self-start sm:self-auto bg-gray-100 ${badgeClass} text-xs px-3 py-1 rounded-md shrink-0">${status}</span>
                        </div>
                    `;
                })
                .join("");

            renderIcons();
        } catch (erro) {
            listaHistorico.innerHTML =
                '<p class="text-sm text-red-500 text-center py-6">Não foi possível carregar o histórico.</p>';
            renderIcons();
        }
    }

    // ----- 2.4 Upload -----
    async function importarArquivo() {
        if (!arquivoAtual) return;

        btnImportar.disabled = true;
        btnImportar.innerHTML =
            '<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Enviando...';
        limparResultado();

        const formData = new FormData();
        formData.append("arquivo_excel", arquivoAtual);

        try {
            const resposta = await fetch("/api/importar-planilha", {
                method: "POST",
                body: formData,
            });

            const dados = await resposta.json().catch(() => ({}));

            if (resposta.ok && dados.sucesso) {
                resultadoImportacao.className = "mt-4 p-3 rounded-lg text-sm bg-green-50 text-green-700";
                resultadoImportacao.innerHTML = `
                    <strong>${dados.tipo_detectado}</strong><br>
                    ${dados.registros_processados} registro(s) processado(s)
                `;
                resultadoImportacao.classList.remove("hidden");
                limparSelecao();
                await carregarHistorico();
                return;
            }

            const mensagens = Array.isArray(dados.erros) && dados.erros.length
                ? dados.erros
                : [dados.mensagem || "Erro ao importar a planilha."];

            resultadoImportacao.className = "mt-4 p-3 rounded-lg text-sm bg-red-50 text-red-700";
            resultadoImportacao.innerHTML = `
                <strong>Erro na importação:</strong>
                <ul class="list-disc pl-5 mt-2">
                    ${mensagens.map((m) => `<li>${m}</li>`).join("")}
                </ul>
            `;
            resultadoImportacao.classList.remove("hidden");
        } catch (erro) {
            resultadoImportacao.className = "mt-4 p-3 rounded-lg text-sm bg-red-50 text-red-700";
            resultadoImportacao.innerHTML = `Erro de rede: ${erro.message || "Não foi possível concluir a importação."}`;
            resultadoImportacao.classList.remove("hidden");
        } finally {
            btnImportar.disabled = false;
            btnImportar.innerHTML = '<i data-lucide="upload" class="w-4 h-4"></i> Confirmar Importação';
            renderIcons();
        }
    }


    if (!document.documentElement.dataset.importacaoDelegado) {
        document.documentElement.dataset.importacaoDelegado = "1";

        // --- Clique no dropzone ---
        document.addEventListener("click", (evento) => {
            const dropzone = evento.target.closest("#drop-zone");
            if (!dropzone) return;

            // Ignora cliques originados no próprio input (evita loop)
            if (evento.target === inputArquivo) return;

            console.log("[importacao] clique no dropzone — abrindo seletor");
            evento.preventDefault();
            inputArquivo.click();
        });

        // --- Teclado (acessibilidade) ---
        document.addEventListener("keydown", (evento) => {
            const dropzone = evento.target.closest("#drop-zone");
            if (!dropzone) return;
            if (evento.key !== "Enter" && evento.key !== " ") return;

            evento.preventDefault();
            inputArquivo.click();
        });

        // --- Drag & drop ---
        document.addEventListener("dragover", (evento) => {
            const dropzone = evento.target.closest("#drop-zone");
            if (!dropzone) return;
            evento.preventDefault();
            dropzone.classList.add("bg-purple-100");
        });

        document.addEventListener("dragleave", (evento) => {
            const dropzone = evento.target.closest("#drop-zone");
            if (!dropzone) return;
            if (!dropzone.contains(evento.relatedTarget)) {
                dropzone.classList.remove("bg-purple-100");
            }
        });

        document.addEventListener("drop", (evento) => {
            const dropzone = evento.target.closest("#drop-zone");
            if (!dropzone) return;
            evento.preventDefault();
            dropzone.classList.remove("bg-purple-100");

            const arquivo = evento.dataTransfer?.files?.[0];
            if (arquivo) prepararArquivo(arquivo);
        });
    }

    // ----- 2.5 Listeners que NÃO dependem de delegação -----
    inputArquivo.addEventListener("change", (evento) => {
        const arquivo = evento.target.files[0];
        if (arquivo) prepararArquivo(arquivo);
    });

    if (btnCancelar) {
        btnCancelar.addEventListener("click", () => {
            limparResultado();
            limparSelecao();
            renderIcons();
        });
    }

    if (btnImportar) {
        btnImportar.addEventListener("click", importarArquivo);
    }

    // ----- 2.6 Boot -----
    renderIcons();
    window.__importacaoCarregada = true;
    console.log("[importacao] módulo carregado com sucesso");
    carregarHistorico();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarImportacao);
} else {
    // Se o script for carregado depois do DOMContentLoaded (ex: type=module),
    // executa imediatamente.
    iniciarImportacao();
}