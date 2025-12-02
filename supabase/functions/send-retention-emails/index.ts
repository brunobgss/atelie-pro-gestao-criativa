// supabase/functions/send-retention-emails/index.ts
// 🔄 Função automática para enviar emails de re-engajamento
// Executa diariamente via cron job - ZERO manutenção!

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey =
  Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const emailFrom = Deno.env.get("RETENTION_EMAIL_FROM") ?? "Ateliê Pro <noreply@ateliepro.online>";

if (!supabaseUrl || !supabaseKey) {
  console.error("[send-retention-emails] Missing Supabase credentials");
  throw new Error("Missing Supabase credentials");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "X-Client-Info": "send-retention-emails-edge-func" } },
});

interface EmpresaComAtividade {
  id: string;
  nome: string;
  email: string;
  trial_end_date: string | null;
  is_premium: boolean;
  status: string;
  total_pedidos: number;
  total_orcamentos: number;
  total_clientes: number;
  ultima_atividade: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("📧 Iniciando envio de emails de retenção...");

    const agora = new Date();
    const tresDiasFuturo = new Date(agora.getTime() + 3 * 24 * 60 * 60 * 1000);
    const doisDiasFuturo = new Date(agora.getTime() + 2 * 24 * 60 * 60 * 1000);

    // 1. Buscar empresas com trial expirando em 3 dias
    const { data: empresasTrial, error: errTrial } = await supabaseAdmin
      .from("empresas")
      .select(`
        id,
        nome,
        email,
        trial_end_date,
        is_premium,
        status,
        user_empresas!inner(
          user_id,
          auth.users!inner(email)
        )
      `)
      .eq("is_premium", false)
      .lte("trial_end_date", tresDiasFuturo.toISOString())
      .gte("trial_end_date", doisDiasFuturo.toISOString())
      .neq("status", "expired");

    if (errTrial) {
      console.error("❌ Erro ao buscar empresas com trial expirando:", errTrial);
    }

    // 2. Buscar empresas premium inativas (sem uso há 7+ dias)
    const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const { data: empresasPremium, error: errPremium } = await supabaseAdmin
      .from("empresas")
      .select(`
        id,
        nome,
        email,
        trial_end_date,
        is_premium,
        status,
        user_empresas!inner(
          user_id,
          auth.users!inner(email)
        )
      `)
      .eq("is_premium", true)
      .eq("status", "active");

    if (errPremium) {
      console.error("❌ Erro ao buscar empresas premium:", errPremium);
    }

    let emailsEnviados = 0;
    const erros: string[] = [];

    // 3. Processar emails para trials expirando
    if (empresasTrial && empresasTrial.length > 0) {
      for (const empresa of empresasTrial) {
        try {
          const userEmail = empresa.user_empresas?.[0]?.auth?.users?.email || empresa.email;
          if (!userEmail) continue;

          // Buscar estatísticas de uso
          const [pedidos, orcamentos, clientes] = await Promise.all([
            supabaseAdmin
              .from("atelie_orders")
              .select("id", { count: "exact", head: true })
              .eq("empresa_id", empresa.id),
            supabaseAdmin
              .from("atelie_quotes")
              .select("id", { count: "exact", head: true })
              .eq("empresa_id", empresa.id),
            supabaseAdmin
              .from("customers")
              .select("id", { count: "exact", head: true })
              .eq("empresa_id", empresa.id),
          ]);

          const totalPedidos = pedidos.count || 0;
          const totalOrcamentos = orcamentos.count || 0;
          const totalClientes = clientes.count || 0;
          const engajamento = totalPedidos + totalOrcamentos + totalClientes;

          const diasRestantes = empresa.trial_end_date
            ? Math.ceil(
                (new Date(empresa.trial_end_date).getTime() - agora.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0;

          // Enviar email via Resend
          if (resendApiKey) {
            const emailHtml = buildTrialExpiringEmail(
              empresa.nome,
              diasRestantes,
              engajamento,
              totalPedidos,
              totalOrcamentos,
              totalClientes
            );

            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: emailFrom,
                to: userEmail,
                subject: `⏰ Seu trial expira em ${diasRestantes} dias - Não perca seus dados!`,
                html: emailHtml,
              }),
            });

            if (res.ok) {
              emailsEnviados++;
              console.log(`✅ Email enviado para ${userEmail} (trial expirando)`);
            } else {
              const errorText = await res.text();
              erros.push(`${userEmail}: ${errorText}`);
              console.error(`❌ Erro ao enviar email para ${userEmail}:`, errorText);
            }
          } else {
            console.warn("⚠️ RESEND_API_KEY não configurada - emails não serão enviados");
          }
        } catch (error) {
          erros.push(`${empresa.email}: ${error.message}`);
          console.error(`❌ Erro ao processar ${empresa.email}:`, error);
        }
      }
    }

    // 4. Processar emails para premium inativos
    if (empresasPremium && empresasPremium.length > 0) {
      for (const empresa of empresasPremium) {
        try {
          const userEmail = empresa.user_empresas?.[0]?.auth?.users?.email || empresa.email;
          if (!userEmail) continue;

          // Verificar última atividade
          const [ultimoPedido, ultimoOrcamento, ultimoCliente] = await Promise.all([
            supabaseAdmin
              .from("atelie_orders")
              .select("created_at")
              .eq("empresa_id", empresa.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single(),
            supabaseAdmin
              .from("atelie_quotes")
              .select("created_at")
              .eq("empresa_id", empresa.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single(),
            supabaseAdmin
              .from("customers")
              .select("created_at")
              .eq("empresa_id", empresa.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single(),
          ]);

          const ultimasAtividades = [
            ultimoPedido.data?.created_at,
            ultimoOrcamento.data?.created_at,
            ultimoCliente.data?.created_at,
          ].filter(Boolean);

          if (ultimasAtividades.length === 0) continue;

          const ultimaAtividade = new Date(
            Math.max(...ultimasAtividades.map((d) => new Date(d!).getTime()))
          );
          const diasSemUso = Math.floor(
            (agora.getTime() - ultimaAtividade.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Só enviar se não usou há 7+ dias
          if (diasSemUso >= 7) {
            if (resendApiKey) {
              const emailHtml = buildPremiumInactiveEmail(empresa.nome, diasSemUso);

              const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${resendApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: emailFrom,
                  to: userEmail,
                  subject: `👋 Notamos que você não usa há ${diasSemUso} dias - Precisa de ajuda?`,
                  html: emailHtml,
                }),
              });

              if (res.ok) {
                emailsEnviados++;
                console.log(`✅ Email enviado para ${userEmail} (premium inativo)`);
              } else {
                const errorText = await res.text();
                erros.push(`${userEmail}: ${errorText}`);
              }
            }
          }
        } catch (error) {
          erros.push(`${empresa.email}: ${error.message}`);
          console.error(`❌ Erro ao processar premium ${empresa.email}:`, error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsEnviados,
        erros: erros.length > 0 ? erros : undefined,
        empresasTrial: empresasTrial?.length || 0,
        empresasPremium: empresasPremium?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Erro fatal:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

function buildTrialExpiringEmail(
  nome: string,
  diasRestantes: number,
  engajamento: number,
  pedidos: number,
  orcamentos: number,
  clientes: number
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seu trial expira em ${diasRestantes} dias</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">⏰ Seu Trial Expira em ${diasRestantes} Dias!</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px;">Olá <strong>${nome}</strong>!</p>
    
    <p>Notamos que você está usando o Ateliê Pro e já criou:</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="margin-top: 0; color: #667eea;">📊 Seu Progresso</h2>
      <ul style="list-style: none; padding: 0;">
        <li style="padding: 10px; border-bottom: 1px solid #eee;">📦 <strong>${pedidos} Pedidos</strong> criados</li>
        <li style="padding: 10px; border-bottom: 1px solid #eee;">💰 <strong>${orcamentos} Orçamentos</strong> gerados</li>
        <li style="padding: 10px;">👥 <strong>${clientes} Clientes</strong> cadastrados</li>
      </ul>
      <p style="text-align: center; margin-top: 20px; font-size: 24px; color: #667eea;">
        <strong>Total: ${engajamento} ações!</strong>
      </p>
    </div>
    
    <p><strong>Não perca tudo isso!</strong> Seu trial expira em <strong>${diasRestantes} dias</strong>.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://app.ateliepro.online/assinatura" 
         style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; display: inline-block;">
        🎯 Assinar Agora - R$ 39/mês
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      💡 <strong>Dica:</strong> Assine agora e mantenha todos os seus dados e histórico!
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #666; font-size: 12px; text-align: center;">
      Ateliê Pro - Sistema de Gestão para Ateliês<br>
      Precisa de ajuda? Responda este email!
    </p>
  </div>
</body>
</html>
  `;
}

function buildPremiumInactiveEmail(nome: string, diasSemUso: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Precisa de ajuda?</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">👋 Olá ${nome}!</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Notamos que você não está usando o Ateliê Pro há <strong>${diasSemUso} dias</strong>.</p>
    
    <p>Está tudo bem? Precisa de ajuda com alguma funcionalidade?</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: #667eea;">💡 Como podemos ajudar?</h3>
      <ul>
        <li>📚 Tutorial personalizado</li>
        <li>🎥 Vídeo chamada de suporte</li>
        <li>📧 Dúvidas sobre funcionalidades</li>
        <li>🔧 Problemas técnicos</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://app.ateliepro.online/ajuda" 
         style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; display: inline-block;">
        🆘 Preciso de Ajuda
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      Ou simplesmente responda este email que entraremos em contato!
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #666; font-size: 12px; text-align: center;">
      Ateliê Pro - Sistema de Gestão para Ateliês<br>
      Estamos aqui para ajudar! 💙
    </p>
  </div>
</body>
</html>
  `;
}

