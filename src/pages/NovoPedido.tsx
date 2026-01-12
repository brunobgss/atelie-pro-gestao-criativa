import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Upload, Save, Plus, Trash2, Copy, CheckCircle, XCircle, Wrench, Search, Check, ChevronsUpDown, Package, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createOrder, generateOrderCode } from "@/integrations/supabase/orders";
import { uploadOrderFile } from "@/integrations/supabase/storage";
import { getProducts } from "@/integrations/supabase/products";
import { getMedidasByCliente } from "@/integrations/supabase/medidas";
import { listServicos } from "@/integrations/supabase/servicos";
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
import { cn } from "@/lib/utils";

// Função auxiliar para gerar IDs únicos
const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

export default function NovoPedido() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const { syncAfterCreate } = useSyncOperations();

  // Estados para produtos (precisam estar antes do useMemo)
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [productSearchTerm, setProductSearchTerm] = useState<string>("");
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [addedCatalogProducts, setAddedCatalogProducts] = useState<Array<{ 
    id: string; 
    name: string; 
    price: number; 
    quantity: number;
    size?: string;
    color?: string;
  }>>([]);
  
  // Estados para serviços rápidos
  const [selectedServico, setSelectedServico] = useState<string>("");
  const [addedServices, setAddedServices] = useState<Array<{ id: string; name: string; price: number; quantity: number }>>([]);

  // Buscar produtos do catálogo
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
  const [totalValue, setTotalValue] = useState<number>(0);
  const valueInputRef = useRef<HTMLInputElement | null>(null);

  // Calcular valor total (useMemo para recalcular quando necessário)
  const calculatedTotal = useMemo(() => {
    let total = 0;
    
    // Somar produtos do catálogo
    if (addedCatalogProducts.length > 0) {
      const productsTotal = addedCatalogProducts.reduce((sum, product) => 
        sum + (product.price * product.quantity), 0
      );
      total += productsTotal;
      logger.debug(`📦 Produtos: ${addedCatalogProducts.length} item(ns) = R$ ${productsTotal.toFixed(2)}`);
    }
    
    // Somar serviços rápidos
    if (addedServices.length > 0) {
      const servicesTotal = addedServices.reduce((sum, service) => 
        sum + (service.price * service.quantity), 0
      );
      total += servicesTotal;
      logger.debug(`🔧 Serviços: ${addedServices.length} item(ns) = R$ ${servicesTotal.toFixed(2)}`);
    }
    
    return total;
  }, [addedCatalogProducts, addedServices]);

  // Atualizar estado do valor total
  useEffect(() => {
    // Só forçar o valor quando ele está sendo calculado automaticamente
    // (quando existem produtos/serviços adicionados). Assim evitamos sobrescrever
    // o valor digitado manualmente quando a lista está vazia.
    if (addedCatalogProducts.length > 0 || addedServices.length > 0) {
      setTotalValue(calculatedTotal);
    }
  }, [calculatedTotal]);

  // Mudar tipo automaticamente para "catalogo" quando um produto é selecionado
  useEffect(() => {
    if (selectedProduct && type !== "catalogo") {
      setType("catalogo");
      logger.debug(`🔄 Tipo alterado automaticamente para "catalogo" ao selecionar produto`);
    }
  }, [selectedProduct, type]);

  const [isKitMode, setIsKitMode] = useState<boolean>(false);
  const [kitItems, setKitItems] = useState<Array<{id: string, size: string, quantity: number}>>([
    { id: generateId(), size: "P", quantity: 0 },
    { id: generateId(), size: "M", quantity: 0 },
    { id: generateId(), size: "G", quantity: 0 },
    { id: generateId(), size: "GG", quantity: 0 }
  ]);
  const [personalizations, setPersonalizations] = useState<PersonalizationEntry[]>([]);
  const [separateLines, setSeparateLines] = useState<boolean>(false);
  
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
        const paidInput = document.getElementById("paid") as HTMLInputElement;
        
        if (descriptionInput) descriptionInput.value = orderData.description;
        if (typeof orderData.value === "number") setTotalValue(orderData.value);
        else if (orderData.value) setTotalValue(Number(orderData.value) || 0);
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
      const { data: medidasEncontradas, error } = await (supabase
        .from('atelie_medidas' as any)
        .select('*')
        .ilike('cliente_nome', `%${nomeCliente}%`)
        .order('created_at', { ascending: false }) as any);

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
    setKitItems([...kitItems, { id: generateId(), size: "", quantity: 0 }]);
  };

  const removeKitSize = (id: string) => {
    setKitItems(kitItems.filter((item) => item.id !== id));
  };

  const updateKitSize = (id: string, size: string) => {
    const updated = kitItems.map(item => 
      item.id === id ? { ...item, size } : item
    );
    setKitItems(updated);
  };

  const updateKitQuantity = (id: string, quantity: number) => {
    const updated = kitItems.map(item => 
      item.id === id ? { ...item, quantity } : item
    );
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
      
      // Aguardar o próximo frame de renderização para garantir que o DOM está estável
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Atualizar progresso e status de forma segura
      setUploadProgress(100);
      
      if (upload.ok && upload.url) {
        // Aguardar mais um frame antes de atualizar o status
        await new Promise(resolve => requestAnimationFrame(resolve));
        setUploadStatus('success');
        setUploadedFileUrl(upload.url);
        toast.success("Arquivo enviado com sucesso!");
        console.log("Upload realizado com sucesso:", upload.url);
      } else {
        // Aguardar mais um frame antes de atualizar o status
        await new Promise(resolve => requestAnimationFrame(resolve));
        setUploadStatus('error');
        toast.warning(upload.error || "Upload falhou - pedido será criado sem arquivo");
        console.log("Upload falhou:", upload.error);
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      // Aguardar frame antes de atualizar estado em caso de erro
      await new Promise(resolve => requestAnimationFrame(resolve));
      setUploadStatus('error');
      toast.error("Erro no upload do arquivo");
    } finally {
      // Aguardar frame antes de desabilitar upload
      await new Promise(resolve => requestAnimationFrame(resolve));
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
    // Capturar data de entrega e garantir que seja salva sem conversão de timezone
    const deliveryInput = document.getElementById("delivery") as HTMLInputElement;
    let delivery: string | undefined = undefined;
    if (deliveryInput?.value) {
      // Input type="date" retorna formato YYYY-MM-DD, usar diretamente sem conversão
      // Garantir que seja apenas a data (remover qualquer parte de hora/timezone se houver)
      const dateValue = deliveryInput.value;
      delivery = dateValue.split('T')[0]; // Pega apenas a parte da data (YYYY-MM-DD)
    }
    const code = generateOrderCode();

    // Validação de campos obrigatórios
    // Validação robusta
    // Se houver produtos do catálogo ou serviços adicionados, não validar quantidade (ela é controlada pelos produtos/serviços)
    const shouldValidateQuantity = addedCatalogProducts.length === 0 && addedServices.length === 0;
    
    // Garantir que quantity está disponível - capturar do estado
    const currentQuantity = typeof quantity !== 'undefined' ? quantity : 1;
    
    const validation = validateForm(
      { client, type, description, value, delivery, quantity: currentQuantity },
      {
        client: validateName,
        type: (value) => value && typeof value === 'string' && value.trim() !== "" ? { isValid: true, errors: [] } : { isValid: false, errors: ['Tipo do pedido é obrigatório'] },
        description: validateDescription,
        value: validateMoney,
        delivery: validateDate,
        quantity: (value) => {
          if (!shouldValidateQuantity) {
            // Se há produtos/serviços adicionados, quantidade não é obrigatória
            return { isValid: true, errors: [] };
          }
          return typeof value === 'number' && value > 0 ? { isValid: true, errors: [] } : { isValid: false, errors: ['Quantidade deve ser maior que zero'] };
        }
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
    
    // Se houver produtos adicionados do catálogo, usar suas informações
    if (addedCatalogProducts.length > 0) {
      // A descrição já foi montada ao adicionar os produtos
      // Apenas adicionar informações de tamanho/cor se houver
      const sizeInfo = size ? ` | Tamanho: ${size}` : "";
      const colorInfo = color ? ` | Cor: ${color}` : "";
      if (sizeInfo || colorInfo) {
        finalDescription = `${finalDescription}${sizeInfo}${colorInfo}`;
      }
    } else if (type === "catalogo" && selectedProduct) {
      // Fallback: adicionar informações do produto selecionado se não foi adicionado à lista
      const product = products.find(p => p.id === selectedProduct);
      if (product) {
        finalDescription = `${description}\nProduto: ${product.name} (R$ ${product.unit_price.toFixed(2)})`;
      }
    }
    
    // Adicionar informações de kit ou quantidade apenas se não houver produtos do catálogo
    if (addedCatalogProducts.length === 0) {
      if (isKitMode) {
        const kitInfo = kitItems
          .filter(item => item.quantity > 0)
          .map(item => `${item.quantity} ${item.size}`)
          .join(" | ");
        finalDescription = `${finalDescription}\nKit: ${kitInfo}\nTotal: ${getTotalKitQuantity()} peças${color ? ` | Cor: ${color}` : ""}`;
      } else {
        const sizeInfo = size ? ` | Tamanho: ${size}` : "";
        const colorInfo = color ? ` | Cor: ${color}` : "";
        const currentQuantity = typeof quantity !== 'undefined' ? quantity : 1;
        finalDescription = `${finalDescription}\nQtd: ${currentQuantity}${sizeInfo}${colorInfo}`;
      }
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

    // Determinar produtos e serviços para baixa automática de estoque
    let productsForInventory: Array<{ id: string; quantity: number }> | undefined = undefined;
    let servicesForInventory: Array<{ id: string; quantity: number }> | undefined = undefined;
    let finalType = type;
    
    // Se houver produtos adicionados do catálogo, forçar tipo como "catalogo" e processar todos
    if (addedCatalogProducts.length > 0) {
      finalType = "catalogo";
      // Processar todos os produtos adicionados com suas quantidades individuais
      productsForInventory = addedCatalogProducts.map(product => ({
        id: product.id,
        quantity: product.quantity
      }));
    } else if (type === "catalogo" && selectedProduct) {
      // Fallback: usar produto selecionado (caso não tenha clicado em "Adicionar")
      productsForInventory = [{
        id: selectedProduct,
        quantity: isKitMode ? getTotalKitQuantity() : (typeof quantity !== 'undefined' ? quantity : 1)
      }];
    }
    
    // Garantir que se há produtos para estoque, o tipo seja "catalogo"
    if (productsForInventory && productsForInventory.length > 0 && finalType !== "catalogo") {
      console.warn("⚠️ Produtos encontrados mas tipo não é 'catalogo'. Corrigindo...");
      finalType = "catalogo";
    }
    
    // Processar serviços adicionados para baixa de estoque
    if (addedServices.length > 0) {
      servicesForInventory = addedServices.map(service => ({
        id: service.id,
        quantity: service.quantity
      }));
    }

    // Medir performance e criar pedido
    let result;
    try {
      result = await performanceMonitor.measure(
      'createOrder',
      async () => {
        return await createOrder({
          code,
          customer_name: client,
          type: finalType,
          description: finalDescription,
          value,
          paid,
          delivery_date: delivery,
          file_url,
          observations: separateLines ? "__SEPARATE_LINES__" : undefined,
          products: productsForInventory, // Lista de produtos com quantidades
          services: servicesForInventory, // Lista de serviços com quantidades
          // Manter product_id e quantity para compatibilidade (deprecated)
          product_id: productsForInventory && productsForInventory.length > 0 ? productsForInventory[0].id : undefined,
          quantity: productsForInventory && productsForInventory.length > 0 ? productsForInventory[0].quantity : undefined,
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
    } catch (error) {
      console.error("❌ ERRO AO CHAMAR createOrder:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Erro ao criar pedido: ${errorMessage}`);
      return;
    }
    console.log("Resultado da criação do pedido:", result);
    
    if (!result.ok) {
      console.error("❌ ERRO AO CRIAR PEDIDO:", result.error);
      const appError = errorHandler.handleSupabaseError(
        { message: result.error, code: 'CREATE_ORDER_ERROR' },
        'createOrder'
      );
      logger.error('Falha ao criar pedido', 'NOVO_PEDIDO', { client, type, value, error: result.error });
      toast.error(appError.message);
      return;
    }

    // Se houve avisos de estoque (saldo negativo/baixo), armazenar para exibir na tela do pedido.
    if ((result as any).inventoryWarnings && Array.isArray((result as any).inventoryWarnings) && (result as any).inventoryWarnings.length > 0) {
      try {
        localStorage.setItem(
          `inventoryWarnings:${code}`,
          JSON.stringify((result as any).inventoryWarnings)
        );
      } catch {
        // Ignorar falha de storage
      }
    }
    
    // Log de sucesso
    logger.userAction('order_created', 'NOVO_PEDIDO', { 
      orderCode: code, 
      client, 
      type, 
      value, 
      quantity: isKitMode ? getTotalKitQuantity() : (typeof quantity !== 'undefined' ? quantity : 1),
      personalizationCount: personalizations.length,
    });
    
    // Navegar imediatamente sem atualizações de estado para evitar erros de removeChild
    // As invalidações serão feitas na página de destino
    const targetUrl = `/pedidos/${code}`;
    
    console.log("Pedido criado com sucesso! Redirecionando para:", targetUrl);
    
    // Exibir toast e navegar imediatamente sem esperar atualizações de estado
    toast.success("Pedido criado com sucesso!", {
      duration: 2000,
    });
    
    // Proteção contra erros de removeChild: usar window.location.replace
    // que não adiciona entrada no histórico e força limpeza completa
    // Além disso, envolver em try-catch silencioso para ignorar erros de DOM
    try {
      // Fechar modais de forma síncrona antes de navegar
      setProductPopoverOpen(false);
      setQuantityModalOpen(false);
    } catch (e) {
      // Ignorar erros ao fechar modais
    }
    
    // Usar window.location.replace em vez de href para evitar problemas com histórico
    // e garantir limpeza completa do estado React
    // Adicionar pequeno delay para garantir que toast seja processado
    setTimeout(() => {
      try {
        window.location.replace(targetUrl);
      } catch (error) {
        // Se ainda houver erro, tentar href como fallback
        console.warn('Erro ao usar replace, tentando href:', error);
        window.location.href = targetUrl;
      }
    }, 100);
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
      }} required disabled={isUploading}>
                    <SelectTrigger className="border-input" disabled={isUploading}>
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

                {/* Seletor de Catálogo removido - agora usamos a seção "Adicionar do Catálogo" sempre visível */}
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
                  <Select value={selectedMedida} onValueChange={setSelectedMedida} disabled={isUploading}>
                    <SelectTrigger className="border-input" disabled={isUploading}>
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

              {/* Seletor de Serviços */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="w-4 h-4 text-green-600" />
                  <Label className="text-green-800 font-medium">Adicionar Serviço Rápido</Label>
                </div>
                <div className="space-y-3">
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
                          const descriptionInput = document.getElementById("description") as HTMLTextAreaElement;
                          
                          if (descriptionInput) {
                            const currentDesc = descriptionInput.value;
                            const servicoLine = `${servico.nome}${servico.descricao ? ` - ${servico.descricao}` : ""} | Qtd: 1`;
                            descriptionInput.value = currentDesc 
                              ? `${currentDesc}\n${servicoLine}`
                              : servicoLine;
                          }
                          
                          // Adicionar à lista de serviços com quantidade padrão 1
                          setAddedServices(prev => [...prev, {
                            id: servico.id,
                            name: servico.nome,
                            price: servico.preco_padrao || 0,
                            quantity: 1
                          }]);
                          
                          // O useEffect vai atualizar o valor total automaticamente
                          
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
                  
                  {/* Lista de serviços adicionados */}
                  {addedServices.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <Label className="text-sm text-green-700 font-medium">Serviços adicionados:</Label>
                      <div className="space-y-2">
                        {addedServices.map((addedService, index) => {
                          const servico = servicos.find(s => s.id === addedService.id);
                          return (
                            <div
                              key={`${addedService.id}-${index}`}
                              className="flex items-center justify-between gap-3 p-2 bg-white border border-green-200 rounded-md"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{addedService.name}</p>
                                <p className="text-xs text-gray-500">
                                  R$ {addedService.price.toFixed(2).replace(".", ",")}
                                  {servico?.categoria && ` • ${servico.categoria}`}
                                </p>
                              </div>
                              
                              {/* Campo de quantidade individual */}
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`serv-qty-${index}`} className="text-xs text-gray-600 whitespace-nowrap">
                                  Qtd:
                                </Label>
                                <Input
                                  id={`serv-qty-${index}`}
                                  type="number"
                                  min="1"
                                  value={addedService.quantity}
                                  onChange={(e) => {
                                    const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
                                    setAddedServices(prev => prev.map((s, i) => 
                                      i === index ? { ...s, quantity: newQuantity } : s
                                    ));
                                    
                                    // Atualizar quantidade na descrição
                                    const descriptionInput = document.getElementById("description") as HTMLTextAreaElement;
                                    if (descriptionInput) {
                                      const lines = descriptionInput.value.split('\n');
                                      const updatedLines = lines.map(line => {
                                        if (line.includes(addedService.name)) {
                                          return line.replace(/Qtd: \d+/, `Qtd: ${newQuantity}`);
                                        }
                                        return line;
                                      });
                                      descriptionInput.value = updatedLines.join('\n');
                                    }
                                  }}
                                  className="w-16 h-8 text-sm"
                                />
                              </div>
                              
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setAddedServices(prev => prev.filter((s, i) => i !== index));
                                  
                                  // Remover da descrição
                                  const descriptionInput = document.getElementById("description") as HTMLTextAreaElement;
                                  if (descriptionInput) {
                                    descriptionInput.value = descriptionInput.value
                                      .split('\n')
                                      .filter(line => !line.includes(addedService.name))
                                      .join('\n')
                                      .trim();
                                  }
                                  
                                  // O useEffect vai recalcular o valor total automaticamente
                                  toast.info("Serviço removido");
                                }}
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Remover serviço"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {servicos.length === 0 && (
                  <p className="text-xs text-green-700 mt-2">
                    Nenhum serviço cadastrado. <a href="/servicos" className="underline">Cadastre serviços aqui</a>
                  </p>
                )}
              </div>

              {/* Seletor de Catálogo - Sempre visível */}
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
                          disabled={isUploading}
                        >
                          {selectedProduct
                            ? products.find((product) => product.id === selectedProduct)?.name || "Selecione um produto"
                            : "Selecione um produto do catálogo"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      {selectedProduct && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct("");
                            setProductSearchTerm("");
                            toast.info("Seleção removida");
                          }}
                          disabled={isUploading}
                          className="shrink-0"
                          title="Remover seleção"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
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
                                    // Valor só será somado quando o usuário clicar em "Adicionar"
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
                      onClick={() => {
                        if (!selectedProduct) {
                          toast.error("Selecione um produto");
                          return;
                        }
                        const product = products.find(p => p.id === selectedProduct);
                        if (product) {
                          const descriptionInput = document.getElementById("description") as HTMLTextAreaElement;
                          const valueInput = document.getElementById("value") as HTMLInputElement;
                          
                          if (descriptionInput) {
                            const currentDesc = descriptionInput.value;
                            const sizeInfo = "Não aplicável"; // Será atualizado quando o usuário mudar
                            const productLine = `${product.name}${product.type ? ` - ${product.type}` : ""}${product.materials && product.materials.length > 0 ? ` (${product.materials.join(", ")})` : ""} | Qtd: 1${sizeInfo !== "Não aplicável" ? ` | Tamanho: ${sizeInfo}` : ""}`;
                            descriptionInput.value = currentDesc 
                              ? `${currentDesc}\n${productLine}`
                              : productLine;
                          }
                          
                          // Adicionar à lista de produtos do catálogo com quantidade padrão 1
                          setAddedCatalogProducts(prev => [...prev, {
                            id: product.id,
                            name: product.name,
                            price: product.unit_price,
                            quantity: 1, // Quantidade padrão ao adicionar
                            size: "Não aplicável", // Tamanho padrão
                            color: "" // Cor vazia por padrão
                          }]);
                          
                          // O useEffect vai atualizar o valor total automaticamente
                          
                          // Definir tipo como "catalogo" quando adicionar produto do catálogo
                          setType("catalogo");
                          
                          setSelectedProduct("");
                          toast.success("Produto adicionado!");
                        }
                      }}
                      disabled={!selectedProduct || isUploading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                  {/* Lista de produtos adicionados do catálogo */}
                  {addedCatalogProducts.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <Label className="text-sm text-blue-700 font-medium">Produtos adicionados:</Label>
                      <div className="space-y-2">
                        {addedCatalogProducts.map((addedProduct, index) => {
                          const product = products.find(p => p.id === addedProduct.id);
                          const updateDescription = (updates: Partial<typeof addedProduct>) => {
                            const descriptionInput = document.getElementById("description") as HTMLTextAreaElement;
                            if (descriptionInput) {
                              const lines = descriptionInput.value.split('\n');
                              const updatedLines = lines.map(line => {
                                if (line.includes(addedProduct.name)) {
                                  let newLine = line;
                                  // Atualizar quantidade
                                  if (updates.quantity !== undefined) {
                                    newLine = newLine.replace(/Qtd: \d+/, `Qtd: ${updates.quantity}`);
                                  }
                                  // Atualizar tamanho
                                  if (updates.size !== undefined) {
                                    if (updates.size === "Não aplicável") {
                                      newLine = newLine.replace(/\s*\|\s*Tamanho: [^|]+/g, '');
                                    } else {
                                      if (newLine.includes('| Tamanho:')) {
                                        newLine = newLine.replace(/\|\s*Tamanho: [^|]+/, `| Tamanho: ${updates.size}`);
                                      } else {
                                        newLine = newLine.replace(/(\| Qtd: \d+)/, `$1 | Tamanho: ${updates.size}`);
                                      }
                                    }
                                  }
                                  // Atualizar cor
                                  if (updates.color !== undefined) {
                                    if (!updates.color || updates.color.trim() === "") {
                                      newLine = newLine.replace(/\s*\|\s*Cor: [^|]+/g, '');
                                    } else {
                                      if (newLine.includes('| Cor:')) {
                                        newLine = newLine.replace(/\|\s*Cor: [^|]+/, `| Cor: ${updates.color}`);
                                      } else {
                                        newLine = newLine + ` | Cor: ${updates.color}`;
                                      }
                                    }
                                  }
                                  return newLine;
                                }
                                return line;
                              });
                              descriptionInput.value = updatedLines.join('\n');
                            }
                          };
                          
                          return (
                            <div
                              key={`${addedProduct.id}-${index}`}
                              className="p-3 bg-white border border-blue-200 rounded-md space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{addedProduct.name}</p>
                                  <p className="text-xs text-gray-500">
                                    R$ {addedProduct.price.toFixed(2).replace(".", ",")}
                                    {product?.type && ` • ${product.type}`}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    // Remover da lista
                                    setAddedCatalogProducts(prev => prev.filter((p, i) => i !== index));
                                    
                                    // Remover da descrição
                                    const descriptionInput = document.getElementById("description") as HTMLTextAreaElement;
                                    if (descriptionInput) {
                                      descriptionInput.value = descriptionInput.value
                                        .split('\n')
                                        .filter(line => !line.includes(addedProduct.name))
                                        .join('\n')
                                        .trim();
                                    }
                                    
                                    // O useEffect vai recalcular o valor total automaticamente
                                    toast.info("Produto removido");
                                  }}
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Remover produto"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              {/* Campos de quantidade, tamanho e cor */}
                              <div className="grid grid-cols-3 gap-2">
                                {/* Quantidade */}
                                <div className="space-y-1">
                                  <Label htmlFor={`qty-${index}`} className="text-xs text-gray-600">
                                    Qtd:
                                  </Label>
                                  <Input
                                    id={`qty-${index}`}
                                    type="number"
                                    min="1"
                                    value={addedProduct.quantity}
                                    onChange={(e) => {
                                      const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
                                      setAddedCatalogProducts(prev => prev.map((p, i) => 
                                        i === index ? { ...p, quantity: newQuantity } : p
                                      ));
                                      updateDescription({ quantity: newQuantity });
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                
                                {/* Tamanho */}
                                <div className="space-y-1">
                                  <Label htmlFor={`size-${index}`} className="text-xs text-gray-600">
                                    Tamanho:
                                  </Label>
                                  <Select
                                    value={addedProduct.size || "Não aplicável"}
                                    onValueChange={(newSize) => {
                                      setAddedCatalogProducts(prev => prev.map((p, i) => 
                                        i === index ? { ...p, size: newSize } : p
                                      ));
                                      updateDescription({ size: newSize });
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue />
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
                                
                                {/* Cor */}
                                <div className="space-y-1">
                                  <Label htmlFor={`color-${index}`} className="text-xs text-gray-600">
                                    Cor:
                                  </Label>
                                  <Input
                                    id={`color-${index}`}
                                    type="text"
                                    placeholder="Ex: Preto, Azul..."
                                    value={addedProduct.color || ""}
                                    onChange={(e) => {
                                      const newColor = e.target.value;
                                      setAddedCatalogProducts(prev => prev.map((p, i) => 
                                        i === index ? { ...p, color: newColor } : p
                                      ));
                                      updateDescription({ color: newColor });
                                    }}
                                    className="h-8 text-sm"
                                    disabled={addedProduct.size === "Não aplicável"}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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

              <div className="space-y-2">
                <Label htmlFor="description">Descrição do Pedido *</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva os detalhes do pedido..."
                  rows={4}
                  required
                  className="border-input resize-none"
                />
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id="separateLines"
                    checked={separateLines}
                    onCheckedChange={(checked) => setSeparateLines(checked === true)}
                  />
                  <Label
                    htmlFor="separateLines"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Separar descrição em linhas (cada linha vira um item separado)
                  </Label>
                </div>
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
                    ref={valueInputRef}
                    id="value"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    required
                    className="border-input"
                    readOnly={addedCatalogProducts.length > 0 || addedServices.length > 0}
                    value={totalValue.toFixed(2)}
                    onChange={(e) => {
                      if (!(addedCatalogProducts.length > 0 || addedServices.length > 0)) {
                        setTotalValue(Number(e.target.value) || 0);
                      }
                    }}
                  />
                  {(addedCatalogProducts.length > 0 || addedServices.length > 0) && (
                    <p className="text-xs text-muted-foreground">
                      Valor calculado automaticamente
                    </p>
                  )}
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
                  <Input 
                    id="qty" 
                    type="number" 
                    min="1" 
                    value={quantity} 
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    disabled={addedCatalogProducts.length > 0 || addedServices.length > 0}
                    title={addedCatalogProducts.length > 0 ? "Quantidade controlada pelos produtos do catálogo" : addedServices.length > 0 ? "Quantidade controlada pelos serviços rápidos" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="size">Tamanho</Label>
                  <Select value={size} onValueChange={setSize} disabled={isUploading}>
                    <SelectTrigger disabled={isUploading}>
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
                      {kitItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <Input
                            placeholder="Tamanho (1 ano, 2 anos, P, M, G...)"
                            value={item.size}
                            onChange={(e) => updateKitSize(item.id, e.target.value)}
                            className="w-24"
                          />
                          <Input
                            type="number"
                            min="0"
                            placeholder="Qtd"
                            value={item.quantity}
                            onChange={(e) => updateKitQuantity(item.id, Number(e.target.value))}
                            className="w-20"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeKitSize(item.id)}
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