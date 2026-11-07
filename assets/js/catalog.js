import { CONFIG } from './config.js';
import { supabase, initializationError } from './supabase-client.js';

const CART_KEY = 'penamoda-carrinho-v1';
const money = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const phone = String(CONFIG.whatsapp || '').replace(/\D/g, '');
const catalog = document.getElementById('catalogo');
const cartList = document.getElementById('itens-carrinho');
const cartDialog = document.getElementById('carrinho');

let products = [];
let cart = loadCart();

function loadCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter((item) => item && typeof item.name === 'string' && typeof item.size === 'string' && Number.isFinite(item.price) && item.price >= 0 && Number.isInteger(item.quantity) && item.quantity > 0) : [];
  } catch { return []; }
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (error) {
    console.warn('Não foi possível salvar o carrinho.', error);
  }
}

function fallbackImage() {
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#F4F8FA"/><text x="50%" y="50%" text-anchor="middle" fill="#667085" font-family="sans-serif" font-size="20">Foto indisponível</text></svg>');
}

function imageUrl(value) {
  const path = String(value ?? '').trim();
  if (!path) return fallbackImage();

  try {
    const url = new URL(path);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
  } catch {
    // caminho relativo do repositório
  }

  const parts = path.replaceAll('\\', '/').split('/').filter(Boolean);
  if (!parts.length || parts.some((part) => part === '.' || part === '..')) return fallbackImage();
  return CONFIG.imageBaseUrl + parts.map(encodeURIComponent).join('/');
}

function listValues(value) {
  const list = Array.isArray(value) ? value : String(value ?? '').split(',');
  return [...new Set(list.map((item) => String(item).trim()).filter(Boolean))];
}

function showState(title, message, retry = false) {
  catalog.setAttribute('aria-busy', 'false');
  const state = document.createElement('div');
  state.className = 'state';
  state.setAttribute('role', 'status');
  const strong = document.createElement('strong');
  strong.textContent = title;
  const text = document.createElement('span');
  text.textContent = message;
  state.append(strong, text);

  if (retry) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Tentar de novo';
    button.addEventListener('click', loadProducts);
    state.append(button);
  }

  catalog.replaceChildren(state);
}

function createCard(product, index) {
  const name = String(product.descricao || '').trim() || 'Produto sem nome';
  const price = Number(product.valor);
  const validPrice = product.valor !== null && product.valor !== undefined && String(product.valor).trim() !== '' && Number.isFinite(price) && price >= 0;
  const stock = product.estoque === null || product.estoque === undefined || product.estoque === '' ? null : Number(product.estoque);
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.id = String(product.id || '');
  card.dataset.name = name;
  card.dataset.price = validPrice ? String(price) : '';

  const frame = document.createElement('div');
  frame.className = 'photo';
  const image = document.createElement('img');
  image.src = imageUrl(product.foto);
  image.alt = name;
  image.width = 400;
  image.height = 500;
  image.decoding = 'async';
  if (index >= 4) image.loading = 'lazy';
  image.addEventListener('error', () => { if (image.src !== fallbackImage()) image.src = fallbackImage(); });
  frame.append(image);

  const title = document.createElement('h3');
  title.textContent = name;

  const sku = document.createElement('p');
  sku.className = 'product-meta';
  sku.textContent = `SKU: ${product.codigo || '—'}`;

  const priceElement = document.createElement('p');
  priceElement.className = 'price';
  priceElement.textContent = validPrice ? money(price) : 'Consulte';

  const color = product.cor ? document.createElement('p') : null;
  if (color) {
    color.className = 'product-meta';
    color.textContent = `Cor: ${product.cor}`;
  }

  const sizes = listValues(product.tamanhos);
  const sizeGroup = document.createElement('div');
  sizeGroup.className = 'sizes';
  sizeGroup.setAttribute('role', 'group');
  sizeGroup.setAttribute('aria-label', `Escolha o tamanho de ${name}`);

  sizes.forEach((size) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'size-btn';
    button.textContent = size;
    button.setAttribute('aria-pressed', 'false');
    sizeGroup.append(button);
  });

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'add-cart';
  add.textContent = 'Adicionar ao carrinho';
  add.disabled = !validPrice || stock === 0;

  const notice = document.createElement('p');
  notice.className = 'card-notice';
  notice.setAttribute('aria-live', 'polite');

  card.append(frame, title, sku, priceElement);
  if (color) card.append(color);
  if (sizes.length) card.append(sizeGroup);
  if (stock !== null && Number.isFinite(stock)) {
    const availability = document.createElement('p');
    availability.className = stock > 0 ? 'stock-available' : 'stock-unavailable';
    availability.textContent = stock > 0 ? `${stock} disponível(is)` : 'Esgotado';
    card.append(availability);
  }

  card.append(add, notice);
  return card;
}

function updateOptions(id, values, firstLabel) {
  const select = document.getElementById(id);
  const previous = select.value;
  select.replaceChildren(new Option(firstLabel, ''));
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')).forEach((value) => select.add(new Option(value, value)));
  if ([...select.options].some((option) => option.value === previous)) select.value = previous;
}

function configureFilters() {
  updateOptions('filtro-publico', products.map((p) => p.publico), 'Todos');
  updateOptions('filtro-categoria', products.map((p) => p.categoria), 'Todas');
  updateOptions('filtro-cor', products.map((p) => p.cor), 'Todas');
  updateOptions('filtro-tamanho', products.flatMap((p) => listValues(p.tamanhos)), 'Todos');

  document.querySelectorAll('.filters select, .filters input').forEach((control) => control.addEventListener('input', applyFilters));
  document.getElementById('limpar-filtros').addEventListener('click', () => {
    document.querySelectorAll('.filters select').forEach((select) => { select.value = ''; });
    document.getElementById('busca-produtos').value = '';
    document.getElementById('somente-disponiveis').checked = false;
    applyFilters();
  });
}

function applyFilters() {
  const search = document.getElementById('busca-produtos').value.trim().toLocaleLowerCase('pt-BR');
  const audience = document.getElementById('filtro-publico').value;
  const category = document.getElementById('filtro-categoria').value;
  const color = document.getElementById('filtro-cor').value;
  const size = document.getElementById('filtro-tamanho').value;
  const availableOnly = document.getElementById('somente-disponiveis').checked;

  let visible = 0;

  catalog.querySelectorAll('.card:not(.skeleton)').forEach((card) => {
    const product = products.find((item) => String(item.id || '') === card.dataset.id) || products.find((item) => item.descricao === card.dataset.name);
    if (!product) {
      card.hidden = true;
      return;
    }

    const text = [product.descricao, product.codigo, product.publico, product.categoria, product.cor].join(' ').toLocaleLowerCase('pt-BR');
    const stock = product.estoque === null || product.estoque === undefined || product.estoque === '' ? null : Number(product.estoque);
    const sizes = listValues(product.tamanhos);
    const matches =
      (!search || text.includes(search)) &&
      (!audience || product.publico === audience) &&
      (!category || product.categoria === category) &&
      (!color || product.cor === color) &&
      (!size || sizes.includes(size)) &&
      (!availableOnly || (stock !== null && stock > 0));

    card.hidden = !matches;
    if (matches) visible++;
  });

  document.getElementById('resultado-filtros').textContent = `${visible} ${visible === 1 ? 'produto encontrado' : 'produtos encontrados'}`;
  if (!visible && products.length) {
    let empty = catalog.querySelector('.filter-empty');
    if (!empty) {
      empty = document.createElement('div');
      empty.className = 'state filter-empty';
      empty.textContent = 'Nenhum produto encontrado com esses filtros.';
      catalog.append(empty);
    }
  } else {
    const empty = catalog.querySelector('.filter-empty');
    if (empty) empty.remove();
  }
}

async function loadProducts() {
  if (!supabase) {
    showState('Catálogo indisponível', initializationError || 'Confira a conexão com o Supabase.', true);
    return;
  }

  const { data, error } = await supabase.from('produtos').select('id, codigo, descricao, valor, tamanhos, foto, publico, categoria, cor, estoque, preco_desconto');
  if (error) {
    console.error('Erro ao carregar produtos:', error);
    showState('Erro ao carregar catálogo', error.message || 'Verifique sua conexão e as permissões de leitura.', true);
    return;
  }

  if (!Array.isArray(data) || !data.length) {
    products = [];
    showState('Nenhum produto por aqui ainda', 'Em breve teremos novidades!');
    return;
  }

  products = data;
  const fragment = document.createDocumentFragment();
  data.forEach((product, index) => fragment.append(createCard(product ?? {}, index)));
  catalog.replaceChildren(fragment);
  catalog.setAttribute('aria-busy', 'false');
  configureFilters();
  applyFilters();
}

function renderCart() {
  cartList.replaceChildren();
  if (!cart.length) {
    const empty = document.createElement('p');
    empty.className = 'cart-empty';
    empty.textContent = 'Seu carrinho está vazio.';
    cartList.append(empty);
  }

  cart.forEach((item, index) => {
    const row = document.createElement('article');
    row.className = 'cart-item';

    const image = item.image ? document.createElement('img') : null;
    if (image) {
      image.src = item.image;
      image.alt = item.name;
      image.className = 'cart-thumb';
      image.onerror = () => { image.remove(); };
      row.append(image);
    }

    const details = document.createElement('div');
    const name = document.createElement('h3');
    name.textContent = item.name;

    const info = document.createElement('p');
    info.textContent = [item.color && `Cor: ${item.color}`, `Tamanho: ${item.size}`].filter(Boolean).join(' · ');

    const price = document.createElement('p');
    price.textContent = `${item.quantity} × ${money(item.price)} = ${money(item.price * item.quantity)}`;

    details.append(name, info, price);

    const controls = document.createElement('div');
    controls.className = 'cart-controls';

    for (const [action, label, aria] of [['decrease', '−', 'Diminuir quantidade'], ['increase', '+', 'Aumentar quantidade'], ['remove', '×', 'Remover item']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = action;
      button.dataset.index = String(index);
      button.textContent = label;
      button.setAttribute('aria-label', aria);
      controls.append(button);
    }

    row.append(details, controls);
    cartList.append(row);
  });

  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const count = document.getElementById('quantidade-carrinho');
  count.textContent = String(quantity);
  count.setAttribute('aria-label', `${quantity} ${quantity === 1 ? 'item' : 'itens'}`);
  document.getElementById('total-carrinho').textContent = money(total);
  document.getElementById('finalizar-pedido').disabled = cart.length === 0 || !phone;
  document.getElementById('aviso-checkout').textContent = phone ? '' : 'Configure o WhatsApp em assets/js/config.js para habilitar pedidos.';
  saveCart();
}

cartList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const index = Number(button.dataset.index);
  if (!cart[index]) return;

  if (button.dataset.action === 'remove') {
    cart.splice(index, 1);
  } else if (button.dataset.action === 'decrease') {
    cart[index].quantity--;
    if (cart[index].quantity < 1) cart.splice(index, 1);
  } else if (button.dataset.action === 'increase') {
    cart[index].quantity++;
  }

  renderCart();
});

document.getElementById('abrir-carrinho').addEventListener('click', () => cartDialog.showModal());

document.getElementById('finalizar-pedido').addEventListener('click', () => {
  if (!phone || !cart.length) return;

  const lines = cart.map((item) => `• ${item.name}${item.color ? ` — ${item.color}` : ''} | Tamanho: ${item.size} | Qtd: ${item.quantity} | ${money(item.price * item.quantity)}`);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const message = ['Olá! Quero finalizar este pedido:', ...lines, '', `Total: ${money(total)}`].join('\n');
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
});

document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
cartDialog.addEventListener('click', (event) => { if (event.target === cartDialog) cartDialog.close(); });

catalog.addEventListener('click', (event) => {
  const sizeButton = event.target.closest('.size-btn');
  if (sizeButton) {
    const card = sizeButton.closest('.card');
    card.querySelectorAll('.size-btn').forEach((button) => button.setAttribute('aria-pressed', String(button === sizeButton ? button.getAttribute('aria-pressed') !== 'true' : false)));
    return;
  }

  const add = event.target.closest('.add-cart');
  if (!add) return;

  const card = add.closest('.card');
  const selectedSize = card.querySelector('.size-btn[aria-pressed="true"]')?.textContent || 'Único';
  const hasSizes = Boolean(card.querySelector('.sizes'));
  const notice = card.querySelector('.card-notice');

  if (hasSizes && !card.querySelector('.size-btn[aria-pressed="true"]')) {
    notice.textContent = 'Selecione um tamanho.';
    card.querySelector('.size-btn')?.focus();
    return;
  }

  const product = products.find((item) => String(item.id || '') === card.dataset.id) || products.find((item) => item.descricao === card.dataset.name);
  const price = Number(card.dataset.price);
  if (!product || !Number.isFinite(price)) {
    notice.textContent = 'Preço indisponível.';
    return;
  }

  const size = selectedSize;
  const color = product.cor || '';
  const existing = cart.find((item) => item.name === product.descricao && item.size === size && item.color === color && item.price === price);
  const availableStock = product.estoque === null || product.estoque === undefined || product.estoque === '' ? null : Number(product.estoque);

  if (availableStock !== null && (!Number.isFinite(availableStock) || (existing?.quantity || 0) >= availableStock)) {
    notice.textContent = 'Não há mais unidades disponíveis em estoque.';
    return;
  }

  if (existing) existing.quantity++;
  else cart.push({ name: product.descricao, size, color, price, quantity: 1, image: imageUrl(product.foto) });

  renderCart();
  notice.textContent = 'Adicionado ao carrinho!';
});

renderCart();
loadProducts();
