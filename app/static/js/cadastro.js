lucide.createIcons();

const senha = document.getElementById("senha");
const confirmarSenha = document.getElementById("confirmarSenha");
const botaoMostrar = document.getElementById("mostrarSenha");
const mensagem = document.getElementById("mensagem");
const foto = document.getElementById("foto");
const formCadastro = document.getElementById("formCadastro");
const erroSenha = document.getElementById("erroSenha");

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

// Conferir foto selecionada
if (foto) {
    foto.addEventListener("change", function () {
        const arquivo = foto.files[0];
        if (!arquivo) return;

        const tipos = ["image/png", "image/jpeg"];
        if (!tipos.includes(arquivo.type) || arquivo.size > 2 * 1024 * 1024) {
            alert("Selecione uma imagem PNG ou JPG de até 2 MB.");
            foto.value = "";
            const nomeArq = document.getElementById("nomeArquivo");
            if (nomeArq) nomeArq.textContent = "";
            return;
        }
        const nomeArq = document.getElementById("nomeArquivo");
        if (nomeArq) nomeArq.textContent = arquivo.name;
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
            const nomeArq = document.getElementById("nomeArquivo");
            if (nomeArq) nomeArq.textContent = "";

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