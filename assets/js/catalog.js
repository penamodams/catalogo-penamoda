import { CONFIG } from './config.js';
import { supabase, initializationError } from './supabase-client.js';

const CART_KEY = 'penamoda-carrinho-v1';
const money = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const phone = String(CONFIG.whatsapp).replace(/\D/g, '');
const catalog = document.getElementById('catalogo');
const cartList = document.getElementById('itens-carrinho');
const cartDialog = document.getElementById('carrinho');
const cart = loadCart();
let products = [];
let catalogHasMetadata = true;
let requestNumber = 0;

function loadCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter((item) => item && typeof item.name === 'string' && typeof item.size === 'string' && Number.isFinite(item.price) && item.price >= 0 && Number.isInteger(item.quantity) && item.quantity > 0) : [];
  } catch { return []; }
}
function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (error) { console.warn('Não foi possível salvar o carrinho.', error); } }
function fallbackImage() { return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#F4F8FA"/><text x="200" y="250" fill="#0A2E66" font-family="sans-serif" font-size="20" text-anchor="middle">Foto em breve</text></svg>'); }
function imageUrl(value) {
  const path = String(value ?? '').trim(); if (!path) return fallbackImage();
  try { const url = new URL(path); if (url.protocol === 'https:' || url.protocol === 'http:') return url.href; } catch { /* Relative repository path. */ }
  const parts = path.replaceAll('\\', '/').split('/').filter(Boolean);
  if (!parts.length || parts.some((part) => part === '.' || part === '..')) return fallbackImage();
  return CONFIG.imageBaseUrl + parts.map(encodeURIComponent).join('/');
}
function listValues(value) { const list = Array.isArray(value) ? value : String(value ?? '').split(','); return [...new Set(list.map((item) => String(item).trim()).filter(Boolean))]; }
function showState(title, message, retry = false) {
  catalog.setAttribute('aria-busy', 'false');
  const state = document.createElement('div'); state.className = 'state'; state.setAttribute('role', 'status');
  const strong = document.createElement('strong'); strong.textContent = title;
  const text = document.createElement('span'); text.textContent = message; state.append(strong, text);
  if (retry) { const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Tentar de novo'; button.addEventListener('click', loadProducts); state.append(document.createElement('br'), button); }
  catalog.replaceChildren(state);
}
function showLoading() {
  catalog.setAttribute('aria-busy', 'true');
  catalog.replaceChildren(...Array.from({ length: 8 }, () => { const card = document.createElement('div'); card.className = 'card skeleton'; card.setAttribute('aria-hidden', 'true'); const photo = document.createElement('div'); photo.className = 'photo'; const line = document.createElement('div'); line.className = 'line'; const short = document.createElement('div'); short.className = 'line short'; card.append(photo, line, short); return card; }));
}
function createCard(product, index) {
  const name = String(product.descricao ?? '').trim() || 'Produto sem nome';
  const price = Number(product.valor); const validPrice = product.valor !== null && product.valor !== undefined && String(product.valor).trim() !== '' && Number.isFinite(price) && price >= 0;
  const stock = product.estoque === null || product.estoque === undefined || product.estoque === '' ? null : Number(product.estoque);
  const card = document.createElement('article'); card.className = 'card';
  card.dataset.name = name; card.dataset.price = validPrice ? String(price) : ''; card.dataset.id = product.id || '';
  card.dataset.publico = product.publico || ''; card.dataset.categoria = product.categoria || ''; card.dataset.cor = product.cor || '';
  card.dataset.estoque = stock === null || !Number.isFinite(stock) ? '' : String(stock);
  const frame = document.createElement('div'); frame.className = 'photo'; const image = document.createElement('img');
  image.src = imageUrl(product.foto); image.alt = name; image.width = 400; image.height = 500; image.decoding = 'async'; if (index >= 4) image.loading = 'lazy';
  image.addEventListener('error', () => { if (image.src !== fallbackImage()) image.src = fallbackImage(); }); frame.append(image);
  const title = document.createElement('h3'); title.textContent = name;
  const priceElement = document.createElement('p'); priceElement.className = 'price'; priceElement.textContent = validPrice ? money(price) : 'Consulte';
  card.append(frame, title, priceElement);
  if (product.cor) { const color = document.createElement('p'); color.className = 'product-meta'; color.textContent = `Cor: ${product.cor}`; card.append(color); }
  if (stock !== null && Number.isFinite(stock)) { const availability = document.createElement('p'); availability.className = stock > 0 ? 'stock-available' : 'stock-unavailable'; availability.textContent = stock > 0 ? `Disponível · ${stock} em estoque` : 'Esgotado'; card.append(availability); }
  const sizes = listValues(product.tamanhos);
  if (sizes.length) { const group = document.createElement('div'); group.className = 'sizes'; group.setAttribute('role', 'group'); group.setAttribute('aria-label', `Escolha o tamanho de ${name}`); sizes.forEach((size) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'size-btn'; button.setAttribute('aria-pressed', 'false'); button.textContent = size; group.append(button); }); card.append(group); }
  const add = document.createElement('button'); add.type = 'button'; add.className = 'add-cart'; add.textContent = 'Adicionar ao carrinho'; add.disabled = !validPrice || stock === 0;
  const notice = document.createElement('p'); notice.className = 'card-notice'; notice.setAttribute('aria-live', 'polite'); card.append(add, notice); return card;
}
function updateOptions(id, values, firstLabel) {
  const select = document.getElementById(id); const previous = select.value;
  select.replaceChildren(new Option(firstLabel, ''));
  values.sort((a, b) => a.localeCompare(b, 'pt-BR')).forEach((value) => select.add(new Option(value, value)));
  if (values.includes(previous)) select.value = previous;
}
function configureFilters() {
  updateOptions('filtro-publico', [...new Set(products.map((p) => p.publico).filter(Boolean))], 'Todos');
  updateOptions('filtro-categoria', [...new Set(products.map((p) => p.categoria).filter(Boolean))], 'Todas');
  updateOptions('filtro-cor', [...new Set(products.map((p) => p.cor).filter(Boolean))], 'Todas');
  updateOptions('filtro-tamanho', [...new Set(products.flatMap((p) => listValues(p.tamanhos)))], 'Todos');
  document.querySelectorAll('#painel-filtros select, #painel-filtros input').forEach((control) => {
    control.addEventListener('input', applyFilters);
    control.addEventListener('change', applyFilters);
  });
  document.getElementById('limpar-filtros').addEventListener('click', () => {
    document.querySelectorAll('#painel-filtros select').forEach((select) => { select.value = select.id === 'ordenar-produtos' ? 'relevancia' : ''; });
    ['busca-produtos','preco-min','preco-max'].forEach((id) => { document.getElementById(id).value = ''; });
    document.getElementById('somente-disponiveis').checked = false;
    applyFilters();
  });
  document.getElementById('abrir-filtros').addEventListener('click', () => {
    const panel = document.getElementById('painel-filtros');
    const open = panel.classList.toggle('filters-open');
    document.getElementById('abrir-filtros').setAttribute('aria-expanded', String(open));
  });
}
function applyFilters() {
  const search = document.getElementById('busca-produtos').value.trim().toLocaleLowerCase('pt-BR');
  const audience = document.getElementById('filtro-publico').value, category = document.getElementById('filtro-categoria').value;
  const color = document.getElementById('filtro-cor').value, size = document.getElementById('filtro-tamanho').value;
  const availableOnly = document.getElementById('somente-disponiveis').checked;
  const minValue = document.getElementById('preco-min').value === '' ? null : Number(document.getElementById('preco-min').value);
  const maxValue = document.getElementById('preco-max').value === '' ? null : Number(document.getElementById('preco-max').value);
  const sort = document.getElementById('ordenar-produtos').value;
  const matches = [];
  catalog.querySelectorAll('.card:not(.skeleton)').forEach((card) => {
    const product = products.find((item) => String(item.id || '') === card.dataset.id && card.dataset.id) || products.find((item) => item.descricao === card.dataset.name);
    if (!product) { card.hidden = true; return; }
    const text = [product.descricao, product.publico, product.categoria, product.cor, product.marca, product.modelo].join(' ').toLocaleLowerCase('pt-BR');
    const stock = product.estoque === null || product.estoque === undefined || product.estoque === '' ? null : Number(product.estoque);
    const price = Number(product.valor);
    const validPrice = Number.isFinite(price);
    const ok = (!search || text.includes(search)) && (!audience || product.publico === audience) && (!category || product.categoria === category) && (!color || product.cor === color) && (!size || listValues(product.tamanhos).includes(size)) && (!availableOnly || (stock !== null && stock > 0)) && (minValue === null || (validPrice && price >= minValue)) && (maxValue === null || (validPrice && price <= maxValue));
    card.hidden = !ok;
    if (ok) matches.push({card, product, price});
  });
  matches.sort((a,b) => sort === 'menor-preco' ? a.price-b.price : sort === 'maior-preco' ? b.price-a.price : sort === 'nome' ? String(a.product.descricao).localeCompare(String(b.product.descricao),'pt-BR') : 0);
  matches.forEach(({card}) => catalog.append(card));
  const visible = matches.length;
  document.getElementById('resultado-filtros').textContent = visible ? `${visible} ${visible === 1 ? 'produto encontrado' : 'produtos encontrados'}` : 'Nenhum produto encontrado com esses filtros.';
  const active = [];
  if (search) active.push(['Busca: '+search, 'busca-produtos']);
  [[audience,'filtro-publico'],[category,'filtro-categoria'],[size,'filtro-tamanho'],[color,'filtro-cor']].forEach(([v,id])=>{if(v)active.push([v,id]);});
  if(minValue!==null)active.push(['A partir de '+money(minValue),'preco-min']);
  if(maxValue!==null)active.push(['Até '+money(maxValue),'preco-max']);
  if(availableOnly)active.push(['Disponíveis','somente-disponiveis']);
  const chips=document.getElementById('filtros-ativos'); chips.replaceChildren();
  active.forEach(([label,id])=>{const chip=document.createElement('button');chip.type='button';chip.className='filter-chip';chip.textContent=label+' ×';chip.addEventListener('click',()=>{const el=document.getElementById(id);if(el.type==='checkbox')el.checked=false;else el.value='';applyFilters();});chips.append(chip);});
}
async function loadProducts() {
  const request = ++requestNumber; showLoading();
  if (!supabase) { showState('Catálogo indisponível', initializationError || 'Confira a conexão com o Supabase.', true); return; }
  let response = await supabase.from('produtos').select('id, descricao, valor, tamanhos, foto, publico, categoria, cor, estoque');
  if (response.error && /column|schema cache|does not exist|not found/i.test(response.error.message || '')) {
    console.warn('Metadados de catálogo ainda não foram migrados. Tentando formato legado.');
    catalogHasMetadata = false;
    response = await supabase.from('produtos').select('descricao, valor, tamanhos, foto');
  }
  const { data, error } = response;
  if (request !== requestNumber) return;
  if (error) { console.error('Erro ao carregar produtos:', error); showState('Erro ao carregar catálogo', error.message || 'Verifique sua conexão e as permissões de leitura da tabela produtos.', true); return; }
  if (!Array.isArray(data) || !data.length) { products = []; showState('Nenhum produto por aqui ainda', 'Em breve teremos novidades!'); return; }
  products = data; const fragment = document.createDocumentFragment(); data.forEach((product, index) => fragment.append(createCard(product ?? {}, index)));
  catalog.replaceChildren(fragment); catalog.setAttribute('aria-busy', 'false'); configureFilters(); applyFilters();
}

function renderCart() {
  cartList.replaceChildren();
  if (!cart.length) { const empty = document.createElement('p'); empty.className = 'cart-empty'; empty.textContent = 'Seu carrinho está vazio.'; cartList.append(empty); }
  cart.forEach((item, index) => {
    const row = document.createElement('article'); row.className = 'cart-item'; const details = document.createElement('div');
    const name = document.createElement('h3'); name.textContent = item.name; const info = document.createElement('p'); info.textContent = [item.color && `Cor: ${item.color}`, `Tamanho: ${item.size}`].filter(Boolean).join(' · ');
    const price = document.createElement('p'); price.className = 'cart-item-price'; price.textContent = `${item.quantity} × ${money(item.price)} = ${money(item.price * item.quantity)}`; details.append(name, info, price);
    const controls = document.createElement('div'); controls.className = 'cart-controls';
    for (const [action, label, aria] of [['decrease', '−', 'Diminuir quantidade'], ['increase', '+', 'Aumentar quantidade'], ['remove', '×', 'Remover item']]) { const button = document.createElement('button'); button.type = 'button'; button.className = action === 'remove' ? 'remove-button' : 'quantity-button'; button.dataset.action = action; button.dataset.index = String(index); button.textContent = label; button.setAttribute('aria-label', aria); controls.append(button); if (action === 'decrease') { const qty = document.createElement('span'); qty.textContent = String(item.quantity); controls.append(qty); } }
    row.append(details, controls); cartList.append(row);
  });
  const qty = cart.reduce((sum, item) => sum + item.quantity, 0), amount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = document.getElementById('quantidade-carrinho'); count.textContent = String(qty); count.setAttribute('aria-label', `${qty} ${qty === 1 ? 'item' : 'itens'}`);
  document.getElementById('total-carrinho').textContent = money(amount);
  document.getElementById('finalizar-pedido').disabled = cart.length === 0 || !phone;
  document.getElementById('aviso-checkout').textContent = phone ? '' : 'Configure o WhatsApp em assets/js/config.js para habilitar pedidos.'; saveCart();
}

cartList.addEventListener('click', (event) => { const button = event.target.closest('[data-action]'); if (!button) return; const index = Number(button.dataset.index), item = cart[index]; if (!item) return; if (button.dataset.action === 'increase') item.quantity++; if (button.dataset.action === 'decrease') item.quantity--; if (button.dataset.action === 'remove' || item.quantity <= 0) cart.splice(index, 1); renderCart(); });
document.getElementById('abrir-carrinho').addEventListener('click', () => cartDialog.showModal());
document.getElementById('finalizar-pedido').addEventListener('click', () => { if (!phone || !cart.length) return; const lines = cart.map((item) => `• ${item.name}${item.color ? ` — ${item.color}` : ''} — tam. ${item.size} — ${item.quantity}x ${money(item.price)} = ${money(item.price * item.quantity)}`); const amount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0); window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Olá! Gostaria de fazer este pedido:\n${lines.join('\n')}\n\nTotal: ${money(amount)}`)}`, '_blank', 'noopener,noreferrer'); });
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
cartDialog.addEventListener('click', (event) => { if (event.target === cartDialog) cartDialog.close(); });

catalog.addEventListener('click', (event) => {
  const sizeButton = event.target.closest('.size-btn');
  if (sizeButton) { const card = sizeButton.closest('.card'), selected = sizeButton.getAttribute('aria-pressed') === 'true'; card.querySelectorAll('.size-btn').forEach((button) => button.setAttribute('aria-pressed', 'false')); sizeButton.setAttribute('aria-pressed', String(!selected)); card.querySelector('.card-notice').textContent = ''; return; }
  const add = event.target.closest('.add-cart'); if (!add) return;
  const card = add.closest('.card'), selected = card.querySelector('.size-btn[aria-pressed="true"]'), hasSizes = Boolean(card.querySelector('.sizes')), notice = card.querySelector('.card-notice');
  if (hasSizes && !selected) { notice.textContent = 'Selecione um tamanho.'; card.querySelector('.size-btn')?.focus(); return; }
  const product = products.find((item) => (card.dataset.id && String(item.id) === card.dataset.id) || (!card.dataset.id && item.descricao === card.dataset.name));
  const price = Number(card.dataset.price); if (!product || !Number.isFinite(price)) { notice.textContent = 'Preço indisponível.'; return; }
  const size = selected?.textContent || 'Único', color = product.cor || '';
  const existing = cart.find((item) => item.name === card.dataset.name && item.size === size && item.color === color && item.price === price);
  const availableStock = product.estoque === null || product.estoque === undefined || product.estoque === '' ? null : Number(product.estoque);
  if (availableStock !== null && (!Number.isFinite(availableStock) || (existing?.quantity || 0) >= availableStock)) { notice.textContent = 'Não há mais unidades disponíveis em estoque.'; return; }
  if (existing) existing.quantity++; else cart.push({ name: card.dataset.name, size, color, price, quantity: 1 }); renderCart(); notice.textContent = 'Adicionado ao carrinho!';
});
renderCart();
loadProducts();
