import { CONFIG } from './config.js';
import { supabase, initializationError } from './supabase-client.js';

const KEY = 'penamoda-carrinho-v1';
const money = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const cart = load();
const list = document.getElementById('itens-carrinho');
const count = document.getElementById('quantidade-carrinho');
const total = document.getElementById('total-carrinho');
const dialog = document.getElementById('carrinho');
const phone = String(CONFIG.whatsapp).replace(/\D/g, '');

function load() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => item && typeof item.name === 'string' && typeof item.size === 'string' && Number.isFinite(item.price) && item.price >= 0 && Number.isInteger(item.quantity) && item.quantity > 0) : [];
  } catch { return []; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (error) { console.warn('Não foi possível salvar o carrinho.', error); } }
function render() {
  list.replaceChildren();
  if (!cart.length) {
    const empty = document.createElement('p'); empty.className = 'cart-empty'; empty.textContent = 'Seu carrinho está vazio.'; list.append(empty);
  }
  cart.forEach((item, index) => {
    const row = document.createElement('article'); row.className = 'cart-item';
    const details = document.createElement('div');
    const name = document.createElement('h3'); name.textContent = item.name;
    const size = document.createElement('p'); size.textContent = `Tamanho: ${item.size}`;
    const price = document.createElement('p'); price.className = 'cart-item-price'; price.textContent = `${money(item.price)} cada`;
    details.append(name, size, price);
    const controls = document.createElement('div'); controls.className = 'cart-controls';
    for (const [action, label, aria] of [['decrease', '−', 'Diminuir quantidade'], ['increase', '+', 'Aumentar quantidade'], ['remove', '×', 'Remover item']]) {
      const button = document.createElement('button'); button.type = 'button'; button.className = action === 'remove' ? 'remove-button' : 'quantity-button';
      button.dataset.action = action; button.dataset.index = String(index); button.textContent = label; button.setAttribute('aria-label', aria); controls.append(button);
      if (action === 'decrease') { const qty = document.createElement('span'); qty.textContent = String(item.quantity); controls.append(qty); }
    }
    row.append(details, controls); list.append(row);
  });
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const amount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  count.textContent = String(itemCount); count.setAttribute('aria-label', `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`);
  total.textContent = money(amount);
  document.getElementById('finalizar-pedido').disabled = cart.length === 0 || !phone;
  document.getElementById('aviso-checkout').textContent = phone ? '' : 'Configure o WhatsApp em assets/js/config.js para habilitar pedidos.';
  save();
}

export function addToCart(product, size) {
  const existing = cart.find((item) => item.name === product.name && item.size === size && item.price === product.price);
  if (existing) existing.quantity += 1;
  else cart.push({ name: product.name, size, price: product.price, quantity: 1 });
  render();
}

list.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const item = cart[Number(button.dataset.index)]; if (!item) return;
  if (button.dataset.action === 'increase') item.quantity += 1;
  if (button.dataset.action === 'decrease') item.quantity -= 1;
  if (button.dataset.action === 'remove' || item.quantity <= 0) cart.splice(Number(button.dataset.index), 1);
  render();
});
document.getElementById('abrir-carrinho').addEventListener('click', () => dialog.showModal());
document.getElementById('finalizar-pedido').addEventListener('click', () => {
  if (!phone || !cart.length) return;
  const lines = cart.map((item) => `• ${item.name} — tam. ${item.size} — ${item.quantity}x ${money(item.price)} = ${money(item.price * item.quantity)}`);
  const amount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const message = `Olá! Gostaria de fazer este pedido:\n${lines.join('\n')}\n\nTotal: ${money(amount)}`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
});
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
render();

const container = document.getElementById('catalogo');
const FALLBACK = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#F4F8FA"/><text x="200" y="250" fill="#0A2E66" font-family="sans-serif" font-size="20" text-anchor="middle">Foto em breve</text></svg>');
function sizesFrom(value) { const values = Array.isArray(value) ? value : String(value ?? '').split(','); return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))]; }
function photoUrl(value) {
  const path = String(value ?? '').trim(); if (!path) return FALLBACK;
  try { const url = new URL(path); if (url.protocol === 'https:' || url.protocol === 'http:') return url.href; } catch { /* Treat it as a repository-relative path. */ }
  const parts = path.replaceAll('\\', '/').split('/').filter(Boolean);
  if (!parts.length || parts.some((part) => part === '.' || part === '..')) return FALLBACK;
  return CONFIG.imageBaseUrl + parts.map(encodeURIComponent).join('/');
}
function showState(title, message, retry = false) {
  container.setAttribute('aria-busy', 'false');
  const state = document.createElement('div'); state.className = 'state'; state.setAttribute('role', 'status');
  const heading = document.createElement('strong'); heading.textContent = title;
  const text = document.createElement('span'); text.textContent = message; state.append(heading, text);
  if (retry) { const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Tentar de novo'; button.addEventListener('click', loadProducts); state.append(document.createElement('br'), button); }
  container.replaceChildren(state);
}
function showLoading() {
  container.setAttribute('aria-busy', 'true');
  container.replaceChildren(...Array.from({ length: 8 }, () => {
    const card = document.createElement('div'); card.className = 'card skeleton'; card.setAttribute('aria-hidden', 'true');
    const photo = document.createElement('div'); photo.className = 'photo'; const line = document.createElement('div'); line.className = 'line';
    const short = document.createElement('div'); short.className = 'line short'; card.append(photo, line, short); return card;
  }));
}
function createCard(product, index) {
  const name = String(product.descricao ?? '').trim() || 'Produto sem nome';
  const price = Number(product.valor); const validPrice = product.valor !== null && product.valor !== undefined && String(product.valor).trim() !== '' && Number.isFinite(price) && price >= 0;
  const card = document.createElement('article'); card.className = 'card';
  const frame = document.createElement('div'); frame.className = 'photo'; const image = document.createElement('img');
  image.src = photoUrl(product.foto); image.alt = name; image.width = 400; image.height = 500; image.decoding = 'async'; if (index >= 4) image.loading = 'lazy';
  image.addEventListener('error', () => { if (image.src !== FALLBACK) image.src = FALLBACK; }); frame.append(image);
  const title = document.createElement('h3'); title.textContent = name;
  const priceText = document.createElement('p'); priceText.className = 'price'; priceText.textContent = validPrice ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Consulte';
  card.append(frame, title, priceText);
  const sizes = sizesFrom(product.tamanhos);
  if (sizes.length) {
    const group = document.createElement('div'); group.className = 'sizes'; group.setAttribute('role', 'group'); group.setAttribute('aria-label', `Escolha o tamanho de ${name}`);
    sizes.forEach((size) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'size-btn'; button.setAttribute('aria-pressed', 'false'); button.textContent = size; group.append(button); }); card.append(group);
  }
  const add = document.createElement('button'); add.type = 'button'; add.className = 'add-cart'; add.textContent = 'Adicionar ao carrinho'; add.disabled = !validPrice;
  const notice = document.createElement('p'); notice.className = 'card-notice'; notice.setAttribute('aria-live', 'polite'); card.append(add, notice);
  card.dataset.name = name; card.dataset.price = validPrice ? String(price) : '';
  return card;
}
let requestNumber = 0;
async function loadProducts() {
  const request = ++requestNumber; showLoading();
  if (!supabase) { showState('Catálogo indisponível', initializationError || 'Confira a conexão com o Supabase.', true); return; }
  try {
    const { data, error } = await supabase.from('produtos').select('descricao, valor, tamanhos, foto');
    if (error) throw error; if (request !== requestNumber) return;
    if (!Array.isArray(data) || data.length === 0) { showState('Nenhum produto por aqui ainda', 'Em breve teremos novidades!'); return; }
    const fragment = document.createDocumentFragment(); data.forEach((product, index) => fragment.append(createCard(product ?? {}, index)));
    container.replaceChildren(fragment); container.setAttribute('aria-busy', 'false');
  } catch (error) {
    if (request !== requestNumber) return; console.error('Erro ao carregar produtos:', error);
    showState('Erro ao carregar catálogo', error?.message || 'Verifique sua conexão e as permissões de leitura da tabela produtos.', true);
  }
}
container.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const sizeButton = event.target.closest('.size-btn');
  if (sizeButton) { const card = sizeButton.closest('.card'); const wasSelected = sizeButton.getAttribute('aria-pressed') === 'true'; card.querySelectorAll('.size-btn').forEach((button) => button.setAttribute('aria-pressed', 'false')); sizeButton.setAttribute('aria-pressed', String(!wasSelected)); card.querySelector('.card-notice').textContent = ''; return; }
  const addButton = event.target.closest('.add-cart'); if (!addButton) return;
  const card = addButton.closest('.card'); const selected = card.querySelector('.size-btn[aria-pressed="true"]'); const hasSizes = Boolean(card.querySelector('.sizes')); const notice = card.querySelector('.card-notice');
  if (hasSizes && !selected) { notice.textContent = 'Selecione um tamanho.'; card.querySelector('.size-btn')?.focus(); return; }
  const price = Number(card.dataset.price); if (!Number.isFinite(price)) { notice.textContent = 'Preço indisponível.'; return; }
  addToCart({ name: card.dataset.name, price }, selected?.textContent || 'Único'); notice.textContent = 'Adicionado ao carrinho!';
});
loadProducts();
