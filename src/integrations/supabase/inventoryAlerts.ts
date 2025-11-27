import { supabase } from "./client";
import { getCurrentEmpresaId } from "./auth-utils";

export type InventoryAlertPreferences = {
  id?: string;
  empresa_id?: string;
  email?: string | null;
  whatsapp?: string | null;
  send_email: boolean;
  send_whatsapp: boolean;
  notify_low: boolean;
  notify_critical: boolean;
  frequency: "daily" | "weekly";
  quiet_hours?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

export type InventoryAlertLog = {
  id: string;
  empresa_id: string;
  inventory_item_id: string;
  status: "low" | "critical";
  payload?: Record<string, unknown> | null;
  sent_at: string;
};

const DEFAULT_PREFERENCES: InventoryAlertPreferences = {
  send_email: true,
  send_whatsapp: false,
  notify_low: true,
  notify_critical: true,
  frequency: "daily",
  quiet_hours: null,
};

export async function getInventoryAlertPreferences(): Promise<InventoryAlertPreferences> {
  const empresaId = await getCurrentEmpresaId();

  const { data, error } = await supabase
    .from("inventory_alert_preferences")
    .select("*")
    .eq("empresa_id", empresaId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar preferências de alertas:", error);
    throw error;
  }

  if (!data) {
    return { ...DEFAULT_PREFERENCES, empresa_id: empresaId };
  }

  return data as InventoryAlertPreferences;
}

export async function upsertInventoryAlertPreferences(
  input: InventoryAlertPreferences
): Promise<{ ok: boolean; error?: string }> {
  try {
    const empresaId = input.empresa_id || (await getCurrentEmpresaId());
    const payload = {
      ...DEFAULT_PREFERENCES,
      ...input,
      empresa_id: empresaId,
      email: input.email?.trim() || null,
      whatsapp: input.whatsapp?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("inventory_alert_preferences").upsert(payload, {
      onConflict: "empresa_id",
    });

    if (error) {
      console.error("Erro ao salvar preferências de alertas:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error("Erro inesperado ao salvar alertas:", error);
    return { ok: false, error: (error as Error).message };
  }
}

export async function listInventoryAlertLogs(limit = 30): Promise<InventoryAlertLog[]> {
  try {
    const empresaId = await getCurrentEmpresaId();
    const { data, error } = await supabase
      .from("inventory_alert_logs")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("sent_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Erro ao buscar logs de alertas:", error);
      return [];
    }

    return (data ?? []) as InventoryAlertLog[];
  } catch (error) {
    console.error("Erro inesperado ao buscar logs de alertas:", error);
    return [];
  }
}

export async function triggerInventoryAlertsJob(): Promise<{ ok: boolean; message?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    
    const { data, error } = await supabase.functions.invoke("inventory-alerts", {
      body: { empresaId },
    });

    if (error) {
      console.error("Erro ao acionar função de alertas:", error);
      return { ok: false, message: error.message };
    }

    const result = data as { processedPreferences?: number; notifiedItems?: number; recipients?: number; message?: string } | null;
    
    let message = "Alertas verificados com sucesso!";
    if (result) {
      if (result.notifiedItems && result.notifiedItems > 0) {
        message = `${result.notifiedItems} alerta(s) enviado(s) com sucesso!`;
      } else if (result.processedPreferences === 0) {
        message = "Nenhuma preferência de alerta configurada.";
      } else {
        message = "Nenhum item com estoque baixo ou crítico encontrado.";
      }
    }

    return { ok: true, message };
  } catch (error) {
    console.error("Erro inesperado ao acionar função de alertas:", error);
    return { ok: false, message: (error as Error).message };
  }
}

