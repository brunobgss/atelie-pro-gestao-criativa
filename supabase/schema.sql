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
  create type public.order_status as enum (
    'Aguardando aprovação',
    'Em produção',
    'Finalizando',
    'Pronto',
    'Aguardando retirada',
    'Entregue',
    'Cancelado'
  );
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

create table if not exists public.order_personalizations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  empresa_id uuid references public.empresas(id) on delete cascade,
  person_name text not null,
  size text,
  quantity integer not null default 1 check (quantity > 0),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_status_configs (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  status_key text not null,
  label text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(empresa_id, status_key)
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

create table if not exists public.quote_personalizations (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  empresa_id uuid references public.empresas(id) on delete cascade,
  person_name text not null,
  size text,
  quantity integer not null default 1 check (quantity > 0),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  name text not null,
  quantity numeric(12,2) not null default 0,
  unit text not null default 'unidades',
  min_quantity numeric(12,2) not null default 0,
  status text not null default 'ok',
  item_type text not null default 'produto_acabado' check (item_type in ('materia_prima','tecido','produto_acabado')),
  category text,
  supplier text,
  cost_per_unit numeric(12,2),
  total_cost numeric(12,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inventory_items_empresa on public.inventory_items(empresa_id);
create index if not exists idx_inventory_items_tipo on public.inventory_items(item_type);

create table if not exists public.movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  produto_id uuid references public.atelie_products(id) on delete set null,
  variacao_id uuid references public.produto_variacoes(id) on delete set null,
  tipo_movimentacao varchar(50) not null check (tipo_movimentacao in ('entrada','saida','ajuste','transferencia','perda','devolucao')),
  ajuste_sign varchar(20) not null default 'incremento' check (ajuste_sign in ('incremento','decremento')),
  quantidade numeric(12,2) not null,
  quantidade_anterior numeric(12,2),
  quantidade_atual numeric(12,2),
  motivo text,
  origem varchar(100),
  origem_id uuid,
  lote varchar(100),
  data_validade date,
  valor_unitario numeric(12,2),
  usuario_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_movimentacoes_empresa on public.movimentacoes_estoque(empresa_id);
create index if not exists idx_movimentacoes_item on public.movimentacoes_estoque(inventory_item_id);
create index if not exists idx_movimentacoes_tipo on public.movimentacoes_estoque(tipo_movimentacao);
create index if not exists idx_movimentacoes_data on public.movimentacoes_estoque(created_at);

create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
as $function$
declare
  delta numeric(12,2) := 0;
  current_quantity numeric(12,2) := 0;
  new_quantity numeric(12,2) := 0;
begin
  if NEW.inventory_item_id is null then
    return NEW;
  end if;

  select quantity
    into current_quantity
    from public.inventory_items
   where id = NEW.inventory_item_id
   for update;

  if NEW.tipo_movimentacao in ('entrada','devolucao','transferencia') then
    delta := NEW.quantidade;
  elsif NEW.tipo_movimentacao in ('saida','perda') then
    delta := -NEW.quantidade;
  elsif NEW.tipo_movimentacao = 'ajuste' then
    if NEW.ajuste_sign = 'decremento' then
      delta := -NEW.quantidade;
    else
      delta := NEW.quantidade;
    end if;
  end if;

  -- Permitir saldo negativo para representar falta real (backorder).
  -- Avisos/alertas devem ser exibidos no app quando quantidade_atual < 0.
  new_quantity := coalesce(current_quantity, 0) + delta;

  update public.inventory_items
    set quantity = new_quantity,
        total_cost = case
          -- total_cost não deve ficar negativo (valor de estoque físico).
          when cost_per_unit is not null then greatest(new_quantity, 0) * cost_per_unit
          else total_cost
        end,
        status = case
          when new_quantity <= 0 then 'critical'
          when new_quantity < min_quantity then 'low'
          else 'ok'
        end,
        updated_at = now()
    where id = NEW.inventory_item_id;

  NEW.quantidade_anterior := current_quantity;
  NEW.quantidade_atual := new_quantity;

  return NEW;
end;
$function$;

drop trigger if exists trg_apply_inventory_movement on public.movimentacoes_estoque;
create trigger trg_apply_inventory_movement
before insert on public.movimentacoes_estoque
for each row execute function public.apply_inventory_movement();

-- RLS Policies
alter table public.empresas enable row level security;
alter table public.user_empresas enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.quote_personalizations enable row level security;
alter table public.inventory_items enable row level security;
alter table public.order_status_configs enable row level security;
alter table public.order_personalizations enable row level security;
alter table public.movimentacoes_estoque enable row level security;

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

drop policy if exists "users_select_order_status_configs" on public.order_status_configs;
create policy "users_select_order_status_configs" on public.order_status_configs for select using (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = order_status_configs.empresa_id
  )
);

drop policy if exists "users_insert_order_status_configs" on public.order_status_configs;
create policy "users_insert_order_status_configs" on public.order_status_configs for insert with check (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = order_status_configs.empresa_id
  )
);

drop policy if exists "users_update_order_status_configs" on public.order_status_configs;
create policy "users_update_order_status_configs" on public.order_status_configs for update using (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = order_status_configs.empresa_id
  )
) with check (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = order_status_configs.empresa_id
  )
);

drop policy if exists "users_select_order_personalizations" on public.order_personalizations;
create policy "users_select_order_personalizations" on public.order_personalizations for select using (
  exists (
    select 1 from public.user_empresas ue
    join public.orders o on o.empresa_id = ue.empresa_id
    where ue.user_id = auth.uid()
    and o.id = order_personalizations.order_id
  )
);

drop policy if exists "users_insert_order_personalizations" on public.order_personalizations;
create policy "users_insert_order_personalizations" on public.order_personalizations for insert with check (
  exists (
    select 1 from public.user_empresas ue
    join public.orders o on o.empresa_id = ue.empresa_id
    where ue.user_id = auth.uid()
    and o.id = order_personalizations.order_id
  )
);

drop policy if exists "users_update_order_personalizations" on public.order_personalizations;
create policy "users_update_order_personalizations" on public.order_personalizations for update using (
  exists (
    select 1 from public.user_empresas ue
    join public.orders o on o.empresa_id = ue.empresa_id
    where ue.user_id = auth.uid()
    and o.id = order_personalizations.order_id
  )
) with check (
  exists (
    select 1 from public.user_empresas ue
    join public.orders o on o.empresa_id = ue.empresa_id
    where ue.user_id = auth.uid()
    and o.id = order_personalizations.order_id
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

drop policy if exists "users_select_quote_personalizations" on public.quote_personalizations;
create policy "users_select_quote_personalizations" on public.quote_personalizations for select using (
  exists (
    select 1 from public.user_empresas ue
    join public.quotes q on q.empresa_id = ue.empresa_id
    where ue.user_id = auth.uid() 
    and q.id = quote_personalizations.quote_id
  )
);

drop policy if exists "users_insert_quote_personalizations" on public.quote_personalizations;
create policy "users_insert_quote_personalizations" on public.quote_personalizations for insert with check (
  exists (
    select 1 from public.user_empresas ue
    join public.quotes q on q.empresa_id = ue.empresa_id
    where ue.user_id = auth.uid() 
    and q.id = quote_personalizations.quote_id
  )
);

drop policy if exists "users_update_quote_personalizations" on public.quote_personalizations;
create policy "users_update_quote_personalizations" on public.quote_personalizations for update using (
  exists (
    select 1 from public.user_empresas ue
    join public.quotes q on q.empresa_id = ue.empresa_id
    where ue.user_id = auth.uid() 
    and q.id = quote_personalizations.quote_id
  )
) with check (
  exists (
    select 1 from public.user_empresas ue
    join public.quotes q on q.empresa_id = ue.empresa_id
    where ue.user_id = auth.uid() 
    and q.id = quote_personalizations.quote_id
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

drop policy if exists "users_update_inventory" on public.inventory_items;
create policy "users_update_inventory" on public.inventory_items for update using (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = inventory_items.empresa_id
  )
) with check (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid() 
    and user_empresas.empresa_id = inventory_items.empresa_id
  )
);

-- Policies para movimentacoes_estoque
drop policy if exists "users_select_movimentacoes" on public.movimentacoes_estoque;
create policy "users_select_movimentacoes" on public.movimentacoes_estoque for select using (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid()
    and user_empresas.empresa_id = movimentacoes_estoque.empresa_id
  )
);

drop policy if exists "users_insert_movimentacoes" on public.movimentacoes_estoque;
create policy "users_insert_movimentacoes" on public.movimentacoes_estoque for insert with check (
  exists (
    select 1 from public.user_empresas 
    where user_empresas.user_id = auth.uid()
    and user_empresas.empresa_id = movimentacoes_estoque.empresa_id
  )
);