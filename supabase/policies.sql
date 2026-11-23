-- Políticas de leitura pública e administração restrita à conta PeNaModa.
-- O UUID abaixo é o usuário Supabase Auth informado pela proprietária da loja.
alter table public.produtos enable row level security;
grant select on table public.produtos to anon, authenticated;
grant insert, update, delete on table public.produtos to authenticated;

drop policy if exists "Catalog products are public to read" on public.produtos;
create policy "Catalog products are public to read" on public.produtos for select to anon, authenticated using (true);

drop policy if exists "Configured admin can insert products" on public.produtos;
create policy "Configured admin can insert products" on public.produtos for insert to authenticated
with check (auth.uid() = '887d78a0-6752-41a9-98f1-8e77a44daff7'::uuid);

drop policy if exists "Configured admin can update products" on public.produtos;
create policy "Configured admin can update products" on public.produtos for update to authenticated
using (auth.uid() = '887d78a0-6752-41a9-98f1-8e77a44daff7'::uuid)
with check (auth.uid() = '887d78a0-6752-41a9-98f1-8e77a44daff7'::uuid);

drop policy if exists "Configured admin can delete products" on public.produtos;
create policy "Configured admin can delete products" on public.produtos for delete to authenticated
using (auth.uid() = '887d78a0-6752-41a9-98f1-8e77a44daff7'::uuid);
