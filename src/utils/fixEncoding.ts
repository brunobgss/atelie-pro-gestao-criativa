/**
 * Função para corrigir problemas de encoding em strings
 * Tenta corrigir caracteres que foram salvos com encoding incorreto
 */
export function fixEncoding(text: string): string {
  if (!text) return text;

  let fixed = text;

  // Correções comuns de encoding incorreto
  // Quando Windows-1252 ou ISO-8859-1 são interpretados como UTF-8

  // Corrigir "~" que pode ter sido salvo como "Ã" (quando não é parte de outro caractere)
  // Verificar se não é parte de "á", "é", "í", "ó", "ú", "ã", "õ", "ç"
  fixed = fixed.replace(/Ã(?!¡|©|­|³|º|£|µ|§)/g, '~');

  // Corrigir acentos comuns
  fixed = fixed.replace(/Ã¡/g, 'á');
  fixed = fixed.replace(/Ã©/g, 'é');
  fixed = fixed.replace(/Ã­/g, 'í');
  fixed = fixed.replace(/Ã³/g, 'ó');
  fixed = fixed.replace(/Ãº/g, 'ú');
  fixed = fixed.replace(/Ã£/g, 'ã');
  fixed = fixed.replace(/Ãµ/g, 'õ');
  fixed = fixed.replace(/Ã§/g, 'ç');
  fixed = fixed.replace(/Ã‰/g, 'É');
  fixed = fixed.replace(/Ã"/g, 'À');
  fixed = fixed.replace(/Ã"/g, 'Â');
  fixed = fixed.replace(/Ã"/g, 'Ã');
  fixed = fixed.replace(/Ã"/g, 'Õ');
  fixed = fixed.replace(/Ã"/g, 'Ç');

  // Outros caracteres comuns
  fixed = fixed.replace(/â€™/g, "'"); // Apóstrofe
  fixed = fixed.replace(/â€œ/g, '"'); // Aspas abertas
  fixed = fixed.replace(/â€/g, '"'); // Aspas fechadas
  fixed = fixed.replace(/â€"/g, '—'); // Em dash
  fixed = fixed.replace(/â€"/g, '–'); // En dash

  return fixed;
}

