import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle2, XCircle, Loader2, AlertCircle, Download, HelpCircle, Info, X } from "lucide-react";
import { toast } from "sonner";
import { createServico, listServicos } from "@/integrations/supabase/servicos";

interface ImportedServico {
  nome: string;
  descricao?: string;
  preco_padrao: number;
  tempo_estimado?: number;
  categoria?: string;
  ativo: boolean;
  row: number;
  errors: string[];
  isDuplicate?: boolean;
  importError?: string;
  status?: 'pending' | 'success' | 'error' | 'duplicate';
}

interface ImportServicosProps {
  onImportComplete?: () => void;
}

export function ImportServicos({ onImportComplete }: ImportServicosProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importedServicos, setImportedServicos] = useState<ImportedServico[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; errors: number; duplicates: number }>({ success: 0, errors: 0, duplicates: 0 });
  const [showHelp, setShowHelp] = useState(false);
  const [existingServicos, setExistingServicos] = useState<string[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelImportRef = useRef(false);

  const downloadExampleCSV = () => {
    const csvContent = `Nome,Descrição,Preço Padrão,Tempo Estimado (minutos),Categoria,Ativo
Conserto de Zíper,Reparo de zíper em roupas,15.00,30,Conserto,Sim
Ajuste de Barra,Encurtamento ou alongamento de barra,20.00,45,Ajuste,Sim
Bordado Personalizado,Bordado com nome ou logo,50.00,120,Personalização,Sim
Troca de Botões,Substituição de botões,10.00,15,Conserto,Sim`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'exemplo_servicos.csv');
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
      const nomeIndex = headers.findIndex(h => h.includes('nome') || h.includes('name'));
      const descricaoIndex = headers.findIndex(h => h.includes('descrição') || h.includes('descricao') || h.includes('description') || h.includes('desc'));
      const precoIndex = headers.findIndex(h => h.includes('preço') || h.includes('preco') || h.includes('price') || h.includes('valor') || h.includes('valor padrão'));
      const tempoIndex = headers.findIndex(h => h.includes('tempo') || h.includes('time') || h.includes('estimado') || h.includes('minutos') || h.includes('minutes'));
      const categoriaIndex = headers.findIndex(h => h.includes('categoria') || h.includes('category') || h.includes('tipo'));
      const ativoIndex = headers.findIndex(h => h.includes('ativo') || h.includes('active') || h.includes('status') || h.includes('ativo/inativo'));

      if (nomeIndex === -1) {
        toast.error("Não foi encontrada uma coluna 'Nome' no arquivo. Verifique o cabeçalho.");
        setIsProcessing(false);
        return;
      }

      // Processar linhas de dados
      const servicos: ImportedServico[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.every(cell => !cell.trim())) continue; // Pular linhas vazias

        const nome = row[nomeIndex]?.trim() || '';
        const descricao = descricaoIndex >= 0 ? row[descricaoIndex]?.trim() : '';
        const precoStr = precoIndex >= 0 ? row[precoIndex]?.trim() : '0';
        const tempoStr = tempoIndex >= 0 ? row[tempoIndex]?.trim() : '';
        const categoria = categoriaIndex >= 0 ? row[categoriaIndex]?.trim() : '';
        const ativoStr = ativoIndex >= 0 ? row[ativoIndex]?.trim().toLowerCase() : 'sim';

        const errors: string[] = [];

        // Validar nome
        if (!nome) {
          errors.push("Nome é obrigatório");
        } else if (nome.length < 3) {
          errors.push("Nome deve ter pelo menos 3 caracteres");
        }

        // Validar preço
        const preco_padrao = parseFloat(precoStr.replace(',', '.')) || 0;
        if (preco_padrao < 0) {
          errors.push("Preço padrão não pode ser negativo");
        }

        // Validar tempo estimado (se fornecido)
        let tempo_estimado: number | undefined = undefined;
        if (tempoStr) {
          const tempo = parseInt(tempoStr);
          if (isNaN(tempo) || tempo < 0) {
            errors.push("Tempo estimado deve ser um número positivo");
          } else {
            tempo_estimado = tempo;
          }
        }

        // Processar ativo
        const ativo = ativoStr === 'sim' || ativoStr === 'yes' || ativoStr === 'true' || ativoStr === '1' || ativoStr === 'ativo' || ativoStr === 's';

        servicos.push({
          nome,
          descricao: descricao || undefined,
          preco_padrao,
          tempo_estimado,
          categoria: categoria || undefined,
          ativo,
          row: i + 1,
          errors
        });
      }

      if (servicos.length === 0) {
        toast.error("Nenhum serviço válido encontrado no arquivo");
        setIsProcessing(false);
        return;
      }

      // Limite de 1000 serviços por importação
      const MAX_SERVICOS = 1000;
      const servicosToProcess = servicos.length > MAX_SERVICOS ? servicos.slice(0, MAX_SERVICOS) : servicos;
      
      if (servicos.length > MAX_SERVICOS) {
        toast.warning(`O arquivo contém ${servicos.length} serviços. O limite é ${MAX_SERVICOS}. Apenas os primeiros ${MAX_SERVICOS} serão processados.`);
      }

      // Verificar serviços existentes
      toast.info("Verificando serviços duplicados...");
      const existing = await listServicos();
      const existingNames = existing.map(s => s.nome.toLowerCase().trim());
      setExistingServicos(existingNames);

      // Marcar duplicatas
      const servicosWithDuplicates = servicosToProcess.map(s => ({
        ...s,
        isDuplicate: existingNames.includes(s.nome.toLowerCase().trim()),
        status: 'pending' as const
      }));

      const duplicatesCount = servicosWithDuplicates.filter(s => s.isDuplicate).length;
      if (duplicatesCount > 0) {
        toast.warning(`${duplicatesCount} serviço(s) já existem no sistema e serão ignorados`);
      }

      setImportedServicos(servicosWithDuplicates);
      toast.success(`${servicosToProcess.length} serviço(s) encontrado(s) no arquivo`);
    } catch (error: any) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar arquivo: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (importedServicos.length === 0) {
      toast.error("Nenhum serviço para importar");
      return;
    }

    setIsImporting(true);
    setIsCancelling(false);
    cancelImportRef.current = false;
    setImportProgress(0);
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    // Filtrar apenas serviços válidos e não duplicados
    const servicosToImport = importedServicos.filter(s => 
      s.errors.length === 0 && !s.isDuplicate
    );

    if (servicosToImport.length === 0) {
      toast.warning("Nenhum serviço válido para importar (todos têm erros ou são duplicados)");
      setIsImporting(false);
      return;
    }

    // Importar serviços em lotes para não sobrecarregar
    const batchSize = 10;
    const totalServicos = servicosToImport.length;
    
    for (let i = 0; i < servicosToImport.length; i += batchSize) {
      if (cancelImportRef.current) {
        toast.info("Importação cancelada pelo usuário");
        break;
      }

      const batch = servicosToImport.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (servico) => {
          if (cancelImportRef.current) return;

          try {
            const result = await createServico({
              nome: servico.nome,
              descricao: servico.descricao,
              preco_padrao: servico.preco_padrao,
              tempo_estimado: servico.tempo_estimado,
              categoria: servico.categoria,
              ativo: servico.ativo
            });

            if (result.ok) {
              successCount++;
              setImportedServicos(prev => prev.map(s => 
                s.row === servico.row ? { ...s, status: 'success' } : s
              ));
            } else {
              errorCount++;
              const errorMsg = result.error || "Erro desconhecido";
              setImportedServicos(prev => prev.map(s => 
                s.row === servico.row ? { ...s, status: 'error', importError: errorMsg } : s
              ));
              console.error(`Erro ao importar serviço linha ${servico.row}:`, errorMsg);
            }
          } catch (error: any) {
            errorCount++;
            const errorMsg = error?.message || "Erro desconhecido";
            setImportedServicos(prev => prev.map(s => 
              s.row === servico.row ? { ...s, status: 'error', importError: errorMsg } : s
            ));
            console.error(`Erro ao importar serviço linha ${servico.row}:`, error);
          }
        })
      );

      // Atualizar progresso
      const progress = Math.min(i + batchSize, totalServicos);
      const progressPercent = Math.round((progress / totalServicos) * 100);
      setImportProgress(progressPercent);

      // Pequeno delay entre lotes
      if (i + batchSize < servicosToImport.length && !cancelImportRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Contar duplicatas
    duplicateCount = importedServicos.filter(s => s.isDuplicate).length;

    setImportResults({ success: successCount, errors: errorCount, duplicates: duplicateCount });
    
    if (successCount > 0) {
      toast.success(`${successCount} serviço(s) importado(s) com sucesso!`);
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} serviço(s) não puderam ser importados`);
    }

    if (duplicateCount > 0) {
      toast.info(`${duplicateCount} serviço(s) duplicado(s) foram ignorados`);
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
    const errors = importedServicos.filter(s => 
      s.errors.length > 0 || s.status === 'error' || s.isDuplicate
    );

    if (errors.length === 0) {
      toast.info("Nenhum erro para exportar");
      return;
    }

    const csvContent = [
      ['Linha', 'Nome', 'Preço', 'Erro'].join(','),
      ...errors.map(s => [
        s.row,
        `"${s.nome}"`,
        s.preco_padrao.toFixed(2),
        `"${s.isDuplicate ? 'Serviço já existe' : s.errors.join('; ') || s.importError || 'Erro desconhecido'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `erros_importacao_servicos_${new Date().toISOString().split('T')[0]}.csv`);
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
    setImportedServicos([]);
    setImportResults({ success: 0, errors: 0, duplicates: 0 });
    setImportProgress(0);
    setExistingServicos([]);
    setIsOpen(false);
    cancelImportRef.current = false;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validServicos = importedServicos.filter(s => s.errors.length === 0 && !s.isDuplicate);
  const invalidServicos = importedServicos.filter(s => s.errors.length > 0);
  const duplicateServicos = importedServicos.filter(s => s.isDuplicate);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Serviços
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Serviços
          </DialogTitle>
          <DialogDescription>
            Importe uma lista de serviços de um arquivo CSV ou Excel. O arquivo deve ter colunas: Nome, Descrição (opcional), Preço Padrão, Tempo Estimado (opcional), Categoria (opcional), Ativo. <strong>Limite: até 1000 serviços por importação.</strong>
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
                    <li>A coluna <strong>"Nome"</strong> é obrigatória</li>
                    <li>As colunas Descrição, Tempo Estimado e Categoria são opcionais</li>
                    <li>Preço Padrão: use números decimais (ponto ou vírgula)</li>
                    <li>Tempo Estimado: em minutos (número inteiro)</li>
                    <li>Ativo: use "Sim" ou "Não" (padrão: Sim)</li>
                  </ol>
                </div>

                {/* Exemplo Visual */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-blue-900">📄 Exemplo de formato CSV:</h4>
                  <div className="bg-white border border-blue-200 rounded p-3 font-mono text-xs overflow-x-auto">
                    <div className="text-blue-900 font-semibold mb-1">Cabeçalho (primeira linha):</div>
                    <div className="text-gray-700 mb-3">Nome,Descrição,Preço Padrão,Tempo Estimado (minutos),Categoria,Ativo</div>
                    
                    <div className="text-blue-900 font-semibold mb-1">Dados (linhas seguintes):</div>
                    <div className="text-gray-700 space-y-1">
                      <div>Conserto de Zíper,Reparo de zíper em roupas,15.00,30,Conserto,Sim</div>
                      <div>Ajuste de Barra,Encurtamento de barra,20.00,45,Ajuste,Sim</div>
                      <div>Bordado Personalizado,Bordado com nome,50.00,120,Personalização,Sim</div>
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
                          <th className="p-2 text-left border-r border-blue-200">Descrição</th>
                          <th className="p-2 text-left border-r border-blue-200">Preço</th>
                          <th className="p-2 text-left border-r border-blue-200">Tempo</th>
                          <th className="p-2 text-left border-r border-blue-200">Categoria</th>
                          <th className="p-2 text-left">Ativo</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2 border-r border-blue-200">Conserto de Zíper</td>
                          <td className="p-2 border-r border-blue-200">Reparo de zíper</td>
                          <td className="p-2 border-r border-blue-200">15.00</td>
                          <td className="p-2 border-r border-blue-200">30</td>
                          <td className="p-2 border-r border-blue-200">Conserto</td>
                          <td className="p-2">Sim</td>
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
                      <li>Valores decimais podem usar ponto ou vírgula: 15.50 ou 15,50</li>
                      <li>Para Ativo, use: Sim, Não, Yes, No, True, False, 1, 0, Ativo, Inativo</li>
                      <li>Deixe campos opcionais vazios se não tiver informação</li>
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

          {/* Preview dos serviços */}
          {importedServicos.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {validServicos.length} serviço(s) válido(s) • {invalidServicos.length} com erro(s) • {duplicateServicos.length} duplicado(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  {(invalidServicos.length > 0 || duplicateServicos.length > 0) && (
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
                    <span>Importando serviços...</span>
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
                      <th className="p-2 text-left">Preço</th>
                      <th className="p-2 text-left">Tempo</th>
                      <th className="p-2 text-left">Categoria</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedServicos.map((servico, index) => {
                      const isError = servico.errors.length > 0 || servico.status === 'error';
                      const isDuplicate = servico.isDuplicate;
                      const isSuccess = servico.status === 'success';
                      const bgColor = isError ? "bg-red-50" : isDuplicate ? "bg-yellow-50" : isSuccess ? "bg-green-50" : "";

                      return (
                        <tr key={index} className={bgColor}>
                          <td className="p-2">{servico.row}</td>
                          <td className="p-2">{servico.nome || "-"}</td>
                          <td className="p-2">R$ {servico.preco_padrao.toFixed(2)}</td>
                          <td className="p-2">{servico.tempo_estimado ? `${servico.tempo_estimado}min` : "-"}</td>
                          <td className="p-2">{servico.categoria || "-"}</td>
                          <td className="p-2">
                            {isError ? (
                              <div className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-4 w-4" />
                                <span className="text-xs">{servico.errors[0] || servico.importError || "Erro"}</span>
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

              {invalidServicos.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900">
                      {invalidServicos.length} serviço(s) com erro(s) não serão importados
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Corrija os erros no arquivo e importe novamente para incluir todos os serviços.
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
            disabled={validServicos.length === 0 || isImporting || importResults.success > 0}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar {validServicos.length} Serviço(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

