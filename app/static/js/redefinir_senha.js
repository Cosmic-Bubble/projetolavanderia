// Inicializa os ícones do Lucide
lucide.createIcons();

// Captura os tokens do hash da URL (#access_token=...) gerados pelo Supabase
window.addEventListener('DOMContentLoaded', async () => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1)); // Remove o '#'
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken) {
            try {
                // Envia os tokens para o backend guardar na session do Flask
                await fetch('/api/guardar-sessao', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken })
                });
                
                // Limpa o hash da URL por segurança e estética
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (err) {
                console.error("Erro ao guardar sessão de recuperação:", err);
            }
        }
    }
});

const campoSenha = document.getElementById("senha");
const campoConfirmarSenha = document.getElementById("confirmarSenha");
const botaoSenha = document.getElementById("mostrarSenha");
const formCadastro = document.getElementById("formCadastro");
const mensagem = document.getElementById("mensagem");
const erroSenha = document.getElementById("erroSenha");

// Elementos do indicador de força de senha
const barra1 = document.getElementById("barra1");
const barra2 = document.getElementById("barra2");
const barra3 = document.getElementById("barra3");
const forcaSenha = document.getElementById("forcaSenha");

// Alternar visibilidade da senha
if (botaoSenha && campoSenha) {
    botaoSenha.addEventListener("click", function () {
        const estaOculta = campoSenha.type === "password";
        campoSenha.type = estaOculta ? "text" : "password";
        
        botaoSenha.innerHTML = estaOculta
            ? '<i data-lucide="eye-off" class="w-5 h-5"></i>'
            : '<i data-lucide="eye" class="w-5 h-5"></i>';
        lucide.createIcons();
    });
}

// Avaliação da força da senha em tempo real
if (campoSenha) {
    campoSenha.addEventListener("input", function () {
        const valor = campoSenha.value;
        let forca = 0;

        if (valor.length >= 8) forca++;
        if (/[A-Z]/.test(valor) && /[0-9]/.test(valor)) forca++;
        if (/[^A-Za-z0-9]/.test(valor)) forca++;

        // Resetar barras
        if (barra1 && barra2 && barra3) {
            barra1.className = "h-1.5 flex-1 bg-slate-200 rounded-full";
            barra2.className = "h-1.5 flex-1 bg-slate-200 rounded-full";
            barra3.className = "h-1.5 flex-1 bg-slate-200 rounded-full";
        }

        if (valor.length === 0) {
            forcaSenha.textContent = "Informe uma senha de pelo menos 8 caracteres.";
            forcaSenha.style.color = "var(--muted)";
        } else if (forca === 1) {
            if (barra1) barra1.className = "h-1.5 flex-1 bg-red-400 rounded-full";
            forcaSenha.textContent = "Senha fraca";
            forcaSenha.style.color = "#ef4444";
        } else if (forca === 2) {
            if (barra1) barra1.className = "h-1.5 flex-1 bg-amber-400 rounded-full";
            if (barra2) barra2.className = "h-1.5 flex-1 bg-amber-400 rounded-full";
            forcaSenha.textContent = "Senha média";
            forcaSenha.style.color = "#f59e0b";
        } else if (forca >= 3) {
            if (barra1) barra1.className = "h-1.5 flex-1 bg-green-500 rounded-full";
            if (barra2) barra2.className = "h-1.5 flex-1 bg-green-500 rounded-full";
            if (barra3) barra3.className = "h-1.5 flex-1 bg-green-500 rounded-full";
            forcaSenha.textContent = "Senha forte";
            forcaSenha.style.color = "#10b981";
        }
    });
}

// Validação em tempo real se as senhas coincidem
if (campoConfirmarSenha && campoSenha) {
    campoConfirmarSenha.addEventListener("input", function () {
        if (campoConfirmarSenha.value !== campoSenha.value) {
            erroSenha.classList.remove("hidden");
        } else {
            erroSenha.classList.add("hidden");
        }
    });
}

// Envio do formulário para o backend Flask
if (formCadastro) {
    formCadastro.addEventListener("submit", async function (evento) {
        evento.preventDefault();

        const senha = campoSenha.value;
        const confirmarSenha = campoConfirmarSenha.value;

        if (senha !== confirmarSenha) {
            erroSenha.classList.remove("hidden");
            campoConfirmarSenha.focus();
            return;
        } else {
            erroSenha.classList.add("hidden");
        }

        mensagem.textContent = "A atualizar a senha...";
        mensagem.className = "text-sm text-center mt-4 text-purple-700 font-medium";

        try {
            const response = await fetch('/redefinir_senha', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ senha: senha })
            });

            const resultado = await response.json();

            if (!response.ok) {
                throw new Error(resultado.error || "Erro ao redefinir a senha.");
            }

            mensagem.textContent = resultado.message;
            mensagem.className = "text-sm text-center mt-4 text-green-600 font-bold";

            setTimeout(() => {
                window.location.href = "/login";
            }, 2000);

        } catch (err) {
            console.error("Erro:", err);
            mensagem.textContent = "Erro: " + err.message;
            mensagem.className = "text-sm text-center mt-4 text-red-600";
        }
    });
}