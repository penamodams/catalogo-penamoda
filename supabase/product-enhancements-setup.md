# Catálogo PeNaModa — atualização v1.1.3

## Cadastro aprimorado

- SKU opcional, descrição, público FA/MA/FI/MI, categoria, cor e estoque.
- Tamanhos selecionáveis em chips de múltipla seleção: FA (33–42), MA (37–48), FI/MI (1–36). A opção Outro abre campo para tamanhos personalizados separados por vírgulas.
- Foto JPG/PNG/WebP até 8 MB com prévia antes de salvar, enviada para o bucket público `produtos` do Supabase Storage. Também é possível informar URL/caminho existente.
- Preço de venda e preço promocional opcional; promoção deve ser menor que o preço normal. O catálogo exibe o preço normal tachado e o promocional em destaque.
- No catálogo, o cliente escolhe um tamanho para cada unidade adicionada ao carrinho. O tamanho, SKU, preço e link da foto acompanham a mensagem do WhatsApp.

## Ativação no Supabase

1. Confira que `assets/js/config.js` contém o UID administrativo `887d78a0-6752-41a9-98f1-8e77a44daff7` e que esse UID pertence à conta de login.
2. No Supabase SQL Editor, execute `supabase/product_enhancements.sql`. O SQL cria os campos `codigo`/`preco_desconto`, configura o bucket e restringe upload de imagens ao administrador configurado.
3. O catálogo continua compatível com produtos antigos: produtos sem preço promocional/código continuam exibidos; tamanhos antigos separados por vírgula continuam aceitos.
4. Configure o telefone comercial em `assets/js/config.js` para habilitar pedidos pelo WhatsApp.

A alteração de código não executa SQL no seu projeto Supabase automaticamente. Execute a migração no painel do projeto antes de usar os novos campos. O site mostra a versão 1.1.3 no rodapé quando esta publicação estiver online.
