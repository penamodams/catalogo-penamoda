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
const loginButton = loginForm.querySelector('button[type="submit"]');
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
let authBootstrapComplete = false;
const setStatus = (text) => { status.textContent = text; };
const isAdmin = (user) => Boolean(user && CONFIG.adminUserId && user.id === CONFIG.adminUserId);
const value = (form, key) => String(form.get(key) || '').trim();
const money = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
function explainDbError(error) {
  const message = String(error?.message || 'Erro desconhecido');
  if (error?.code === '42501' || /row-level security|permission denied|not allowed/i.test(message)) return `O banco bloqueou a gravação por segurança (RLS). Confirme o UID em assets/js/config.js e execute supabase/policies.sql no Supabase. Detalhe: ${message}`;
  if (/column|schema cache|does not exist|not found/i.test(message)) return `Faltam colunas no banco. Execute supabase/product_enhancements.sql no Supabase. Detalhe: ${message}`;
  if (/bucket|storage|object/i.test(message)) return `Falha no Storage de imagens. Execute supabase/product_enhancements.sql e confira o bucket produtos. Detalhe: ${message}`;
  return `Falha ao consultar o Supabase: ${message}`;
}
function setSession(user) { const allowed = isAdmin(user); loginForm.hidden = allowed; sessionPanel.hidden = !allowed; userLabel.textContent = allowed ? `Conectado: ${user.email || 'administrador'}` : ''; }
function showPreview(src) { photoPreview.hidden = !src; removePhoto.hidden = !src; if (src) photoPreview.src = src; }
function clearPreview() { if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl); previewObjectUrl = ''; photoInput.value = ''; showPreview(''); }
photoInput.addEventListener('change', () => { const file = photoInput.files?.[0]; if (!file) return; if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { photoInput.value = ''; setStatus('Escolha uma imagem JPG, PNG ou WebP.'); return; } if (file.size > 8 * 1024 * 1024) { photoInput.value = ''; setStatus('A imagem deve ter no máximo 8 MB.'); return; } if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl); previewObjectUrl = URL.createObjectURL(file); showPreview(previewObjectUrl); photoUrl.value = ''; });
photoUrl.addEventListener('input', () => { if (!photoInput.files?.length) showPreview(photoUrl.value.trim()); });
removePhoto.addEventListener('click', () => { clearPreview(); photoUrl.value = ''; });
function syncSizes() { const custom = customInput.value.split(',').map((x) => x.trim()).filter(Boolean); customSizes = custom.filter((x) => !selectedSizes.has(x)); sizesHidden.value = [...selectedSizes, ...customSizes].join(','); }
function renderSizeOptions(publico, initial = []) {
  selectedSizes = new Set(); customSizes = []; sizeSelector.replaceChildren(); customWrap.hidden = true; customInput.value = ''; const options = sizeOptions[publico] || [];
  if (!publico) { const note = document.createElement('p'); note.className = 'help-text'; note.textContent = 'Escolha o público para ver os tamanhos disponíveis.'; sizeSelector.append(note); sizesHidden.value = ''; return; }
  options.forEach((size) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'size-option'; button.textContent = size; button.setAttribute('aria-pressed','false'); button.addEventListener('click', () => { if (selectedSizes.has(size)) selectedSizes.delete(size); else selectedSizes.add(size); button.classList.toggle('selected', selectedSizes.has(size)); button.setAttribute('aria-pressed',String(selectedSizes.has(size))); syncSizes(); }); sizeSelector.append(button); });
  const other = document.createElement('button'); other.type = 'button'; other.className = 'size-option size-other'; other.textContent = 'Outro'; other.setAttribute('aria-expanded','false'); other.addEventListener('click', () => { customWrap.hidden = !customWrap.hidden; other.classList.toggle('selected',!customWrap.hidden); other.setAttribute('aria-expanded',String(!customWrap.hidden)); if (!customWrap.hidden) customInput.focus(); syncSizes(); }); sizeSelector.append(other);
  initial.forEach((size) => { if (options.includes(size)) { selectedSizes.add(size); const button = [...sizeSelector.querySelectorAll('.size-option')].find((b) => b.textContent === size); button?.classList.add('selected'); button?.setAttribute('aria-pressed','true'); } });
  const custom = initial.filter((size) => !options.includes(size)); if (custom.length) { customWrap.hidden = false; other.classList.add('selected'); other.setAttribute('aria-expanded','true'); customInput.value = custom.join(', '); } syncSizes();
}
publicoSelect.addEventListener('change', () => renderSizeOptions(publicoSelect.value)); customInput.addEventListener('input', syncSizes);
function resetForm() { productForm.reset(); editingId.value = ''; photoUrl.value = ''; clearPreview(); $('save-product').textContent = 'Salvar e publicar produto'; cancelEdit.hidden = true; renderSizeOptions(''); }
function renderProducts() {
  productList.replaceChildren(); if (!products.length) { const empty = document.createElement('p'); empty.className = 'help-text'; empty.textContent = 'Nenhum produto cadastrado.'; productList.append(empty); return; }
  products.forEach((p) => { const row = document.createElement('article'); row.className = 'admin-product-row'; if (p.foto) { const img = document.createElement('img'); img.src = p.foto; img.alt = ''; img.className = 'admin-product-thumb'; row.append(img); } const details = document.createElement('div'); const title = document.createElement('strong'); title.textContent = p.descricao || 'Produto sem nome'; const meta = document.createElement('p'); meta.textContent = `${p.codigo ? `SKU ${p.codigo} · ` : ''}${p.preco_desconto ? `${money(p.preco_desconto)} (de ${money(p.valor)})` : money(p.valor)} · Tamanhos: ${p.tamanhos || '—'} · Estoque: ${p.estoque ?? 'Não informado'}`; details.append(title,meta); const actions = document.createElement('div'); actions.className = 'admin-row-actions'; const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'secondary-button'; edit.textContent = 'Editar'; edit.addEventListener('click', () => startEdit(p)); const del = document.createElement('button'); del.type = 'button'; del.className = 'secondary-button danger-button'; del.textContent = 'Excluir'; del.addEventListener('click', () => deleteProduct(p)); actions.append(edit,del); row.append(details,actions); productList.append(row); });
}
function startEdit(p) { editingId.value = String(p.id); for (const key of ['codigo','descricao','valor','publico','categoria','cor','estoque','preco_desconto']) productForm.elements[key].value = p[key] ?? ''; photoUrl.value = p.foto || ''; if (p.foto) showPreview(p.foto); else showPreview(''); renderSizeOptions(p.publico || '',String(p.tamanhos || '').split(',').map((x) => x.trim()).filter(Boolean)); $('save-product').textContent = 'Salvar alterações'; cancelEdit.hidden = false; productForm.scrollIntoView({behavior:'smooth',block:'center'}); }
async function loadProducts() {
  setStatus('Consultando produtos no banco…');
  const { data,error } = await supabase.from('produtos').select('id,codigo,descricao,valor,preco_desconto,tamanhos,foto,publico,categoria,cor,estoque').order('descricao');
  if (error) { schemaReady = false; console.error('Erro ao consultar tabela produtos:',error); setStatus(explainDbError(error)); return; }
  schemaReady = true; products = data || []; renderProducts(); setStatus(`${products.length} produto(s) carregado(s) do banco.`);
}
async function uploadPhoto() {
  const file = photoInput.files?.[0]; if (!file) return photoUrl.value.trim();
  const cleanName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g,'-'); const path = `${Date.now()}-${crypto.randomUUID()}-${cleanName}`;
  const { error } = await supabase.storage.from('produtos').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
  if (error) throw new Error(explainDbError(error)); return supabase.storage.from('produtos').getPublicUrl(path).data.publicUrl;
}
async function deleteProduct(p) { if (!confirm(`Excluir “${p.descricao}” permanentemente?`)) return; const {error}=await supabase.from('produtos').delete().eq('id',p.id); if(error)return setStatus(explainDbError(error)); setStatus('Produto excluído.'); await loadProducts(); }
setSession(null); loginButton.disabled = true;
if (!supabase) { setStatus(initializationError || 'Não foi possível conectar ao Supabase.'); }
else {
  supabase.auth.onAuthStateChange((event,session) => { if(!authBootstrapComplete)return; if(event==='SIGNED_OUT'){setSession(null);return;} if(['SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED'].includes(event)&&session?.user){if(!isAdmin(session.user)){void supabase.auth.signOut({scope:'local'});setSession(null);setStatus('Esta conta não está autorizada como administradora.');return;}setSession(session.user);if(event==='SIGNED_IN')setTimeout(()=>void loadProducts(),0);} });
  supabase.auth.signOut({scope:'local'}).then(({error})=>{if(error)console.warn(error);authBootstrapComplete=true;loginButton.disabled=false;setSession(null);setStatus('Digite seu e-mail e sua senha para entrar na área da loja.');}).catch((error)=>{authBootstrapComplete=true;loginButton.disabled=false;setSession(null);console.error(error);setStatus('Digite seu e-mail e sua senha para entrar na área da loja.');});
}
loginForm.addEventListener('submit',async(event)=>{event.preventDefault();if(!supabase)return setStatus(initializationError||'Supabase indisponível.');const email=$('admin-email').value.trim();const password=$('admin-password').value;loginButton.disabled=true;setStatus('Entrando…');const {data,error}=await supabase.auth.signInWithPassword({email,password});loginButton.disabled=false;if(error)return setStatus('Não foi possível entrar. Confira o e-mail e a senha no Supabase.');if(!isAdmin(data.user)){await supabase.auth.signOut({scope:'local'});setSession(null);return setStatus('Esta conta não está autorizada como administradora.');}setSession(data.user);$('admin-password').value='';await loadProducts();});
$('sign-out').addEventListener('click',async()=>{if(supabase)await supabase.auth.signOut({scope:'local'});setSession(null);resetForm();setStatus('Você saiu da área administrativa.');}); cancelEdit.addEventListener('click',resetForm);
productForm.addEventListener('submit',async(event)=>{
  event.preventDefault(); if(!supabase)return setStatus('Supabase indisponível.'); const {data:sessionData,error:sessionError}=await supabase.auth.getSession(); if(sessionError||!isAdmin(sessionData?.session?.user)){setSession(null);return setStatus('Sessão administrativa inválida. Entre novamente.');} if(!schemaReady)return setStatus('O banco ainda não está pronto. Confira as instruções acima e recarregue o painel.');
  syncSizes();const form=new FormData(productForm);const rawPrice=value(form,'valor');const price=Number(rawPrice);const rawDiscount=value(form,'preco_desconto');const discount=rawDiscount?Number(rawDiscount):null;const stockRaw=value(form,'estoque');const selectedPublic=value(form,'publico');
  if(!value(form,'descricao')||!rawPrice||!Number.isFinite(price)||price<0)return setStatus('Informe a descrição e um preço válido.'); if(discount!==null&&(!Number.isFinite(discount)||discount<=0||discount>=price))return setStatus('O preço promocional deve ser maior que zero e menor que o preço de venda.'); if(!selectedPublic)return setStatus('Selecione o público para habilitar os tamanhos.');if(!sizesHidden.value)return setStatus('Selecione ao menos um tamanho ou informe um tamanho em “Outro”.'); const stock=stockRaw===''?null:Number(stockRaw);if(stock!==null&&(!Number.isInteger(stock)||stock<0))return setStatus('O estoque deve ser um inteiro igual ou maior que zero.');
  setStatus('Salvando produto…');$('save-product').disabled=true;
  try { const foto=await uploadPhoto();const payload={codigo:value(form,'codigo')||null,descricao:value(form,'descricao'),valor:price,preco_desconto:discount,tamanhos:sizesHidden.value,publico:selectedPublic,categoria:value(form,'categoria')||null,cor:value(form,'cor')||null,estoque:stock,foto:foto||null};const query=editingId.value?supabase.from('produtos').update(payload).eq('id',editingId.value):supabase.from('produtos').insert(payload);const {error}=await query;if(error)throw error;const edited=Boolean(editingId.value);resetForm();setStatus(edited?'Produto atualizado no banco.':'Produto cadastrado no banco.');await loadProducts();
  }catch(error){console.error('Erro ao salvar produto no Supabase:',error);setStatus(explainDbError(error));}finally{$('save-product').disabled=false;}
});
renderSizeOptions('');
