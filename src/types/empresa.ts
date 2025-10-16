// src/types/empresa.ts
// Interface compartilhada para dados da empresa
// Baseada na estrutura real da tabela empresas no Supabase

export interface Empresa {
  id: string;
  nome: string;
  telefone?: string;
  responsavel?: string;
  cpf_cnpj?: string;
  trial_end_date?: string;
  created_at?: string;
  updated_at?: string;
  // Campos adicionais da tabela real
  asaas_customer_id?: string;
  asaas_subscription_id?: string;
  current_period_end?: string;
  endereco?: string;
  is_premium?: boolean;
  logo_url?: string;
  plan_type?: string;
  status?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  trial_ends_at?: string;
}
