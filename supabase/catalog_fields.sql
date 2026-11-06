-- Execute no SQL Editor do Supabase para adicionar os metadados de catálogo.
-- Faça backup antes. O id existente, se houver, será preservado.
alter table public.produtos add column if not exists id uuid default gen_random_uuid();
update public.produtos set id = gen_random_uuid() where id is null;
create unique index if not exists produtos_id_unique_idx on public.produtos(id);

alter table public.produtos add column if not exists publico text;
alter table public.produtos add column if not exists categoria text;
alter table public.produtos add column if not exists cor text;
alter table public.produtos add column if not exists estoque integer;

-- A tabela precisa permitir leitura pública e escrita somente pelo administrador configurado.
-- Execute também supabase/policies.sql após substituir o UUID placeholder.
