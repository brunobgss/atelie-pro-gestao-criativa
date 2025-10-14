const fs = require('fs');

// Lista de arquivos com erros específicos
const fixes = [
  {
    file: 'src/components/ui/command.tsx',
    search: 'interface CommandDialogProps extends DialogProps {}',
    replace: 'type CommandDialogProps = DialogProps'
  },
  {
    file: 'src/components/ui/textarea.tsx',
    search: 'interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}',
    replace: 'type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>'
  },
  {
    file: 'src/integrations/supabase/quotes.ts',
    search: 'let orderError;',
    replace: 'const orderError;'
  },
  {
    file: 'src/pages/Assinatura.tsx',
    search: 'const [subscriptionData, setSubscriptionData] = useState<any>(null);',
    replace: 'const [subscriptionData, setSubscriptionData] = useState<unknown>(null);'
  },
  {
    file: 'src/pages/CalculadoraPrecos.tsx',
    search: 'const [kitItems, setKitItems] = useState<any[]>([]);',
    replace: 'const [kitItems, setKitItems] = useState<unknown[]>([]);'
  },
  {
    file: 'src/pages/Clientes.tsx',
    search: 'const [editingClient, setEditingClient] = useState<any>(null);',
    replace: 'const [editingClient, setEditingClient] = useState<unknown>(null);'
  },
  {
    file: 'src/pages/Estoque.tsx',
    search: 'const [editingItem, setEditingItem] = useState<any>(null);',
    replace: 'const [editingItem, setEditingItem] = useState<unknown>(null);'
  },
  {
    file: 'src/pages/PedidoDetalhe.tsx',
    search: 'const [orderDb, setOrderDb] = useState<any>(null);',
    replace: 'const [orderDb, setOrderDb] = useState<unknown>(null);'
  },
  {
    file: 'src/utils/backupManager.ts',
    search: 'private backupData: any = {};',
    replace: 'private backupData: Record<string, unknown> = {};'
  },
  {
    file: 'src/utils/businessMetrics.ts',
    search: 'private metrics: any = {};',
    replace: 'private metrics: Record<string, unknown> = {};'
  },
  {
    file: 'src/utils/retryHandler.ts',
    search: 'private retryCounts: any = {};',
    replace: 'private retryCounts: Record<string, number> = {};'
  },
  {
    file: 'src/utils/security.ts',
    search: 'private auditLog: any[] = [];',
    replace: 'private auditLog: unknown[] = [];'
  },
  {
    file: 'src/utils/trialPersistence.ts',
    search: 'export function getTrialData(): any {',
    replace: 'export function getTrialData(): unknown {'
  }
];

// Aplicar correções
fixes.forEach(fix => {
  if (fs.existsSync(fix.file)) {
    console.log(`Corrigindo ${fix.file}...`);
    
    let content = fs.readFileSync(fix.file, 'utf8');
    
    if (content.includes(fix.search)) {
      content = content.replace(fix.search, fix.replace);
      fs.writeFileSync(fix.file, content);
      console.log(`✅ ${fix.file} corrigido`);
    } else {
      console.log(`❌ ${fix.file} - string não encontrada`);
    }
  } else {
    console.log(`❌ ${fix.file} não encontrado`);
  }
});

console.log('🎉 Correções aplicadas!');
