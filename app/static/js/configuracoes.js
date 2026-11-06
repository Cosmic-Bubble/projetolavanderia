// =========================================================================
// 1. LÓGICA DA FOTO (Validação antes do envio)
// =========================================================================
const perfil = document.getElementById('form-perfil');
const foto = document.getElementById('perfil-foto');

if (foto) {
  foto.addEventListener('change', () => {
    const arquivo = foto.files[0];
    if (!arquivo) return;
    
    if (!['image/png', 'image/jpeg'].includes(arquivo.type) || arquivo.size > 2 * 1024 * 1024) {
      foto.value = '';
      document.getElementById('perfil-feedback').textContent = 'Selecione uma imagem PNG ou JPEG de até 2 MB.';
      document.getElementById('perfil-feedback').className = 'text-sm text-red-700';
    } else {
      document.getElementById('perfil-feedback').textContent = 'Foto selecionada: ' + arquivo.name;
      document.getElementById('perfil-feedback').className = 'text-sm text-blue-700';
    }
  });
}

// =========================================================================
// 2. ENVIO DO FORMULÁRIO DE PERFIL (Nome, Sobrenome e Foto)
// =========================================================================
if (perfil) {
  perfil.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const nome = document.getElementById('perfil-nome').value.trim();
    const sobrenome = document.getElementById('perfil-sobrenome').value.trim();
    const feedback = document.getElementById('perfil-feedback');

    // Validação básica
    if (nome.length < 2 || sobrenome.length < 2) {
      feedback.textContent = 'Preencha os campos obrigatórios corretamente.';
      feedback.className = 'text-sm text-red-700';
      return;
    }

    // Prepara os dados para envio
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

        // Atualiza o cabeçalho sem recarregar a página
        document.getElementById('nome-cabecalho').textContent = nome + ' ' + sobrenome;

        // Limpa o input de arquivo
        foto.value = '';
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
// 3. LÓGICA DE MOSTRAR/OCULTAR SENHA (O "olhinho")
// =========================================================================
document.querySelectorAll('.mostrar-senha').forEach(botao => {
  botao.addEventListener('click', () => {
    const input = document.getElementById(botao.dataset.alvo);
    const mostrar = input.type === 'password';
    input.type = mostrar ? 'text' : 'password';
    botao.setAttribute('aria-pressed', String(mostrar));
    botao.setAttribute('aria-label', (mostrar ? 'Ocultar ' : 'Mostrar ') + (botao.dataset.alvo === 'senha-atual' ? 'senha atual' : botao.dataset.alvo === 'senha-nova' ? 'nova senha' : 'confirmação de senha'));
    botao.innerHTML = mostrar ? '<i data-lucide="eye-off" class="w-5 h-5"></i>' : '<i data-lucide="eye" class="w-5 h-5"></i>';
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
    confirmacao.setCustomValidity(confirmacao.value && nova.value !== confirmacao.value ? 'As senhas não coincidem.' : '');
  }
}

if (nova) nova.addEventListener('input', validarConfirmacao);
if (confirmacao) confirmacao.addEventListener('input', validarConfirmacao);

const formSenha = document.getElementById('form-senha');
if (formSenha) {
  formSenha.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    validarConfirmacao();
    
    // Se as senhas não baterem, para aqui
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
        formSenha.reset(); // Limpa os campos de senha
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
// 5. BUSCAR DADOS DO BANCO PARA PREENCHER A TELA
// =========================================================================
async function carregarDadosCabecalho() {
  try {
    const resposta = await fetch('/api/meu-perfil');
    if (!resposta.ok) return;

    const dados = await resposta.json();

    // Atualiza o topo (Header)
    const nomeHeader = document.getElementById('nome-cabecalho');
    const cargoHeader = document.getElementById('cargo-cabecalho');

    if (nomeHeader) nomeHeader.textContent = dados.nome + ' ' + (dados.sobrenome || '');
    if (cargoHeader) cargoHeader.textContent = dados.cargo || 'Gestão';

    const avatarHeader = document.querySelector('header .w-10.h-10.rounded-full');
    if (avatarHeader && dados.foto_url) {
      avatarHeader.innerHTML = `<img src="${dados.foto_url}" alt="Foto de perfil" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    }

    // Atualiza os campos do formulário
    const inputNome = document.getElementById('perfil-nome');
    const inputSobrenome = document.getElementById('perfil-sobrenome');

    if (inputNome) inputNome.value = dados.nome || '';
    if (inputSobrenome) inputSobrenome.value = dados.sobrenome || '';

    // Atualiza o Cargo (que agora é uma div de texto)
    const displayCargo = document.getElementById('perfil-cargo-display');
    if (displayCargo) displayCargo.textContent = dados.cargo || 'Não definido';

  } catch (erro) {
    console.error("Erro ao carregar dados do cabeçalho:", erro);
  }
}

document.addEventListener("DOMContentLoaded", carregarDadosCabecalho);