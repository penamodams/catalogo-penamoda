import { CONFIG } from './config.js';
import { supabase, initializationError } from './supabase-client.js';

const loginForm = document.getElementById('login-form');
const adminSession = document.getElementById('admin-session');
const status = document.getElementById('admin-status');
const userLabel = document.getElementById('admin-user');
const productForm = document.getElementById('product-form');

function setStatus(message) { status.textContent = message; }
function isConfiguredAdmin(user) {
  return Boolean(user && CONFIG.adminUserId && user.id === CONFIG.adminUserId);
}
function setSession(user) {
  if (isConfiguredAdmin(user)) {
    loginForm.hidden = true; adminSession.hidden = false; userLabel.textContent = `Conectado: ${user.email || 'administrador'}`; setStatus(''); return;
  }
  loginForm.hidden = false; adminSession.hidden = true;
  if (user) setStatus('Esta conta não está autorizada para administrar a loja.');
}

if (!supabase) {
  loginForm.querySelector('button').disabled = true;
  setStatus(initializationError || 'Não foi possível conectar ao Supabase.');
} else if (!CONFIG.adminUserId) {
  setStatus('Configuração pendente: informe o UUID do administrador em assets/js/config.js e habilite as políticas RLS indicadas no arquivo supabase/policies.sql.');
  supabase.auth.getSession().then(({ data }) => setSession(data?.session?.user || null));
} else {
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) console.error('Erro ao verificar a sessão:', error);
    const user = data?.session?.user || null;
    if (user && !isConfiguredAdmin(user)) supabase.auth.signOut();
    else setSession(user);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user || null;
    if (user && !isConfiguredAdmin(user)) { setSession(user); void supabase.auth.signOut(); return; }
    setSession(user);
  });
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabase) return setStatus(initializationError || 'Supabase indisponível.');
  if (!CONFIG.adminUserId) return setStatus('Configure o UUID administrador em assets/js/config.js antes de entrar.');
  setStatus('Validando acesso…');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: document.getElementById('admin-email').value.trim(),
    password: document.getElementById('admin-password').value
  });
  if (error) { console.error('Falha no login administrativo:', error); setStatus('Não foi possível entrar. Confira o e-mail, a senha e a configuração do Supabase.'); return; }
  document.getElementById('admin-password').value = '';
  if (!isConfiguredAdmin(data.user)) { await supabase.auth.signOut(); setStatus('Esta conta não está autorizada para administrar a loja.'); return; }
  setSession(data.user); setStatus('Acesso autorizado.');
});

document.getElementById('sign-out').addEventListener('click', async () => {
  if (supabase) { const { error } = await supabase.auth.signOut(); if (error) console.error('Erro ao sair:', error); }
  setSession(null); setStatus('Você saiu da área administrativa.');
});

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabase) return setStatus('Supabase indisponível.');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !isConfiguredAdmin(sessionData?.session?.user)) { setSession(null); return setStatus('Sessão não autorizada. Entre novamente com a conta administradora.'); }
  const form = new FormData(productForm);
  const descricao = String(form.get('descricao') || '').trim();
  const rawPrice = String(form.get('valor') || '').trim();
  const valor = Number(rawPrice);
  const tamanhos = String(form.get('tamanhos') || '').trim();
  const foto = String(form.get('foto') || '').trim();
  if (!descricao || !rawPrice || !Number.isFinite(valor) || valor < 0) return setStatus('Informe um nome e um preço válido.');
  setStatus('Salvando produto…');
  const { error } = await supabase.from('produtos').insert({ descricao, valor, tamanhos, foto });
  if (error) {
    console.error('Erro ao cadastrar produto:', error);
    setStatus(error.code === '42501' ? 'O banco bloqueou o cadastro. Confira a política RLS em supabase/policies.sql.' : `Não foi possível cadastrar: ${error.message}`);
    return;
  }
  productForm.reset(); setStatus('Produto cadastrado com sucesso! Ele já está disponível no catálogo.');
});

document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
