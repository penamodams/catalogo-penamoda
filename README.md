# PeNaModa — estrutura do projeto

Catálogo estático no GitHub Pages com dados e autenticação no Supabase. Módulos separados para permitir evolução sem concentrar toda a operação em uma página.

```text
index.html                    Catálogo, filtros e carrinho
admin.html                    Login, cadastro, edição e controle de estoque
assets/css/site.css           Identidade visual e componentes compartilhados
assets/img/logo.svg           Logotipo vetorial
assets/js/config.js           Chave pública, WhatsApp, imagem base e UID admin
assets/js/supabase-client.js  Cliente Supabase
assets/js/catalog.js          Busca/filtros, produtos e carrinho
assets/js/admin.js            Autenticação e gestão de produtos
supabase/catalog_fields.sql   Migração para categoria/cor/público/estoque/id
supabase/policies.sql         RLS: leitura pública; escrita só pelo admin
```

## Ativação inicial

1. No Supabase, crie a conta administrativa em Authentication → Users. Guarde o e-mail e defina uma senha forte.
2. Copie o UUID do usuário e preencha `adminUserId` em `assets/js/config.js`.
3. Confirme URL e chave pública em `assets/js/config.js`. Nunca use `service_role` ou `sb_secret` no navegador.
4. No SQL Editor, execute primeiro `supabase/catalog_fields.sql`.
5. Edite `supabase/policies.sql`: substitua `COLOQUE_O_UUID_DO_ADMIN` pelo UUID real da conta e execute o SQL. Isso permite SELECT público e restringe INSERT/UPDATE/DELETE à conta configurada.
6. Configure `whatsapp` em `assets/js/config.js` com DDI+DDD+número, apenas dígitos.
7. A tabela `public.produtos` precisa manter `descricao`, `valor`, `tamanhos` e `foto`. A migração acrescenta `id`, `publico`, `categoria`, `cor` e `estoque`.
8. Faça commit/publicação no GitHub Pages. Acesse `/admin.html` para gerenciar produtos.

## Operação do catálogo

- Clientes filtram por busca, departamento, categoria, tamanho e cor; “Somente disponíveis” mostra apenas produtos com estoque maior que zero.
- Para cada item, use um título claro como “Tênis Beira Rio Casual Branco Feminino”, informe cor, público, categoria, numerações e estoque.
- As fotos usam `object-fit: contain` para mostrar o produto inteiro.
- Carrinho mostra cor, tamanho, quantidade, subtotal por linha e total e prepara o pedido no WhatsApp.
- No painel, administrador autenticado pode cadastrar, editar e excluir produtos. O banco também aplica RLS; a verificação de interface não substitui as policies.
- Itens com estoque vazio são tratados como disponibilidade não informada; não são bloqueados no catálogo. Estoque igual a zero aparece esgotado e não permite adicionar ao carrinho.

## Importante

O carrinho/WhatsApp não processa pagamento nem reserva estoque no servidor. Para pagamento online, reserva concorrente de estoque, imagens em galeria e permissões multiusuário, será necessário adicionar backend/Storage e validar operações no servidor. Faça backup do banco antes de executar migrações.
