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
  // Campos que existem na tabela real
  is_premium?: boolean;
  status?: string;
  // Campos que podem existir mas não estão sendo usados atualmente
  asaas_customer_id?: string;
  asaas_subscription_id?: string;
  endereco?: string;
  logo_url?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}
