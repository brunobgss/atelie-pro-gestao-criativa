-- Ateliê Pro - Migração para Multi-Loja (rodar no Supabase SQL Editor)
-- Este script adiciona as colunas necessárias às tabelas existentes

-- 1. Criar tabelas de multi-tenancy
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  telefone text,
  responsavel text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_empresas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  empresa_id uuid references public.empresas(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique(user_id, empresa_id)
);

-- 2. Adicionar coluna empresa_id às tabelas existentes
alter table public.customers add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;
alter table public.orders add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;
alter table public.quotes add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;
alter table public.inventory_items add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;

-- 3. Remover constraints unique antigas e criar novas com empresa_id
alter table public.orders drop constraint if exists orders_code_key;
alter table public.quotes drop constraint if exists quotes_code_key;

-- 4. Criar novas constraints unique por empresa
alter table public.orders add constraint orders_empresa_code_unique unique(empresa_id, code);
alter table public.quotes add constraint quotes_empresa_code_unique unique(empresa_id, code);

-- 5. Atualizar RLS Policies
alter table public.empresas enable row level security;
alter table public.user_empresas enable row level security;

-- Policies para empresas
drop policy if exists "users_select_empresas" on public.empresas;
create policy "users_select_empresas" on public.empresas for select using (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = empresas.id
  )
);

drop policy if exists "users_insert_empresas" on public.empresas;
create policy "users_insert_empresas" on public.empresas for insert with check (true);

-- Policies para user_empresas
drop policy if exists "users_select_user_empresas" on public.user_empresas;
create policy "users_select_user_empresas" on public.user_empresas for select using (user_id = auth.uid());

drop policy if exists "users_insert_user_empresas" on public.user_empresas;
create policy "users_insert_user_empresas" on public.user_empresas for insert with check (user_id = auth.uid());

-- Atualizar policies existentes para incluir empresa_id
drop policy if exists "anon_select_customers" on public.customers;
create policy "users_select_customers" on public.customers for select using (
  empresa_id is null or exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = customers.empresa_id
  )
);

drop policy if exists "anon_insert_customers" on public.customers;
create policy "users_insert_customers" on public.customers for insert with check (
  empresa_id is null or exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = customers.empresa_id
  )
);

drop policy if exists "anon_select_orders" on public.orders;
create policy "users_select_orders" on public.orders for select using (
  empresa_id is null or exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = orders.empresa_id
  )
);

drop policy if exists "anon_insert_orders" on public.orders;
create policy "users_insert_orders" on public.orders for insert with check (
  empresa_id is null or exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = orders.empresa_id
  )
);

drop policy if exists "anon_select_quotes" on public.quotes;
create policy "users_select_quotes" on public.quotes for select using (
  empresa_id is null or exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = quotes.empresa_id
  )
);

drop policy if exists "anon_insert_quotes" on public.quotes;
create policy "users_insert_quotes" on public.quotes for insert with check (
  empresa_id is null or exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = quotes.empresa_id
  )
);

drop policy if exists "anon_select_quote_items" on public.quote_items;
create policy "users_select_quote_items" on public.quote_items for select using (
  exists (
    select 1 from public.user_empresas ue
    join public.quotes q on q.empresa_id = ue.empresa_id
    where ue.user_id = auth.uid() 
    and q.id = quote_items.quote_id
  )
);

drop policy if exists "anon_insert_quote_items" on public.quote_items;
create policy "users_insert_quote_items" on public.quote_items for insert with check (
  exists (
    select 1 from public.user_empresas ue
    join public.quotes q on q.empresa_id = ue.empresa_id
    where ue.user_id = auth.uid() 
    and q.id = quote_items.quote_id
  )
);

drop policy if exists "anon_select_inventory" on public.inventory_items;
create policy "users_select_inventory" on public.inventory_items for select using (
  empresa_id is null or exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = inventory_items.empresa_id
  )
);

drop policy if exists "anon_insert_inventory" on public.inventory_items;
create policy "users_insert_inventory" on public.inventory_items for insert with check (
  empresa_id is null or exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = inventory_items.empresa_id
  )
);



