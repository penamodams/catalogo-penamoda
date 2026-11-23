# Diagnóstico de cadastro de produtos — versão 1.1.5

A versão 1.1.5 apresenta no painel se a consulta ou gravação falhou, com indicação de possíveis causas (RLS, colunas ausentes ou Storage). Depois de publicar, recarregue `admin.html` com Ctrl+F5.

Para habilitar cadastro completo, no SQL Editor do projeto Supabase execute nesta ordem:

1. `supabase/product_enhancements.sql` — adiciona os campos de produto e configura bucket/policies para imagens.
2. `supabase/policies.sql` — permite leitura pública e restringe insert/update/delete ao UUID administrativo `887d78a0-6752-41a9-98f1-8e77a44daff7`.

Em seguida confirme que esse UUID está em `assets/js/config.js` e é o mesmo usuário conectado no painel. O SQL não é executado pelo GitHub Pages; é necessário rodá-lo manualmente no Supabase. Se ainda falhar, copie o texto de erro que aparece no fim do painel (não envie senhas nem chaves secretas).
