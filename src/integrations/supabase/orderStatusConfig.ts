import { supabase } from "./client";
import { getCurrentEmpresaId } from "./auth-utils";
export type OrderStatusKey =
  | "Aguardando aprovação"
  | "Em produção"
  | "Finalizando"
  | "Pronto"
  | "Aguardando retirada"
  | "Entregue"
  | "Cancelado";

export type OrderStatusConfigRecord = {
  id: string;
  empresa_id: string;
  status_key: OrderStatusKey;
  label: string;
  description: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type OrderStatusConfigInput = {
  status_key: OrderStatusKey;
  label: string;
  description?: string | null;
};

export async function getOrderStatusConfigs(): Promise<OrderStatusConfigRecord[]> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      console.warn("Empresa não encontrada ao buscar configurações de status");
      return [];
    }

    const { data, error } = await supabase
      .from("order_status_configs")
      .select("id, empresa_id, status_key, label, description, created_at, updated_at")
      .eq("empresa_id", empresaId);

    if (error) {
      console.error("Erro ao buscar configurações de status:", error);
      return [];
    }

    return (data ?? []) as OrderStatusConfigRecord[];
  } catch (error) {
    console.error("Erro inesperado ao buscar configurações de status:", error);
    return [];
  }
}

export async function saveOrderStatusConfigs(
  configs: OrderStatusConfigInput[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: "Empresa não encontrada" };
    }

    const sanitizedConfigs = configs.map((config) => ({
      empresa_id: empresaId,
      status_key: config.status_key,
      label: config.label.trim(),
      description: config.description?.trim() || null,
      updated_at: new Date().toISOString(),
    }));

    // Filtrar configurações inválidas (sem label)
    const validConfigs = sanitizedConfigs.filter((config) => config.label.length > 0);

    if (validConfigs.length === 0) {
      return { ok: false, error: "Nenhuma configuração válida para salvar" };
    }

    const { error } = await supabase
      .from("order_status_configs")
      .upsert(validConfigs, { onConflict: "empresa_id,status_key" });

    if (error) {
      console.error("Erro ao salvar configurações de status:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error: any) {
    console.error("Erro inesperado ao salvar configurações de status:", error);
    return { ok: false, error: error.message || "Erro ao salvar configurações" };
  }
}

export async function resetOrderStatusConfigs(): Promise<{ ok: boolean; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: "Empresa não encontrada" };
    }

    const { error } = await supabase
      .from("order_status_configs")
      .delete()
      .eq("empresa_id", empresaId);

    if (error) {
      console.error("Erro ao resetar configurações de status:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error: any) {
    console.error("Erro inesperado ao resetar configurações de status:", error);
    return { ok: false, error: error.message || "Erro ao resetar configurações" };
  }
}

