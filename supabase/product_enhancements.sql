-- Migração PeNaModa v1.1.3: campos de produto, código e promoção.
-- Execute no Supabase SQL Editor uma única vez. Não apaga dados existentes.
alter table public.produtos add column if not exists codigo text;
alter table public.produtos add column if not exists preco_desconto numeric(10,2);

-- Cria bucket público para as fotos do catálogo. Upload e remoção exigem login;
-- as policies abaixo restringem escrita ao UUID do administrador.
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
