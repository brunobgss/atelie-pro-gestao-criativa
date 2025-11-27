-- Inventory alert preferences and logs
create table if not exists public.inventory_alert_preferences (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  email text,
  whatsapp text,
  send_email boolean not null default true,
  send_whatsapp boolean not null default false,
  notify_low boolean not null default true,
  notify_critical boolean not null default true,
  frequency text not null default 'daily',
  quiet_hours jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id)
);

create table if not exists public.inventory_alert_logs (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  status text not null check (status in ('low','critical')),
  payload jsonb,
  sent_at timestamptz not null default now()
);

create index if not exists idx_inventory_alert_logs_empresa on public.inventory_alert_logs (empresa_id);
create index if not exists idx_inventory_alert_logs_item_status on public.inventory_alert_logs (inventory_item_id, status);

alter table public.inventory_alert_preferences enable row level security;
alter table public.inventory_alert_logs enable row level security;

drop policy if exists "users_select_alert_prefs" on public.inventory_alert_preferences;
create policy "users_select_alert_prefs" on public.inventory_alert_preferences
  for select using (
    empresa_id in (
      select empresa_id from public.user_empresas where user_empresas.user_id = auth.uid()
    )
  );

drop policy if exists "users_upsert_alert_prefs" on public.inventory_alert_preferences;
create policy "users_upsert_alert_prefs" on public.inventory_alert_preferences
  for all using (
    empresa_id in (
      select empresa_id from public.user_empresas where user_empresas.user_id = auth.uid()
    )
  )
  with check (
    empresa_id in (
      select empresa_id from public.user_empresas where user_empresas.user_id = auth.uid()
    )
  );

drop policy if exists "users_select_alert_logs" on public.inventory_alert_logs;
create policy "users_select_alert_logs" on public.inventory_alert_logs
  for select using (
    empresa_id in (
      select empresa_id from public.user_empresas where user_empresas.user_id = auth.uid()
    )
  );




