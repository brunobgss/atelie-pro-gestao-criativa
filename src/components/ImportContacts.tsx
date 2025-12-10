import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle2, XCircle, Loader2, AlertCircle, Download, HelpCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { createCustomer } from "@/integrations/supabase/customers";
import { validateName, validatePhone, validateEmail } from "@/utils/validators";

interface ImportedContact {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  row: number;
  errors: string[];
}

interface ImportContactsProps {
  onImportComplete?: () => void;
}

export function ImportContacts({ onImportComplete }: ImportContactsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importedContacts, setImportedContacts] = useState<ImportedContact[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; errors: number }>({ success: 0, errors: 0 });
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadExampleCSV = () => {
    const csvContent = `Nome,Telefone,Email,Endereço
Maria Silva,(11) 98765-4321,maria.silva@email.com,Rua das Flores, 123 - São Paulo
João Santos,(21) 99876-5432,joao.santos@email.com,Av. Principal, 456 - Rio de Janeiro
Ana Costa,(31) 91234-5678,ana.costa@email.com,Rua Central, 789 - Belo Horizonte
Carlos Oliveira,(41) 92345-6789,carlos.oliveira@email.com,Av. Brasil, 321 - Curitiba`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'exemplo_clientes.csv');
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
          i++; // Skip next quote
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
      const phoneIndex = headers.findIndex(h => h.includes('telefone') || h.includes('phone') || h.includes('celular'));
      const emailIndex = headers.findIndex(h => h.includes('email') || h.includes('e-mail'));
      const addressIndex = headers.findIndex(h => h.includes('endereco') || h.includes('address') || h.includes('endereço'));

      if (nameIndex === -1) {
        toast.error("Não foi encontrada uma coluna 'Nome' no arquivo. Verifique o cabeçalho.");
        setIsProcessing(false);
        return;
      }

      // Processar linhas de dados
      const contacts: ImportedContact[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.every(cell => !cell.trim())) continue; // Pular linhas vazias

        const name = row[nameIndex]?.trim() || '';
        const phone = phoneIndex >= 0 ? row[phoneIndex]?.trim() : '';
        const email = emailIndex >= 0 ? row[emailIndex]?.trim() : '';
        const address = addressIndex >= 0 ? row[addressIndex]?.trim() : '';

        const errors: string[] = [];

        // Validar nome
        if (!name) {
          errors.push("Nome é obrigatório");
        } else if (!validateName(name)) {
          errors.push("Nome inválido");
        }

        // Validar telefone (se fornecido)
        if (phone && !validatePhone(phone)) {
          errors.push("Telefone inválido");
        }

        // Validar email (se fornecido)
        if (email && !validateEmail(email)) {
          errors.push("Email inválido");
        }

        contacts.push({
          name,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          row: i + 1,
          errors
        });
      }

      if (contacts.length === 0) {
        toast.error("Nenhum contato válido encontrado no arquivo");
        setIsProcessing(false);
        return;
      }

      setImportedContacts(contacts);
      toast.success(`${contacts.length} contato(s) encontrado(s) no arquivo`);
    } catch (error: any) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar arquivo: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (importedContacts.length === 0) {
      toast.error("Nenhum contato para importar");
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    // Importar contatos em lotes para não sobrecarregar
    const batchSize = 5;
    for (let i = 0; i < importedContacts.length; i += batchSize) {
      const batch = importedContacts.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (contact) => {
          if (contact.errors.length > 0) {
            errorCount++;
            return;
          }

          try {
            const result = await createCustomer({
              name: contact.name,
              phone: contact.phone,
              email: contact.email
            });

            if (result.ok) {
              successCount++;
            } else {
              errorCount++;
              console.error(`Erro ao importar contato linha ${contact.row}:`, result.error);
            }
          } catch (error: any) {
            errorCount++;
            console.error(`Erro ao importar contato linha ${contact.row}:`, error);
          }
        })
      );

      // Pequeno delay entre lotes
      if (i + batchSize < importedContacts.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    setImportResults({ success: successCount, errors: errorCount });
    
    if (successCount > 0) {
      toast.success(`${successCount} contato(s) importado(s) com sucesso!`);
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} contato(s) não puderam ser importados`);
    }

    if (onImportComplete) {
      onImportComplete();
    }

    // Limpar após 3 segundos
    setTimeout(() => {
      handleClose();
    }, 3000);
  };

  const handleClose = () => {
    setFile(null);
    setImportedContacts([]);
    setImportResults({ success: 0, errors: 0 });
    setIsOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validContacts = importedContacts.filter(c => c.errors.length === 0);
  const invalidContacts = importedContacts.filter(c => c.errors.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Contatos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Contatos
          </DialogTitle>
          <DialogDescription>
            Importe uma lista de contatos de um arquivo CSV ou Excel. O arquivo deve ter colunas: Nome, Telefone (opcional), Email (opcional), Endereço (opcional).
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
                    <li>As colunas Telefone, Email e Endereço são opcionais</li>
                    <li>Use vírgula (,) para separar as colunas</li>
                    <li>Nomes de colunas aceitos: Nome/Name, Telefone/Phone/Celular, Email/E-mail, Endereço/Address</li>
                  </ol>
                </div>

                {/* Exemplo Visual */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-blue-900">📄 Exemplo de formato CSV:</h4>
                  <div className="bg-white border border-blue-200 rounded p-3 font-mono text-xs overflow-x-auto">
                    <div className="text-blue-900 font-semibold mb-1">Cabeçalho (primeira linha):</div>
                    <div className="text-gray-700 mb-3">Nome,Telefone,Email,Endereço</div>
                    
                    <div className="text-blue-900 font-semibold mb-1">Dados (linhas seguintes):</div>
                    <div className="text-gray-700 space-y-1">
                      <div>Maria Silva,(11) 98765-4321,maria@email.com,Rua das Flores, 123</div>
                      <div>João Santos,(21) 99876-5432,joao@email.com,Av. Principal, 456</div>
                      <div>Ana Costa,(31) 91234-5678,ana@email.com,Rua Central, 789</div>
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
                          <th className="p-2 text-left border-r border-blue-200">Telefone</th>
                          <th className="p-2 text-left border-r border-blue-200">Email</th>
                          <th className="p-2 text-left">Endereço</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2 border-r border-blue-200">Maria Silva</td>
                          <td className="p-2 border-r border-blue-200">(11) 98765-4321</td>
                          <td className="p-2 border-r border-blue-200">maria@email.com</td>
                          <td className="p-2">Rua das Flores, 123</td>
                        </tr>
                        <tr className="bg-blue-50/30">
                          <td className="p-2 border-r border-blue-200">João Santos</td>
                          <td className="p-2 border-r border-blue-200">(21) 99876-5432</td>
                          <td className="p-2 border-r border-blue-200">joao@email.com</td>
                          <td className="p-2">Av. Principal, 456</td>
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
                      <li>Telefones podem ter ou não formatação: (11) 98765-4321 ou 11987654321</li>
                      <li>Emails devem estar no formato válido: nome@dominio.com</li>
                      <li>Nomes devem ter pelo menos 3 caracteres</li>
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

          {/* Preview dos contatos */}
          {importedContacts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {validContacts.length} contato(s) válido(s) • {invalidContacts.length} com erro(s)
                  </p>
                </div>
                {importResults.success > 0 && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {importResults.success} importado(s) • {importResults.errors} erro(s)
                  </div>
                )}
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Linha</th>
                      <th className="p-2 text-left">Nome</th>
                      <th className="p-2 text-left">Telefone</th>
                      <th className="p-2 text-left">Email</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedContacts.map((contact, index) => (
                      <tr key={index} className={contact.errors.length > 0 ? "bg-red-50" : ""}>
                        <td className="p-2">{contact.row}</td>
                        <td className="p-2">{contact.name || "-"}</td>
                        <td className="p-2">{contact.phone || "-"}</td>
                        <td className="p-2">{contact.email || "-"}</td>
                        <td className="p-2">
                          {contact.errors.length > 0 ? (
                            <div className="flex items-center gap-1 text-red-600">
                              <XCircle className="h-4 w-4" />
                              <span className="text-xs">{contact.errors[0]}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs">Válido</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invalidContacts.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900">
                      {invalidContacts.length} contato(s) com erro(s) não serão importados
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Corrija os erros no arquivo e importe novamente para incluir todos os contatos.
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
            disabled={validContacts.length === 0 || isImporting || importResults.success > 0}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar {validContacts.length} Contato(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

