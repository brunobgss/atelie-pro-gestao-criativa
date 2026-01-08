// Sistema de alertas automáticos de estoque
// Monitora estoque baixo e envia notificações

import { supabase } from "@/integrations/supabase/client";
import { logger } from "./logger";

export interface StockAlert {
  id: string;
  itemName: string;
  currentQuantity: number;
  minQuantity: number;
  unit: string;
  status: 'critical' | 'low' | 'ok';
  lastAlert?: Date;
}

export interface StockAlertConfig {
  checkInterval: number; // em minutos
  enableNotifications: boolean;
  enableWhatsApp: boolean;
  whatsAppNumber?: string;
}

class StockAlertSystem {
  private config: StockAlertConfig;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastCheck: Date | null = null;
  private readonly lastAlertStorageKey = "stock_alerts_last_sent_v1";

  constructor(config: StockAlertConfig) {
    this.config = config;
  }

  private readLastAlertMap(): Record<string, string> {
    try {
      if (typeof window === "undefined") return {};
      const raw = window.localStorage.getItem(this.lastAlertStorageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") return {};
      return parsed as Record<string, string>;
    } catch {
      return {};
    }
  }

  private writeLastAlertMap(map: Record<string, string>): void {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(this.lastAlertStorageKey, JSON.stringify(map));
    } catch {
      // Ignorar falhas de storage (modo privado, quota, etc.)
    }
  }

  private getLastAlertTime(itemId: string): Date | undefined {
    const map = this.readLastAlertMap();
    const iso = map[itemId];
    if (!iso) return undefined;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }

  // Iniciar monitoramento automático
  startMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkStockLevels();
    }, this.config.checkInterval * 60 * 1000); // Converter para ms

    // Verificar imediatamente
    this.checkStockLevels();
    
    logger.info('Sistema de alertas de estoque iniciado', {
      checkInterval: this.config.checkInterval,
      enableNotifications: this.config.enableNotifications
    });
  }

  // Parar monitoramento
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logger.info('Sistema de alertas de estoque parado');
  }

  // Verificar níveis de estoque
  async checkStockLevels(): Promise<StockAlert[]> {
    try {
      logger.info('Verificando níveis de estoque...');
      
      const { data: items, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name");

      if (error) {
        logger.error('Erro ao buscar itens de estoque:', error);
        return [];
      }

      if (!items || items.length === 0) {
        logger.info('Nenhum item de estoque encontrado');
        return [];
      }

      const alerts: StockAlert[] = [];
      const now = new Date();

      for (const item of items) {
        const currentQuantity = item.quantity || 0;
        const minQuantity = item.min_quantity || 0;
        
        let status: 'critical' | 'low' | 'ok' = 'ok';
        
        if (currentQuantity <= 0) {
          status = 'critical';
        } else if (currentQuantity < minQuantity) {
          status = 'low';
        }

        if (status !== 'ok') {
          alerts.push({
            id: item.id,
            itemName: item.name,
            currentQuantity,
            minQuantity,
            unit: item.unit || 'un',
            status,
            // NÃO grava no banco (evita erro 400 se coluna não existir).
            // Usamos localStorage só para referência e possível throttling futuro.
            lastAlert: this.getLastAlertTime(item.id)
          });
        }
      }

      // Processar alertas
      if (alerts.length > 0) {
        await this.processAlerts(alerts);
      }

      this.lastCheck = now;
      logger.info(`Verificação de estoque concluída. ${alerts.length} alertas encontrados`);
      
      return alerts;
    } catch (error) {
      logger.error('Erro ao verificar níveis de estoque:', error);
      return [];
    }
  }

  // Processar alertas encontrados
  private async processAlerts(alerts: StockAlert[]): Promise<void> {
    const criticalAlerts = alerts.filter(a => a.status === 'critical');
    const lowAlerts = alerts.filter(a => a.status === 'low');

    // Registrar último alerta localmente (não no banco).
    this.updateLastAlertTimes(alerts);

    // Enviar notificações
    if (this.config.enableNotifications) {
      await this.sendNotifications(criticalAlerts, lowAlerts);
    }

    // Log dos alertas
    if (criticalAlerts.length > 0) {
      logger.warn('Alertas críticos de estoque:', {
        count: criticalAlerts.length,
        items: criticalAlerts.map(a => a.itemName)
      });
    }

    if (lowAlerts.length > 0) {
      logger.info('Alertas de estoque baixo:', {
        count: lowAlerts.length,
        items: lowAlerts.map(a => a.itemName)
      });
    }
  }

  // Atualizar timestamps de último alerta
  private updateLastAlertTimes(alerts: StockAlert[]): void {
    const nowIso = new Date().toISOString();
    const map = this.readLastAlertMap();
    for (const alert of alerts) {
      map[alert.id] = nowIso;
    }
    this.writeLastAlertMap(map);
  }

  // Enviar notificações
  private async sendNotifications(criticalAlerts: StockAlert[], lowAlerts: StockAlert[]): Promise<void> {
    // Notificações críticas
    if (criticalAlerts.length > 0) {
      const message = this.buildCriticalAlertMessage(criticalAlerts);
      await this.sendNotification(message, 'critical');
    }

    // Notificações de estoque baixo (apenas se não há críticos)
    if (lowAlerts.length > 0 && criticalAlerts.length === 0) {
      const message = this.buildLowStockMessage(lowAlerts);
      await this.sendNotification(message, 'warning');
    }
  }

  // Construir mensagem de alerta crítico
  private buildCriticalAlertMessage(alerts: StockAlert[]): string {
    let message = `🚨 *ALERTA CRÍTICO DE ESTOQUE*\n\n`;
    message += `Os seguintes itens estão em falta:\n\n`;
    
    alerts.forEach(alert => {
      message += `• ${alert.itemName}: ${alert.currentQuantity} ${alert.unit} (mín: ${alert.minQuantity})\n`;
    });
    
    message += `\n⚠️ *AÇÃO NECESSÁRIA:* Repor urgentemente estes itens!`;
    
    return message;
  }

  // Construir mensagem de estoque baixo
  private buildLowStockMessage(alerts: StockAlert[]): string {
    let message = `⚠️ *ALERTA DE ESTOQUE BAIXO*\n\n`;
    message += `Os seguintes itens estão com estoque baixo:\n\n`;
    
    alerts.forEach(alert => {
      message += `• ${alert.itemName}: ${alert.currentQuantity} ${alert.unit} (mín: ${alert.minQuantity})\n`;
    });
    
    message += `\n💡 *SUGESTÃO:* Considere repor estes itens em breve.`;
    
    return message;
  }

  // Enviar notificação (WhatsApp ou console)
  private async sendNotification(message: string, type: 'critical' | 'warning'): Promise<void> {
    if (this.config.enableWhatsApp && this.config.whatsAppNumber) {
      // Implementar envio via WhatsApp
      const whatsappUrl = `https://wa.me/${this.config.whatsAppNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      // Log no console para desenvolvimento
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  // Obter status do sistema
  getStatus(): {
    isRunning: boolean;
    lastCheck: Date | null;
    config: StockAlertConfig;
  } {
    return {
      isRunning: this.checkInterval !== null,
      lastCheck: this.lastCheck,
      config: this.config
    };
  }
}

// Instância global do sistema de alertas
export const stockAlertSystem = new StockAlertSystem({
  checkInterval: 30, // Verificar a cada 30 minutos
  enableNotifications: true,
  enableWhatsApp: true,
  whatsAppNumber: undefined // Será configurado pela empresa
});

// Função para iniciar o sistema
export function startStockAlerts(): void {
  stockAlertSystem.startMonitoring();
}

// Função para parar o sistema
export function stopStockAlerts(): void {
  stockAlertSystem.stopMonitoring();
}

// Função para verificar estoque manualmente
export async function checkStockNow(): Promise<StockAlert[]> {
  return await stockAlertSystem.checkStockLevels();
}
