import { supabase } from './supabaseClient.js';

lucide.createIcons();

const senha = document.getElementById("senha");
const confirmarSenha = document.getElementById("confirmarSenha");
const botaoMostrar = document.getElementById("mostrarSenha");
const mensagem = document.getElementById("mensagem");
const foto = document.getElementById("foto");
const formCadastro = document.getElementById("formCadastro");
const selectCargo = document.getElementById("cargo"); // Corrigido para bater com o id="cargo" do HTML

// ============================================================================
// CARREGAR CARGOS DINAMICAMENTE DO BANCO DE DADOS
// ============================================================================
async function carregarCargos() {
    try {
        const { data: cargos, error } = await supabase
            .from('cargos')
            .select('id, nome_cargo')
            .eq('status_cargo', true) // Filtra apenas cargos ativos
            .order('nome_cargo', { ascending: true });

        if (error) throw error;

        // Limpa as opções estáticas do HTML e insere a opção padrão
        selectCargo.innerHTML = '<option value="">Selecione um cargo</option>';

        // Adiciona cada cargo vindo da tabela 'cargos'
        cargos.forEach(cargo => {
            const option = document.createElement('option');
            option.value = cargo.id;
            option.textContent = cargo.nome_cargo;
            selectCargo.appendChild(option);
        });

    } catch (erro) {
        console.error("Erro ao carregar cargos do Supabase:", erro.message);
        selectCargo.innerHTML = '<option value="">Erro ao carregar cargos</option>';
    }
}

// Carrega a lista de cargos assim que a página é aberta
document.addEventListener("DOMContentLoaded", carregarCargos);

// ============================================================================
// COMPORTAMENTO DA INTERFACE E VALIDAÇÕES
// ============================================================================

// Mostrar ou ocultar senha
botaoMostrar.addEventListener("click", function () {
    const mostrar = senha.type === "password";
    senha.type = mostrar ? "text" : "password";
    botaoMostrar.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
    botaoMostrar.setAttribute("aria-pressed", String(mostrar));
    botaoMostrar.innerHTML = mostrar
        ? '<i data-lucide="eye-off"></i>'
        : '<i data-lucide="eye"></i>';
    lucide.createIcons();
});

// Indicador visual simples de força da senha
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
        barra.className = "h-1 flex-1 rounded " +
            (valor && indice < pontuacao
                ? (pontuacao === 3 ? "bg-green-500" : "bg-amber-400")
                : "bg-slate-200");
    });

    document.getElementById("forcaSenha").textContent =
        !valor ? "Informe uma senha de pelo menos 8 caracteres."
        : pontuacao === 3 ? "Indicador: senha forte"
        : pontuacao === 2 ? "Indicador: senha intermediária"
        : "Indicador: senha fraca";
});

// Validação em tempo real das senhas
const erroSenha = document.getElementById("erroSenha");

function verificarSenhas() {
    const diferentes =
        confirmarSenha.value !== "" &&
        senha.value !== confirmarSenha.value;

    erroSenha.classList.toggle("hidden", !diferentes);
    confirmarSenha.setCustomValidity(
        diferentes ? "As senhas não coincidem." : ""
    );
}

senha.addEventListener("input", verificarSenhas);
confirmarSenha.addEventListener("input", verificarSenhas);

// Conferir foto selecionada
foto.addEventListener("change", function () {
    const arquivo = foto.files[0];
    if (!arquivo) return;

    const tipos = ["image/png", "image/jpeg"];
    if (!tipos.includes(arquivo.type) || arquivo.size > 2 * 1024 * 1024) {
        alert("Selecione uma imagem PNG ou JPG de até 2 MB.");
        foto.value = "";
        document.getElementById("nomeArquivo").textContent = "";
        return;
    }
    document.getElementById("nomeArquivo").textContent = arquivo.name;
});

// ============================================================================
// CADASTRO NO SUPABASE
// ============================================================================
formCadastro.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (senha.value !== confirmarSenha.value) {
        mensagem.textContent = "As senhas não coincidem.";
        mensagem.className = "text-sm text-center mt-4 text-red-600";
        return;
    }

    const cargoId = selectCargo.value;
    if (!cargoId) {
        mensagem.textContent = "Por favor, selecione um cargo válido.";
        mensagem.className = "text-sm text-center mt-4 text-red-600";
        return;
    }

    mensagem.textContent = "Processando cadastro...";
    mensagem.className = "text-sm text-center mt-4 text-blue-700";

    const nome = document.getElementById("nome").value;
    const sobrenome = document.getElementById("sobrenome").value;
    const email = document.getElementById("email").value;
    const arquivoFoto = foto.files[0];

    try {
        // 1. Criar o usuário no Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: senha.value,
        });

        if (authError) throw authError;

        const userId = authData.user?.id;
        let fotoUrl = null;

        // 2. Fazer upload da foto para o bucket 'foto_perfil' no Supabase Storage (se informada)
        if (arquivoFoto && userId) {
            const extensao = arquivoFoto.name.split('.').pop();
            const caminhoArquivo = `perfis/${userId}_${Date.now()}.${extensao}`;

            const { error: uploadError } = await supabase.storage
                .from('fotos_perfil')
                .upload(caminhoArquivo, arquivoFoto);

            if (!uploadError) {
                const { data: publicUrlData } = supabase.storage
                    .from('fotos_perfil')
                    .getPublicUrl(caminhoArquivo);
                fotoUrl = publicUrlData.publicUrl;
            } else {
                console.warn("Aviso ao enviar imagem:", uploadError.message);
            }
        }

        // 3. Salvar os dados do perfil na tabela 'administradores'
        const { error: dbError } = await supabase
            .from('administradores')
            .insert([
                {
                    auth_user_id: userId,
                    nome: nome,
                    sobrenome: sobrenome,
                    email: email,
                    cargo_id: cargoId,
                    foto_perfil_url: fotoUrl,
                    status_usuario: 'pendente'
                }
            ]);

        if (dbError) throw dbError;

        mensagem.textContent = "Cadastro realizado com sucesso! Verifique seu e-mail para confirmação.";
        mensagem.className = "text-sm text-center mt-4 text-green-600";
        
        formCadastro.reset();
        document.getElementById("nomeArquivo").textContent = "";
        carregarCargos();

    } catch (erro) {
        console.error("Erro durante o cadastro:", erro.message);
        mensagem.textContent = "Erro ao realizar cadastro: " + erro.message;
        mensagem.className = "text-sm text-center mt-4 text-red-600";
    }
});