// supabase/functions/inventory-alerts/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PreferenceRow = {
  id?: string;
  empresa_id: string;
  email?: string | null;
  send_email: boolean;
  notify_low: boolean;
  notify_critical: boolean;
  frequency: "daily" | "weekly";
  empresa?: {
    nome?: string | null;
  } | null;
};

type InventoryItemRow = {
  id: string;
  empresa_id: string;
  name: string;
  quantity: number;
  min_quantity: number;
  status: "low" | "critical" | string;
  item_type?: string | null;
  supplier?: string | null;
  updated_at?: string | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey =
  Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const emailFrom = Deno.env.get("ALERTS_EMAIL_FROM") ?? "Ateliê PRO <no-reply@ateliepro.app>";

if (!supabaseUrl || !supabaseKey) {
  console.error("[inventory-alerts] Missing Supabase credentials");
  throw new Error("Missing Supabase credentials");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "X-Client-Info": "inventory-alerts-edge-func" } },
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    let targetEmpresaId: string | null = null;
    try {
      if (req.headers.get("content-type")?.includes("application/json")) {
        const body = await req.json();
        targetEmpresaId = body?.empresaId ?? null;
        console.log("[inventory-alerts] empresaId recebido:", targetEmpresaId);
      }
    } catch {
      // corpo inválido? ignora
    }

    const result = await processAlerts(targetEmpresaId);
    console.log("[inventory-alerts] resultado:", JSON.stringify(result));
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[inventory-alerts] erro inesperado:", error);
    return new Response(
      JSON.stringify({ ok: false, error: (error as Error)?.message ?? "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function processAlerts(targetEmpresaId: string | null) {
  const baseQuery = supabaseAdmin
    .from("inventory_alert_preferences")
    .select("*, empresa:empresas(nome)");

  const { data: preferences, error } = await (targetEmpresaId
    ? baseQuery.eq("empresa_id", targetEmpresaId)
    : baseQuery);

  if (error) throw error;
  if (!preferences || preferences.length === 0) {
    return { processedPreferences: 0, notifiedItems: 0, recipients: 0 };
  }

  let totalRecipients = 0;
  let totalItems = 0;
  const logsToInsert: Array<{
    empresa_id: string;
    inventory_item_id: string;
    status: string;
    payload: Record<string, unknown>;
  }> = [];

  for (const pref of preferences as PreferenceRow[]) {
    const statuses: Array<"low" | "critical"> = [];
    if (pref.notify_low) statuses.push("low");
    if (pref.notify_critical) statuses.push("critical");
    if (statuses.length === 0) {
      console.log(`[inventory-alerts] empresa ${pref.empresa_id}: nenhum tipo de alerta habilitado`);
      continue;
    }

    console.log(`[inventory-alerts] empresa ${pref.empresa_id}: buscando itens com status ${statuses.join(", ")}`);

    const { data: items, error: itemsError } = await supabaseAdmin
      .from("inventory_items")
      .select("id, empresa_id, name, quantity, min_quantity, status, item_type, supplier, updated_at")
      .eq("empresa_id", pref.empresa_id)
      .in("status", statuses);

    if (itemsError) {
      console.error("[inventory-alerts] erro ao buscar itens:", itemsError);
      continue;
    }
    if (!items || items.length === 0) {
      console.log(`[inventory-alerts] empresa ${pref.empresa_id}: nenhum item encontrado com status ${statuses.join(", ")}`);
      continue;
    }
    
    console.log(`[inventory-alerts] empresa ${pref.empresa_id}: ${items.length} item(ns) encontrado(s)`);

    const windowHours = pref.frequency === "weekly" ? 24 * 7 : 24;
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

    const { data: recentLogs } = await supabaseAdmin
      .from("inventory_alert_logs")
      .select("inventory_item_id, status")
      .eq("empresa_id", pref.empresa_id)
      .gte("sent_at", since);

    const alreadySent = new Set(
      (recentLogs ?? []).map((log) => `${log.inventory_item_id}:${log.status}`),
    );

    const pendingItems = (items as InventoryItemRow[]).filter(
      (item) =>
        ["low", "critical"].includes(item.status) &&
        !alreadySent.has(`${item.id}:${item.status}`),
    );

    if (pendingItems.length === 0) {
      console.log(`[inventory-alerts] empresa ${pref.empresa_id}: nenhum item pendente (todos já foram notificados recentemente)`);
      continue;
    }

    console.log(`[inventory-alerts] empresa ${pref.empresa_id}: ${pendingItems.length} item(ns) pendente(s) para notificação`);

    const companyName = pref.empresa?.nome ?? "Seu ateliê";

    if (pref.send_email && pref.email) {
      console.log(`[inventory-alerts] empresa ${pref.empresa_id}: enviando e-mail para ${pref.email}`);
      const ok = await sendEmail(companyName, pref.email, pendingItems);
      if (ok) {
        totalRecipients += 1;
        console.log(`[inventory-alerts] empresa ${pref.empresa_id}: e-mail enviado com sucesso`);
      } else {
        console.error(`[inventory-alerts] empresa ${pref.empresa_id}: falha ao enviar e-mail`);
      }
    } else {
      console.log(`[inventory-alerts] empresa ${pref.empresa_id}: e-mail desabilitado ou não configurado`);
    }

    totalItems += pendingItems.length;
    logsToInsert.push(
      ...pendingItems.map((item) => ({
        empresa_id: pref.empresa_id,
        inventory_item_id: item.id,
        status: item.status,
        payload: {
          name: item.name,
          quantity: item.quantity,
          min_quantity: item.min_quantity,
          supplier: item.supplier,
          item_type: item.item_type,
          updated_at: item.updated_at,
        },
      })),
    );
  }

  if (logsToInsert.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from("inventory_alert_logs")
      .insert(logsToInsert);
    if (insertError) console.error("[inventory-alerts] erro ao registrar logs:", insertError);
  }

  return {
    processedPreferences: preferences.length,
    notifiedItems: totalItems,
    recipients: totalRecipients,
  };
}

async function sendEmail(companyName: string, to: string, items: InventoryItemRow[]) {
  if (!resendApiKey) {
    console.warn("[inventory-alerts] RESEND_API_KEY não configurada, pulando envio de e-mail");
    return false;
  }

  if (!to || !to.trim()) {
    console.warn("[inventory-alerts] e-mail de destino não informado");
    return false;
  }

  const subject = `Alertas de estoque - ${companyName}`;
  const html = buildEmailTemplate(companyName, items);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: emailFrom, to: [to], subject, html }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[inventory-alerts] falha ao enviar e-mail:", response.status, text);
      return false;
    }

    const result = await response.json();
    console.log("[inventory-alerts] e-mail enviado com sucesso:", result);
    return true;
  } catch (error) {
    console.error("[inventory-alerts] erro ao enviar e-mail:", error);
    return false;
  }
}

function buildEmailTemplate(companyName: string, items: InventoryItemRow[]) {
  const rows = items
    .map((item) => {
      const statusLabel = item.status === "critical" ? "Crítico" : "Baixo";
      return `
        <tr>
          <td style="padding:8px 12px;border:1px solid #eaeaea;">
            <strong>${escapeHtml(item.name)}</strong><br/>
            <small style="color:#6b7280;">${escapeHtml(item.item_type ?? "—")}</small>
          </td>
          <td style="padding:8px 12px;border:1px solid #eaeaea;">${item.quantity ?? "-"}</td>
          <td style="padding:8px 12px;border:1px solid #eaeaea;">${item.min_quantity ?? "-"}</td>
          <td style="padding:8px 12px;border:1px solid #eaeaea;">${escapeHtml(statusLabel)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="font-family:Inter,Helvetica,Arial,sans-serif;background-color:#f7f7f8;padding:24px;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <div style="padding:24px;border-bottom:1px solid #e5e7eb;">
          <h1 style="margin:0;font-size:20px;color:#111827;">Alertas de estoque - ${escapeHtml(companyName)}</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#4b5563;">
            Identificamos ${items.length} item(ns) com atenção no seu estoque.
          </p>
        </div>
        <div style="padding:0 24px 24px;">
          <table style="width:100%;border-collapse:collapse;margin-top:16px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="text-align:left;padding:8px 12px;border:1px solid #eaeaea;">Item</th>
                <th style="text-align:left;padding:8px 12px;border:1px solid #eaeaea;">Saldo</th>
                <th style="text-align:left;padding:8px 12px;border:1px solid #eaeaea;">Mínimo</th>
                <th style="text-align:left;padding:8px 12px;border:1px solid #eaeaea;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <p style="margin-top:16px;font-size:13px;color:#6b7280;">
            Dica: atualize os mínimos em cada item para receber alertas mais precisos.
          </p>
        </div>
        <div style="padding:16px 24px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            Você recebeu este e-mail porque os alertas automáticos estão habilitados no Ateliê PRO.
          </p>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}