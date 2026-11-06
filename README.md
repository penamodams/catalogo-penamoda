# PeNaModa — estrutura do projeto

O site usa HTML estático com módulos JavaScript, Supabase e GitHub Pages. A separação deixa catálogo, carrinho, administração, configuração e estilos independentes:

```text
index.html                 Catálogo público e carrinho
admin.html                 Login e cadastro de produtos
assets/css/site.css        Estilos compartilhados
assets/img/logo.svg        Marca vetorial PeNaMod@
assets/js/config.js        URL/chave pública, WhatsApp, UID administrativo
assets/js/supabase-client.js Inicialização do cliente Supabase
assets/js/catalog.js       Consulta/renderização dos produtos e carrinho
assets/js/admin.js         Login e cadastro de produtos
supabase/policies.sql      Políticas RLS para leitura pública e escrita do admin
```

## Configuração inicial

1. No Supabase, crie/convide a conta que administrará a loja em **Authentication → Users**. Use uma senha forte e única.
2. Copie o UUID dessa conta e preencha `adminUserId` em `assets/js/config.js`.
3. Confirme a URL e a chave pública (`anon` ou `sb_publishable`) em `assets/js/config.js`. A chave pública pode ser usada no navegador; **nunca** publique uma chave `service_role` ou `sb_secret`.
4. No SQL Editor do Supabase, revise e execute `supabase/policies.sql`. Substitua `COLOQUE_O_UUID_DO_ADMIN` pelo UUID real da conta. O script concede leitura pública dos produtos, mas permite insert/update/delete apenas para esse UUID autenticado.
5. A tabela existente `public.produtos` deve ter as colunas `descricao` (text), `valor` (numeric), `tamanhos` (text) e `foto` (text). O formulário grava essas quatro colunas.
6. Configure `whatsapp` em `assets/js/config.js` com DDI+DDD+número, apenas dígitos, para habilitar checkout.
7. Publique o repositório com GitHub Pages. Navegue para `/admin.html` para fazer login e cadastrar itens.

## Segurança

A área administrativa usa autenticação de usuário do Supabase — não há senha administrativa no JavaScript. Ocultar a interface no navegador é apenas conveniência; a proteção real das operações é feita pelas políticas RLS do banco. A policy de escrita compara `auth.uid()` com um UUID explicitamente configurado. Mantenha essa policy restrita e não conceda escrita à role `anon`.

Os valores/preços enviados pelo carrinho são para montar o pedido no WhatsApp; se futuramente houver pagamento online, recalcule os preços no servidor e não confie nos valores do navegador.

## Manutenção

- Identidade visual: `assets/css/site.css` e `assets/img/logo.svg`.
- Dados de conexão e configurações públicas: `assets/js/config.js`.
- Comportamento da vitrine/carrinho: `assets/js/catalog.js`.
- Acesso e cadastro: `assets/js/admin.js`.
- Alterações no banco e permissões: `supabase/policies.sql`.
