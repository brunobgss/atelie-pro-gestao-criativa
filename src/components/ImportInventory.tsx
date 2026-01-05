import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle2, XCircle, Loader2, AlertCircle, Download, HelpCircle, Info, X } from "lucide-react";
import { toast } from "sonner";
import { createInventoryItem, listInventory, InventoryItemType } from "@/integrations/supabase/inventory";

interface ImportedInventoryItem {
  name: string;
  item_type: InventoryItemType;
  quantity: number;
  unit: string;
  min_quantity: number;
  category?: string;
  supplier?: string;
  cost_per_unit?: number;
  notes?: string;
  row: number;
  errors: string[];
  isDuplicate?: boolean;
  importError?: string;
  status?: 'pending' | 'success' | 'error' | 'duplicate';
}

interface ImportInventoryProps {
  onImportComplete?: () => void;
}

const VALID_TYPES: Array<{ value: InventoryItemType; label: string }> = [
  { value: "materia_prima", label: "Matéria-prima" },
  { value: "tecido", label: "Tecido" },
  { value: "produto_acabado", label: "Produto acabado" },
];

const TYPE_MAP: Record<string, InventoryItemType> = {
  "matéria-prima": "materia_prima",
  "materia-prima": "materia_prima",
  "matéria prima": "materia_prima",
  "materia prima": "materia_prima",
  "tecido": "tecido",
  "produto acabado": "produto_acabado",
  "produto-acabado": "produto_acabado",
};

const DEFAULT_UNITS: Record<InventoryItemType, string> = {
  materia_prima: "unidades",
  tecido: "metros",
  produto_acabado: "unidades",
};

export function ImportInventory({ onImportComplete }: ImportInventoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importedItems, setImportedItems] = useState<ImportedInventoryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; errors: number; duplicates: number }>({ success: 0, errors: 0, duplicates: 0 });
  const [showHelp, setShowHelp] = useState(false);
  const [existingItems, setExistingItems] = useState<string[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelImportRef = useRef(false);

  const downloadExampleCSV = () => {
    const csvContent = `Nome,Tipo,Quantidade,Unidade,Quantidade Mínima,Categoria,Fornecedor,Custo Unitário,Observações
Linha Branca,Matéria-prima,50,rolos,10,Aviamen tos,Fornecedor ABC,2.50,Linha de costura
Tecido Algodão,Tecido,25,metros,5,Tecidos,Tecidos XYZ,15.00,Tecido 100% algodão
Vestido Pronto,Produto acabado,10,unidades,2,Produtos,Loja ABC,120.00,Pronto para venda
Botões,Matéria-prima,200,unidades,50,Aviamen tos,Fornecedor DEF,0.15,Botões pequenos`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'exemplo_estoque.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Arquivo de exemplo baixado!");
  };

  const parseCSV = (text: string): string[][] => {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentLine += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === '\n' && !inQuotes) {
        lines.push(currentLine);
        currentLine = '';
      } else if (char === '\r' && !inQuotes) {
        // Skip carriage return
      } else {
        currentLine += char;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines.map(line => {
      const values: string[] = [];
      let currentValue = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentValue += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());
      return values;
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validar tipo de arquivo
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const validExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(fileExtension)) {
      toast.error("Por favor, selecione um arquivo CSV ou Excel (.csv, .xls, .xlsx)");
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const text = await selectedFile.text();
      const lines = parseCSV(text);
      
      if (lines.length < 2) {
        toast.error("O arquivo deve ter pelo menos um cabeçalho e uma linha de dados");
        setIsProcessing(false);
        return;
      }

      // Primeira linha é o cabeçalho
      const headers = lines[0].map(h => h.toLowerCase().trim());
      
      // Encontrar índices das colunas
      const nameIndex = headers.findIndex(h => h.includes('nome') || h.includes('name'));
      const typeIndex = headers.findIndex(h => h.includes('tipo') || h.includes('type'));
      const quantityIndex = headers.findIndex(h => h.includes('quantidade') || h.includes('quantity') || h.includes('qtd'));
      const unitIndex = headers.findIndex(h => h.includes('unidade') || h.includes('unit'));
      const minQuantityIndex = headers.findIndex(h => (h.includes('mínima') || h.includes('minima') || h.includes('minimum')) && (h.includes('quantidade') || h.includes('quantity')));
      const categoryIndex = headers.findIndex(h => h.includes('categoria') || h.includes('category'));
      const supplierIndex = headers.findIndex(h => h.includes('fornecedor') || h.includes('supplier'));
      const costIndex = headers.findIndex(h => (h.includes('custo') || h.includes('cost')) && (h.includes('unitário') || h.includes('unitario') || h.includes('unit')));
      const notesIndex = headers.findIndex(h => h.includes('observação') || h.includes('observacao') || h.includes('notes') || h.includes('nota'));

      if (nameIndex === -1) {
        toast.error("Não foi encontrada uma coluna 'Nome' no arquivo. Verifique o cabeçalho.");
        setIsProcessing(false);
        return;
      }

      if (typeIndex === -1) {
        toast.error("Não foi encontrada uma coluna 'Tipo' no arquivo. Verifique o cabeçalho.");
        setIsProcessing(false);
        return;
      }

      if (quantityIndex === -1) {
        toast.error("Não foi encontrada uma coluna 'Quantidade' no arquivo. Verifique o cabeçalho.");
        setIsProcessing(false);
        return;
      }

      // Processar linhas de dados
      const items: ImportedInventoryItem[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.every(cell => !cell.trim())) continue; // Pular linhas vazias

        const name = row[nameIndex]?.trim() || '';
        const typeStr = row[typeIndex]?.trim() || '';
        const quantityStr = row[quantityIndex]?.trim() || '0';
        const unit = unitIndex >= 0 ? row[unitIndex]?.trim() : '';
        const minQuantityStr = minQuantityIndex >= 0 ? row[minQuantityIndex]?.trim() : '0';
        const category = categoryIndex >= 0 ? row[categoryIndex]?.trim() : '';
        const supplier = supplierIndex >= 0 ? row[supplierIndex]?.trim() : '';
        const costStr = costIndex >= 0 ? row[costIndex]?.trim() : '';
        const notes = notesIndex >= 0 ? row[notesIndex]?.trim() : '';

        const errors: string[] = [];

        // Validar nome
        if (!name) {
          errors.push("Nome é obrigatório");
        } else if (name.length < 2) {
          errors.push("Nome deve ter pelo menos 2 caracteres");
        }

        // Validar e normalizar tipo
        let item_type: InventoryItemType | null = null;
        if (!typeStr) {
          errors.push("Tipo é obrigatório");
        } else {
          const normalizedType = typeStr.toLowerCase().trim();
          item_type = TYPE_MAP[normalizedType] || null;
          if (!item_type) {
            errors.push(`Tipo inválido. Use: ${VALID_TYPES.map(t => t.label).join(', ')}`);
          }
        }

        // Validar quantidade
        const quantity = parseFloat(quantityStr.replace(',', '.')) || 0;
        if (isNaN(quantity)) {
          errors.push("Quantidade deve ser um número válido");
        } else if (quantity < 0) {
          errors.push("Quantidade não pode ser negativa");
        }

        // Validar unidade (se não informada, usar padrão do tipo)
        let finalUnit = unit;
        if (!finalUnit && item_type) {
          finalUnit = DEFAULT_UNITS[item_type];
        } else if (!finalUnit) {
          finalUnit = "unidades";
        }

        // Validar quantidade mínima
        const min_quantity = parseFloat(minQuantityStr.replace(',', '.')) || 0;
        if (isNaN(min_quantity)) {
          errors.push("Quantidade mínima deve ser um número válido");
        } else if (min_quantity < 0) {
          errors.push("Quantidade mínima não pode ser negativa");
        }

        // Validar custo unitário (opcional)
        let cost_per_unit: number | undefined = undefined;
        if (costStr) {
          cost_per_unit = parseFloat(costStr.replace(',', '.')) || undefined;
          if (cost_per_unit !== undefined && isNaN(cost_per_unit)) {
            errors.push("Custo unitário deve ser um número válido");
          } else if (cost_per_unit !== undefined && cost_per_unit < 0) {
            errors.push("Custo unitário não pode ser negativo");
          }
        }

        items.push({
          name,
          item_type: item_type || "materia_prima", // fallback
          quantity,
          unit: finalUnit,
          min_quantity: min_quantity,
          category: category || undefined,
          supplier: supplier || undefined,
          cost_per_unit: cost_per_unit,
          notes: notes || undefined,
          row: i + 1,
          errors
        });
      }

      if (items.length === 0) {
        toast.error("Nenhum item válido encontrado no arquivo");
        setIsProcessing(false);
        return;
      }

      // Limite de 1000 itens por importação
      const MAX_ITEMS = 1000;
      const itemsToProcess = items.length > MAX_ITEMS ? items.slice(0, MAX_ITEMS) : items;
      
      if (items.length > MAX_ITEMS) {
        toast.warning(`O arquivo contém ${items.length} itens. O limite é ${MAX_ITEMS}. Apenas os primeiros ${MAX_ITEMS} serão processados.`);
      }

      // Verificar itens existentes
      toast.info("Verificando itens duplicados...");
      const existing = await listInventory();
      const existingNames = existing.map(item => item.name.toLowerCase().trim());
      setExistingItems(existingNames);

      // Marcar duplicatas
      const itemsWithDuplicates = itemsToProcess.map(item => ({
        ...item,
        isDuplicate: existingNames.includes(item.name.toLowerCase().trim()),
        status: 'pending' as const
      }));

      const duplicatesCount = itemsWithDuplicates.filter(item => item.isDuplicate).length;
      if (duplicatesCount > 0) {
        toast.warning(`${duplicatesCount} item(ns) já existem no sistema e serão ignorados`);
      }

      setImportedItems(itemsWithDuplicates);
      toast.success(`${itemsToProcess.length} item(ns) encontrado(s) no arquivo`);
    } catch (error: any) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar arquivo: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (importedItems.length === 0) {
      toast.error("Nenhum item para importar");
      return;
    }

    setIsImporting(true);
    setIsCancelling(false);
    cancelImportRef.current = false;
    setImportProgress(0);
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    // Filtrar apenas itens válidos e não duplicados
    const itemsToImport = importedItems.filter(item => 
      item.errors.length === 0 && !item.isDuplicate
    );

    if (itemsToImport.length === 0) {
      toast.warning("Nenhum item válido para importar (todos têm erros ou são duplicados)");
      setIsImporting(false);
      return;
    }

    // Importar itens em lotes para não sobrecarregar
    const batchSize = 10;
    const totalItems = itemsToImport.length;
    
    for (let i = 0; i < itemsToImport.length; i += batchSize) {
      if (cancelImportRef.current) {
        toast.info("Importação cancelada pelo usuário");
        break;
      }

      const batch = itemsToImport.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (item) => {
          if (cancelImportRef.current) return;

          try {
            const metadata: Record<string, unknown> = {};
            if (item.notes) {
              metadata.notes = item.notes;
            }

            const result = await createInventoryItem({
              name: item.name,
              item_type: item.item_type,
              quantity: item.quantity,
              unit: item.unit,
              min_quantity: item.min_quantity,
              category: item.category || null,
              supplier: item.supplier || null,
              cost_per_unit: item.cost_per_unit ?? null,
              metadata: Object.keys(metadata).length > 0 ? metadata : null,
            });

            if (result.ok) {
              successCount++;
              // Atualizar status do item
              setImportedItems(prev => prev.map(p => 
                p.row === item.row ? { ...p, status: 'success' } : p
              ));
            } else {
              errorCount++;
              const errorMsg = result.error || "Erro desconhecido";
              // Atualizar status do item
              setImportedItems(prev => prev.map(p => 
                p.row === item.row ? { ...p, status: 'error', importError: errorMsg } : p
              ));
              console.error(`Erro ao importar item linha ${item.row}:`, errorMsg);
            }
          } catch (error: any) {
            errorCount++;
            const errorMsg = error?.message || "Erro desconhecido";
            setImportedItems(prev => prev.map(p => 
              p.row === item.row ? { ...p, status: 'error', importError: errorMsg } : p
            ));
            console.error(`Erro ao importar item linha ${item.row}:`, error);
          }
        })
      );

      // Atualizar progresso
      const progress = Math.min(i + batchSize, totalItems);
      const progressPercent = Math.round((progress / totalItems) * 100);
      setImportProgress(progressPercent);

      // Pequeno delay entre lotes
      if (i + batchSize < itemsToImport.length && !cancelImportRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Contar duplicatas
    duplicateCount = importedItems.filter(item => item.isDuplicate).length;

    setImportResults({ success: successCount, errors: errorCount, duplicates: duplicateCount });
    
    if (successCount > 0) {
      toast.success(`${successCount} item(ns) importado(s) com sucesso!`);
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} item(ns) não puderam ser importados`);
    }

    if (duplicateCount > 0) {
      toast.info(`${duplicateCount} item(ns) duplicado(s) foram ignorados`);
    }

    setIsImporting(false);

    if (onImportComplete && !cancelImportRef.current) {
      onImportComplete();
    }
  };

  const handleCancelImport = () => {
    cancelImportRef.current = true;
    setIsCancelling(true);
    setIsImporting(false);
    toast.info("Cancelando importação...");
  };

  const exportErrors = () => {
    const errors = importedItems.filter(item => 
      item.errors.length > 0 || item.status === 'error' || item.isDuplicate
    );

    if (errors.length === 0) {
      toast.info("Nenhum erro para exportar");
      return;
    }

    const csvContent = [
      ['Linha', 'Nome', 'Tipo', 'Erro'].join(','),
      ...errors.map(item => [
        item.row,
        `"${item.name}"`,
        `"${item.item_type}"`,
        `"${item.isDuplicate ? 'Item já existe' : item.errors.join('; ') || item.importError || 'Erro desconhecido'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `erros_importacao_estoque_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Arquivo de erros exportado!");
  };

  const handleClose = () => {
    if (isImporting) {
      if (!confirm("A importação está em andamento. Deseja realmente cancelar?")) {
        return;
      }
      handleCancelImport();
    }
    setFile(null);
    setImportedItems([]);
    setImportResults({ success: 0, errors: 0, duplicates: 0 });
    setImportProgress(0);
    setExistingItems([]);
    setIsOpen(false);
    cancelImportRef.current = false;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validItems = importedItems.filter(item => item.errors.length === 0 && !item.isDuplicate);
  const invalidItems = importedItems.filter(item => item.errors.length > 0);
  const duplicateItems = importedItems.filter(item => item.isDuplicate);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Estoque
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Estoque
          </DialogTitle>
          <DialogDescription>
            Importe uma lista de itens de estoque de um arquivo CSV ou Excel. O arquivo deve ter colunas: Nome, Tipo, Quantidade, Unidade (opcional), Quantidade Mínima (opcional), Categoria (opcional), Fornecedor (opcional), Custo Unitário (opcional), Observações (opcional). <strong>Limite: até 1000 itens por importação.</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seção de Ajuda e Exemplo */}
          <div className="border rounded-lg p-4 bg-blue-50/50">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Como preparar seu arquivo</h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
                className="h-auto p-1"
              >
                {showHelp ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
            
            {showHelp && (
              <div className="space-y-4 mt-3">
                {/* Instruções */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-blue-900">📋 Instruções:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                    <li>A primeira linha deve conter os cabeçalhos das colunas</li>
                    <li>As colunas <strong>"Nome"</strong>, <strong>"Tipo"</strong> e <strong>"Quantidade"</strong> são obrigatórias</li>
                    <li>Tipos válidos: Matéria-prima, Tecido, Produto acabado</li>
                    <li>Unidade: se não informada, será usada a padrão do tipo (unidades para matéria-prima/produto acabado, metros para tecido)</li>
                    <li>Quantidade mínima: se não informada, será 0</li>
                    <li>Valores numéricos: use números decimais (ponto ou vírgula)</li>
                  </ol>
                </div>

                {/* Exemplo Visual */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-blue-900">📄 Exemplo de formato CSV:</h4>
                  <div className="bg-white border border-blue-200 rounded p-3 font-mono text-xs overflow-x-auto">
                    <div className="text-blue-900 font-semibold mb-1">Cabeçalho (primeira linha):</div>
                    <div className="text-gray-700 mb-3">Nome,Tipo,Quantidade,Unidade,Quantidade Mínima,Categoria,Fornecedor,Custo Unitário,Observações</div>
                    
                    <div className="text-blue-900 font-semibold mb-1">Dados (linhas seguintes):</div>
                    <div className="text-gray-700 space-y-1">
                      <div>Linha Branca,Matéria-prima,50,rolos,10,Aviamen tos,Fornecedor ABC,2.50,Linha de costura</div>
                      <div>Tecido Algodão,Tecido,25,metros,5,Tecidos,Tecidos XYZ,15.00,Tecido 100% algodão</div>
                      <div>Vestido Pronto,Produto acabado,10,unidades,2,Produtos,Loja ABC,120.00,Pronto para venda</div>
                    </div>
                  </div>
                </div>

                {/* Tabela de Exemplo */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-blue-900">📊 Visualização em tabela:</h4>
                  <div className="bg-white border border-blue-200 rounded overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-blue-100">
                        <tr>
                          <th className="p-2 text-left border-r border-blue-200">Nome</th>
                          <th className="p-2 text-left border-r border-blue-200">Tipo</th>
                          <th className="p-2 text-left border-r border-blue-200">Qtd</th>
                          <th className="p-2 text-left border-r border-blue-200">Unidade</th>
                          <th className="p-2 text-left border-r border-blue-200">Mín</th>
                          <th className="p-2 text-left">Custo</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2 border-r border-blue-200">Linha Branca</td>
                          <td className="p-2 border-r border-blue-200">Matéria-prima</td>
                          <td className="p-2 border-r border-blue-200">50</td>
                          <td className="p-2 border-r border-blue-200">rolos</td>
                          <td className="p-2 border-r border-blue-200">10</td>
                          <td className="p-2">2.50</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Dicas Importantes */}
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <Info className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 text-sm text-yellow-800">
                    <p className="font-medium mb-1">💡 Dicas importantes:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Salve o arquivo como <strong>CSV (UTF-8)</strong> para evitar problemas de acentuação</li>
                      <li>Não deixe linhas vazias entre os dados</li>
                      <li>Valores decimais podem usar ponto ou vírgula: 2.50 ou 2,50</li>
                      <li>Se não informar a unidade, será usada a padrão do tipo</li>
                      <li>Campos opcionais podem ser deixados em branco</li>
                    </ul>
                  </div>
                </div>

                {/* Botão para baixar exemplo */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadExampleCSV}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Arquivo de Exemplo (CSV)
                </Button>
              </div>
            )}
          </div>

          {/* Seleção de arquivo */}
          <div className="space-y-2">
            <Label htmlFor="file">Arquivo (CSV ou Excel)</Label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || isImporting}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    {file ? file.name : "Selecionar Arquivo"}
                  </>
                )}
              </Button>
              {file && !isProcessing && (
                <span className="text-sm text-muted-foreground">
                  {file.size > 1024 * 1024 
                    ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${(file.size / 1024).toFixed(2)} KB`}
                </span>
              )}
            </div>
          </div>

          {/* Preview dos itens */}
          {importedItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {validItems.length} item(ns) válido(s) • {invalidItems.length} com erro(s) • {duplicateItems.length} duplicado(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  {(invalidItems.length > 0 || duplicateItems.length > 0) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={exportErrors}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar Erros
                    </Button>
                  )}
                  {importResults.success > 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      {importResults.success} importado(s) • {importResults.errors} erro(s) • {importResults.duplicates} duplicado(s)
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de progresso */}
              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Importando itens...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelImport}
                    disabled={isCancelling}
                    className="w-full"
                  >
                    {isCancelling ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cancelando...
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cancelar Importação
                      </>
                    )}
                  </Button>
                </div>
              )}

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Linha</th>
                      <th className="p-2 text-left">Nome</th>
                      <th className="p-2 text-left">Tipo</th>
                      <th className="p-2 text-left">Qtd</th>
                      <th className="p-2 text-left">Unidade</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedItems.map((item, index) => {
                      const isError = item.errors.length > 0 || item.status === 'error';
                      const isDuplicate = item.isDuplicate;
                      const isSuccess = item.status === 'success';
                      const bgColor = isError ? "bg-red-50" : isDuplicate ? "bg-yellow-50" : isSuccess ? "bg-green-50" : "";

                      return (
                        <tr key={index} className={bgColor}>
                          <td className="p-2">{item.row}</td>
                          <td className="p-2">{item.name || "-"}</td>
                          <td className="p-2">{VALID_TYPES.find(t => t.value === item.item_type)?.label || item.item_type}</td>
                          <td className="p-2">{item.quantity}</td>
                          <td className="p-2">{item.unit}</td>
                          <td className="p-2">
                            {isError ? (
                              <div className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-4 w-4" />
                                <span className="text-xs">{item.errors[0] || item.importError || "Erro"}</span>
                              </div>
                            ) : isDuplicate ? (
                              <div className="flex items-center gap-1 text-yellow-600">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-xs">Duplicado</span>
                              </div>
                            ) : isSuccess ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-xs">Importado</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-blue-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-xs">Válido</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {invalidItems.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900">
                      {invalidItems.length} item(ns) com erro(s) não serão importados
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Corrija os erros no arquivo e importe novamente para incluir todos os itens.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isImporting}>
            {importResults.success > 0 ? "Fechar" : "Cancelar"}
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={validItems.length === 0 || isImporting || importResults.success > 0}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar {validItems.length} Item(ns)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

