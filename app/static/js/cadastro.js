lucide.createIcons();

// Carregar cargos da tabela "cargos" do banco
async function carregarCargos() {
    const selectCargo = document.getElementById("cargo_id");

    if (!selectCargo) return;

    try {
        const response = await fetch("/api/cargos");

        if (!response.ok) {
            throw new Error("Erro ao buscar cargos.");
        }

        const cargos = await response.json();

        // Limpa as opções atuais
        selectCargo.innerHTML = "";

        // Opção inicial
        const opcaoInicial = document.createElement("option");
        opcaoInicial.value = "";
        opcaoInicial.textContent = "Selecione um cargo";
        opcaoInicial.disabled = true;
        opcaoInicial.selected = true;
        selectCargo.appendChild(opcaoInicial);

        // Adiciona os cargos vindos do banco
        cargos.forEach(cargo => {
            const option = document.createElement("option");

            option.value = cargo.id;
            option.textContent = cargo.nome_cargo;

            selectCargo.appendChild(option);
        });

    } catch (erro) {
        console.error("Erro ao carregar cargos:", erro);

        selectCargo.innerHTML = `
            <option value="">Erro ao carregar cargos</option>
        `;
    }
}

// Executar quando a página carregar
document.addEventListener("DOMContentLoaded", carregarCargos);

const senha = document.getElementById("senha");
const confirmarSenha = document.getElementById("confirmarSenha");
const botaoMostrar = document.getElementById("mostrarSenha");
const mensagem = document.getElementById("mensagem");
const formCadastro = document.getElementById("formCadastro");
const erroSenha = document.getElementById("erroSenha");

const foto = document.getElementById("foto");
const previewFoto = document.getElementById("previewFoto");
const placeholderFoto = document.getElementById("placeholderFoto");
const removerFoto = document.getElementById("removerFoto");
const nomeArq = document.getElementById("nomeArquivo");

let urlPreview = null;

// Mostrar ou ocultar senha
if (botaoMostrar && senha) {
    botaoMostrar.addEventListener("click", function () {
        const mostrar = senha.type === "password";
        senha.type = mostrar ? "text" : "password";
        botaoMostrar.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
        botaoMostrar.setAttribute("aria-pressed", String(mostrar));
        botaoMostrar.innerHTML = mostrar
            ? '<i data-lucide="eye-off" class="w-5 h-5"></i>'
            : '<i data-lucide="eye" class="w-5 h-5"></i>';
        lucide.createIcons();
    });
}

// Indicador visual de força da senha
if (senha) {
    senha.addEventListener("input", function () {
        const valor = senha.value;
        const regras = [
            valor.length >= 8,
            /[A-Z]/.test(valor) && /[a-z]/.test(valor),
            /[0-9]/.test(valor) && /[^A-Za-z0-9]/.test(valor)
        ];
        const pontuacao = regras.filter(Boolean).length;
        const barras = [
            document.getElementById("barra1"),
            document.getElementById("barra2"),
            document.getElementById("barra3")
        ];

        barras.forEach((barra, indice) => {
            if (barra) {
                barra.className = "h-1.5 flex-1 rounded-full transition-colors duration-200 " +
                    (valor && indice < pontuacao
                        ? (pontuacao === 3 ? "bg-green-500" : "bg-amber-400")
                        : "bg-slate-200");
            }
        });

        const forcaEl = document.getElementById("forcaSenha");
        if (forcaEl) {
            forcaEl.textContent =
                !valor ? "Informe uma senha de pelo menos 8 caracteres."
                : pontuacao === 3 ? "Indicador: senha forte"
                : pontuacao === 2 ? "Indicador: senha intermediária"
                : "Indicador: senha fraca";
        }
    });
}

// Validação em tempo real se as senhas coincidem
function verificarSenhas() {
    if (!confirmarSenha || !senha) return;
    const diferentes = confirmarSenha.value !== "" && senha.value !== confirmarSenha.value;
    if (erroSenha) erroSenha.classList.toggle("hidden", !diferentes);
}

if (senha) senha.addEventListener("input", verificarSenhas);
if (confirmarSenha) confirmarSenha.addEventListener("input", verificarSenhas);

// preview da foto de perfil
// Conferir foto selecionada e exibir preview
if (foto) {
    foto.addEventListener("change", function () {

        const arquivo = foto.files[0];

        if (!arquivo) return;

        const tipos = ["image/png", "image/jpeg"];

        // Validar formato e tamanho
        if (!tipos.includes(arquivo.type) || arquivo.size > 2 * 1024 * 1024) {

            alert("Selecione uma imagem PNG ou JPG de até 2 MB.");

            limparPreviewFoto();
            return;
        }

        // Liberar URL da imagem anterior, se existir
        if (urlPreview) {
            URL.revokeObjectURL(urlPreview);
        }

        // Criar URL temporária para a imagem
        urlPreview = URL.createObjectURL(arquivo);

        // Exibir a foto no lugar do ícone da câmera
        previewFoto.src = urlPreview;
        previewFoto.classList.remove("hidden");
        placeholderFoto.classList.add("hidden");

        // Exibir botão de remoção
        removerFoto.classList.remove("hidden");

        // Exibir nome do arquivo
        if (nomeArq) {
            nomeArq.textContent = arquivo.name;
        }
    });
}

// Limpar preview e restaurar estado inicial
function limparPreviewFoto() {

    foto.value = "";

    if (urlPreview) {
        URL.revokeObjectURL(urlPreview);
        urlPreview = null;
    }

    previewFoto.src = "";
    previewFoto.classList.add("hidden");

    placeholderFoto.classList.remove("hidden");
    removerFoto.classList.add("hidden");

    if (nomeArq) {
        nomeArq.textContent = "";
    }
}

// Remover foto selecionada
if (removerFoto) {
    removerFoto.addEventListener("click", function () {
        limparPreviewFoto();
    });
}

// Envio do formulário via Fetch para o Flask
if (formCadastro) {
    formCadastro.addEventListener("submit", async function (evento) {
        evento.preventDefault();

        if (senha.value !== confirmarSenha.value) {
            if (mensagem) {
                mensagem.textContent = "As senhas não coincidem.";
                mensagem.className = "text-sm text-center mt-4 text-red-600 font-medium";
            }
            return;
        }

        if (mensagem) {
            mensagem.textContent = "Processando cadastro...";
            mensagem.className = "text-sm text-center mt-4 text-purple-700 font-medium";
        }

        // Usa FormData para enviar texto e ficheiros binários (como a foto) de uma só vez
        const formData = new FormData(formCadastro);

        try {
            const response = await fetch('/cadastro', {
                method: 'POST',
                body: formData
            });

            const resultado = await response.json();

            if (!response.ok) {
                throw new Error(resultado.error || "Erro ao realizar o cadastro.");
            }

            if (mensagem) {
                mensagem.textContent = resultado.message;
                mensagem.className = "text-sm text-center mt-4 text-green-600 font-bold";
            }

            formCadastro.reset();
            limparPreviewFoto();

            setTimeout(() => {
                window.location.href = "/login";
            }, 3000);

        } catch (err) {
            console.error("Erro:", err);
            if (mensagem) {
                mensagem.textContent = "Erro: " + err.message;
                mensagem.className = "text-sm text-center mt-4 text-red-600";
            }
        }
    });
}