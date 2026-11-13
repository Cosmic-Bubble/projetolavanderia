const perfil = document.getElementById('form-perfil');
const foto = document.getElementById('perfil-foto');
const preview = document.getElementById('perfil-foto-preview');
const iconeFoto = document.getElementById('perfil-foto-icone');
const feedbackFoto = document.getElementById('perfil-feedback');

let urlPreview = null;      // URL temporária do arquivo selecionado
let fotoAtualUrl = null;    // URL da foto salva no banco

/**
 * Exibe uma foto no preview (esconde o ícone de câmera).
 * @param {string} url
 */
function mostrarFoto(url) {
    if (!preview || !iconeFoto) return;
    preview.src = url;
    preview.classList.remove('hidden');
    iconeFoto.classList.add('hidden');
}

/**
 * Reseta o preview para o estado "sem foto selecionada",
 * voltando a exibir a foto do banco (se existir) ou o ícone de câmera.
 */
function limparPreview() {
    if (urlPreview) {
        URL.revokeObjectURL(urlPreview);
        urlPreview = null;
    }

    if (fotoAtualUrl) {
        mostrarFoto(fotoAtualUrl);
    } else {
        preview.src = '';
        preview.classList.add('hidden');
        iconeFoto.classList.remove('hidden');
    }
}

if (foto) {
    foto.addEventListener('change', () => {
        const arquivo = foto.files[0];

        if (!arquivo) {
            limparPreview();
            return;
        }

        const tiposPermitidos = ['image/png', 'image/jpeg'];

        if (
            !tiposPermitidos.includes(arquivo.type) ||
            arquivo.size > 2 * 1024 * 1024
        ) {
            foto.value = '';
            limparPreview();

            feedbackFoto.textContent =
                'Selecione uma imagem PNG ou JPEG de até 2 MB.';
            feedbackFoto.className = 'text-sm text-red-700';
            return;
        }

        if (urlPreview) {
            URL.revokeObjectURL(urlPreview);
        }

        urlPreview = URL.createObjectURL(arquivo);
        mostrarFoto(urlPreview);

        feedbackFoto.textContent = 'Foto selecionada: ' + arquivo.name;
        feedbackFoto.className = 'text-sm text-blue-700';
    });
}

// =========================================================================
// 2. ENVIO DO FORMULÁRIO DE PERFIL
// =========================================================================
if (perfil) {
    perfil.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        const nome = document.getElementById('perfil-nome').value.trim();
        const sobrenome = document.getElementById('perfil-sobrenome').value.trim();
        const feedback = document.getElementById('perfil-feedback');

        if (nome.length < 2 || sobrenome.length < 2) {
            feedback.textContent = 'Preencha os campos obrigatórios corretamente.';
            feedback.className = 'text-sm text-red-700';
            return;
        }

        const formData = new FormData();
        formData.append('nome', nome);
        formData.append('sobrenome', sobrenome);

        if (foto.files[0]) {
            formData.append('foto', foto.files[0]);
        }

        feedback.textContent = 'Salvando...';
        feedback.className = 'text-sm text-slate-500';

        try {
            const resposta = await fetch('/api/atualizar-perfil', {
                method: 'POST',
                body: formData
            });

            const dados = await resposta.json();

            if (resposta.ok) {
                feedback.textContent = dados.message;
                feedback.className = 'text-sm text-green-700';

                document.getElementById('nome-cabecalho').textContent =
                    nome + ' ' + sobrenome;

                // Limpa o input de arquivo
                foto.value = '';

                // Se o backend devolveu a nova foto_url, atualiza o estado
                if (dados.foto_url) {
                    fotoAtualUrl = dados.foto_url;
                }

                // Libera a URL temporária do preview
                if (urlPreview) {
                    URL.revokeObjectURL(urlPreview);
                    urlPreview = null;
                }

                // Volta o preview para a foto atual (nova ou antiga)
                limparPreview();

                // Atualiza o avatar do header
                const avatarHeader = document.querySelector('header .w-10.h-10.rounded-full');
                if (avatarHeader && fotoAtualUrl) {
                    avatarHeader.innerHTML =
                        `<img src="${fotoAtualUrl}" alt="Foto de perfil" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                }

                feedbackFoto.textContent = 'Foto atualizada com sucesso.';
                feedbackFoto.className = 'text-sm text-green-700';
            } else {
                feedback.textContent = dados.error || 'Erro ao atualizar.';
                feedback.className = 'text-sm text-red-700';
            }
        } catch (erro) {
            feedback.textContent = 'Erro de conexão ao salvar.';
            feedback.className = 'text-sm text-red-700';
            console.error(erro);
        }
    });
}

// =========================================================================
// 3. MOSTRAR/OCULTAR SENHA
// =========================================================================
document.querySelectorAll('.mostrar-senha').forEach(botao => {
    botao.addEventListener('click', () => {
        const input = document.getElementById(botao.dataset.alvo);
        const mostrar = input.type === 'password';
        input.type = mostrar ? 'text' : 'password';
        botao.setAttribute('aria-pressed', String(mostrar));
        botao.setAttribute(
            'aria-label',
            (mostrar ? 'Ocultar ' : 'Mostrar ') +
                (botao.dataset.alvo === 'senha-atual'
                    ? 'senha atual'
                    : botao.dataset.alvo === 'senha-nova'
                    ? 'nova senha'
                    : 'confirmação de senha')
        );
        botao.innerHTML = mostrar
            ? '<i data-lucide="eye-off" class="w-5 h-5"></i>'
            : '<i data-lucide="eye" class="w-5 h-5"></i>';
        if (window.lucide) lucide.createIcons();
    });
});

// =========================================================================
// 4. ENVIO DO FORMULÁRIO DE SENHA
// =========================================================================
const nova = document.getElementById('senha-nova');
const confirmacao = document.getElementById('senha-confirmacao');

function validarConfirmacao() {
    if (confirmacao && nova) {
        confirmacao.setCustomValidity(
            confirmacao.value && nova.value !== confirmacao.value
                ? 'As senhas não coincidem.'
                : ''
        );
    }
}

if (nova) nova.addEventListener('input', validarConfirmacao);
if (confirmacao) confirmacao.addEventListener('input', validarConfirmacao);

const formSenha = document.getElementById('form-senha');
if (formSenha) {
    formSenha.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        validarConfirmacao();

        if (!confirmacao.reportValidity()) return;

        const feedback = document.getElementById('senha-feedback');
        const senhaAtual = document.getElementById('senha-atual').value;
        const novaSenha = document.getElementById('senha-nova').value;

        feedback.textContent = 'Alterando senha...';
        feedback.className = 'text-sm text-slate-500';

        try {
            const resposta = await fetch('/api/alterar-senha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha })
            });

            const dados = await resposta.json();

            if (resposta.ok) {
                feedback.textContent = dados.message;
                feedback.className = 'text-sm text-green-700';
                formSenha.reset();
            } else {
                feedback.textContent = dados.error || 'Erro ao alterar senha.';
                feedback.className = 'text-sm text-red-700';
            }
        } catch (erro) {
            feedback.textContent = 'Erro de conexão ao alterar senha.';
            feedback.className = 'text-sm text-red-700';
            console.error(erro);
        }
    });
}

// =========================================================================
// 5. CARREGAR DADOS DO BANCO
// =========================================================================
async function carregarDadosCabecalho() {
    try {
        const resposta = await fetch('/api/meu-perfil');
        if (!resposta.ok) return;

        const dados = await resposta.json();

        // ---- Header ----
        const nomeHeader = document.getElementById('nome-cabecalho');
        const cargoHeader = document.getElementById('cargo-cabecalho');

        if (nomeHeader) nomeHeader.textContent = dados.nome + ' ' + (dados.sobrenome || '');
        if (cargoHeader) cargoHeader.textContent = dados.cargo || 'Gestão';

        const avatarHeader = document.querySelector('header .w-10.h-10.rounded-full');
        if (avatarHeader && dados.foto_url) {
            avatarHeader.innerHTML = `<img src="${dados.foto_url}" alt="Foto de perfil" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        }

        // ---- Formulário ----
        const inputNome = document.getElementById('perfil-nome');
        const inputSobrenome = document.getElementById('perfil-sobrenome');

        if (inputNome) inputNome.value = dados.nome || '';
        if (inputSobrenome) inputSobrenome.value = dados.sobrenome || '';

        const displayCargo = document.getElementById('perfil-cargo-display');
        if (displayCargo) displayCargo.textContent = dados.cargo || 'Não definido';

        // ---- Preview da foto ----
        if (dados.foto_url) {
            fotoAtualUrl = dados.foto_url;
            mostrarFoto(fotoAtualUrl);
        }
    } catch (erro) {
        console.error('Erro ao carregar dados do cabeçalho:', erro);
    }
}

document.addEventListener('DOMContentLoaded', carregarDadosCabecalho);