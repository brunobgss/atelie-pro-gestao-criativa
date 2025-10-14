// Validações centralizadas para o app
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Validação de email
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email || !email.trim()) {
    errors.push("Email é obrigatório");
    return { isValid: false, errors };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push("Email deve ter um formato válido");
  }
  
  return { isValid: errors.length === 0, errors };
}

// Validação de telefone
export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = [];
  
  if (!phone || !phone.trim()) {
    errors.push("Telefone é obrigatório");
    return { isValid: false, errors };
  }
  
  // Remove todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length < 10) {
    errors.push("Telefone deve ter pelo menos 10 dígitos");
  }
  
  if (cleanPhone.length > 11) {
    errors.push("Telefone deve ter no máximo 11 dígitos");
  }
  
  return { isValid: errors.length === 0, errors };
}

// Validação de CPF/CNPJ
export function validateCpfCnpj(cpfCnpj: string): ValidationResult {
  const errors: string[] = [];
  
  if (!cpfCnpj || !cpfCnpj.trim()) {
    errors.push("CPF/CNPJ é obrigatório");
    return { isValid: false, errors };
  }
  
  // Remove todos os caracteres não numéricos
  const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
  
  if (cleanCpfCnpj.length === 11) {
    // Validação de CPF
    if (!isValidCPF(cleanCpfCnpj)) {
      errors.push("CPF inválido");
    }
  } else if (cleanCpfCnpj.length === 14) {
    // Validação de CNPJ
    if (!isValidCNPJ(cleanCpfCnpj)) {
      errors.push("CNPJ inválido");
    }
  } else {
    errors.push("CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos");
  }
  
  return { isValid: errors.length === 0, errors };
}

// Validação de valor monetário
export function validateMoney(value: number | string): ValidationResult {
  const errors: string[] = [];
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    errors.push("Valor deve ser um número válido");
    return { isValid: false, errors };
  }
  
  if (numValue < 0) {
    errors.push("Valor não pode ser negativo");
  }
  
  if (numValue === 0) {
    errors.push("Valor deve ser maior que zero");
  }
  
  return { isValid: errors.length === 0, errors };
}

// Validação de data
export function validateDate(date: string): ValidationResult {
  const errors: string[] = [];
  
  if (!date || !date.trim()) {
    errors.push("Data é obrigatória");
    return { isValid: false, errors };
  }
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    errors.push("Data deve ter um formato válido");
    return { isValid: false, errors };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (dateObj < today) {
    errors.push("Data não pode ser no passado");
  }
  
  return { isValid: errors.length === 0, errors };
}

// Validação de nome
export function validateName(name: string): ValidationResult {
  const errors: string[] = [];
  
  if (!name || !name.trim()) {
    errors.push("Nome é obrigatório");
    return { isValid: false, errors };
  }
  
  if (name.trim().length < 2) {
    errors.push("Nome deve ter pelo menos 2 caracteres");
  }
  
  if (name.trim().length > 100) {
    errors.push("Nome deve ter no máximo 100 caracteres");
  }
  
  return { isValid: errors.length === 0, errors };
}

// Validação de quantidade
export function validateQuantity(quantity: number | string): ValidationResult {
  const errors: string[] = [];
  
  const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  
  if (isNaN(numQuantity)) {
    errors.push("Quantidade deve ser um número válido");
    return { isValid: false, errors };
  }
  
  if (numQuantity <= 0) {
    errors.push("Quantidade deve ser maior que zero");
  }
  
  if (!Number.isInteger(numQuantity)) {
    errors.push("Quantidade deve ser um número inteiro");
  }
  
  return { isValid: errors.length === 0, errors };
}

// Validação de descrição
export function validateDescription(description: string, maxLength: number = 500): ValidationResult {
  const errors: string[] = [];
  
  if (!description || !description.trim()) {
    errors.push("Descrição é obrigatória");
    return { isValid: false, errors };
  }
  
  if (description.trim().length < 5) {
    errors.push("Descrição deve ter pelo menos 5 caracteres");
  }
  
  if (description.trim().length > maxLength) {
    errors.push(`Descrição deve ter no máximo ${maxLength} caracteres`);
  }
  
  return { isValid: errors.length === 0, errors };
}

// Função auxiliar para validar CPF
function isValidCPF(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

// Função auxiliar para validar CNPJ
function isValidCNPJ(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }
  
  let sum = 0;
  let weight = 2;
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(cnpj.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cnpj.charAt(12))) return false;
  
  sum = 0;
  weight = 2;
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(cnpj.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cnpj.charAt(13))) return false;
  
  return true;
}

// Validação combinada para formulários
export function validateForm(data: Record<string, any>, rules: Record<string, (value: any) => ValidationResult>): ValidationResult {
  const allErrors: string[] = [];
  let isValid = true;
  
  for (const [field, validator] of Object.entries(rules)) {
    const result = validator(data[field]);
    if (!result.isValid) {
      isValid = false;
      allErrors.push(...result.errors.map(error => `${field}: ${error}`));
    }
  }
  
  return { isValid, errors: allErrors };
}
