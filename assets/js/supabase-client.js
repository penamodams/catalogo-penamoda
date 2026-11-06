import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CONFIG } from './config.js';

let client = null;
let initializationError = '';

try {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
    throw new Error('Configure a URL e a chave pública do Supabase em assets/js/config.js.');
  }
  client = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
} catch (error) {
  initializationError = error.message || 'Falha ao iniciar o Supabase.';
  console.error('Falha ao iniciar Supabase:', error);
}

export { client as supabase, initializationError };
