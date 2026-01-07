import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Save, Share2, Plus, Trash2, MessageCircle, Printer, Package, Upload, CheckCircle, XCircle, Wrench, Search, Check, ChevronsUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { createQuote, generateQuoteCode } from "@/integrations/supabase/quotes";
import { getProducts } from "@/integrations/supabase/products";
import { listServicos } from "@/integrations/supabase/servicos";
import { useAuth } from "@/components/AuthProvider";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useSync } from "@/contexts/SyncContext";
import { useSyncOperations } from "@/hooks/useSyncOperations";
import { validateName, validateMoney, validateDescription, validateForm } from "@/utils/validators";
import { errorHandler } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { performanceMonitor } from "@/utils/performanceMonitor";
import { ClientSearch } from "@/components/ClientSearch";
import { PersonalizationListEditor, PersonalizationEntry } from "@/components/PersonalizationListEditor";
import { supabase } from "@/integrations/supabase/client";
import { uploadOrderFile } from "@/integrations/supabase/storage";
import { CLOTHING_SIZES } from "@/constants/sizes";
import { cn } from "@/lib/utils";

export default function NovoOrcamento() {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const { syncAfterCreate } = useSyncOperations();
  const [items, setItems] = useState([{ description: "", quantity: 1, value: 0 }]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedServico, setSelectedServico] = useState<string>("");
  const [productSearchTerm, setProductSearchTerm] = useState<string>("");
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [personalizations, setPersonalizations] = useState<PersonalizationEntry[]>([]);
  
  // Novos estados para campos do pedido
  const [type, setType] = useState<string>("");
  const [selectedMedida, setSelectedMedida] = useState<string>("");
  const [medidas, setMedidas] = useState<any[]>([]);
  const [buscandoMedidas, setBuscandoMedidas] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [isKitMode, setIsKitMode] = useState<boolean>(false);
  const [kitItems, setKitItems] = useState<Array<{size: string, quantity: number}>>([
    { size: "P", quantity: 0 },
    { size: "M", quantity: 0 },
    { size: "G", quantity: 0 },
    { size: "GG", quantity: 0 }
  ]);
  const [size, setSize] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  // Query para buscar produtos do catálogo
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  // Normalizar texto para busca (remove acentos, espaços extras, caixa)
  const normalizeSearch = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();

  // Filtrar produtos baseado no termo de busca
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) {
      return products;
    }

    const search = normalizeSearch(productSearchTerm);
    if (!search) return products;

    const searchWords = search.split(" ");

    return products.filter((product) => {
      const base = [
        product.name,
        product.type || "",
        ...(Array.isArray(product.materials) ? product.materials : []),
      ]
        .join(" ")
        .toString();

      const normalizedProduct = normalizeSearch(base);

      // Cada palavra digitada deve existir em alguma parte do texto do produto
      return searchWords.every((word) => normalizedProduct.includes(word));
    });
  }, [products, productSearchTerm]);

  // Buscar serviços
  const { data: servicos = [] } = useQuery({
    queryKey: ["servicos"],
    queryFn: () => listServicos({ ativo: true }),
  });

  // Função para buscar medidas do cliente
  const buscarMedidasCliente = async (nomeCliente: string) => {
    if (!nomeCliente || nomeCliente.length < 3) {
      setMedidas([]);
      setBuscandoMedidas(false);
      return;
    }

    setBuscandoMedidas(true);

    try {
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

      setMedidas(medidasEncontradas || []);
    } catch (error) {
      console.error("Erro ao buscar medidas:", error);
      setMedidas([]);
    } finally {
      setBuscandoMedidas(false);
    }
  };

  // Funções do Modo Kit
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

  // Funções de Upload de Arquivo
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');
    setUploadedFileUrl(null);
    
    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 200);
      
      const code = generateQuoteCode();
      const upload = await uploadOrderFile(file, code);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (upload.ok && upload.url) {
        setUploadStatus('success');
        setUploadedFileUrl(upload.url);
        toast.success("Arquivo enviado com sucesso!");
      } else {
        setUploadStatus('error');
        toast.warning(upload.error || "Upload falhou - orçamento será criado sem arquivo");
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
    
    const dateInput = (document.getElementById("date") as HTMLInputElement)?.value || new Date().toISOString().split('T')[0];
    const deliveryDateInput = (document.getElementById("deliveryDate") as HTMLInputElement)?.value;
    const observations = (document.getElementById("observations") as HTMLTextAreaElement)?.value || undefined;
    const code = generateQuoteCode();
    
    // Montar observações com informações adicionais
    let observationsText = observations || '';
    if (type) {
      observationsText += (observationsText ? '\n' : '') + `Tipo: ${type}`;
    }
    if (size) {
      observationsText += (observationsText ? '\n' : '') + `Tamanho: ${size}`;
    }
    if (color) {
      observationsText += (observationsText ? '\n' : '') + `Cor: ${color}`;
    }
    if (quantity > 1) {
      observationsText += (observationsText ? '\n' : '') + `Quantidade: ${quantity}`;
    }
    if (isKitMode && getTotalKitQuantity() > 0) {
      const kitInfo = kitItems
        .filter(item => item.quantity > 0)
        .map(item => `${item.quantity} ${item.size}`)
        .join(', ');
      if (kitInfo) {
        observationsText += (observationsText ? '\n' : '') + `Kit: ${kitInfo}`;
      }
    }
    if (deliveryDateInput) {
      observationsText += (observationsText ? '\n' : '') + `Data de entrega estimada: ${new Date(deliveryDateInput).toLocaleDateString('pt-BR')}`;
    }
    if (uploadedFileUrl) {
      observationsText += (observationsText ? '\n' : '') + `Arquivo/Arte: ${uploadedFileUrl}`;
    }

    // Validação de campos obrigatórios
    // Validação robusta
    const validation = validateForm(
      { client: clientName, items },
      {
        client: validateName,
        items: (items) => {
          if (!Array.isArray(items) || items.length === 0) {
            return { isValid: false, errors: ['Adicione pelo menos um item ao orçamento'] };
          }
          
          const errors: string[] = [];
          items.forEach((item, index) => {
            if (!item.description?.trim()) {
              errors.push(`Item ${index + 1}: Descrição é obrigatória`);
            }
            if (!item.quantity || item.quantity <= 0) {
              errors.push(`Item ${index + 1}: Quantidade deve ser maior que zero`);
            }
            if (!item.value || item.value <= 0) {
              errors.push(`Item ${index + 1}: Valor deve ser maior que zero`);
            }
          });
          
          return { isValid: errors.length === 0, errors };
        }
      }
    );
    
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    // Medir performance e criar orçamento
    const result = await performanceMonitor.measure(
      'createQuote',
      async () => {
        return await createQuote({
          code,
          customer_name: clientName,
          customer_phone: clientPhone,
          date: dateInput,
          observations: observationsText || undefined,
          items,
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
      'NovoOrcamento'
    );

    if (!result.ok) {
      const appError = errorHandler.handleSupabaseError(
        { message: result.error, code: 'CREATE_QUOTE_ERROR' },
        'createQuote'
      );
      logger.error('Falha ao criar orçamento', 'NOVO_ORCAMENTO', { client: clientName, itemsCount: items.length, error: result.error });
      toast.error(appError.message);
      return;
    }
    
    // Log de sucesso
    logger.userAction('quote_created', 'NOVO_ORCAMENTO', { 
      quoteCode: code, 
      client: clientName, 
      itemsCount: items.length, 
      totalValue: items.reduce((sum, item) => sum + (item.quantity * item.value), 0),
      personalizationCount: personalizations.length,
    });

    toast.success("Orçamento criado com sucesso!");
    // Sincronização automática
    syncAfterCreate('quotes', result.data);
    invalidateRelated('quotes');
    
    // Fechar qualquer modal/popover aberto antes de navegar
    setProductPopoverOpen(false);
    setQuantityModalOpen(false);
    setWhatsappModalOpen(false);
    
    // Usar setTimeout para garantir que o DOM esteja pronto antes de navegar
    // Isso evita erros de removeChild durante a navegação
    setTimeout(() => {
      navigate(`/orcamento/${code}`);
    }, 100);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, value: 0 }]);
  };

  // Função para abrir modal de quantidade
  const openQuantityModal = () => {
    if (!selectedProduct) {
      toast.error("Selecione um produto do catálogo");
      return;
    }
    setQuantityModalOpen(true);
  };

  // Função para adicionar item do catálogo com quantidade
  const addCatalogItemWithQuantity = () => {
    const product = products.find(p => p.id === selectedProduct);
    if (!product) {
      toast.error("Produto não encontrado");
      return;
    }

    const newItem = {
      description: `${product.name} - ${product.type}`,
      quantity: selectedQuantity,
      value: product.unit_price
    };

    setItems([...items, newItem]);
    setSelectedProduct(""); // Limpar seleção
    setQuantityModalOpen(false);
    setSelectedQuantity(1); // Reset quantidade
    toast.success("Produto adicionado ao orçamento!");
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + item.quantity * item.value, 0);

  const handleOpenPublic = () => {
    const code = generateQuoteCode();
    window.open(`${window.location.origin}/orcamento/${code}`, "_blank");
  };

  const generateDefaultMessage = () => {
    return `Olá ${clientName}! 

Segue o seu orçamento do ${empresa?.nome || 'Ateliê'}:

${items.map((item, index) => 
  `${index + 1}. ${item.description} - Qtd: ${item.quantity} - R$ ${item.value.toFixed(2)}`
).join('\n')}

*Total: R$ ${total.toFixed(2)}*

Aguardo seu retorno! 😊`;
  };

  const handleWhatsApp = () => {
    setCustomMessage(generateDefaultMessage());
    setWhatsappModalOpen(true);
  };

  const sendWhatsAppMessage = () => {
    const message = encodeURIComponent(customMessage);
    window.open(`https://wa.me/?text=${message}`, "_blank");
    setWhatsappModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4">
          <SidebarTrigger />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/orcamentos")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Novo Orçamento</h1>
            <p className="text-sm text-muted-foreground">Crie um orçamento rápido</p>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <Card className="border-border animate-fade-in">
            <CardHeader>
              <CardTitle className="text-foreground">Informações do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ClientSearch
                  value={clientName}
                  onChange={(value) => {
                    setClientName(value);
                    buscarMedidasCliente(value);
                  }}
                  onPhoneChange={setClientPhone}
                  placeholder="Nome do cliente"
                  required
                />

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="border-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data do Orçamento</Label>
                  <Input
                    id="date"
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">Data de Entrega Estimada</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    className="border-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Pedido</Label>
                <Select value={type} onValueChange={(value) => {
                  setType(value);
                  if (value !== "catalogo") {
                    setSelectedProduct("");
                  }
                }}>
                  <SelectTrigger className="border-input">
                    <SelectValue placeholder="Selecione o tipo (opcional)" />
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
                      <SelectValue placeholder="Selecione as medidas do cliente (opcional)" />
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

              {/* Upload de Arquivo */}
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
                
                {uploadStatus === 'success' && (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">Arquivo pronto</span>
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

              {/* Campos de Tamanho, Cor e Quantidade */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qty">Quantidade</Label>
                  <Input 
                    id="qty" 
                    type="number" 
                    min="1" 
                    value={quantity} 
                    onChange={(e) => setQuantity(Number(e.target.value))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="size">Tamanho</Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tamanho" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLOTHING_SIZES.map((sizeOption) => (
                        <SelectItem key={sizeOption.value} value={sizeOption.value}>
                          {sizeOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Cor</Label>
                  <Input 
                    id="color" 
                    placeholder="Ex.: Preto, Azul..." 
                    value={color} 
                    onChange={(e) => setColor(e.target.value)} 
                  />
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

                {isKitMode && (
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
                )}
              </div>

              {/* Seletor de Serviços */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="w-4 h-4 text-green-600" />
                  <Label className="text-green-800 font-medium">Adicionar Serviço Rápido</Label>
                </div>
                <div className="flex gap-3">
                  <Select value={selectedServico} onValueChange={setSelectedServico}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um serviço pré-cadastrado" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicos.map((servico) => (
                        <SelectItem key={servico.id} value={servico.id}>
                          {servico.nome}
                          {servico.preco_padrao > 0 && ` - R$ ${servico.preco_padrao.toFixed(2)}`}
                          {servico.categoria && ` (${servico.categoria})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!selectedServico) {
                        toast.error("Selecione um serviço");
                        return;
                      }
                      const servico = servicos.find(s => s.id === selectedServico);
                      if (servico) {
                        // Adicionar serviço como um novo item no orçamento
                        const newItem = {
                          description: servico.nome + (servico.descricao ? ` - ${servico.descricao}` : ""),
                          quantity: 1,
                          value: servico.preco_padrao || 0
                        };
                        setItems([...items, newItem]);
                        
                        // Só definir tipo como "outro" se o usuário ainda não tiver selecionado um tipo
                        if (!type || type.trim() === "") {
                          setType("outro");
                        }
                        toast.success(`Serviço "${servico.nome}" adicionado!`);
                        setSelectedServico("");
                      }
                    }}
                    disabled={!selectedServico}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
                {servicos.length === 0 && (
                  <p className="text-xs text-green-700 mt-2">
                    Nenhum serviço cadastrado. <a href="/servicos" className="underline">Cadastre serviços aqui</a>
                  </p>
                )}
              </div>

              {/* Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Itens do Orçamento</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addItem}
                      className="border-secondary text-secondary"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </div>
                </div>

                {/* Seletor de Catálogo */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-blue-600" />
                    <Label className="text-blue-800 font-medium">Adicionar do Catálogo</Label>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={productPopoverOpen}
                            className="flex-1 justify-between"
                          >
                            {selectedProduct
                              ? products.find((product) => product.id === selectedProduct)?.name || "Selecione um produto"
                              : "Selecione um produto do catálogo"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Pesquisar produto por nome, tipo ou material..." 
                              value={productSearchTerm}
                              onValueChange={setProductSearchTerm}
                            />
                            <CommandList>
                              <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                              <CommandGroup>
                                {filteredProducts.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={`${product.name} ${product.type || ""} ${product.materials?.join(" ") || ""}`}
                                    onSelect={() => {
                                      setSelectedProduct(product.id);
                                      setProductPopoverOpen(false);
                                      setProductSearchTerm("");
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedProduct === product.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">{product.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        R$ {product.unit_price.toFixed(2)}
                                        {product.type && ` • ${product.type}`}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Button
                        type="button"
                        onClick={openQuantityModal}
                        disabled={!selectedProduct}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                  {selectedProduct && (
                    <div className="mt-3 text-sm text-blue-700 bg-blue-100 p-2 rounded">
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

                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 p-4 rounded-lg border border-border">
                    <div className="col-span-12 md:col-span-5">
                      <Input
                        placeholder="Descrição do item"
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].description = e.target.value;
                          setItems(newItems);
                        }}
                        className="border-input"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <Input
                        type="number"
                        placeholder="Qtd"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].quantity = Number(e.target.value);
                          setItems(newItems);
                        }}
                        className="border-input"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <div className="space-y-1">
                        <Input
                          type="number"
                          placeholder="Valor unitário"
                          step="0.01"
                          min="0"
                          value={item.value}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index].value = Number(e.target.value);
                            setItems(newItems);
                          }}
                          className="border-input"
                        />
                        <p className="text-xs text-muted-foreground">
                          Valor por unidade (ex: 25.50)
                        </p>
                      </div>
                    </div>
                    {items.length > 1 && (
                      <div className="col-span-12 md:col-span-1 flex items-center justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                <PersonalizationListEditor
                  entries={personalizations}
                  onChange={setPersonalizations}
                  description="Registre cada peça personalizada com nome e tamanho. Esses dados ficam salvos no orçamento e podem ser reaproveitados no pedido."
                />

                <div className="flex justify-end p-4 bg-muted/30 rounded-lg">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold text-foreground">
                      R$ {total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  placeholder="Observações adicionais..."
                  rows={3}
                  className="border-input resize-none"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-4 border-t border-border sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground w-full sm:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Orçamento
                </Button>
                <div className="space-y-3 w-full sm:w-auto">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-amber-600 text-xs font-bold">!</span>
                      </div>
                      <p className="text-amber-800 text-sm font-medium">
                        Atenção: Salve o orçamento antes de clicar no botão WhatsApp
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-secondary text-secondary w-full sm:w-auto"
                      onClick={handleOpenPublic}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Visualizar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-border w-full sm:w-auto"
                      onClick={() => window.print()}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimir
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-green-600 text-green-600 hover:bg-green-600/10 w-full sm:w-auto"
                      onClick={handleWhatsApp}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/orcamentos")}
                  className="border-border w-full sm:w-auto"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Modal de Quantidade */}
        <Dialog open={quantityModalOpen} onOpenChange={setQuantityModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Definir Quantidade</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedProduct && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Produto selecionado:</p>
                  <p className="font-medium">
                    {products.find(p => p.id === selectedProduct)?.name} - 
                    {products.find(p => p.id === selectedProduct)?.type}
                  </p>
                  <p className="text-sm text-gray-500">
                    Preço: R$ {products.find(p => p.id === selectedProduct)?.unit_price?.toFixed(2)}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={selectedQuantity}
                  onChange={(e) => setSelectedQuantity(Number(e.target.value))}
                  placeholder="Digite a quantidade"
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setQuantityModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={addCatalogItemWithQuantity}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Adicionar ao Orçamento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal do WhatsApp */}
        <Dialog open={whatsappModalOpen} onOpenChange={setWhatsappModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Personalizar Mensagem do WhatsApp</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-message">Mensagem</Label>
                <Textarea
                  id="whatsapp-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Digite sua mensagem personalizada..."
                  rows={8}
                  className="resize-none"
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setWhatsappModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => setCustomMessage(generateDefaultMessage())}
                  variant="outline"
                >
                  Usar Modelo Padrão
                </Button>
                <Button
                  onClick={sendWhatsAppMessage}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar WhatsApp
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
