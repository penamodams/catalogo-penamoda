-- Execute no Supabase SQL Editor uma vez antes de publicar produtos da versão 1.1.5.
-- Compatível com registros existentes: não remove nem sobrescreve dados.
create extension if not exists pgcrypto;

alter table public.produtos add column if not exists id uuid default gen_random_uuid();
update public.produtos set id = gen_random_uuid() where id is null;
create unique index if not exists produtos_id_unique_idx on public.produtos(id);

alter table public.produtos add column if not exists publico text;
alter table public.produtos add column if not exists categoria text;
alter table public.produtos add column if not exists cor text;
alter table public.produtos add column if not exists estoque integer;
alter table public.produtos add column if not exists codigo text;
alter table public.produtos add column if not exists preco_desconto numeric(10,2);

-- Bucket para fotos escolhidas no painel (JPG, PNG, WebP até 8 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Product photos are public to read" on storage.objects;
create policy "Product photos are public to read" on storage.objects for select to public using (bucket_id = 'produtos');
drop policy if exists "Configured admin uploads product photos" on storage.objects;
create policy "Configured admin uploads product photos" on storage.objects for insert to authenticated
with check (bucket_id = 'produtos' and auth.uid() = '887d78a0-6752-41a9-98f1-8e77a44daff7'::uuid);
drop policy if exists "Configured admin updates product photos" on storage.objects;
create policy "Configured admin updates product photos" on storage.objects for update to authenticated
using (bucket_id = 'produtos' and auth.uid() = '887d78a0-6752-41a9-98f1-8e77a44daff7'::uuid)
with check (bucket_id = 'produtos' and auth.uid() = '887d78a0-6752-41a9-98f1-8e77a44daff7'::uuid);
drop policy if exists "Configured admin deletes product photos" on storage.objects;
create policy "Configured admin deletes product photos" on storage.objects for delete to authenticated
using (bucket_id = 'produtos' and auth.uid() = '887d78a0-6752-41a9-98f1-8e77a44daff7'::uuid);
