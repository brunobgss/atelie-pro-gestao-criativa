-- Permitir saldo negativo no estoque (representar falta real).
-- Rode este SQL no Supabase SQL Editor (produção e dev) após o deploy.
--
-- O app deve exibir aviso quando movimentacoes_estoque.quantidade_atual < 0.

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

  -- IMPORTANTE: permite negativo (sem greatest(0,...))
  new_quantity := coalesce(current_quantity, 0) + delta;

  update public.inventory_items
    set quantity = new_quantity,
        total_cost = case
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

