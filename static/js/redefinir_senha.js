import { supabase } from './supabaseClient.js';

// Inicializa os ícones do Lucide
lucide.createIcons();

// Elementos do DOM
const formRedefinir = document.getElementById("formRedefinirSenha");
const campoNovaSenha = document.getElementById("novaSenha");
const campoConfirmarSenha = document.getElementById("confirmarSenha");
const botaoMostrarSenha = document.getElementById("mostrarNovaSenha");
const mensagem = document.getElementById("mensagem");

// Elementos da barra de força e erro
const barra1 = document.getElementById("barra1");
const barra2 = document.getElementById("barra2");
const barra3 = document.getElementById("barra3");
const textoForca = document.getElementById("forcaSenha");
const erroSenha = document.getElementById("erroSenha");

// Alternar visualização da senha
botaoMostrarSenha.addEventListener("click", function () {
    const oculta = campoNovaSenha.type === "password";
    campoNovaSenha.type = oculta ? "text" : "password";
    campoConfirmarSenha.type = oculta ? "text" : "password";

    botaoMostrarSenha.setAttribute("aria-label", oculta ? "Ocultar senha" : "Mostrar senha");
    botaoMostrarSenha.setAttribute("aria-pressed", String(oculta));

    botaoMostrarSenha.innerHTML = oculta
        ? '<i data-lucide="eye-off" class="w-5 h-5"></i>'
        : '<i data-lucide="eye" class="w-5 h-5"></i>';

    lucide.createIcons();
});

// 1. Função de Cálculo da Força da Senha
function avaliarForcaSenha(senha) {
    let pontos = 0;

    if (senha.length >= 8) pontos++;
    if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) pontos++;
    if (/[0-9]/.test(senha) || /[^A-Za-z0-9]/.test(senha)) pontos++;

    return pontos; // Retorna 0, 1, 2 ou 3
}

// 2. Evento em tempo real para a barra de força da senha
campoNovaSenha.addEventListener("input", function () {
    const senha = campoNovaSenha.value;
    const pontos = avaliarForcaSenha(senha);

    // Reseta as cores das barras
    barra1.className = "h-1 flex-1 rounded bg-slate-200 transition-colors";
    barra2.className = "h-1 flex-1 rounded bg-slate-200 transition-colors";
    barra3.className = "h-1 flex-1 rounded bg-slate-200 transition-colors";

    if (senha.length === 0) {
        textoForca.textContent = "Informe uma senha de pelo menos 8 caracteres com letras maiúsculas, minúsculas e números.";
        textoForca.className = "text-xs text-slate-500 mt-2";
        return;
    }

    if (pontos === 1) {
        barra1.classList.add("bg-red-500");
        textoForca.textContent = "Senha fraca (use pelo menos 8 caracteres com letras e números).";
        textoForca.className = "text-xs text-red-500 font-medium mt-2";
    } else if (pontos === 2) {
        barra1.classList.add("bg-amber-500");
        barra2.classList.add("bg-amber-500");
        textoForca.textContent = "Senha média (adicione letras maiúsculas e números).";
        textoForca.className = "text-xs text-amber-600 font-medium mt-2";
    } else if (pontos === 3) {
        barra1.classList.add("bg-green-500");
        barra2.classList.add("bg-green-500");
        barra3.classList.add("bg-green-500");
        textoForca.textContent = "Senha forte!";
        textoForca.className = "text-xs text-green-600 font-bold mt-2";
    }

    validarCoincidencia();
});

// 3. Validação em tempo real de coincidência de senhas
function validarCoincidencia() {
    const novaSenha = campoNovaSenha.value;
    const confirmarSenha = campoConfirmarSenha.value;

    if (confirmarSenha.length > 0 && novaSenha !== confirmarSenha) {
        erroSenha.classList.remove("hidden");
    } else {
        erroSenha.classList.add("hidden");
    }
}

campoConfirmarSenha.addEventListener("input", validarCoincidencia);

// 4. Submissão do Formulário
formRedefinir.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const novaSenha = campoNovaSenha.value;
    const confirmarSenha = campoConfirmarSenha.value;

    // Validação final de coincidência
    if (novaSenha !== confirmarSenha) {
        erroSenha.classList.remove("hidden");
        campoConfirmarSenha.focus();
        return;
    }

    // Validação final de força
    if (avaliarForcaSenha(novaSenha) < 2 || novaSenha.length < 8) {
        mensagem.textContent = "A senha é muito fraca. Certifique-se de usar pelo menos 8 caracteres com maiúsculas, minúsculas e números.";
        mensagem.className = "text-center text-sm mt-4 text-orange-600 font-semibold";
        campoNovaSenha.focus();
        return;
    }

    mensagem.textContent = "Atualizando sua senha...";
    mensagem.className = "text-center text-sm mt-4 text-purple-700 font-semibold";

    try {
        const { error } = await supabase.auth.updateUser({
            password: novaSenha
        });

        if (error) throw error;

        mensagem.textContent = "Senha alterada com sucesso! Redirecionando para o login...";
        mensagem.className = "text-center text-sm mt-4 text-green-600 font-bold";

        formRedefinir.reset();
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);

    } catch (err) {
        console.error("Erro ao redefinir senha:", err);

        let msgErro = "Erro ao atualizar a senha: " + err.message;
        if (err.message.includes("Same password")) {
            msgErro = "A nova senha precisa ser diferente da senha anterior.";
        } else if (err.message.includes("Auth session missing")) {
            msgErro = "Sessão expirada. Solicite um novo link de redefinição no e-mail.";
        }

        mensagem.textContent = msgErro;
        mensagem.className = "text-center text-sm mt-4 text-red-600 font-semibold";
    }
});