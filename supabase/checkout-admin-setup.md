# Configuração do checkout e do painel PeNaModa

## Dados necessários no Supabase

1. Em Authentication → Users, crie/edite a conta `penamodams@gmail.com` com a senha temporária `123456`. Defina em User Metadata o campo JSON `must_change_password` como `true` para exigir a troca no primeiro acesso. O painel substitui esse sinalizador após salvar a nova senha (mínimo 8 caracteres).
2. Copie o UUID desse usuário e coloque em `adminUserId` no arquivo `assets/js/config.js`.
3. No SQL Editor, execute `supabase/orders.sql`. Substitua `COLOQUE_O_UUID_DO_ADMIN` no SQL pelo UUID copiado antes de executar a política de leitura dos pedidos.
4. Se ainda não aplicou a política de produtos, configure `supabase/policies.sql` com o mesmo UUID e execute-a. Nunca coloque uma senha ou chave `service_role` no código do site.
5. Edite `assets/js/config.js` e preencha `whatsapp` com o número comercial em formato internacional e somente dígitos (DDI + DDD + número). O número não foi informado, então o site deixa o checkout pausado até ser definido.

## Como funciona

- O checkout pede nome, data de nascimento e consentimento, registra o pedido no Supabase e mostra os pedidos no painel autenticado.
- RLS permite que visitantes criem pedidos, mas apenas o UUID administrador configurado consegue ler os dados pessoais. A tabela não permite leitura anônima.
- A mensagem do WhatsApp inclui produtos, códigos, tamanhos, quantidades, total e links das fotos. O WhatsApp Click to Chat não anexa arquivos automaticamente; os links podem exibir prévia conforme o app/dispositivo.
- O código do produto é o campo `codigo` quando preenchido, ou o ID existente do produto como alternativa.
- O e-mail e a senha são credenciais de uma conta Supabase Auth. O repositório não pode criar/alterar a senha real com segurança; faça essa configuração no painel do Supabase e nunca publique senha de administrador.
- Data de nascimento é dado pessoal: colete apenas com consentimento e restrinja o acesso. Considere remover os dados quando não forem mais necessários para a finalidade informada.
