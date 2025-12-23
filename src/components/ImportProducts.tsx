import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle2, XCircle, Loader2, AlertCircle, Download, HelpCircle, Info, X } from "lucide-react";
import { toast } from "sonner";
import { createProduct, getProducts } from "@/integrations/supabase/products";

interface ImportedProduct {
  name: string;
  type: string;
  materials: string[];
  work_hours: number;
  unit_price: number;
  profit_margin: number;
  row: number;
  errors: string[];
  isDuplicate?: boolean;
  importError?: string;
  status?: 'pending' | 'success' | 'error' | 'duplicate';
}

interface ImportProductsProps {
  onImportComplete?: () => void;
}

const VALID_TYPES = ["Uniforme", "Personalizado", "Bordado", "Estampado"];

export function ImportProducts({ onImportComplete }: ImportProductsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; errors: number; duplicates: number }>({ success: 0, errors: 0, duplicates: 0 });
  const [showHelp, setShowHelp] = useState(false);
  const [existingProducts, setExistingProducts] = useState<string[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelImportRef = useRef(false);

  const downloadExampleCSV = () => {
    const csvContent = `Nome,Tipo,Materiais,Horas Trabalho,Preço Unitário,Margem Lucro (%)
Camiseta Polo Bordada,Bordado,"linha, tecido",1.5,25.00,35
Vestido Personalizado,Personalizado,"tecido, linha, zíper",3.0,120.00,40
Uniforme Escolar,Uniforme,"tecido, botões, etiqueta",2.0,85.00,30
Camiseta Estampada,Estampado,"camiseta, tinta",0.5,35.00,50`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'exemplo_produtos.csv');
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
      const typeIndex = headers.findIndex(h => h.includes('tipo') || h.includes('type') || h.includes('categoria') || h.includes('category'));
      const materialsIndex = headers.findIndex(h => h.includes('materiais') || h.includes('materials') || h.includes('material'));
      const workHoursIndex = headers.findIndex(h => h.includes('horas') || h.includes('hours') || h.includes('tempo') || h.includes('work'));
      const unitPriceIndex = headers.findIndex(h => h.includes('preço') || h.includes('price') || h.includes('preco') || h.includes('valor') || h.includes('unit'));
      const profitMarginIndex = headers.findIndex(h => h.includes('margem') || h.includes('margin') || h.includes('lucro') || h.includes('profit'));

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

      // Processar linhas de dados
      const products: ImportedProduct[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.every(cell => !cell.trim())) continue; // Pular linhas vazias

        const name = row[nameIndex]?.trim() || '';
        const type = row[typeIndex]?.trim() || '';
        const materialsStr = materialsIndex >= 0 ? row[materialsIndex]?.trim() : '';
        const workHoursStr = workHoursIndex >= 0 ? row[workHoursIndex]?.trim() : '0';
        const unitPriceStr = unitPriceIndex >= 0 ? row[unitPriceIndex]?.trim() : '0';
        const profitMarginStr = profitMarginIndex >= 0 ? row[profitMarginIndex]?.trim() : '0';

        const errors: string[] = [];

        // Validar nome
        if (!name) {
          errors.push("Nome é obrigatório");
        } else if (name.length < 3) {
          errors.push("Nome deve ter pelo menos 3 caracteres");
        }

        // Validar tipo
        if (!type) {
          errors.push("Tipo é obrigatório");
        } else if (!VALID_TYPES.includes(type)) {
          errors.push(`Tipo inválido. Use: ${VALID_TYPES.join(', ')}`);
        }

        // Processar materiais
        let materials: string[] = [];
        if (materialsStr) {
          materials = materialsStr.split(',').map(m => m.trim()).filter(m => m.length > 0);
        }

        // Validar horas de trabalho
        const work_hours = parseFloat(workHoursStr) || 0;
        if (work_hours < 0) {
          errors.push("Horas de trabalho não pode ser negativo");
        }

        // Validar preço unitário
        const unit_price = parseFloat(unitPriceStr.replace(',', '.')) || 0;
        if (unit_price <= 0) {
          errors.push("Preço unitário deve ser maior que zero");
        }

        // Validar margem de lucro
        const profit_margin = parseFloat(profitMarginStr.replace(',', '.')) || 0;
        if (profit_margin < 0 || profit_margin > 100) {
          errors.push("Margem de lucro deve estar entre 0 e 100");
        }

        products.push({
          name,
          type,
          materials,
          work_hours,
          unit_price,
          profit_margin,
          row: i + 1,
          errors
        });
      }

      if (products.length === 0) {
        toast.error("Nenhum produto válido encontrado no arquivo");
        setIsProcessing(false);
        return;
      }

      // Limite de 1000 produtos por importação
      const MAX_PRODUCTS = 1000;
      const productsToProcess = products.length > MAX_PRODUCTS ? products.slice(0, MAX_PRODUCTS) : products;
      
      if (products.length > MAX_PRODUCTS) {
        toast.warning(`O arquivo contém ${products.length} produtos. O limite é ${MAX_PRODUCTS}. Apenas os primeiros ${MAX_PRODUCTS} serão processados.`);
      }

      // Verificar produtos existentes
      toast.info("Verificando produtos duplicados...");
      const existing = await getProducts();
      const existingNames = existing.map(p => p.name.toLowerCase().trim());
      setExistingProducts(existingNames);

      // Marcar duplicatas
      const productsWithDuplicates = productsToProcess.map(p => ({
        ...p,
        isDuplicate: existingNames.includes(p.name.toLowerCase().trim()),
        status: 'pending' as const
      }));

      const duplicatesCount = productsWithDuplicates.filter(p => p.isDuplicate).length;
      if (duplicatesCount > 0) {
        toast.warning(`${duplicatesCount} produto(s) já existem no sistema e serão ignorados`);
      }

      setImportedProducts(productsWithDuplicates);
      toast.success(`${productsToProcess.length} produto(s) encontrado(s) no arquivo`);
    } catch (error: any) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar arquivo: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (importedProducts.length === 0) {
      toast.error("Nenhum produto para importar");
      return;
    }

    setIsImporting(true);
    setIsCancelling(false);
    cancelImportRef.current = false;
    setImportProgress(0);
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    // Filtrar apenas produtos válidos e não duplicados
    const productsToImport = importedProducts.filter(p => 
      p.errors.length === 0 && !p.isDuplicate
    );

    if (productsToImport.length === 0) {
      toast.warning("Nenhum produto válido para importar (todos têm erros ou são duplicados)");
      setIsImporting(false);
      return;
    }

    // Importar produtos em lotes para não sobrecarregar
    const batchSize = 10;
    const totalProducts = productsToImport.length;
    
    for (let i = 0; i < productsToImport.length; i += batchSize) {
      if (cancelImportRef.current) {
        toast.info("Importação cancelada pelo usuário");
        break;
      }

      const batch = productsToImport.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (product) => {
          if (cancelImportRef.current) return;

          try {
            const result = await createProduct({
              name: product.name,
              type: product.type,
              materials: product.materials,
              work_hours: product.work_hours,
              unit_price: product.unit_price,
              profit_margin: product.profit_margin
            });

            if (result.ok) {
              successCount++;
              // Atualizar status do produto
              setImportedProducts(prev => prev.map(p => 
                p.row === product.row ? { ...p, status: 'success' } : p
              ));
            } else {
              errorCount++;
              const errorMsg = result.error || "Erro desconhecido";
              // Atualizar status do produto
              setImportedProducts(prev => prev.map(p => 
                p.row === product.row ? { ...p, status: 'error', importError: errorMsg } : p
              ));
              console.error(`Erro ao importar produto linha ${product.row}:`, errorMsg);
            }
          } catch (error: any) {
            errorCount++;
            const errorMsg = error?.message || "Erro desconhecido";
            setImportedProducts(prev => prev.map(p => 
              p.row === product.row ? { ...p, status: 'error', importError: errorMsg } : p
            ));
            console.error(`Erro ao importar produto linha ${product.row}:`, error);
          }
        })
      );

      // Atualizar progresso
      const progress = Math.min(i + batchSize, totalProducts);
      const progressPercent = Math.round((progress / totalProducts) * 100);
      setImportProgress(progressPercent);

      // Pequeno delay entre lotes
      if (i + batchSize < productsToImport.length && !cancelImportRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Contar duplicatas
    duplicateCount = importedProducts.filter(p => p.isDuplicate).length;

    setImportResults({ success: successCount, errors: errorCount, duplicates: duplicateCount });
    
    if (successCount > 0) {
      toast.success(`${successCount} produto(s) importado(s) com sucesso!`);
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} produto(s) não puderam ser importados`);
    }

    if (duplicateCount > 0) {
      toast.info(`${duplicateCount} produto(s) duplicado(s) foram ignorados`);
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
    const errors = importedProducts.filter(p => 
      p.errors.length > 0 || p.status === 'error' || p.isDuplicate
    );

    if (errors.length === 0) {
      toast.info("Nenhum erro para exportar");
      return;
    }

    const csvContent = [
      ['Linha', 'Nome', 'Tipo', 'Erro'].join(','),
      ...errors.map(p => [
        p.row,
        `"${p.name}"`,
        `"${p.type}"`,
        `"${p.isDuplicate ? 'Produto já existe' : p.errors.join('; ') || p.importError || 'Erro desconhecido'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `erros_importacao_${new Date().toISOString().split('T')[0]}.csv`);
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
    setImportedProducts([]);
    setImportResults({ success: 0, errors: 0, duplicates: 0 });
    setImportProgress(0);
    setExistingProducts([]);
    setIsOpen(false);
    cancelImportRef.current = false;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validProducts = importedProducts.filter(p => p.errors.length === 0 && !p.isDuplicate);
  const invalidProducts = importedProducts.filter(p => p.errors.length > 0);
  const duplicateProducts = importedProducts.filter(p => p.isDuplicate);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Produtos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Produtos
          </DialogTitle>
          <DialogDescription>
            Importe uma lista de produtos de um arquivo CSV ou Excel. O arquivo deve ter colunas: Nome, Tipo, Materiais (opcional), Horas Trabalho, Preço Unitário, Margem Lucro (%). <strong>Limite: até 1000 produtos por importação.</strong>
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
                    <li>As colunas <strong>"Nome"</strong> e <strong>"Tipo"</strong> são obrigatórias</li>
                    <li>Tipos válidos: Uniforme, Personalizado, Bordado, Estampado</li>
                    <li>Materiais: separar por vírgula (ex: "linha, tecido, botões")</li>
                    <li>Horas de trabalho, Preço e Margem: use números decimais (ponto ou vírgula)</li>
                    <li>Margem de lucro deve estar entre 0 e 100</li>
                  </ol>
                </div>

                {/* Exemplo Visual */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-blue-900">📄 Exemplo de formato CSV:</h4>
                  <div className="bg-white border border-blue-200 rounded p-3 font-mono text-xs overflow-x-auto">
                    <div className="text-blue-900 font-semibold mb-1">Cabeçalho (primeira linha):</div>
                    <div className="text-gray-700 mb-3">Nome,Tipo,Materiais,Horas Trabalho,Preço Unitário,Margem Lucro (%)</div>
                    
                    <div className="text-blue-900 font-semibold mb-1">Dados (linhas seguintes):</div>
                    <div className="text-gray-700 space-y-1">
                      <div>Camiseta Polo Bordada,Bordado,"linha, tecido",1.5,25.00,35</div>
                      <div>Vestido Personalizado,Personalizado,"tecido, linha, zíper",3.0,120.00,40</div>
                      <div>Uniforme Escolar,Uniforme,"tecido, botões",2.0,85.00,30</div>
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
                          <th className="p-2 text-left border-r border-blue-200">Materiais</th>
                          <th className="p-2 text-left border-r border-blue-200">Horas</th>
                          <th className="p-2 text-left border-r border-blue-200">Preço</th>
                          <th className="p-2 text-left">Margem %</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2 border-r border-blue-200">Camiseta Polo</td>
                          <td className="p-2 border-r border-blue-200">Bordado</td>
                          <td className="p-2 border-r border-blue-200">linha, tecido</td>
                          <td className="p-2 border-r border-blue-200">1.5</td>
                          <td className="p-2 border-r border-blue-200">25.00</td>
                          <td className="p-2">35</td>
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
                      <li>Use vírgulas para separar materiais dentro de aspas: "linha, tecido"</li>
                      <li>Valores decimais podem usar ponto ou vírgula: 25.50 ou 25,50</li>
                      <li>Margem de lucro é em porcentagem (0-100)</li>
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

          {/* Preview dos produtos */}
          {importedProducts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {validProducts.length} produto(s) válido(s) • {invalidProducts.length} com erro(s) • {duplicateProducts.length} duplicado(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  {(invalidProducts.length > 0 || duplicateProducts.length > 0) && (
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
                    <span>Importando produtos...</span>
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
                      <th className="p-2 text-left">Preço</th>
                      <th className="p-2 text-left">Horas</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedProducts.map((product, index) => {
                      const isError = product.errors.length > 0 || product.status === 'error';
                      const isDuplicate = product.isDuplicate;
                      const isSuccess = product.status === 'success';
                      const bgColor = isError ? "bg-red-50" : isDuplicate ? "bg-yellow-50" : isSuccess ? "bg-green-50" : "";

                      return (
                        <tr key={index} className={bgColor}>
                          <td className="p-2">{product.row}</td>
                          <td className="p-2">{product.name || "-"}</td>
                          <td className="p-2">{product.type || "-"}</td>
                          <td className="p-2">R$ {product.unit_price.toFixed(2)}</td>
                          <td className="p-2">{product.work_hours}h</td>
                          <td className="p-2">
                            {isError ? (
                              <div className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-4 w-4" />
                                <span className="text-xs">{product.errors[0] || product.importError || "Erro"}</span>
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

              {invalidProducts.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900">
                      {invalidProducts.length} produto(s) com erro(s) não serão importados
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Corrija os erros no arquivo e importe novamente para incluir todos os produtos.
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
            disabled={validProducts.length === 0 || isImporting || importResults.success > 0}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar {validProducts.length} Produto(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

