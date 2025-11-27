import { supabase } from "./client";
import { getCurrentEmpresaId } from "./auth-utils";
import { InventoryItemType } from "./inventory";

export type AjusteSign = "incremento" | "decremento";

export interface MovimentacaoEstoque {
  id?: string;
  empresa_id?: string;
  inventory_item_id?: string;
  produto_id?: string | null;
  variacao_id?: string | null;
  tipo_movimentacao: "entrada" | "saida" | "ajuste" | "transferencia" | "perda" | "devolucao";
  ajuste_sign?: AjusteSign;
  quantidade: number;
  quantidade_anterior?: number | null;
  quantidade_atual?: number | null;
  motivo?: string | null;
  origem?: string | null;
  origem_id?: string | null;
  lote?: string | null;
  data_validade?: string | null;
  valor_unitario?: number | null;
  usuario_id?: string | null;
  created_at?: string;
  inventory_item?: {
    id: string;
    name: string;
    unit: string;
    item_type: InventoryItemType;
  } | null;
}

export async function listarMovimentacoes(filtros?: {
  inventory_item_id?: string;
  tipo_movimentacao?: string;
  data_inicio?: string;
  data_fim?: string;
}): Promise<MovimentacaoEstoque[]> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return [];
    }

    let query = supabase
      .from("movimentacoes_estoque")
      .select("*, inventory_items(id, name, unit, item_type)")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (filtros?.inventory_item_id) {
      query = query.eq("inventory_item_id", filtros.inventory_item_id);
    }

    if (filtros?.tipo_movimentacao) {
      query = query.eq("tipo_movimentacao", filtros.tipo_movimentacao);
    }

    if (filtros?.data_inicio) {
      query = query.gte("created_at", filtros.data_inicio);
    }

    if (filtros?.data_fim) {
      query = query.lte("created_at", `${filtros.data_fim}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao listar movimentações:", error);
      return [];
    }

    return (data || []) as MovimentacaoEstoque[];
  } catch (error) {
    console.error("Erro ao listar movimentações:", error);
    return [];
  }
}

type CriarMovimentacaoInput = Omit<
  MovimentacaoEstoque,
  "id" | "empresa_id" | "usuario_id" | "created_at" | "inventory_item"
>;

export async function criarMovimentacao(
  movimentacao: CriarMovimentacaoInput
): Promise<{ ok: boolean; data?: MovimentacaoEstoque; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: "Usuário não tem empresa associada" };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const insertPayload = {
      empresa_id: empresaId,
      usuario_id: user?.id ?? null,
      inventory_item_id: movimentacao.inventory_item_id ?? null,
      produto_id: movimentacao.produto_id ?? null,
      variacao_id: movimentacao.variacao_id ?? null,
      tipo_movimentacao: movimentacao.tipo_movimentacao,
      ajuste_sign: movimentacao.ajuste_sign ?? "incremento",
      quantidade: movimentacao.quantidade,
      motivo: movimentacao.motivo ?? null,
      origem: movimentacao.origem ?? null,
      origem_id: movimentacao.origem_id ?? null,
      lote: movimentacao.lote ?? null,
      data_validade: movimentacao.data_validade ?? null,
      valor_unitario: movimentacao.valor_unitario ?? null,
    };

    const { data, error } = await supabase
      .from("movimentacoes_estoque")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) {
      console.error("Erro ao criar movimentação:", error);
      return { ok: false, error: error.message };
    }

    if (!data?.id) {
      return { ok: true };
    }

    const { data: refreshed } = await supabase
      .from("movimentacoes_estoque")
      .select("*, inventory_items(id, name, unit, item_type)")
      .eq("id", data.id)
      .single();

    return { ok: true, data: refreshed as MovimentacaoEstoque };
  } catch (error: any) {
    console.error("Erro ao criar movimentação:", error);
    return { ok: false, error: error.message || "Erro ao criar movimentação" };
  }
}

