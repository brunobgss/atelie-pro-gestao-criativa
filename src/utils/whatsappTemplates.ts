// Utilitário para buscar e processar templates WhatsApp personalizados
import { supabase } from "@/integrations/supabase/client";

type TemplateType = 'dashboard_intro' | 'quote' | 'payment' | 'delivery' | 'stock_alert';

interface TemplateData {
  [key: string]: any;
}

/**
 * Busca template personalizado do banco de dados
 */
export async function getWhatsAppTemplate(
  empresaId: string,
  templateType: TemplateType
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("whatsapp_templates")
      .select("message_text")
      .eq("empresa_id", empresaId)
      .eq("template_type", templateType)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error(`Erro ao buscar template ${templateType}:`, error);
      return null;
    }

    return data?.message_text || null;
  } catch (error) {
    console.error(`Erro ao buscar template ${templateType}:`, error);
    return null;
  }
}

/**
 * Busca configurações gerais de WhatsApp
 */
export async function getWhatsAppSettings(empresaId: string) {
  try {
    const { data, error } = await supabase
      .from("whatsapp_settings")
      .select("*")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar configurações WhatsApp:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Erro ao buscar configurações WhatsApp:", error);
    return null;
  }
}

/**
 * Processa template substituindo variáveis
 */
export function processTemplate(
  template: string,
  data: TemplateData,
  empresa?: any
): string {
  let processed = template;

  // Variáveis da empresa
  processed = processed.replace(/\$\{empresa\?\.nome\}/g, empresa?.nome || 'Ateliê');

  // Variáveis de orçamento
  processed = processed.replace(/\{cliente\}/g, data.cliente || data.client || 'Cliente');
  processed = processed.replace(/\{produtos\}/g, data.produtos || data.products || '');
  processed = processed.replace(/\{valor_total\}/g, data.valor_total || data.total_value || 'R$ 0,00');

  // Variáveis de pagamento
  processed = processed.replace(/\{codigo_pedido\}/g, data.codigo_pedido || data.orderCode || '');
  processed = processed.replace(/\{valor_pago\}/g, data.valor_pago || data.paidAmount || 'R$ 0,00');
  processed = processed.replace(/\{valor_restante\}/g, data.valor_restante || data.remainingAmount || 'R$ 0,00');
  processed = processed.replace(/\{aviso_atraso\}/g, data.aviso_atraso || data.isOverdue ? 'ATENÇÃO: Este pedido está em atraso!' : '');

  // Variáveis de entrega
  processed = processed.replace(/\{data_entrega\}/g, data.data_entrega || data.deliveryDate || '');
  processed = processed.replace(/\{tipo\}/g, data.tipo || data.type || '');
  processed = processed.replace(/\{status\}/g, data.status || '');
  processed = processed.replace(/\{dias_restantes\}/g, data.dias_restantes || data.daysUntilDelivery?.toString() || '0');

  // Variáveis de estoque
  processed = processed.replace(/\{itens_estoque\}/g, data.itens_estoque || data.items || '');

  return processed;
}

/**
 * Adiciona assinatura padrão se configurada
 */
export function addSignature(message: string, settings: any): string {
  if (!settings?.default_signature) return message;
  
  // Verificar se já tem assinatura
  if (message.includes(settings.default_signature)) return message;
  
  return `${message}\n\n_${settings.default_signature}_`;
}

/**
 * Gera URL do WhatsApp com mensagem
 */
export function generateWhatsAppUrl(
  message: string,
  phoneNumber?: string
): string {
  const encodedMessage = encodeURIComponent(message);
  if (phoneNumber) {
    return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  }
  return `https://wa.me/?text=${encodedMessage}`;
}

