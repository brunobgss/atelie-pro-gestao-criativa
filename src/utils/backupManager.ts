// Sistema de backup e recuperação de dados
export interface BackupData {
  id: string;
  timestamp: string;
  data: any;
  type: 'full' | 'incremental';
  size: number;
  checksum: string;
}

export interface BackupConfig {
  maxBackups: number;
  autoBackupInterval: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  backupKey: string;
}

export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  maxBackups: 10,
  autoBackupInterval: 24 * 60 * 60 * 1000, // 24 horas
  enableCompression: true,
  enableEncryption: true,
  backupKey: 'backup-key-2024'
};

export class BackupManager {
  private static instance: BackupManager;
  private config: BackupConfig;
  private backups: BackupData[] = [];
  private autoBackupTimer?: NodeJS.Timeout;

  static getInstance(): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
    }
    return BackupManager.instance;
  }

  constructor() {
    this.config = { ...DEFAULT_BACKUP_CONFIG };
    this.loadBackups();
    this.startAutoBackup();
  }

  // Configurar backup
  configure(config: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Criar backup completo
  async createFullBackup(): Promise<{ success: boolean; backupId?: string; error?: string }> {
    try {
      console.log('🔄 Criando backup completo...');
      
      const data = await this.collectAllData();
      const backupId = this.generateBackupId();
      const timestamp = new Date().toISOString();
      const size = this.calculateDataSize(data);
      const checksum = this.calculateChecksum(data);
      
      const backup: BackupData = {
        id: backupId,
        timestamp,
        data: this.config.enableEncryption ? this.encryptData(data) : data,
        type: 'full',
        size,
        checksum
      };

      this.backups.push(backup);
      this.cleanupOldBackups();
      this.saveBackups();

      console.log(`✅ Backup completo criado: ${backupId}`);
      return { success: true, backupId };
    } catch (error) {
      console.error('❌ Erro ao criar backup completo:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  // Criar backup incremental
  async createIncrementalBackup(): Promise<{ success: boolean; backupId?: string; error?: string }> {
    try {
      console.log('🔄 Criando backup incremental...');
      
      const lastBackup = this.getLastBackup();
      if (!lastBackup) {
        return await this.createFullBackup();
      }

      const data = await this.collectChangedData(lastBackup.timestamp);
      if (Object.keys(data).length === 0) {
        console.log('ℹ️ Nenhuma alteração detectada, backup incremental ignorado');
        return { success: true };
      }

      const backupId = this.generateBackupId();
      const timestamp = new Date().toISOString();
      const size = this.calculateDataSize(data);
      const checksum = this.calculateChecksum(data);
      
      const backup: BackupData = {
        id: backupId,
        timestamp,
        data: this.config.enableEncryption ? this.encryptData(data) : data,
        type: 'incremental',
        size,
        checksum
      };

      this.backups.push(backup);
      this.cleanupOldBackups();
      this.saveBackups();

      console.log(`✅ Backup incremental criado: ${backupId}`);
      return { success: true, backupId };
    } catch (error) {
      console.error('❌ Erro ao criar backup incremental:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  // Restaurar backup
  async restoreBackup(backupId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔄 Restaurando backup: ${backupId}`);
      
      const backup = this.backups.find(b => b.id === backupId);
      if (!backup) {
        return { success: false, error: 'Backup não encontrado' };
      }

      let data = backup.data;
      if (this.config.enableEncryption) {
        data = this.decryptData(data);
      }

      await this.restoreData(data);
      
      console.log(`✅ Backup restaurado com sucesso: ${backupId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao restaurar backup:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  // Listar backups
  getBackups(): BackupData[] {
    return [...this.backups].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Obter backup específico
  getBackup(backupId: string): BackupData | undefined {
    return this.backups.find(b => b.id === backupId);
  }

  // Excluir backup
  deleteBackup(backupId: string): { success: boolean; error?: string } {
    try {
      const index = this.backups.findIndex(b => b.id === backupId);
      if (index === -1) {
        return { success: false, error: 'Backup não encontrado' };
      }

      this.backups.splice(index, 1);
      this.saveBackups();
      
      console.log(`✅ Backup excluído: ${backupId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao excluir backup:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  // Exportar backup
  exportBackup(backupId: string): { success: boolean; data?: string; error?: string } {
    try {
      const backup = this.backups.find(b => b.id === backupId);
      if (!backup) {
        return { success: false, error: 'Backup não encontrado' };
      }

      const exportData = {
        ...backup,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      return { success: true, data: JSON.stringify(exportData, null, 2) };
    } catch (error) {
      console.error('❌ Erro ao exportar backup:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  // Importar backup
  importBackup(backupData: string): { success: boolean; backupId?: string; error?: string } {
    try {
      const importedBackup = JSON.parse(backupData);
      
      // Validar estrutura do backup
      if (!importedBackup.id || !importedBackup.timestamp || !importedBackup.data) {
        return { success: false, error: 'Formato de backup inválido' };
      }

      // Gerar novo ID para evitar conflitos
      const newBackupId = this.generateBackupId();
      const backup: BackupData = {
        ...importedBackup,
        id: newBackupId,
        timestamp: new Date().toISOString()
      };

      this.backups.push(backup);
      this.cleanupOldBackups();
      this.saveBackups();

      console.log(`✅ Backup importado: ${newBackupId}`);
      return { success: true, backupId: newBackupId };
    } catch (error) {
      console.error('❌ Erro ao importar backup:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  // Obter estatísticas
  getStats(): {
    totalBackups: number;
    totalSize: number;
    lastBackup?: string;
    oldestBackup?: string;
    averageSize: number;
  } {
    const totalBackups = this.backups.length;
    const totalSize = this.backups.reduce((sum, backup) => sum + backup.size, 0);
    const lastBackup = this.backups.length > 0 ? this.backups[this.backups.length - 1].timestamp : undefined;
    const oldestBackup = this.backups.length > 0 ? this.backups[0].timestamp : undefined;
    const averageSize = totalBackups > 0 ? totalSize / totalBackups : 0;

    return {
      totalBackups,
      totalSize,
      lastBackup,
      oldestBackup,
      averageSize: Math.round(averageSize)
    };
  }

  // Funções privadas
  private async collectAllData(): Promise<any> {
    // Coletar todos os dados do localStorage e sessionStorage
    const data: any = {
      localStorage: {},
      sessionStorage: {},
      timestamp: new Date().toISOString()
    };

    // Coletar localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        data.localStorage[key] = localStorage.getItem(key);
      }
    }

    // Coletar sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        data.sessionStorage[key] = sessionStorage.getItem(key);
      }
    }

    return data;
  }

  private async collectChangedData(since: string): Promise<any> {
    // Implementação básica - em produção, comparar timestamps dos dados
    const data = await this.collectAllData();
    return data;
  }

  private async restoreData(data: any): Promise<void> {
    // Restaurar localStorage
    if (data.localStorage) {
      for (const [key, value] of Object.entries(data.localStorage)) {
        localStorage.setItem(key, value as string);
      }
    }

    // Restaurar sessionStorage
    if (data.sessionStorage) {
      for (const [key, value] of Object.entries(data.sessionStorage)) {
        sessionStorage.setItem(key, value as string);
      }
    }
  }

  private generateBackupId(): string {
    return `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateDataSize(data: any): number {
    return JSON.stringify(data).length;
  }

  private calculateChecksum(data: any): string {
    // Implementação simples de checksum
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private encryptData(data: any): any {
    // Implementação simples de criptografia
    const str = JSON.stringify(data);
    let encrypted = '';
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i) ^ this.config.backupKey.charCodeAt(i % this.config.backupKey.length);
      encrypted += String.fromCharCode(charCode);
    }
    return btoa(encrypted);
  }

  private decryptData(encryptedData: any): any {
    try {
      const str = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i) ^ this.config.backupKey.charCodeAt(i % this.config.backupKey.length);
        decrypted += String.fromCharCode(charCode);
      }
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Erro ao descriptografar dados:', error);
      return encryptedData;
    }
  }

  private cleanupOldBackups(): void {
    if (this.backups.length > this.config.maxBackups) {
      // Manter apenas os backups mais recentes
      this.backups = this.backups
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, this.config.maxBackups);
    }
  }

  private getLastBackup(): BackupData | undefined {
    return this.backups.length > 0 ? this.backups[this.backups.length - 1] : undefined;
  }

  private loadBackups(): void {
    try {
      const stored = localStorage.getItem('app-backups');
      if (stored) {
        this.backups = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Erro ao carregar backups:', error);
      this.backups = [];
    }
  }

  private saveBackups(): void {
    try {
      localStorage.setItem('app-backups', JSON.stringify(this.backups));
    } catch (error) {
      console.error('Erro ao salvar backups:', error);
    }
  }

  private startAutoBackup(): void {
    if (this.config.autoBackupInterval > 0) {
      this.autoBackupTimer = setInterval(() => {
        this.createIncrementalBackup();
      }, this.config.autoBackupInterval);
    }
  }

  private stopAutoBackup(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = undefined;
    }
  }
}

// Instância global
export const backupManager = BackupManager.getInstance();

// Funções auxiliares
export const backup = {
  createFull: () => backupManager.createFullBackup(),
  createIncremental: () => backupManager.createIncrementalBackup(),
  restore: (backupId: string) => backupManager.restoreBackup(backupId),
  list: () => backupManager.getBackups(),
  get: (backupId: string) => backupManager.getBackup(backupId),
  delete: (backupId: string) => backupManager.deleteBackup(backupId),
  export: (backupId: string) => backupManager.exportBackup(backupId),
  import: (backupData: string) => backupManager.importBackup(backupData),
  stats: () => backupManager.getStats()
};
