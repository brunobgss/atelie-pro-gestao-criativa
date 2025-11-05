/**
 * Formata um valor numérico como moeda
 * @param value - Valor numérico a ser formatado
 * @param currency - Código da moeda (padrão: 'BRL')
 * @returns String formatada como moeda
 */
export function formatCurrency({
  value,
  currency = 'BRL'
}: {
  value: number;
  currency?: string;
}): string {
  try {
    // Verificar se o valor é válido
    if (value === null || value === undefined || isNaN(value)) {
      console.warn("formatCurrency: valor inválido:", value);
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency || 'BRL'
      }).format(0);
    }
    
    const numValue = Number(value);
    if (isNaN(numValue)) {
      console.warn("formatCurrency: conversão falhou:", value);
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency || 'BRL'
      }).format(0);
    }
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL'
    }).format(numValue);
  } catch (error) {
    console.error("formatCurrency error:", error, "value:", value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL'
    }).format(0);
  }
}

