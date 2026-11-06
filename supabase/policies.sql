-- Execute no SQL Editor do Supabase depois de trocar o UUID placeholder pelo UID
-- da conta criada em Authentication > Users. Nunca use senha ou service_role aqui.

alter table public.produtos enable row level security;

grant select on table public.produtos to anon, authenticated;
grant insert, update, delete on table public.produtos to authenticated;

drop policy if exists "Catalog products are public to read" on public.produtos;
create policy "Catalog products are public to read"
on public.produtos for select
to anon, authenticated
using (true);

drop policy if exists "Configured admin can insert products" on public.produtos;
create policy "Configured admin can insert products"
on public.produtos for insert
to authenticated
with check (auth.uid() = 'COLOQUE_O_UUID_DO_ADMIN'::uuid);

drop policy if exists "Configured admin can update products" on public.produtos;
create policy "Configured admin can update products"
on public.produtos for update
to authenticated
using (auth.uid() = 'COLOQUE_O_UUID_DO_ADMIN'::uuid)
with check (auth.uid() = 'COLOQUE_O_UUID_DO_ADMIN'::uuid);

drop policy if exists "Configured admin can delete products" on public.produtos;
create policy "Configured admin can delete products"
on public.produtos for delete
to authenticated
using (auth.uid() = 'COLOQUE_O_UUID_DO_ADMIN'::uuid);
