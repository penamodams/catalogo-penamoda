import { CONFIG } from './config.js';
import { supabase, initializationError } from './supabase-client.js';

const $ = (id) => document.getElementById(id);
const loginForm = $('login-form');
const sessionPanel = $('admin-session');
const status = $('admin-status');
const userLabel = $('admin-user');
const productForm = $('product-form');
const productList = $('admin-product-list');
const editingId = $('editing-id');
const cancelEdit = $('cancel-edit');
const publicoSelect = $('publico-select');
const sizeSelector = $('size-selector');
const customWrap = $('custom-size-wrap');
const customInput = $('custom-size-input');
const sizesHidden = $('tamanhos-hidden');
const photoInput = $('foto-arquivo');
const photoUrl = $('foto-url');
const photoPreview = $('foto-preview');
const removePhoto = $('remover-foto');
const sizeOptions = {
  FA: Array.from({ length: 10 }, (_, i) => String(i + 33)),
  MA: Array.from({ length: 12 }, (_, i) => String(i + 37)),
  FI: Array.from({ length: 36 }, (_, i) => String(i + 1)),
  MI: Array.from({ length: 36 }, (_, i) => String(i + 1))
};
let products = [];
let selectedSizes = new Set();
let customSizes = [];
let previewObjectUrl = '';
let schemaReady = true;
const setStatus = (text) => { status.textContent = text; };
const isAdmin = (user) => Boolean(user && CONFIG.adminUserId && user.id === CONFIG.adminUserId);
const value = (form, key) => String(form.get(key) || '').trim();
const money = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function setSession(user) {
  const allowed = isAdmin(user);
  loginForm.hidden = allowed;
  sessionPanel.hidden = !allowed;
  userLabel.textContent = allowed ? `Conectado: ${user.email || 'administrador'}` : '';
}
function showPreview(src) {
  photoPreview.hidden = !src;
  removePhoto.hidden = !src;
  if (src) photoPreview.src = src;
}
function clearPreview() {
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = '';
  photoInput.value = '';
  showPreview('');
}
photoInput.addEventListener('change', () => {
  const file = photoInput.files?.[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { photoInput.value = ''; setStatus('Escolha uma imagem JPG, PNG ou WebP.'); return; }
  if (file.size > 8 * 1024 * 1024) { photoInput.value = ''; setStatus('A imagem deve ter no máximo 8 MB.'); return; }
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = URL.createObjectURL(file);
  showPreview(previewObjectUrl);
  photoUrl.value = '';
});
photoUrl.addEventListener('input', () => { if (!photoInput.files?.length) showPreview(photoUrl.value.trim()); });
removePhoto.addEventListener('click', () => { clearPreview(); photoUrl.value = ''; });

function syncSizes() {
  const custom = customInput.value.split(',').map((x) => x.trim()).filter(Boolean);
  customSizes = custom.filter((x) => !selectedSizes.has(x));
  sizesHidden.value = [...selectedSizes, ...customSizes].join(',');
}
function renderSizeOptions(publico, initial = []) {
  selectedSizes = new Set();
  customSizes = [];
  sizeSelector.replaceChildren();
  customWrap.hidden = true;
  customInput.value = '';
  const options = sizeOptions[publico] || [];
  if (!publico) {
    const note = document.createElement('p'); note.className = 'help-text'; note.textContent = 'Escolha o público para ver os tamanhos disponíveis.'; sizeSelector.append(note); sizesHidden.value = ''; return;
  }
  options.forEach((size) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'size-option'; button.textContent = size; button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      if (selectedSizes.has(size)) selectedSizes.delete(size); else selectedSizes.add(size);
      button.classList.toggle('selected', selectedSizes.has(size)); button.setAttribute('aria-pressed', String(selectedSizes.has(size)));
      syncSizes();
    });
    sizeSelector.append(button);
  });
  const other = document.createElement('button'); other.type = 'button'; other.className = 'size-option size-other'; other.textContent = 'Outro'; other.setAttribute('aria-expanded', 'false');
  other.addEventListener('click', () => { customWrap.hidden = !customWrap.hidden; other.classList.toggle('selected', !customWrap.hidden); other.setAttribute('aria-expanded', String(!customWrap.hidden)); if (!customWrap.hidden) customInput.focus(); syncSizes(); });
  sizeSelector.append(other);
  initial.forEach((size) => {
    if (options.includes(size)) { selectedSizes.add(size); const button = [...sizeSelector.querySelectorAll('.size-option')].find((b) => b.textContent === size); button?.classList.add('selected'); button?.setAttribute('aria-pressed', 'true'); }
  });
  const custom = initial.filter((size) => !options.includes(size));
  if (custom.length) { customWrap.hidden = false; other.classList.add('selected'); other.setAttribute('aria-expanded', 'true'); customInput.value = custom.join(', '); }
  syncSizes();
}
publicoSelect.addEventListener('change', () => renderSizeOptions(publicoSelect.value));
customInput.addEventListener('input', syncSizes);
function resetForm() {
  productForm.reset(); editingId.value = ''; photoUrl.value = ''; clearPreview();
  $('save-product').textContent = 'Salvar e publicar produto'; cancelEdit.hidden = true;
  renderSizeOptions('');
}
function renderProducts() {
  productList.replaceChildren();
  if (!products.length) { const empty = document.createElement('p'); empty.className = 'help-text'; empty.textContent = 'Nenhum produto cadastrado.'; productList.append(empty); return; }
  products.forEach((p) => {
    const row = document.createElement('article'); row.className = 'admin-product-row';
    if (p.foto) { const img = document.createElement('img'); img.src = p.foto; img.alt = ''; img.className = 'admin-product-thumb'; row.append(img); }
    const details = document.createElement('div'); const title = document.createElement('strong'); title.textContent = p.descricao || 'Produto sem nome';
    const meta = document.createElement('p'); meta.textContent = `${p.codigo ? `SKU ${p.codigo} · ` : ''}${p.preco_desconto ? `${money(p.preco_desconto)} (de ${money(p.valor)})` : money(p.valor)} · Tamanhos: ${p.tamanhos || '—'} · Estoque: ${p.estoque ?? 'Não informado'}`; details.append(title, meta);
    const actions = document.createElement('div'); actions.className = 'admin-row-actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'secondary-button'; edit.textContent = 'Editar'; edit.addEventListener('click', () => startEdit(p));
    const del = document.createElement('button'); del.type = 'button'; del.className = 'secondary-button danger-button'; del.textContent = 'Excluir'; del.addEventListener('click', () => deleteProduct(p));
    actions.append(edit, del); row.append(details, actions); productList.append(row);
  });
}
function startEdit(p) {
  editingId.value = String(p.id);
  for (const key of ['codigo', 'descricao', 'valor', 'publico', 'categoria', 'cor', 'estoque', 'preco_desconto']) productForm.elements[key].value = p[key] ?? '';
  photoUrl.value = p.foto || ''; if (p.foto) showPreview(p.foto); else showPreview('');
  renderSizeOptions(p.publico || '', String(p.tamanhos || '').split(',').map((x) => x.trim()).filter(Boolean));
  $('save-product').textContent = 'Salvar alterações'; cancelEdit.hidden = false; productForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function loadProducts() {
  const { data, error } = await supabase.from('produtos').select('id, codigo, descricao, valor, preco_desconto, tamanhos, foto, publico, categoria, cor, estoque').order('descricao');
  if (error) { schemaReady = false; console.error(error); setStatus('Aplique supabase/product_enhancements.sql no Supabase antes de cadastrar.'); return; }
  schemaReady = true; products = data || []; renderProducts();
}
async function uploadPhoto() {
  const file = photoInput.files?.[0]; if (!file) return photoUrl.value.trim();
  const cleanName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${Date.now()}-${crypto.randomUUID()}-${cleanName}`;
  const { error } = await supabase.storage.from('produtos').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw new Error(`Falha no envio da foto. Verifique a configuração do Storage: ${error.message}`);
  return supabase.storage.from('produtos').getPublicUrl(path).data.publicUrl;
}
async function deleteProduct(p) {
  if (!confirm(`Excluir “${p.descricao}” permanentemente?`)) return;
  const { error } = await supabase.from('produtos').delete().eq('id', p.id);
  if (error) return setStatus(`Não foi possível excluir: ${error.message}`);
  setStatus('Produto excluído.'); await loadProducts();
}
if (!supabase) { loginForm.querySelector('button').disabled = true; setStatus(initializationError || 'Não foi possível conectar ao Supabase.'); }
else {
  supabase.auth.getSession().then(({ data, error }) => { if (error) console.error(error); const user = data?.session?.user || null; if (user && !isAdmin(user)) { void supabase.auth.signOut(); return; } setSession(user); if (user) void loadProducts(); });
  supabase.auth.onAuthStateChange((_event, session) => { const user = session?.user || null; if (user && !isAdmin(user)) { void supabase.auth.signOut(); setSession(null); return; } setSession(user); if (user) setTimeout(() => void loadProducts(), 0); });
}
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault(); if (!supabase) return;
  const email = $('admin-email').value.trim(); const password = $('admin-password').value;
  setStatus('Entrando…'); const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return setStatus('Não foi possível entrar. Confira o e-mail e a senha no Supabase.');
  if (!isAdmin(data.user)) { await supabase.auth.signOut(); return setStatus('Esta conta não está autorizada como administradora.'); }
  setSession(data.user); $('admin-password').value = ''; await loadProducts();
});
$('sign-out').addEventListener('click', async () => { await supabase.auth.signOut(); setSession(null); resetForm(); setStatus('Você saiu da área administrativa.'); });
cancelEdit.addEventListener('click', resetForm);
productForm.addEventListener('submit', async (event) => {
  event.preventDefault(); if (!supabase) return setStatus('Supabase indisponível.');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !isAdmin(sessionData?.session?.user)) { setSession(null); return setStatus('Sessão administrativa inválida. Entre novamente.'); }
  if (!schemaReady) return setStatus('Aplique primeiro supabase/product_enhancements.sql no Supabase.');
  syncSizes(); const form = new FormData(productForm); const rawPrice = value(form, 'valor'); const price = Number(rawPrice); const rawDiscount = value(form, 'preco_desconto'); const discount = rawDiscount ? Number(rawDiscount) : null;
  const stockRaw = value(form, 'estoque'); const selectedPublic = value(form, 'publico');
  if (!value(form, 'descricao') || !rawPrice || !Number.isFinite(price) || price < 0) return setStatus('Informe a descrição e um preço válido.');
  if (discount !== null && (!Number.isFinite(discount) || discount <= 0 || discount >= price)) return setStatus('O preço promocional deve ser maior que zero e menor que o preço de venda.');
  if (!selectedPublic) return setStatus('Selecione o público para habilitar os tamanhos.');
  if (!sizesHidden.value) return setStatus('Selecione ao menos um tamanho ou informe um tamanho em “Outro”.');
  const stock = stockRaw === '' ? null : Number(stockRaw); if (stock !== null && (!Number.isInteger(stock) || stock < 0)) return setStatus('O estoque deve ser um inteiro igual ou maior que zero.');
  setStatus('Salvando produto e foto…'); $('save-product').disabled = true;
  try {
    const foto = await uploadPhoto();
    const payload = { codigo: value(form, 'codigo') || null, descricao: value(form, 'descricao'), valor: price, preco_desconto: discount, tamanhos: sizesHidden.value, publico: selectedPublic, categoria: value(form, 'categoria') || null, cor: value(form, 'cor') || null, estoque: stock, foto: foto || null };
    const query = editingId.value ? supabase.from('produtos').update(payload).eq('id', editingId.value) : supabase.from('produtos').insert(payload);
    const { error } = await query; if (error) throw new Error(error.message);
    const edited = Boolean(editingId.value); resetForm(); setStatus(edited ? 'Produto atualizado!' : 'Produto cadastrado!'); await loadProducts();
  } catch (error) { console.error(error); setStatus(`Não foi possível salvar: ${error.message}`); }
  finally { $('save-product').disabled = false; }
});
renderSizeOptions('');
