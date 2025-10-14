import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Upload, Save, Plus, Trash2, Copy, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createOrder, generateOrderCode } from "@/integrations/supabase/orders";
import { uploadOrderFile } from "@/integrations/supabase/storage";
import { useQueryClient } from "@tanstack/react-query";
import { useSync } from "@/contexts/SyncContext";
import { useSyncOperations } from "@/hooks/useSyncOperations";
import { validateName, validateMoney, validateDate, validateDescription, validateForm } from "@/utils/validators";
import { errorHandler } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { performanceMonitor } from "@/utils/performanceMonitor";

export default function NovoPedido() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const { syncAfterCreate } = useSyncOperations();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [color, setColor] = useState<string>("");
  const [isKitMode, setIsKitMode] = useState<boolean>(false);
  const [kitItems, setKitItems] = useState<Array<{size: string, quantity: number}>>([
    { size: "P", quantity: 0 },
    { size: "M", quantity: 0 },
    { size: "G", quantity: 0 },
    { size: "GG", quantity: 0 }
  ]);
  
  // Estados para controle de upload
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  // Carregar dados duplicados se existirem
  useEffect(() => {
    const duplicateData = localStorage.getItem('duplicateOrder');
    if (duplicateData) {
      try {
        const orderData = JSON.parse(duplicateData);
        
        // Preencher campos com dados duplicados
        const clientInput = document.getElementById("client") as HTMLInputElement;
        const descriptionInput = document.getElementById("description") as HTMLTextAreaElement;
        const valueInput = document.getElementById("value") as HTMLInputElement;
        const paidInput = document.getElementById("paid") as HTMLInputElement;
        
        if (clientInput) clientInput.value = orderData.client;
        if (descriptionInput) descriptionInput.value = orderData.description;
        if (valueInput) valueInput.value = orderData.value.toString();
        if (paidInput) paidInput.value = orderData.paid.toString();
        
        // Limpar dados duplicados após uso
        localStorage.removeItem('duplicateOrder');
        
        toast.success("Dados do pedido anterior carregados!");
      } catch (error) {
        console.error("Erro ao carregar dados duplicados:", error);
      }
    }
  }, []);

  const addKitSize = () => {
    setKitItems([...kitItems, { size: "", quantity: 0 }]);
  };

  const removeKitSize = (index: number) => {
    setKitItems(kitItems.filter((_, i) => i !== index));
  };

  const updateKitSize = (index: number, size: string) => {
    const updated = [...kitItems];
    updated[index].size = size;
    setKitItems(updated);
  };

  const updateKitQuantity = (index: number, quantity: number) => {
    const updated = [...kitItems];
    updated[index].quantity = quantity;
    setKitItems(updated);
  };

  const getTotalKitQuantity = () => {
    return kitItems.reduce((total, item) => total + item.quantity, 0);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');
    setUploadedFileUrl(null);
    
    try {
      console.log("Iniciando upload do arquivo:", file.name);
      
      // Simular progresso do upload (já que o Supabase não fornece progresso real)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 200);
      
      const code = generateOrderCode();
      const upload = await uploadOrderFile(file, code);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (upload.ok && upload.url) {
        setUploadStatus('success');
        setUploadedFileUrl(upload.url);
        toast.success("Arquivo enviado com sucesso!");
        console.log("Upload realizado com sucesso:", upload.url);
      } else {
        setUploadStatus('error');
        toast.warning(upload.error || "Upload falhou - pedido será criado sem arquivo");
        console.log("Upload falhou:", upload.error);
      }
    } catch (error) {
      setUploadStatus('error');
      toast.error("Erro no upload do arquivo");
      console.error("Erro no upload:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      handleFileUpload(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadedFileUrl(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    
    // Limpar o input de arquivo
    const fileInput = document.getElementById("file") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Não permitir envio se estiver fazendo upload
    if (isUploading) {
      toast.warning("Aguarde o upload do arquivo terminar");
      return;
    }
    
    const client = (document.getElementById("client") as HTMLInputElement)?.value;
    const type = (document.querySelector("[data-select-type]") as HTMLButtonElement)?.dataset.value || "outro";
    const description = (document.getElementById("description") as HTMLTextAreaElement)?.value || "";
    const value = Number((document.getElementById("value") as HTMLInputElement)?.value || 0);
    const paid = Number((document.getElementById("paid") as HTMLInputElement)?.value || 0);
    const delivery = (document.getElementById("delivery") as HTMLInputElement)?.value || undefined;
    const code = generateOrderCode();

    // Validação de campos obrigatórios
    // Validação robusta
    const validation = validateForm(
      { client, type, description, value, delivery, quantity },
      {
        client: validateName,
        type: (value) => value && value !== "outro" ? { isValid: true, errors: [] } : { isValid: false, errors: ['Tipo do pedido é obrigatório'] },
        description: validateDescription,
        value: validateMoney,
        delivery: validateDate,
        quantity: (value) => value > 0 ? { isValid: true, errors: [] } : { isValid: false, errors: ['Quantidade deve ser maior que zero'] }
      }
    );
    
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    // Usar arquivo já carregado se disponível
    let file_url: string | undefined = uploadedFileUrl || undefined;

    // Montar descrição com informações do kit ou quantidade simples
    let finalDescription = description;
    if (isKitMode) {
      const kitInfo = kitItems
        .filter(item => item.quantity > 0)
        .map(item => `${item.quantity} ${item.size}`)
        .join(" | ");
      finalDescription = `${description}\nKit: ${kitInfo}\nTotal: ${getTotalKitQuantity()} peças${color ? ` | Cor: ${color}` : ""}`;
    } else {
      finalDescription = `${description}\nQtd: ${quantity}${color ? ` | Cor: ${color}` : ""}`;
    }

    console.log("Dados do pedido a serem enviados:", {
      code,
      customer_name: client,
      type,
      description: finalDescription,
      value,
      paid,
      delivery_date: delivery,
      file_url
    });

    // Medir performance e criar pedido
    const result = await performanceMonitor.measure(
      'createOrder',
      async () => {
        return await createOrder({
          code,
          customer_name: client,
          type,
          description: finalDescription,
          value,
          paid,
          delivery_date: delivery,
          file_url,
        });
      },
      'NovoPedido'
    );
    
    console.log("Resultado da criação do pedido:", result);
    
    if (!result.ok) {
      const appError = errorHandler.handleSupabaseError(
        { message: result.error, code: 'CREATE_ORDER_ERROR' },
        'createOrder'
      );
      logger.error('Falha ao criar pedido', 'NOVO_PEDIDO', { client, type, value, error: result.error });
      toast.error(appError.message);
      return;
    }
    
    // Log de sucesso
    logger.userAction('order_created', 'NOVO_PEDIDO', { 
      orderCode: code, 
      client, 
      type, 
      value, 
      quantity: isKitMode ? getTotalKitQuantity() : quantity 
    });
    
    console.log("Pedido criado com sucesso! Redirecionando para:", `/pedidos/${code}`);
    toast.success("Pedido criado com sucesso!");
    // Sincronização automática
    syncAfterCreate('orders', result.data);
    invalidateRelated('orders');
    navigate(`/pedidos/${code}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4">
          <SidebarTrigger />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pedidos")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Novo Pedido</h1>
            <p className="text-sm text-muted-foreground">Cadastre um novo pedido</p>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <Card className="border-border animate-fade-in">
            <CardHeader>
              <CardTitle className="text-foreground">Informações do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente *</Label>
                  <Input
                    id="client"
                    placeholder="Nome do cliente"
                    required
                    className="border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Pedido *</Label>
                  <Select required>
                    <SelectTrigger className="border-input" data-select-type>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bordado">Bordado Computadorizado</SelectItem>
                      <SelectItem value="camiseta">Camiseta Personalizada</SelectItem>
                      <SelectItem value="uniforme">Uniforme</SelectItem>
                      <SelectItem value="personalizado">Personalizado</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição do Pedido *</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva os detalhes do pedido..."
                  rows={4}
                  required
                  className="border-input resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Arquivo / Arte</Label>
                <label htmlFor="file" className={`block border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  isUploading ? 'border-blue-400 bg-blue-50' : 
                  uploadStatus === 'success' ? 'border-green-400 bg-green-50' :
                  uploadStatus === 'error' ? 'border-red-400 bg-red-50' :
                  'border-input hover:border-secondary'
                }`}>
                  {isUploading ? (
                    <div className="space-y-3">
                      <div className="w-8 h-8 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm text-blue-600 font-medium">Enviando arquivo...</p>
                      <div className="w-full max-w-xs mx-auto">
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-xs text-blue-600 mt-1">{Math.round(uploadProgress)}%</p>
                </div>
                    </div>
                  ) : uploadStatus === 'success' ? (
                    <div className="space-y-2">
                      <CheckCircle className="w-8 h-8 mx-auto text-green-600" />
                      <p className="text-sm text-green-600 font-medium">Arquivo enviado com sucesso!</p>
                      <p className="text-xs text-green-600">{selectedFile?.name}</p>
                    </div>
                  ) : uploadStatus === 'error' ? (
                    <div className="space-y-2">
                      <XCircle className="w-8 h-8 mx-auto text-red-600" />
                      <p className="text-sm text-red-600 font-medium">Erro no upload</p>
                      <p className="text-xs text-red-600">Clique para tentar novamente</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Clique para fazer upload ou arraste o arquivo</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF até 10MB</p>
                    </div>
                  )}
                </label>
                <Input 
                  id="file" 
                  type="file" 
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
                
                {/* Botão para remover arquivo */}
                {uploadStatus === 'success' && (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">Arquivo pronto para envio</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeFile}
                      className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                )}
                
                {/* Botão para tentar novamente em caso de erro */}
                {uploadStatus === 'error' && (
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-700">Erro no upload</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => selectedFile && handleFileUpload(selectedFile)}
                      className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Tentar Novamente
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Valor Total (R$) *</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    required
                    className="border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paid">Sinal Pago (R$)</Label>
                  <Input
                    id="paid"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="border-input"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const valueInput = document.getElementById("value") as HTMLInputElement;
                        const paidInput = document.getElementById("paid") as HTMLInputElement;
                        const value = Number(valueInput.value || 0);
                        paidInput.value = (value * 0.5).toFixed(2); // 50% de sinal
                      }}
                      className="text-xs"
                    >
                      50%
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const valueInput = document.getElementById("value") as HTMLInputElement;
                        const paidInput = document.getElementById("paid") as HTMLInputElement;
                        const value = Number(valueInput.value || 0);
                        paidInput.value = value.toFixed(2); // 100% pago
                      }}
                      className="text-xs"
                    >
                      100%
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery">Data de Entrega *</Label>
                  <Input
                    id="delivery"
                    type="date"
                    required
                    className="border-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qty">Quantidade</Label>
                  <Input id="qty" type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="color">Cor</Label>
                  <Input id="color" placeholder="Ex.: Preto, Azul..." value={color} onChange={(e) => setColor(e.target.value)} />
                </div>
              </div>

              {/* Controle de Kits e Tamanhos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Controle de Kits e Tamanhos</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsKitMode(!isKitMode)}
                    className="text-xs"
                  >
                    {isKitMode ? "Modo Simples" : "Modo Kit"}
                  </Button>
                </div>

                {isKitMode ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Ideal para uniformes e lotes com diferentes tamanhos
                    </p>
                    <div className="space-y-2">
                      {kitItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            placeholder="Tamanho (P, M, G, GG...)"
                            value={item.size}
                            onChange={(e) => updateKitSize(index, e.target.value)}
                            className="w-24"
                          />
                          <Input
                            type="number"
                            min="0"
                            placeholder="Qtd"
                            value={item.quantity}
                            onChange={(e) => updateKitQuantity(index, Number(e.target.value))}
                            className="w-20"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeKitSize(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addKitSize}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Tamanho
                      </Button>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium">
                        Total do Kit: {getTotalKitQuantity()} peças
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {kitItems.filter(item => item.quantity > 0).map(item => 
                          `${item.quantity} ${item.size}`
                        ).join(" | ")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Quantidade simples: {quantity} peça{quantity !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  type="submit"
                  disabled={isUploading}
                  className="bg-primary hover:bg-primary/90 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Aguardando Upload...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Pedido
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/pedidos")}
                  className="border-border"
                  disabled={isUploading}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}