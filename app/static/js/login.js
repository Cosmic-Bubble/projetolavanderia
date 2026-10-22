// Inicializa os ícones do Lucide
lucide.createIcons();

// Elementos do DOM
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const botaoSenha = document.getElementById("mostrarSenha");
const mensagem = document.getElementById("mensagem");
const linkRecuperarSenha = document.getElementById("recuperarSenha");

// Alternar visibilidade da senha
if (botaoSenha && campoSenha) {
    botaoSenha.addEventListener("click", function () {
        const estaOculta = campoSenha.type === "password";
        campoSenha.type = estaOculta ? "text" : "password";

        botaoSenha.setAttribute("aria-label", estaOculta ? "Ocultar senha" : "Mostrar senha");
        botaoSenha.setAttribute("aria-pressed", String(estaOculta));

        botaoSenha.innerHTML = estaOculta
            ? '<i data-lucide="eye-off" class="w-5 h-5"></i>'
            : '<i data-lucide="eye" class="w-5 h-5"></i>';

        lucide.createIcons();
    });
}

// Recuperação de senha comunicando com o Backend Flask
if (linkRecuperarSenha) {
    linkRecuperarSenha.addEventListener("click", async function (evento) {
        evento.preventDefault();

        const email = campoEmail.value.trim();

        if (!email) {
            mensagem.textContent = "Digite o seu e-mail no campo acima antes de clicar em recuperar senha.";
            mensagem.className = "text-center text-sm mt-4 text-orange-600 font-medium";
            campoEmail.focus();
            return;
        }

        mensagem.textContent = "A enviar e-mail de redefinição...";
        mensagem.className = "text-center text-sm mt-4 text-purple-700";

        try {
            const response = await fetch('/api/esqueci-senha', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email })
            });

            const resultado = await response.json();

            if (!response.ok) {
                throw new Error(resultado.error || "Erro ao solicitar redefinição.");
            }

            mensagem.textContent = resultado.message;
            mensagem.className = "text-center text-sm mt-4 text-green-600 font-bold";
        } catch (err) {
            console.error("Erro na redefinição:", err);
            mensagem.textContent = "Erro ao solicitar redefinição: " + err.message;
            mensagem.className = "text-center text-sm mt-4 text-red-600";
        }
    });
}