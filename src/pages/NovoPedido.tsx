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
import { getProducts } from "@/integrations/supabase/products";
import { getMedidasByCliente } from "@/integrations/supabase/medidas";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useSync } from "@/contexts/SyncContext";
import { useSyncOperations } from "@/hooks/useSyncOperations";
import { validateName, validateMoney, validateDate, validateDescription, validateForm } from "@/utils/validators";
import { errorHandler } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { performanceMonitor } from "@/utils/performanceMonitor";
import { PersonalizationListEditor, PersonalizationEntry } from "@/components/PersonalizationListEditor";
import { ClientSearch } from "@/components/ClientSearch";
import { CLOTHING_SIZES } from "@/constants/sizes";

export default function NovoPedido() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const { syncAfterCreate } = useSyncOperations();

  // Buscar produtos do catálogo
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });
  
  // Estado para cliente
  const [clientName, setClientName] = useState<string>("");
  
  // Estados para medidas
  const [selectedMedida, setSelectedMedida] = useState<string>("");
  const [medidas, setMedidas] = useState<any[]>([]);
  const [buscandoMedidas, setBuscandoMedidas] = useState<boolean>(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [color, setColor] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [isKitMode, setIsKitMode] = useState<boolean>(false);
  const [kitItems, setKitItems] = useState<Array<{size: string, quantity: number}>>([
    { size: "P", quantity: 0 },
    { size: "M", quantity: 0 },
    { size: "G", quantity: 0 },
    { size: "GG", quantity: 0 }
  ]);
  const [personalizations, setPersonalizations] = useState<PersonalizationEntry[]>([]);
  
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
        setClientName(orderData.client || "");
        buscarMedidasCliente(orderData.client || "");
        const descriptionInput = document.getElementById("description") as HTMLTextAreaElement;
        const valueInput = document.getElementById("value") as HTMLInputElement;
        const paidInput = document.getElementById("paid") as HTMLInputElement;
        
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

  // Função para buscar medidas do cliente com debounce
  const buscarMedidasCliente = async (nomeCliente: string) => {
    if (!nomeCliente || nomeCliente.length < 3) {
      setMedidas([]);
      setBuscandoMedidas(false);
      return;
    }

    setBuscandoMedidas(true);

    try {
      console.log("Buscando medidas para cliente:", nomeCliente);
      
      // Buscar medidas que contenham o nome do cliente
      const { data: medidasEncontradas, error } = await supabase
        .from('atelie_medidas')
        .select('*')
        .ilike('cliente_nome', `%${nomeCliente}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erro ao buscar medidas:", error);
        setMedidas([]);
        return;
      }

      console.log("Medidas encontradas:", medidasEncontradas?.length || 0);
      setMedidas(medidasEncontradas || []);
    } catch (error) {
      console.error("Erro ao buscar medidas:", error);
      setMedidas([]);
    } finally {
      setBuscandoMedidas(false);
    }
  };

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
    
    const client = clientName;
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
        type: (value) => value && value.trim() !== "" ? { isValid: true, errors: [] } : { isValid: false, errors: ['Tipo do pedido é obrigatório'] },
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
    const file_url: string | undefined = uploadedFileUrl || undefined;

    // Montar descrição com informações do kit ou quantidade simples
    let finalDescription = description;
    
    // Adicionar informações do produto selecionado se for "Item do Catálogo"
    if (type === "catalogo" && selectedProduct) {
      const product = products.find(p => p.id === selectedProduct);
      if (product) {
        finalDescription = `${description}\nProduto: ${product.name} (R$ ${product.unit_price.toFixed(2)})`;
      }
    }
    
    if (isKitMode) {
      const kitInfo = kitItems
        .filter(item => item.quantity > 0)
        .map(item => `${item.quantity} ${item.size}`)
        .join(" | ");
      finalDescription = `${finalDescription}\nKit: ${kitInfo}\nTotal: ${getTotalKitQuantity()} peças${color ? ` | Cor: ${color}` : ""}`;
    } else {
      const sizeInfo = size ? ` | Tamanho: ${size}` : "";
      const colorInfo = color ? ` | Cor: ${color}` : "";
      finalDescription = `${finalDescription}\nQtd: ${quantity}${sizeInfo}${colorInfo}`;
    }

    if (personalizations.length) {
      const personalizationLines = personalizations
        .filter((p) => p.personName.trim())
        .map((p) => `- ${p.personName}${p.size ? ` (${p.size})` : ""}${p.quantity && p.quantity !== 1 ? ` x${p.quantity}` : ""}${p.notes ? ` — ${p.notes}` : ""}`)
        .join("\n");

      if (personalizationLines) {
        finalDescription = `${finalDescription}\nPersonalizações:\n${personalizationLines}`;
      }
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
          personalizations: personalizations
            .filter((p) => p.personName.trim())
            .map((p) => ({
              person_name: p.personName.trim(),
              size: p.size?.trim() || undefined,
              quantity: p.quantity ?? 1,
              notes: p.notes?.trim() || undefined,
            })),
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
      quantity: isKitMode ? getTotalKitQuantity() : quantity,
      personalizationCount: personalizations.length,
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
                <ClientSearch
                  value={clientName}
                  onChange={(value) => {
                    setClientName(value);
                    buscarMedidasCliente(value);
                  }}
                  placeholder="Nome do cliente"
                  required
                />

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Pedido *</Label>
      <Select value={type} onValueChange={(value) => {
        setType(value);
        if (value !== "catalogo") {
          setSelectedProduct("");
        }
      }} required>
                    <SelectTrigger className="border-input">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
        <SelectContent>
          <SelectItem value="bordado">Bordado Computadorizado</SelectItem>
          <SelectItem value="camiseta">Camiseta Personalizada</SelectItem>
          <SelectItem value="uniforme">Uniforme</SelectItem>
          <SelectItem value="personalizado">Personalizado</SelectItem>
          <SelectItem value="catalogo">Item do Catálogo</SelectItem>
          <SelectItem value="outro">Outro</SelectItem>
        </SelectContent>
                  </Select>
                </div>

                {/* Seletor de Catálogo - aparece quando escolher "Item do Catálogo" */}
                {type === "catalogo" && (
                  <div className="space-y-2">
                    <Label htmlFor="product">Produto do Catálogo</Label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger className="border-input">
                        <SelectValue placeholder="Selecione um produto do catálogo" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - R$ {product.unit_price.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedProduct && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {(() => {
                          const product = products.find(p => p.id === selectedProduct);
                          return product ? (
                            <div>
                              <p><strong>Nome:</strong> {product.name}</p>
                              <p><strong>Preço:</strong> R$ {product.unit_price.toFixed(2)}</p>
                              <p><strong>Tempo estimado:</strong> {product.work_hours}h</p>
                              <p><strong>Tipo:</strong> {product.type}</p>
                              {product.materials && product.materials.length > 0 && (
                                <p><strong>Materiais:</strong> {product.materials.join(", ")}</p>
                              )}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Seletor de Medidas */}
              <div className="space-y-2">
                <Label htmlFor="medidas">Medidas do Cliente</Label>
                {buscandoMedidas ? (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded border border-blue-200">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-blue-600">Buscando medidas...</span>
                  </div>
                ) : medidas.length > 0 ? (
                  <Select value={selectedMedida} onValueChange={setSelectedMedida}>
                    <SelectTrigger className="border-input">
                      <SelectValue placeholder="Selecione as medidas do cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {medidas.map((medida) => (
                        <SelectItem key={medida.id} value={medida.id}>
                          {medida.tipo_peca.toUpperCase()} - {medida.cliente_nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded border border-gray-200">
                    Nenhuma medida encontrada para este cliente. 
                    <br />
                    <span className="text-xs">Cadastre medidas na página "Medidas" primeiro.</span>
                  </div>
                )}
                {selectedMedida && medidas.length > 0 && (
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
                    {(() => {
                      const medida = medidas.find(m => m.id === selectedMedida);
                      return medida ? (
                        <div>
                          <p className="font-medium text-blue-800 mb-2">Medidas Selecionadas:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {medida.busto && <span><strong>Busto:</strong> {medida.busto}cm</span>}
                            {medida.cintura && <span><strong>Cintura:</strong> {medida.cintura}cm</span>}
                            {medida.quadril && <span><strong>Quadril:</strong> {medida.quadril}cm</span>}
                            {medida.ombro && <span><strong>Ombro:</strong> {medida.ombro}cm</span>}
                            {medida.coxa && <span><strong>Coxa:</strong> {medida.coxa}cm</span>}
                            {medida.comprimento && <span><strong>Comprimento:</strong> {medida.comprimento}cm</span>}
                          </div>
                          {medida.observacoes && (
                            <p className="mt-2 text-xs"><strong>Observações:</strong> {medida.observacoes}</p>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
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
                <div className="space-y-2">
                  <Label htmlFor="size">Tamanho</Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tamanho" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLOTHING_SIZES.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
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
                            placeholder="Tamanho (1 ano, 2 anos, P, M, G...)"
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

              <PersonalizationListEditor
                entries={personalizations}
                onChange={setPersonalizations}
                showNotes
                description="Liste as peças personalizadas com nome, tamanho e observações. Esses dados aparecem no pedido e podem ser reutilizados depois."
              />

              <div className="flex flex-col gap-3 pt-4 border-t border-border sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  disabled={isUploading}
                  className="bg-primary hover:bg-primary/90 flex-1 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
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
                  className="border-border w-full sm:w-auto"
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