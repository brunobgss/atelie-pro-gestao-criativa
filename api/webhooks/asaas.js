// api/webhooks/asaas.js - Webhook ASAAS
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  console.log('🔔 Webhook ASAAS recebido (POST)');
  
  try {
    const webhookData = await req.json();
    console.log('📨 Dados do webhook:', JSON.stringify(webhookData, null, 2));

    // Verificar se é um evento válido do ASAAS
    if (!webhookData.event) {
      console.error('❌ Dados do webhook inválidos: evento ausente');
      console.error('📨 Payload completo:', JSON.stringify(webhookData, null, 2));
      return Response.json({ 
        error: 'Dados do webhook inválidos - evento ausente',
        success: false
      }, { status: 400 });
    }

    // Verificar se tem payment OU subscription
    if (!webhookData.payment && !webhookData.subscription) {
      console.error('❌ Dados do webhook inválidos: nem payment nem subscription encontrados');
      console.error('📨 Payload completo:', JSON.stringify(webhookData, null, 2));
      return Response.json({ 
        error: 'Dados do webhook inválidos - payment ou subscription ausente',
        success: false
      }, { status: 400 });
    }

    // Processar diferentes tipos de eventos
    switch (webhookData.event) {
      case 'PAYMENT_CREATED':
        console.log('✅ Pagamento criado:', webhookData.payment.id);
        // Aqui você pode atualizar o status no seu banco de dados
        break;
      
      case 'PAYMENT_RECEIVED':
        console.log('💰 Pagamento recebido:', webhookData.payment.id);
        // Ativar premium do usuário
        await activatePremium(webhookData.payment);
        break;
      
      case 'PAYMENT_CONFIRMED':
        console.log('✅ Pagamento confirmado:', webhookData.payment.id);
        // Ativar premium do usuário (backup para PAYMENT_RECEIVED)
        await activatePremium(webhookData.payment);
        break;
      
      case 'PAYMENT_OVERDUE':
        console.log('⚠️ Pagamento em atraso:', webhookData.payment.id);
        // Desativar premium quando pagamento está em atraso
        await deactivatePremiumForOverdue(webhookData.payment);
        break;
      
      case 'PAYMENT_DELETED':
        console.log('🗑️ Pagamento deletado:', webhookData.payment.id);
        // Desativar premium quando pagamento é deletado
        await deactivatePremiumForDeleted(webhookData.payment);
        break;

      case 'SUBSCRIPTION_CREATED':
        console.log('🔄 Assinatura criada:', webhookData.subscription.id);
        // Ativar premium quando assinatura é criada
        await activatePremiumForSubscription(webhookData.subscription);
        break;

      case 'SUBSCRIPTION_UPDATED':
        console.log('🔄 Assinatura atualizada:', webhookData.subscription.id);
        // Verificar se precisa atualizar status
        await updatePremiumForSubscription(webhookData.subscription);
        break;

      case 'SUBSCRIPTION_DELETED':
        console.log('🗑️ Assinatura deletada:', webhookData.subscription.id);
        // Desativar premium quando assinatura é cancelada
        await deactivatePremiumForSubscriptionDeleted(webhookData.subscription);
        break;
      
      default:
        console.log('ℹ️ Evento não tratado:', webhookData.event);
    }

    // Responder com sucesso para o ASAAS
    console.log('✅ Webhook processado com sucesso');
    return Response.json({ 
      success: true,
      message: 'Webhook processado com sucesso'
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    return Response.json({ 
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    }, { status: 500 });
  }
}

// Função para ativar premium do usuário
async function activatePremium(payment) {
  try {
    console.log('🔄 Ativando premium para pagamento:', payment.id);
    console.log('🔄 External Reference:', payment.externalReference);
    console.log('🔄 Payment Value:', payment.value);
    
    // Verificar se a API Key do Supabase está configurada
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('❌ Variáveis do Supabase não configuradas');
      console.error('❌ SUPABASE_URL:', process.env.SUPABASE_URL ? 'SIM' : 'NÃO');
      console.error('❌ SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SIM' : 'NÃO');
      return;
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Detectar se tem nota fiscal e extrair empresa ID
    let empresaId = payment.externalReference;
    let temNotaFiscal = false;
    
    if (empresaId && empresaId.includes('|NF=true')) {
      temNotaFiscal = true;
      empresaId = empresaId.split('|')[0];
    }
    
    // Calcular data de expiração e tipo de plano baseado no valor do pagamento
    let expirationDate;
    let planType;
    
    const planValues = {
      39.00: { days: 30, type: 'monthly-basic', temNF: false },
      390.00: { days: 365, type: 'yearly-basic', temNF: false },
      149.00: { days: 30, type: 'monthly-professional', temNF: true },
      1488.00: { days: 365, type: 'yearly-professional', temNF: true }
    };
    
    const planInfo = planValues[payment.value];
    if (!planInfo) {
      console.error('❌ Valor de pagamento não reconhecido:', payment.value);
      return;
    }
    
    expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + planInfo.days);
    planType = planInfo.type;
    temNotaFiscal = temNotaFiscal || planInfo.temNF;

    console.log('🔄 Data de expiração calculada:', expirationDate.toISOString());
    console.log('🔄 Tipo de plano:', planType);

    // Primeiro, verificar se a empresa existe
    const { data: empresaData, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome')
      .eq('id', empresaId)
      .single();

    if (empresaError) {
      console.error('❌ Erro ao buscar empresa:', empresaError);
      return;
    }

    if (!empresaData) {
      console.error('❌ Empresa não encontrada:', payment.externalReference);
      return;
    }

    console.log('✅ Empresa encontrada:', empresaData.nome);

    // Atualizar empresa como premium
    const { data, error } = await supabase
      .from('empresas')
      .update({
        is_premium: true,
        status: 'active',
        trial_end_date: expirationDate.toISOString(),
        tem_nota_fiscal: temNotaFiscal,
        updated_at: new Date().toISOString()
      })
      .eq('id', empresaId);

    if (error) {
      console.error('❌ Erro ao ativar premium:', error);
      console.error('❌ Detalhes do erro:', error.message);
    } else {
      console.log('✅ Premium ativado com sucesso para empresa:', payment.externalReference);
      console.log('✅ Dados atualizados:', data);
    }

  } catch (error) {
    console.error('❌ Erro na função activatePremium:', error);
    console.error('❌ Stack trace:', error.stack);
  }
}

// Função para desativar premium quando pagamento está em atraso
async function deactivatePremiumForOverdue(payment) {
  try {
    console.log('⚠️ Desativando premium por pagamento em atraso:', payment.id);
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { error } = await supabase
      .from('empresas')
      .update({
        is_premium: false,
        status: 'overdue',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.externalReference);

    if (error) {
      console.error('❌ Erro ao desativar premium por atraso:', error);
    } else {
      console.log('✅ Premium desativado por atraso para empresa:', payment.externalReference);
    }
  } catch (error) {
    console.error('❌ Erro ao desativar premium por atraso:', error);
  }
}

// Função para desativar premium quando pagamento é deletado
async function deactivatePremiumForDeleted(payment) {
  try {
    console.log('🗑️ Desativando premium por pagamento deletado:', payment.id);
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { error } = await supabase
      .from('empresas')
      .update({
        is_premium: false,
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.externalReference);

    if (error) {
      console.error('❌ Erro ao desativar premium por pagamento deletado:', error);
    } else {
      console.log('✅ Premium desativado por pagamento deletado para empresa:', payment.externalReference);
    }
  } catch (error) {
    console.error('❌ Erro ao desativar premium por pagamento deletado:', error);
  }
}

// Função para ativar premium quando assinatura é criada
async function activatePremiumForSubscription(subscription) {
  try {
    console.log('🔄 Ativando premium para assinatura:', subscription.id);
    console.log('🔄 Subscription Value:', subscription.value);
    console.log('🔄 External Reference:', subscription.externalReference);
    
    // Verificar se a API Key do Supabase está configurada
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('❌ Variáveis do Supabase não configuradas');
      return;
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Calcular data de expiração baseado no valor
    let expirationDate;
    
    // Função auxiliar para converter data do formato brasileiro (DD/MM/YYYY) para ISO
    const parseBrazilianDate = (dateStr) => {
      if (!dateStr) return new Date();
      
      // Se já vier em formato ISO ou válido, usar diretamente
      if (dateStr.includes('T') || dateStr.includes('-')) {
        return new Date(dateStr);
      }
      
      // Converter formato brasileiro DD/MM/YYYY para YYYY-MM-DD
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return new Date(`${year}-${month}-${day}`);
      }
      
      return new Date();
    };
    
    // Detectar se tem nota fiscal e extrair empresa ID
    let empresaId = subscription.externalReference;
    let temNotaFiscal = false;
    
    if (empresaId && empresaId.includes('|NF=true')) {
      temNotaFiscal = true;
      empresaId = empresaId.split('|')[0];
    }
    
    // Identificar plano baseado no valor
    const planValues = {
      39: { temNF: false },
      390: { temNF: false },
      149: { temNF: true },
      1488: { temNF: true }
    };
    
    const planInfo = planValues[subscription.value];
    if (!planInfo) {
      console.error('❌ Valor de assinatura não reconhecido:', subscription.value);
      return;
    }
    
    temNotaFiscal = temNotaFiscal || planInfo.temNF;
    expirationDate = parseBrazilianDate(subscription.nextDueDate);

    console.log('🔄 Data de expiração calculada:', expirationDate.toISOString());
    console.log('🔄 Original nextDueDate:', subscription.nextDueDate);
    console.log('🔄 Tem Nota Fiscal:', temNotaFiscal);

    // Buscar empresa pelo externalReference (que é o ID da empresa)
    const { data: empresaData, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome')
      .eq('id', empresaId)
      .single();

    if (empresaError || !empresaData) {
      console.error('❌ Erro ao buscar empresa:', empresaError);
      console.error('❌ External Reference:', empresaId);
      
      // Tentar buscar pela empresa pelo nome ou outro campo
      console.log('🔍 Tentando busca alternativa...');
      return;
    }

    console.log('✅ Empresa encontrada:', empresaData.nome);

    // Atualizar empresa como premium
    const { data, error } = await supabase
      .from('empresas')
      .update({
        is_premium: true,
        status: 'active',
        trial_end_date: expirationDate.toISOString(),
        tem_nota_fiscal: temNotaFiscal,
        updated_at: new Date().toISOString()
      })
      .eq('id', empresaId);

    if (error) {
      console.error('❌ Erro ao ativar premium:', error);
    } else {
      console.log('✅ Premium ativado com sucesso para empresa:', empresaId);
    }

  } catch (error) {
    console.error('❌ Erro na função activatePremiumForSubscription:', error);
  }
}

// Função para atualizar premium quando assinatura é atualizada
async function updatePremiumForSubscription(subscription) {
  try {
    console.log('🔄 Atualizando premium para assinatura:', subscription.id);
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('❌ Variáveis do Supabase não configuradas');
      return;
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Função auxiliar para converter data do formato brasileiro (DD/MM/YYYY) para ISO
    const parseBrazilianDate = (dateStr) => {
      if (!dateStr) return new Date();
      
      // Se já vier em formato ISO ou válido, usar diretamente
      if (dateStr.includes('T') || dateStr.includes('-')) {
        return new Date(dateStr);
      }
      
      // Converter formato brasileiro DD/MM/YYYY para YYYY-MM-DD
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return new Date(`${year}-${month}-${day}`);
      }
      
      return new Date();
    };
    
    // Calcular data de expiração
    const expirationDate = parseBrazilianDate(subscription.nextDueDate);

    // Atualizar empresa
    const { error } = await supabase
      .from('empresas')
      .update({
        is_premium: true,
        status: 'active',
        trial_end_date: expirationDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.externalReference);

    if (error) {
      console.error('❌ Erro ao atualizar premium:', error);
    } else {
      console.log('✅ Premium atualizado com sucesso');
    }

  } catch (error) {
    console.error('❌ Erro ao atualizar premium:', error);
  }
}

// Função para desativar premium quando assinatura é cancelada
async function deactivatePremiumForSubscriptionDeleted(subscription) {
  try {
    console.log('🗑️ Desativando premium por assinatura cancelada:', subscription.id);
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { error } = await supabase
      .from('empresas')
      .update({
        is_premium: false,
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.externalReference);

    if (error) {
      console.error('❌ Erro ao desativar premium por assinatura cancelada:', error);
    } else {
      console.log('✅ Premium desativado por assinatura cancelada para empresa:', subscription.externalReference);
    }
  } catch (error) {
    console.error('❌ Erro ao desativar premium por assinatura cancelada:', error);
  }
}
