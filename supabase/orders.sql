-- Execute no SQL Editor do Supabase depois de configurar seu usuario administrador.
-- Nao exponha service_role nem credenciais neste arquivo.
create extension if not exists pgcrypto;

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  nome_comprador text not null check (char_length(trim(nome_comprador)) between 2 and 120),
  data_nascimento date not null check (data_nascimento <= current_date),
  itens jsonb not null check (jsonb_typeof(itens) = 'array' and jsonb_array_length(itens) > 0),
  total numeric(10,2) not null check (total >= 0),
  consentimento boolean not null default false check (consentimento = true),
  created_at timestamptz not null default now()
);
alter table public.pedidos enable row level security;
grant insert on table public.pedidos to anon, authenticated;
grant select on table public.pedidos to authenticated;
drop policy if exists "Visitors can submit orders" on public.pedidos;
create policy "Visitors can submit orders" on public.pedidos for insert to anon, authenticated
  with check (consentimento = true and char_length(trim(nome_comprador)) between 2 and 120 and data_nascimento <= current_date and jsonb_typeof(itens) = 'array' and jsonb_array_length(itens) > 0 and total >= 0);
drop policy if exists "Configured admin can read orders" on public.pedidos;
create policy "Configured admin can read orders" on public.pedidos for select to authenticated
  using (auth.uid() = 'COLOQUE_O_UUID_DO_ADMIN'::uuid);

-- Para permitir cadastro opcional de código próprio para produtos:
alter table public.produtos add column if not exists codigo text;
