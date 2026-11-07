export const CONFIG = Object.freeze({
  supabaseUrl: 'https://lzperhbkeanfrflcdtkd.supabase.co',
  // Chave pública (anon/publishable). Nunca use service_role ou chave secreta no navegador.
  supabaseKey: 'sb_publishable_juaoZjOGkOV2zDuGKxkYpg_qG0pIEBk',
  whatsapp: '', // Configure o número comercial com DDI+DDD, apenas dígitos.
  instagram: 'https://instagram.com/penamoda.ms',
  imageBaseUrl: 'https://penamodams.github.io/catalogo-penamoda/',
  adminEmail: 'penamodams@gmail.com',
  // Preencha com o UUID do usuário admin do Supabase para habilitar as policies de banco.
  adminUserId: ''
});
