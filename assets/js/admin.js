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
let schemaReady = true;
let products = [];
const setStatus = (message) => { status.textContent = message; };
const isAdmin = (user) => Boolean(user && CONFIG.adminUserId && user.id === CONFIG.adminUserId);
function setSession(user) { const allowed = isAdmin(user); loginForm.hidden = allowed; sessionPanel.hidden = !allowed; userLabel.textContent = allowed ? `Conectado: ${user.email || 'administrador'}` : ''; if (!allowed && user) setStatus('Esta conta não está autorizada para administrar a loja.'); }
function resetForm() { productForm.reset(); editingId.value = ''; document.getElementById('save-product').textContent = 'Salvar e publicar produto'; cancelEdit.hidden = true; }
function value(form, name) { return String(form.get(name) || '').trim(); }
function renderProducts() {
  productList.replaceChildren();
  const search = (document.getElementById('admin-search')?.value || '').trim().toLocaleLowerCase('pt-BR');
  const size = (document.getElementById('admin-size-filter')?.value || '').trim().toLocaleLowerCase('pt-BR');
  const color = (document.getElementById('admin-color-filter')?.value || '').trim().toLocaleLowerCase('pt-BR');
  const stockFilter = document.getElementById('admin-stock-filter')?.value || '';
  const filtered = products.filter((p) => {
    const haystack = [p.descricao,p.publico,p.categoria,p.cor,p.marca,p.modelo].join(' ').toLocaleLowerCase('pt-BR');
    const sizes = (Array.isArray(p.tamanhos) ? p.tamanhos : String(p.tamanhos || '').split(',')).map(v=>String(v).trim().toLocaleLowerCase('pt-BR'));
    const stock = p.estoque === null || p.estoque === undefined || p.estoque === '' ? null : Number(p.estoque);
    return (!search || haystack.includes(search)) && (!size || sizes.includes(size)) && (!color || String(p.cor || '').toLocaleLowerCase('pt-BR').includes(color)) && (!stockFilter || (stockFilter==='available' && stock>0) || (stockFilter==='empty' && stock===0) || (stockFilter==='unknown' && stock===null));
  });
  const count = document.getElementById('admin-filter-count'); if(count) count.textContent = `${filtered.length} de ${products.length} produtos`;
  if (!filtered.length) { const empty = document.createElement('p'); empty.className = 'help-text'; empty.textContent = products.length ? 'Nenhum produto corresponde à pesquisa.' : 'Nenhum produto cadastrado.'; productList.append(empty); return; }
  filtered.forEach((product) => {
    const row = document.createElement('article'); row.className = 'admin-product-row';
    const details = document.createElement('div'); const title = document.createElement('strong'); title.textContent = product.descricao || 'Produto sem nome';
    const meta = document.createElement('p'); const stock = product.estoque ?? 'Não informado'; meta.textContent = `${Number(product.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · ${product.publico || 'Sem departamento'} · Estoque: ${stock}`; details.append(title, meta);
    const actions = document.createElement('div'); actions.className = 'admin-row-actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'secondary-button'; edit.textContent = 'Editar'; edit.addEventListener('click', () => startEdit(product));
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'secondary-button danger-button'; remove.textContent = 'Excluir'; remove.addEventListener('click', () => deleteProduct(product));
    actions.append(edit, remove); row.append(details, actions); productList.append(row);
  });
}
function startEdit(product) {
  editingId.value = String(product.id); productForm.elements.descricao.value = product.descricao || ''; productForm.elements.valor.value = product.valor ?? '';
  productForm.elements.tamanhos.value = product.tamanhos || ''; productForm.elements.foto.value = product.foto || '';
  productForm.elements.publico.value = product.publico || ''; productForm.elements.categoria.value = product.categoria || '';
  productForm.elements.cor.value = product.cor || ''; productForm.elements.estoque.value = product.estoque ?? '';
  document.getElementById('save-product').textContent = 'Salvar alterações'; cancelEdit.hidden = false; productForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function loadAdminProducts() {
  const { data, error } = await supabase.from('produtos').select('id, descricao, valor, tamanhos, foto, publico, categoria, cor, estoque').order('descricao');
  if (error) { schemaReady = false; console.error('Erro ao listar produtos da administração:', error); setStatus('Para habilitar filtros e gestão completa, aplique a migração supabase/catalog_fields.sql e as políticas RLS atualizadas.'); return; }
  schemaReady = true; products = data || []; renderProducts();
}
async function deleteProduct(product) {
  if (!window.confirm(`Excluir “${product.descricao}” permanentemente?`)) return;
  const { error } = await supabase.from('produtos').delete().eq('id', product.id);
  if (error) { console.error('Erro ao excluir produto:', error); setStatus(`Não foi possível excluir: ${error.message}`); return; }
  setStatus('Produto excluído.'); await loadAdminProducts();
}

if (!supabase) { loginForm.querySelector('button').disabled = true; setStatus(initializationError || 'Não foi possível conectar ao Supabase.'); }
else if (!CONFIG.adminUserId) { setStatus('Configuração pendente: configure o UUID administrador em assets/js/config.js e aplique as políticas RLS.'); supabase.auth.getSession().then(({ data }) => setSession(data?.session?.user || null)); }
else {
  supabase.auth.getSession().then(({ data, error }) => { if (error) console.error(error); const user = data?.session?.user || null; if (user && !isAdmin(user)) void supabase.auth.signOut(); else { setSession(user); if (user) void loadAdminProducts(); } });
  supabase.auth.onAuthStateChange((_event, session) => { const user = session?.user || null; if (user && !isAdmin(user)) { setSession(user); void supabase.auth.signOut(); return; } setSession(user); if (user) void loadAdminProducts(); });
}
loginForm.addEventListener('submit', async (event) => { event.preventDefault(); if (!supabase) return setStatus(initializationError || 'Supabase indisponível.'); if (!CONFIG.adminUserId) return setStatus('Configure o UUID administrador em assets/js/config.js.'); setStatus('Validando acesso…'); const { data, error } = await supabase.auth.signInWithPassword({ email: document.getElementById('admin-email').value.trim(), password: document.getElementById('admin-password').value }); if (error) { console.error(error); setStatus('Não foi possível entrar. Confira o e-mail e a senha.'); return; } document.getElementById('admin-password').value = ''; if (!isAdmin(data.user)) { await supabase.auth.signOut(); setStatus('Esta conta não está autorizada.'); return; } setSession(data.user); await loadAdminProducts(); });
document.getElementById('sign-out').addEventListener('click', async () => { if (supabase) await supabase.auth.signOut(); setSession(null); resetForm(); setStatus('Você saiu da área administrativa.'); });
cancelEdit.addEventListener('click', resetForm);
productForm.addEventListener('submit', async (event) => {
  event.preventDefault(); if (!supabase) return setStatus('Supabase indisponível.');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession(); if (sessionError || !isAdmin(sessionData?.session?.user)) { setSession(null); return setStatus('Sessão não autorizada. Entre novamente.'); }
  if (!schemaReady) return setStatus('Aplique primeiro a migração supabase/catalog_fields.sql para ativar os campos de categoria, cor e estoque.');
  const form = new FormData(productForm), descricao = value(form, 'descricao'), rawPrice = value(form, 'valor'), valor = Number(rawPrice);
  const payload = { descricao, valor, tamanhos: value(form, 'tamanhos'), foto: value(form, 'foto'), publico: value(form, 'publico'), categoria: value(form, 'categoria'), cor: value(form, 'cor'), estoque: value(form, 'estoque') === '' ? null : Number(value(form, 'estoque')) };
  if (!descricao || !rawPrice || !Number.isFinite(valor) || valor < 0 || (payload.estoque !== null && (!Number.isInteger(payload.estoque) || payload.estoque < 0))) return setStatus('Confira nome, preço e estoque: estoque deve ser um inteiro igual ou maior que zero.');
  setStatus('Salvando produto…');
  const query = editingId.value ? supabase.from('produtos').update(payload).eq('id', editingId.value) : supabase.from('produtos').insert(payload);
  const { error } = await query;
  if (error) { console.error('Erro ao salvar produto:', error); setStatus(error.code === '42501' ? 'Acesso bloqueado pela política RLS. Confira supabase/policies.sql.' : `Não foi possível salvar: ${error.message}`); return; }
  const wasEdit = Boolean(editingId.value); resetForm(); setStatus(wasEdit ? 'Alterações salvas.' : 'Produto cadastrado com sucesso!'); await loadAdminProducts();
});
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));

['admin-search','admin-size-filter','admin-color-filter','admin-stock-filter'].forEach((id)=>document.getElementById(id)?.addEventListener('input',renderProducts));
