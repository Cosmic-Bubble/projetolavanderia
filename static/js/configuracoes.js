// Interações locais demonstrativas; nenhum dado é persistido ou enviado ao servidor.
const perfil = document.getElementById('form-perfil');
const foto = document.getElementById('perfil-foto');
foto.addEventListener('change', () => {
  const arquivo = foto.files[0];
  if (!arquivo) return;
  if (!['image/png','image/jpeg'].includes(arquivo.type) || arquivo.size > 2 * 1024 * 1024) {
    foto.value = '';
    document.getElementById('perfil-feedback').textContent = 'Selecione uma imagem PNG ou JPEG de até 2 MB.';
    document.getElementById('perfil-feedback').className = 'text-sm text-red-700';
  } else { document.getElementById('perfil-feedback').textContent = 'Foto selecionada: ' + arquivo.name; }
});
perfil.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const nome = document.getElementById('perfil-nome').value.trim();
  const sobrenome = document.getElementById('perfil-sobrenome').value.trim();
  const cargo = document.getElementById('perfil-cargo').value.trim();
  const feedback = document.getElementById('perfil-feedback');
  if (nome.length < 2 || sobrenome.length < 2 || !cargo) { feedback.textContent = 'Preencha os campos obrigatórios corretamente.'; feedback.className = 'text-sm text-red-700'; return; }
  document.getElementById('nome-cabecalho').textContent = nome + ' ' + sobrenome;
  document.getElementById('cargo-cabecalho').textContent = cargo;
  feedback.textContent = 'Prévia atualizada nesta página. Para salvar, será necessário conectar ao Flask.';
  feedback.className = 'text-sm text-blue-700';
});
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
const nova = document.getElementById('senha-nova');
const confirmacao = document.getElementById('senha-confirmacao');
function validarConfirmacao() {
  confirmacao.setCustomValidity(confirmacao.value && nova.value !== confirmacao.value ? 'As senhas não coincidem.' : '');
}
nova.addEventListener('input', validarConfirmacao);
confirmacao.addEventListener('input', validarConfirmacao);
document.getElementById('form-senha').addEventListener('submit', evento => {
  evento.preventDefault();
  validarConfirmacao();
  if (!confirmacao.reportValidity()) return;
  const feedback = document.getElementById('senha-feedback');
  feedback.textContent = 'Formulário validado. A senha não foi alterada: integração com Flask pendente.';
  feedback.className = 'text-sm text-blue-700';
});
