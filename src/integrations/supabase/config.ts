import { supabase } from "./client";

// Cache para verificar se o banco está funcionando
let isDatabaseWorking: boolean | null = null;
let lastCheck: number = 0;
const CHECK_INTERVAL = 30000; // 30 segundos

export async function checkDatabaseHealth(): Promise<boolean> {
  const now = Date.now();
  
  // Se já verificamos recentemente, retornar o resultado em cache
  if (isDatabaseWorking !== null && (now - lastCheck) < CHECK_INTERVAL) {
    return isDatabaseWorking;
  }

  try {
    // Teste simples: buscar uma empresa
    const { error } = await supabase
      .from("empresas")
      .select("id")
      .limit(1)
      .single();

    isDatabaseWorking = !error;
    lastCheck = now;
    
    return isDatabaseWorking;
  } catch (error) {
    isDatabaseWorking = false;
    lastCheck = now;
    return false;
  }
}

export function getDatabaseStatus(): boolean | null {
  return isDatabaseWorking;
}

export function resetDatabaseStatus(): void {
  isDatabaseWorking = null;
  lastCheck = 0;
}


