/**
 * Tamanhos de roupas disponíveis no sistema
 * Inclui tamanhos adultos e infantis
 */
export const CLOTHING_SIZES = [
  // Tamanhos infantis
  { value: "1 ano", label: "1 ano" },
  { value: "2 anos", label: "2 anos" },
  { value: "4 anos", label: "4 anos" },
  { value: "6 anos", label: "6 anos" },
  { value: "8 anos", label: "8 anos" },
  { value: "10 anos", label: "10 anos" },
  // Tamanhos adultos
  { value: "PP", label: "PP" },
  { value: "P", label: "P" },
  { value: "M", label: "M" },
  { value: "G", label: "G" },
  { value: "GG", label: "GG" },
  { value: "XG", label: "XG" },
  { value: "XXG", label: "XXG" },
  // Opções especiais
  { value: "Único", label: "Único" },
  { value: "Personalizado", label: "Personalizado" },
] as const;

/**
 * Retorna apenas os valores dos tamanhos (para uso em Select)
 */
export const CLOTHING_SIZE_VALUES = CLOTHING_SIZES.map((size) => size.value);

/**
 * Retorna apenas os labels dos tamanhos
 */
export const CLOTHING_SIZE_LABELS = CLOTHING_SIZES.map((size) => size.label);

