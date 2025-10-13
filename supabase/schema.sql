-- Ateliê Pro - Schema multi-loja (rodar no Supabase SQL Editor)
create extension if not exists pgcrypto;

-- Tabelas de multi-tenancy
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

-- Tabelas principais com empresa_id
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

do $$ begin
  create type public.order_status as enum ('Aguardando aprovação','Em produção','Pronto','Aguardando retirada');
exception when duplicate_object then null; end $$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  code text not null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  type text not null,
  description text,
  value numeric(12,2) not null default 0,
  paid numeric(12,2) not null default 0,
  delivery_date date,
  status public.order_status not null default 'Aguardando aprovação',
  file_url text,
  created_at timestamptz not null default now(),
  unique(empresa_id, code)
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  code text not null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  date date not null default now(),
  observations text,
  created_at timestamptz not null default now(),
  unique(empresa_id, code)
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  description text not null,
  quantity integer not null check (quantity > 0),
  value numeric(12,2) not null check (value >= 0)
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  name text not null,
  quantity numeric(12,2) not null default 0,
  unit text not null default 'unidades',
  min_quantity numeric(12,2) not null default 0,
  status text not null default 'ok',
  created_at timestamptz not null default now()
);

-- RLS Policies
alter table public.empresas enable row level security;
alter table public.user_empresas enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.inventory_items enable row level security;

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

-- Policies para customers
drop policy if exists "users_select_customers" on public.customers;
create policy "users_select_customers" on public.customers for select using (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = customers.empresa_id
  )
);

drop policy if exists "users_insert_customers" on public.customers;
create policy "users_insert_customers" on public.customers for insert with check (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = customers.empresa_id
  )
);

-- Policies para orders
drop policy if exists "users_select_orders" on public.orders;
create policy "users_select_orders" on public.orders for select using (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = orders.empresa_id
  )
);

drop policy if exists "users_insert_orders" on public.orders;
create policy "users_insert_orders" on public.orders for insert with check (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = orders.empresa_id
  )
);

-- Policies para quotes
drop policy if exists "users_select_quotes" on public.quotes;
create policy "users_select_quotes" on public.quotes for select using (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = quotes.empresa_id
  )
);

drop policy if exists "users_insert_quotes" on public.quotes;
create policy "users_insert_quotes" on public.quotes for insert with check (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = quotes.empresa_id
  )
);

-- Policies para quote_items
drop policy if exists "users_select_quote_items" on public.quote_items;
create policy "users_select_quote_items" on public.quote_items for select using (
  exists (
    select 1 from public.user_empresas ue
    join public.quotes q on q.empresa_id = ue.empresa_id
    where ue.user_id = auth.uid() 
    and q.id = quote_items.quote_id
  )
);

drop policy if exists "users_insert_quote_items" on public.quote_items;
create policy "users_insert_quote_items" on public.quote_items for insert with check (
  exists (
    select 1 from public.user_empresas ue
    join public.quotes q on q.empresa_id = ue.empresa_id
    where ue.user_id = auth.uid() 
    and q.id = quote_items.quote_id
  )
);

-- Policies para inventory_items
drop policy if exists "users_select_inventory" on public.inventory_items;
create policy "users_select_inventory" on public.inventory_items for select using (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = inventory_items.empresa_id
  )
);

drop policy if exists "users_insert_inventory" on public.inventory_items;
create policy "users_insert_inventory" on public.inventory_items for insert with check (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = inventory_items.empresa_id
  )
);