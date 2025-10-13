// src/utils/trialPersistence.ts
// Sistema robusto de persistência do trial

const STORAGE_KEY = 'atelie-pro-trial-end-date';
const STORAGE_KEY_EMPRESA = 'atelie-pro-empresa-data';
const STORAGE_KEY_USER = 'atelie-pro-user-id';

export interface TrialData {
  trialEndDate: string;
  empresaData: any;
  userId: string;
}

export function getTrialData(): TrialData | null {
  try {
    const storedTrialDate = localStorage.getItem(STORAGE_KEY);
    const storedEmpresaData = localStorage.getItem(STORAGE_KEY_EMPRESA);
    const storedUserId = localStorage.getItem(STORAGE_KEY_USER);
    
    if (storedTrialDate && storedEmpresaData && storedUserId) {
      return {
        trialEndDate: storedTrialDate,
        empresaData: JSON.parse(storedEmpresaData),
        userId: storedUserId
      };
    }
    return null;
  } catch (error) {
    console.error('Erro ao recuperar dados do trial:', error);
    return null;
  }
}

export function saveTrialData(trialData: TrialData): void {
  try {
    localStorage.setItem(STORAGE_KEY, trialData.trialEndDate);
    localStorage.setItem(STORAGE_KEY_EMPRESA, JSON.stringify(trialData.empresaData));
    localStorage.setItem(STORAGE_KEY_USER, trialData.userId);
    console.log('Dados do trial salvos com sucesso');
  } catch (error) {
    console.error('Erro ao salvar dados do trial:', error);
  }
}

export function createNewTrial(userId: string): TrialData {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 7);
  const trialEndDate = trialEnd.toISOString();
  
  const empresaData = {
    id: "temp-id",
    nome: "Empresa Temporária",
    email: "temp@empresa.com",
    telefone: "",
    responsavel: "Usuário",
    trial_end_date: trialEndDate
  };
  
  const trialData: TrialData = {
    trialEndDate,
    empresaData,
    userId
  };
  
  saveTrialData(trialData);
  return trialData;
}

export function clearTrialData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_EMPRESA);
    localStorage.removeItem(STORAGE_KEY_USER);
    console.log('Dados do trial limpos');
  } catch (error) {
    console.error('Erro ao limpar dados do trial:', error);
  }
}
