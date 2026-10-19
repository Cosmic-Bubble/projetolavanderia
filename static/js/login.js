import { supabase } from './supabaseClient.js';

// Inicializa os ícones do Lucide
lucide.createIcons();

// Elementos do DOM
const formLogin = document.getElementById("formLogin");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const botaoSenha = document.getElementById("mostrarSenha");
const mensagem = document.getElementById("mensagem");
const linkRecuperarSenha = document.getElementById("recuperarSenha");

// Alternar visibilidade da senha
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

// Autenticação com Supabase
formLogin.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const email = campoEmail.value.trim();
    const senha = campoSenha.value;

    mensagem.textContent = "Autenticando...";
    mensagem.className = "text-center text-sm mt-4 text-purple-700 font-semibold";

    try {
        // 1. Realiza o login no Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (error) throw error;

        // 2. Busca os dados do perfil do usuário logado na tabela 'administradores'
        const userId = data.user.id;
        const { data: admin, error: adminError } = await supabase
            .from('administradores')
            .select('nome, sobrenome, status_usuario')
            .eq('auth_user_id', userId)
            .single();

        if (adminError) {
            console.warn("Usuário autenticado, mas perfil não encontrado em administradores:", adminError.message);
        }

        mensagem.textContent = `Login realizado com sucesso! Bem-vindo(a), ${admin?.nome || 'Usuário'}. Redirecionando...`;
        mensagem.className = "text-center text-sm mt-4 text-green-600 font-bold";

        // Redireciona para o painel principal após 1.5 segundos
        setTimeout(() => {
            window.location.href = "dashboard.html"; // Ajuste o nome da página principal se for diferente
        }, 1500);

    } catch (err) {
        console.error("Erro no login:", err);

        // Tratamento de mensagens amigáveis em português
        let msgErro = "E-mail ou senha incorretos.";
        if (err.message.includes("Invalid login credentials")) {
            msgErro = "E-mail ou senha incorretos.";
        } else if (err.message.includes("Email not confirmed")) {
            msgErro = "Seu e-mail ainda não foi confirmado.";
        }

        mensagem.textContent = msgErro;
        mensagem.className = "text-center text-sm mt-4 text-red-600 font-semibold";
    }
});

// Recuperação de senha
linkRecuperarSenha.addEventListener("click", async function (evento) {
    evento.preventDefault();

    const email = campoEmail.value.trim();

    if (!email) {
        mensagem.textContent = "Digite seu e-mail no campo acima antes de clicar em esqueci a senha.";
        mensagem.className = "text-center text-sm mt-4 text-orange-600 font-medium";
        campoEmail.focus();
        return;
    }

    mensagem.textContent = "Enviando e-mail de redefinição...";
    mensagem.className = "text-center text-sm mt-4 text-purple-700";

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/redefinir_senha.html`
        });

        if (error) throw error;

        mensagem.textContent = "Instruções enviadas para o seu e-mail!";
        mensagem.className = "text-center text-sm mt-4 text-green-600 font-bold";
    } catch (err) {
        console.error("Erro na redefinição:", err);
        mensagem.textContent = "Erro ao solicitar redefinição: " + err.message;
        mensagem.className = "text-center text-sm mt-4 text-red-600";
    }
});