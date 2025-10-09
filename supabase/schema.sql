-- Ateliê Pro - Schema inicial (rodar no Supabase SQL Editor)
create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
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
  code text unique not null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  type text not null,
  description text,
  value numeric(12,2) not null default 0,
  paid numeric(12,2) not null default 0,
  delivery_date date,
  status public.order_status not null default 'Aguardando aprovação',
  file_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  date date not null default now(),
  observations text,
  created_at timestamptz not null default now()
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
  name text not null,
  quantity numeric(12,2) not null default 0,
  unit text not null default 'unidades',
  min_quantity numeric(12,2) not null default 0,
  status text not null default 'ok',
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.inventory_items enable row level security;

drop policy if exists "anon_select_customers" on public.customers;
create policy "anon_select_customers" on public.customers for select using (true);
drop policy if exists "anon_insert_customers" on public.customers;
create policy "anon_insert_customers" on public.customers for insert with check (true);

drop policy if exists "anon_select_orders" on public.orders;
create policy "anon_select_orders" on public.orders for select using (true);
drop policy if exists "anon_insert_orders" on public.orders;
create policy "anon_insert_orders" on public.orders for insert with check (true);

drop policy if exists "anon_select_quotes" on public.quotes;
create policy "anon_select_quotes" on public.quotes for select using (true);
drop policy if exists "anon_insert_quotes" on public.quotes;
create policy "anon_insert_quotes" on public.quotes for insert with check (true);

drop policy if exists "anon_select_quote_items" on public.quote_items;
create policy "anon_select_quote_items" on public.quote_items for select using (true);
drop policy if exists "anon_insert_quote_items" on public.quote_items;
create policy "anon_insert_quote_items" on public.quote_items for insert with check (true);

drop policy if exists "anon_select_inventory" on public.inventory_items;
create policy "anon_select_inventory" on public.inventory_items for select using (true);
drop policy if exists "anon_insert_inventory" on public.inventory_items;
create policy "anon_insert_inventory" on public.inventory_items for insert with check (true);


