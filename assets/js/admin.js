import { CONFIG } from './config.js';
import { supabase, initializationError } from './supabase-client.js';

const loginForm = document.getElementById('login-form');
const sessionPanel = document.getElementById('admin-session');
const status = document.getElementById('admin-status');
const userLabel = document.getElementById('admin-user');
const productForm = document.getElementById('product-form');
const productList = document.getElementById('admin-product-list');
const editingId = document.getElementById('editing-id');
const cancelEdit = document.getElementById('cancel-edit');
const sizeSelector = document.getElementById('size-selector');
const customSizeWrap = document.getElementById('custom-size-wrap');
const customSizeInput = document.getElementById('custom-size-input');
const publicoSelect = document.getElementById('publico-select');
const tamanhosHidden = document.getElementById('tamanhos-hidden');

let schemaReady = true;
let products = [];
let selectedSizes = [];

const sizeOptions = {
  FA: ['33', '34', '35', '36', '37', '38', '39', '40', '41', '42', 'Outro'],
  MA: ['37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', 'Outro'],
  FI: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', 'Outro'],
  MI: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', 'Outro']
};

const setStatus = (message) => { status.textContent = message; };
const isAdmin = (user) => Boolean(user && CONFIG.adminUserId && user.id === CONFIG.adminUserId);

function setSession(user) {
  const allowed = isAdmin(user);
  loginForm.hidden = allowed;
  sessionPanel.hidden = !allowed;
  userLabel.textContent = allowed ? `Conectado: ${user.email || 'administrador'}` : 'Acesso restrito';
}

function value(form, name) {
  return String(form.get(name) || '').trim();
}

function renderSizeSelector(publico) {
  const options = sizeOptions[publico] || [];
  selectedSizes = [];
  customSizeWrap.hidden = true;
  customSizeInput.value = '';
  sizeSelector.replaceChildren();

  options.forEach((size) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'size-option';
    button.textContent = size;
    button.dataset.value = size;
    button.setAttribute('aria-pressed', 'false');

    button.addEventListener('click', () => {
      if (size === 'Outro') {
        customSizeWrap.hidden = false;
        button.classList.toggle('selected');
        if (button.classList.contains('selected')) {
          selectedSizes = selectedSizes.filter((item) => item !== 'Outro');
          selectedSizes.push('Outro');
        } else {
          selectedSizes = selectedSizes.filter((item) => item !== 'Outro');
        }
        syncSelectedSizes();
        return;
      }

      if (button.classList.contains('selected')) {
        button.classList.remove('selected');
        button.setAttribute('aria-pressed', 'false');
        selectedSizes = selectedSizes.filter((item) => item !== size);
      } else {
        button.classList.add('selected');
        button.setAttribute('aria-pressed', 'true');
        selectedSizes.push(size);
      }

      syncSelectedSizes();
    });

    sizeSelector.append(button);
  });

  syncSelectedSizes();
}

function syncSelectedSizes() {
  const safe = selectedSizes.filter(Boolean);
  const custom = customSizeInput.value.trim();
  const finalSizes = [...safe];

  if (custom && !finalSizes.includes(custom)) {
    finalSizes.push(custom);
  }

  tamanhosHidden.value = finalSizes.join(',');
}

publicoSelect.addEventListener('change', () => {
  const publico = publicoSelect.value;
  renderSizeSelector(publico);
});

customSizeInput.addEventListener('input', syncSelectedSizes);

function resetForm() {
  productForm.reset();
  editingId.value = '';
  document.getElementById('save-product').textContent = 'Salvar e publicar produto';
  cancelEdit.hidden = true;
  selectedSizes = [];
  customSizeInput.value = '';
  customSizeWrap.hidden = true;
  tamanhosHidden.value = '';
  renderSizeSelector('');
}

function renderProducts() {
  productList.replaceChildren();
  if (!products.length) {
    const empty = document.createElement('p');
    empty.className = 'help-text';
    empty.textContent = 'Nenhum produto cadastrado.';
    productList.append(empty);
    return;
  }

  products.forEach((product) => {
    const row = document.createElement('article');
    row.className = 'admin-product-row';

    const details = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = product.descricao || 'Produto sem nome';

    const meta = document.createElement('p');
    const price = Number(product.valor || 0);
    const stock = product.estoque ?? 'Não informado';
    meta.textContent = `${price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · Estoque: ${stock} · Tamanhos: ${product.tamanhos || '—'}`;

    details.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'admin-row-actions';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'secondary-button';
    edit.textContent = 'Editar';
    edit.addEventListener('click', () => startEdit(product));

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary-button danger-button';
    remove.textContent = 'Excluir';
    remove.addEventListener('click', () => deleteProduct(product));

    actions.append(edit, remove);
    row.append(details, actions);
    productList.append(row);
  });
}

function startEdit(product) {
  editingId.value = String(product.id);
  productForm.elements.descricao.value = product.descricao || '';
  productForm.elements.valor.value = product.valor ?? '';
  productForm.elements.codigo.value = product.codigo || '';
  productForm.elements.foto.value = product.foto || '';
  productForm.elements.publico.value = product.publico || '';
  productForm.elements.categoria.value = product.categoria || '';
  productForm.elements.cor.value = product.cor || '';
  productForm.elements.estoque.value = product.estoque ?? '';
  productForm.elements.preco_desconto.value = product.preco_desconto ?? '';

  const selected = String(product.tamanhos || '').split(',').map((item) => item.trim()).filter(Boolean);
  selectedSizes = selected;
  customSizeInput.value = selected.includes('Outro') ? '' : '';
  customSizeWrap.hidden = true;

  renderSizeSelector(product.publico || 'FA');

  const visibleOptions = [...sizeSelector.querySelectorAll('.size-option')];
  visibleOptions.forEach((option) => {
    const optionValue = option.dataset.value;
    const selectedOption = selected.includes(optionValue) || (optionValue === 'Outro' && selected.some((item) => item.toLowerCase().includes('outro')));
    option.classList.toggle('selected', selectedOption);
    option.setAttribute('aria-pressed', selectedOption ? 'true' : 'false');
  });

  if (selected.some((item) => item !== 'Outro' && !sizeOptions[product.publico || 'FA']?.includes(item))) {
    customSizeInput.value = selected.filter((item) => !sizeOptions[product.publico || 'FA']?.includes(item)).join(', ');
    customSizeWrap.hidden = false;
  }

  syncSelectedSizes();
  document.getElementById('save-product').textContent = 'Salvar alterações';
  cancelEdit.hidden = false;
  productForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function loadAdminProducts() {
  const { data, error } = await supabase.from('produtos').select('id, codigo, descricao, valor, tamanhos, publico, categoria, cor, estoque, foto, preco_desconto').order('descricao');
  if (error) {
    schemaReady = false;
    console.error('Erro ao listar produtos:', error);
    setStatus('Para habilitar o cadastro completo, aplique a migração e as políticas do banco.');
    return;
  }

  schemaReady = true;
  products = data || [];
  renderProducts();
}

async function deleteProduct(product) {
  if (!window.confirm(`Excluir “${product.descricao}” permanentemente?`)) return;

  const { error } = await supabase.from('produtos').delete().eq('id', product.id);
  if (error) {
    console.error('Erro ao excluir produto:', error);
    setStatus(`Não foi possível excluir: ${error.message}`);
    return;
  }

  setStatus('Produto excluído.');
  await loadAdminProducts();
}

if (!supabase) {
  loginForm.querySelector('button').disabled = true;
  setStatus(initializationError || 'Não foi possível conectar ao Supabase.');
} else if (!CONFIG.adminUserId) {
  setStatus('Configuração pendente: configure o UUID administrador em assets/js/config.js e aplique as políticas RLS.');
  supabase.auth.getSession().then(({ data }) => {
    const user = data?.session?.user || null;
    setSession(user);
  });
} else {
  supabase.auth.getSession().then(({ data }) => {
    const user = data?.session?.user || null;
    setSession(user);
    if (user && isAdmin(user)) loadAdminProducts();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user || null;
    setSession(user);
    if (user && isAdmin(user)) loadAdminProducts();
  });
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabase) return setStatus(initializationError || 'Supabase indisponível.');
  if (!CONFIG.adminUserId) return setStatus('Configure o UID do administrador em assets/js/config.js.');

  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setStatus('Não foi possível entrar. Confira o e-mail e a senha do administrador.');
    return;
  }

  if (!isAdmin(data.user)) {
    await supabase.auth.signOut();
    setSession(null);
    setStatus('Conta sem autorização para acessar o painel.');
    return;
  }

  setSession(data.user);
  await loadAdminProducts();
});

document.getElementById('sign-out').addEventListener('click', async () => {
  if (supabase) await supabase.auth.signOut();
  setSession(null);
  resetForm();
  setStatus('Você saiu da área administrativa.');
});

cancelEdit.addEventListener('click', resetForm);

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabase) return setStatus('Supabase indisponível.');

  const { data: sessionData } = await supabase.auth.getSession();
  if (!isAdmin(sessionData?.session?.user)) {
    setSession(null);
    return setStatus('Sessão inválida. Faça login novamente.');
  }

  if (!schemaReady) return setStatus('Aplique primeiro a migração do banco para os campos de catálogo.');

  const form = new FormData(productForm);
  const descricao = value(form, 'descricao');
  const rawPrice = value(form, 'valor');
  const valor = Number(rawPrice);
  const estoque = value(form, 'estoque');
  const payload = {
    codigo: value(form, 'codigo'),
    descricao,
    valor,
    tamanhos: tamanhosHidden.value,
    publico: value(form, 'publico'),
    categoria: value(form, 'categoria'),
    cor: value(form, 'cor'),
    estoque: estoque ? Number(estoque) : null,
    foto: value(form, 'foto'),
    preco_desconto: value(form, 'preco_desconto') ? Number(value(form, 'preco_desconto')) : null
  };

  if (!descricao || !rawPrice || !Number.isFinite(valor) || valor < 0) {
    return setStatus('Confira nome e preço do produto.');
  }

  if (payload.estoque !== null && (!Number.isInteger(payload.estoque) || payload.estoque < 0)) {
    return setStatus('O estoque deve ser um número inteiro maior ou igual a zero.');
  }

  setStatus('Salvando produto…');

  const query = editingId.value
    ? supabase.from('produtos').update(payload).eq('id', editingId.value)
    : supabase.from('produtos').insert(payload);

  const { error } = await query;
  if (error) {
    console.error('Erro ao salvar produto:', error);
    setStatus(`Não foi possível salvar: ${error.message}`);
    return;
  }

  const wasEdit = Boolean(editingId.value);
  resetForm();
  setStatus(wasEdit ? 'Alterações salvas.' : 'Produto cadastrado com sucesso!');
  await loadAdminProducts();
});

renderSizeSelector('');
resetForm();
