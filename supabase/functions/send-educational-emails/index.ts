// supabase/functions/send-educational-emails/index.ts
// 📚 Função automática para enviar emails educativos (Drip Campaign)
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
  console.error("[send-educational-emails] Missing Supabase credentials");
  throw new Error("Missing Supabase credentials");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "X-Client-Info": "send-educational-emails-edge-func" } },
});

interface EmpresaComDados {
  id: string;
  nome: string;
  email: string;
  created_at: string;
  is_premium: boolean;
  user_empresas?: Array<{
    user_id: string;
    auth?: {
      users?: {
        email?: string;
      };
    };
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("📚 Iniciando envio de emails educativos...");

    const agora = new Date();

    // Buscar todas as empresas não premium (trials)
    const { data: empresas, error } = await supabaseAdmin
      .from("empresas")
      .select(`
        id,
        nome,
        email,
        created_at,
        is_premium,
        user_empresas!inner(
          user_id,
          auth.users!inner(email)
        )
      `)
      .eq("is_premium", false)
      .neq("status", "expired");

    if (error) {
      console.error("❌ Erro ao buscar empresas:", error);
      throw error;
    }

    let emailsEnviados = 0;
    const erros: string[] = [];

    for (const empresa of empresas || []) {
      try {
        const userEmail = empresa.user_empresas?.[0]?.auth?.users?.email || empresa.email;
        if (!userEmail) continue;

        const diasDesdeCadastro = Math.floor(
          (agora.getTime() - new Date(empresa.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

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

        // Determinar qual email enviar baseado nos dias desde cadastro
        let emailTemplate: string | null = null;
        let subject: string = "";

        if (diasDesdeCadastro === 1) {
          // Dia 1: Bem-vindo
          emailTemplate = buildWelcomeEmail(empresa.nome);
          subject = "🎉 Bem-vindo ao Ateliê Pro! Veja como começar";
        } else if (diasDesdeCadastro === 3 && totalPedidos === 0) {
          // Dia 3: Dica de orçamentos
          emailTemplate = buildQuoteTipEmail(empresa.nome);
          subject = "💡 Dica: Use orçamentos para aumentar conversão";
        } else if (diasDesdeCadastro === 5 && totalOrcamentos === 0) {
          // Dia 5: Dica de WhatsApp
          emailTemplate = buildWhatsAppTipEmail(empresa.nome);
          subject = "📱 Você sabia? O app envia WhatsApp automaticamente";
        } else if (diasDesdeCadastro === 7) {
          // Dia 7: Resumo do que fez
          emailTemplate = buildWeekSummaryEmail(
            empresa.nome,
            totalPedidos,
            totalOrcamentos,
            totalClientes
          );
          subject = "📊 Resumo da sua primeira semana no Ateliê Pro";
        }

        // Enviar email se houver template
        if (emailTemplate && resendApiKey) {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: emailFrom,
              to: userEmail,
              subject,
              html: emailTemplate,
            }),
          });

          if (res.ok) {
            emailsEnviados++;
            console.log(`✅ Email educativo enviado para ${userEmail} (dia ${diasDesdeCadastro})`);
          } else {
            const errorText = await res.text();
            erros.push(`${userEmail}: ${errorText}`);
          }
        }
      } catch (error) {
        erros.push(`${empresa.email}: ${error.message}`);
        console.error(`❌ Erro ao processar ${empresa.email}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsEnviados,
        erros: erros.length > 0 ? erros : undefined,
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

function buildWelcomeEmail(nome: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">🎉 Bem-vindo ao Ateliê Pro!</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px;">Olá <strong>${nome}</strong>!</p>
    
    <p>Ficamos felizes em ter você aqui! 🎊</p>
    
    <p>O Ateliê Pro vai ajudar você a:</p>
    <ul style="line-height: 2;">
      <li>✅ Organizar todos os seus pedidos</li>
      <li>✅ Criar orçamentos profissionais</li>
      <li>✅ Gerenciar seus clientes</li>
      <li>✅ Controlar seu estoque</li>
      <li>✅ Enviar WhatsApp automaticamente</li>
    </ul>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #667eea;">🚀 Primeiros Passos:</h3>
      <ol style="line-height: 2;">
        <li>Crie seu primeiro cliente</li>
        <li>Faça um orçamento</li>
        <li>Converta em pedido</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://app.ateliepro.online" 
         style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; display: inline-block;">
        Começar Agora
      </a>
    </div>
    
    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center;">
      <h3 style="color: white; margin-top: 0; font-size: 20px;">💬 Precisa de Ajuda?</h3>
      <p style="color: white; margin: 10px 0;">Estamos aqui para ajudar você a ter sucesso!</p>
      <p style="color: white; margin: 15px 0; font-size: 16px;">
        <strong>✨ Suporte Proativo Disponível:</strong>
      </p>
      <ul style="color: white; text-align: left; display: inline-block; margin: 15px 0;">
        <li>💬 Chat ao vivo no app (clique no ícone no canto inferior direito)</li>
        <li>📧 Email: suporte@ateliepro.online</li>
        <li>📱 WhatsApp: Disponível no chat</li>
      </ul>
      <p style="color: white; margin-top: 20px; font-size: 14px;">
        Não hesite em nos chamar! Queremos garantir que você aproveite ao máximo o Ateliê Pro. 🚀
      </p>
    </div>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      💡 <strong>Dica:</strong> Complete o checklist de onboarding no dashboard para começar!
    </p>
  </div>
</body>
</html>
  `;
}

function buildQuoteTipEmail(nome: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">💡 Dica do Dia</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Olá <strong>${nome}</strong>!</p>
    
    <p>Você sabia que <strong>orçamentos aumentam a conversão em até 40%</strong>? 📈</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #667eea;">✨ Como usar orçamentos:</h3>
      <ul style="line-height: 2;">
        <li>📝 Crie orçamentos detalhados</li>
        <li>📤 Compartilhe com clientes via link</li>
        <li>📱 Envie por WhatsApp</li>
        <li>✅ Converta em pedido quando aprovado</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://app.ateliepro.online/orcamentos/novo" 
         style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; display: inline-block;">
        Criar Primeiro Orçamento
      </a>
    </div>
  </div>
</body>
</html>
  `;
}

function buildWhatsAppTipEmail(nome: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">📱 Você Sabia?</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Olá <strong>${nome}</strong>!</p>
    
    <p>O Ateliê Pro <strong>envia mensagens no WhatsApp automaticamente</strong>! 🚀</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #667eea;">✨ Funcionalidades automáticas:</h3>
      <ul style="line-height: 2;">
        <li>📤 Enviar orçamentos por WhatsApp</li>
        <li>🔔 Lembretes de pagamento</li>
        <li>📅 Avisos de entrega</li>
        <li>💬 Mensagens personalizadas</li>
      </ul>
    </div>
    
    <p><strong>Economize tempo</strong> e mantenha seus clientes sempre informados!</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://app.ateliepro.online" 
         style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; display: inline-block;">
        Ver Como Funciona
      </a>
    </div>
  </div>
</body>
</html>
  `;
}

function buildWeekSummaryEmail(
  nome: string,
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
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">📊 Resumo da Sua Primeira Semana</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Olá <strong>${nome}</strong>!</p>
    
    <p>Você completou sua primeira semana no Ateliê Pro! 🎉</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="margin-top: 0; color: #667eea;">📈 Seu Progresso:</h2>
      <ul style="list-style: none; padding: 0;">
        <li style="padding: 10px; border-bottom: 1px solid #eee;">📦 <strong>${pedidos} Pedidos</strong> criados</li>
        <li style="padding: 10px; border-bottom: 1px solid #eee;">💰 <strong>${orcamentos} Orçamentos</strong> gerados</li>
        <li style="padding: 10px;">👥 <strong>${clientes} Clientes</strong> cadastrados</li>
      </ul>
    </div>
    
    <p><strong>Continue assim!</strong> Quanto mais você usa, mais valor o app gera para você.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://app.ateliepro.online" 
         style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; display: inline-block;">
        Ver Dashboard
      </a>
    </div>
  </div>
</body>
</html>
  `;
}

