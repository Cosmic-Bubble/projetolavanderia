lucide.createIcons();


    const dropZone = document.getElementById("drop-zone");
    const inputArquivo = document.getElementById("arquivo-excel");
    const arquivoSelecionado = document.getElementById("arquivo-selecionado");

    // Selecionar arquivo clicando na área
    dropZone.addEventListener("click", () => {
        inputArquivo.click();
    });

    // Selecionar arquivo pelo teclado
    dropZone.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            inputArquivo.click();
        }
    });

    // Arquivo escolhido no computador
    inputArquivo.addEventListener("change", () => {
        if (inputArquivo.files.length > 0) {
            mostrarArquivo(inputArquivo.files[0]);
        }
    });

    // Arrastar arquivo
    dropZone.addEventListener("dragover", (evento) => {
        evento.preventDefault();
        dropZone.classList.add("bg-purple-100");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("bg-purple-100");
    });

    // Soltar arquivo
    dropZone.addEventListener("drop", (evento) => {
        evento.preventDefault();
        dropZone.classList.remove("bg-purple-100");

        const arquivo = evento.dataTransfer.files[0];

        if (arquivo) {
            mostrarArquivo(arquivo);
        }
    });

    // Verificar extensão e mostrar nome
    function mostrarArquivo(arquivo) {

        arquivoSelecionado.classList.remove("hidden");

        if (!arquivo.name.toLowerCase().endsWith(".xlsx")) {
            arquivoSelecionado.className =
                "mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm";

            arquivoSelecionado.textContent =
                "Formato inválido. Selecione um arquivo .xlsx.";
            return;
        }

        arquivoSelecionado.className =
            "mt-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm";

        arquivoSelecionado.textContent =
            "Arquivo selecionado: " + arquivo.name;
    }
