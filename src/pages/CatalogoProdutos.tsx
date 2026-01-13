import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Plus, Edit, Trash2, Copy, Search, Filter, Clock, Layers, Upload, X, Image as ImageIcon, Link2, Download, HelpCircle, PackageSearch } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/integrations/supabase/products";
import { createInventoryItem } from "@/integrations/supabase/inventory";
import { supabase } from "@/integrations/supabase/client";
import { uploadProductImage } from "@/integrations/supabase/storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DialogVariacoesProduto } from "@/components/DialogVariacoesProduto";
import { DialogVinculosEstoque } from "@/components/DialogVinculosEstoque";
import { DialogVinculosEstoqueMassa } from "@/components/DialogVinculosEstoqueMassa";
import { ImportProducts } from "@/components/ImportProducts";
import { useSync } from "@/contexts/SyncContext";
import { useSyncOperations } from "@/hooks/useSyncOperations";
import { useInternationalization } from "@/contexts/InternationalizationContext";
import { validateName, validateMoney, validateDescription, validateForm } from "@/utils/validators";
import { errorHandler } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { performanceMonitor } from "@/utils/performanceMonitor";

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  unit_price: number;
  work_hours: number;
  materials: string[];
  image?: string;
  createdAt: string;
}

export default function CatalogoProdutos() {
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const { syncAfterCreate, syncAfterUpdate, syncAfterDelete } = useSyncOperations();
  const { formatCurrency } = useInternationalization();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    unit_price: 0,
    work_hours: 0,
    materials: ""
  });
  const [testQuantity, setTestQuantity] = useState(1);
  const [dialogVariacoesOpen, setDialogVariacoesOpen] = useState(false);
  const [produtoParaVariacoes, setProdutoParaVariacoes] = useState<Product | null>(null);
  const [dialogVinculosOpen, setDialogVinculosOpen] = useState(false);
  const [produtoParaVinculos, setProdutoParaVinculos] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [dialogVinculosMassaOpen, setDialogVinculosMassaOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [copiedLinks, setCopiedLinks] = useState<null | {
    sourceProductId: string;
    sourceName: string;
    inventory_items: string[];
    inventory_quantities: number[];
  }>(null);
  const [createInventoryFromProduct, setCreateInventoryFromProduct] = useState(false);

  const categories = ["all", "Uniforme", "Personalizado", "Bordado", "Estampado"];

  // Buscar produtos do Supabase usando React Query
  const { data: products = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        console.error("🔍 [CatalogoProdutos] Buscando produtos do catálogo...");
        const productsData = await getProducts();
        
        console.error(`📊 [CatalogoProdutos] getProducts retornou: ${productsData.length} produto(s)`);
        
        // Verificar se os produtos específicos estão na lista
        const produtosProcurados = ["CAMISETA MANGA CURTA - G-IPUC", "CAMISETA MANGA CURTA - P-IPUC", "CAMISETA MANGA CURTA - M-IPUC", "CAMISETA MANGA CURTA - GG-IPUC", "CAMISETA MANGA CURTA - XG-IPUC", "CAMISETA MANGA CURTA - XXG-IPUC"];
        const produtosEncontrados = produtosProcurados.map(nome => {
          const encontrado = productsData.find(p => p.name === nome);
          return { nome, encontrado: !!encontrado, id: encontrado?.id };
        });
        console.error(`🔍 [CatalogoProdutos] Produtos específicos procurados:`, produtosEncontrados);
        
        if (productsData.length > 0) {
          console.error(`📦 [CatalogoProdutos] Primeiros produtos:`, productsData.slice(0, 5).map(p => ({ 
            id: p.id, 
            name: p.name, 
            type: p.type,
            empresa_id: p.empresa_id 
          })));
        }
        
        // Converter dados do Supabase para o formato da interface
        const convertedProducts: Product[] = productsData.map(product => {
          try {
            return {
              id: product.id,
              name: product.name || 'Produto sem nome',
              category: product.type || 'outros',
              description: `Produto ${product.type || 'indefinido'} - ${formatCurrency(product.unit_price || 0)}`,
              unit_price: product.unit_price || 0,
              work_hours: product.work_hours || 0,
              materials: Array.isArray(product.materials) 
                ? product.materials.map((mat: unknown) => {
                    if (typeof mat === 'string') return mat;
                    if (typeof mat === 'object' && mat.name) return mat.name;
                    return 'Material';
                  })
                : [],
              image: product.image_url || undefined,
              createdAt: product.created_at || new Date().toISOString()
            };
          } catch (conversionError) {
            console.error("❌ Erro ao converter produto:", product, conversionError);
            return {
              id: product.id,
              name: 'Produto com erro',
              category: 'outros',
              description: 'Erro ao carregar produto',
              unit_price: 0,
              work_hours: 0,
              materials: [],
              createdAt: new Date().toISOString()
            };
          }
        });
        
        console.error(`✅ [CatalogoProdutos] Produtos convertidos: ${convertedProducts.length}`);
        return convertedProducts;
      } catch (error) {
        console.error("❌ Erro ao buscar produtos:", error);
        toast.error("Erro ao carregar produtos");
        return [];
      }
    },
    staleTime: 0, // Sempre buscar dados frescos
  });

  // Normalizar texto para busca (remove acentos, espaços extras, caixa)
  const normalizeSearch = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();

  const filteredProducts = useMemo(() => {
    // Se não há termo de busca, apenas filtrar por categoria
    if (!searchTerm.trim()) {
      return products.filter((product) => selectedCategory === "all" || product.category === selectedCategory);
    }

    const search = normalizeSearch(searchTerm);
    if (!search) {
      return products.filter((product) => selectedCategory === "all" || product.category === selectedCategory);
    }

    const searchWords = search.split(" ");

    return products.filter((product) => {
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      
      if (!matchesCategory) return false;

      // Buscar em múltiplos campos: nome, descrição, categoria, materiais
      const searchableText = [
        product.name || "",
        product.description || "",
        product.category || "",
        Array.isArray(product.materials) ? product.materials.join(" ") : "",
      ]
        .join(" ")
        .toString();

      const normalizedText = normalizeSearch(searchableText);

      // Cada palavra digitada deve existir em alguma parte do texto
      const matchesSearch = searchWords.every((word) => normalizedText.includes(word));

      return matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação robusta
    const validation = validateForm(
      { 
        name: formData.name, 
        category: formData.category, 
        unit_price: formData.unit_price, 
        materials: formData.materials,
        description: formData.description,
        work_hours: formData.work_hours
      },
      {
        name: validateName,
        category: (value) => value ? { isValid: true, errors: [] } : { isValid: false, errors: ['Categoria é obrigatória'] },
        unit_price: validateMoney,
        materials: (value) => value ? { isValid: true, errors: [] } : { isValid: false, errors: ['Materiais são obrigatórios'] },
        description: (value) => value ? validateDescription(value, 1000) : { isValid: true, errors: [] },
        work_hours: (value) => value ? { isValid: true, errors: [] } : { isValid: true, errors: [] }
      }
    );
    
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }
    
    try {
      let imageUrl = currentImageUrl;
      
      // Medir performance da operação
      const result = await performanceMonitor.measure(
        editingProduct ? 'updateProduct' : 'createProduct',
        async () => {
          if (editingProduct) {
            // Editar produto existente - fazer upload da imagem primeiro se houver nova
            if (selectedImage) {
              setIsUploadingImage(true);
              const uploadResult = await uploadProductImage(selectedImage, editingProduct.id);
              
              if (!uploadResult.ok) {
                toast.error(uploadResult.error || "Erro ao fazer upload da imagem");
                setIsUploadingImage(false);
                throw new Error(uploadResult.error || "Erro ao fazer upload da imagem");
              }
              
              imageUrl = uploadResult.url || null;
              setIsUploadingImage(false);
            }
            
            // Atualizar produto existente
            return await updateProduct(editingProduct.id, {
              name: formData.name,
              type: formData.category,
              materials: formData.materials.split(",").map(m => m.trim()),
              work_hours: formData.work_hours,
              unit_price: formData.unit_price,
              profit_margin: 0, // Pode ser calculado depois
              image_url: imageUrl || undefined
            });
          } else {
            // Criar novo produto primeiro (sem imagem)
            const createResult = await createProduct({
              name: formData.name,
              type: formData.category,
              materials: formData.materials.split(",").map(m => m.trim()),
              work_hours: formData.work_hours,
              unit_price: formData.unit_price,
              profit_margin: 0, // Pode ser calculado depois
            });
            
            // Se criou o produto e tem imagem, fazer upload com o ID correto
            if (createResult.ok && createResult.id && selectedImage) {
              setIsUploadingImage(true);
              const uploadResult = await uploadProductImage(selectedImage, createResult.id);
              
              if (uploadResult.ok && uploadResult.url) {
                // Atualizar o produto com a URL da imagem
                await updateProduct(createResult.id, { image_url: uploadResult.url });
                imageUrl = uploadResult.url;
              } else {
                console.warn("Produto criado mas falha ao fazer upload da imagem:", uploadResult.error);
                toast.warning("Produto criado, mas houve erro ao fazer upload da imagem");
              }
              setIsUploadingImage(false);
            }

            // Se checkbox marcado, criar item no estoque e vincular
            if (createResult.ok && createResult.id && createInventoryFromProduct) {
              try {
                // Determinar tipo de item baseado na categoria do produto
                let itemType: "materia_prima" | "tecido" | "produto_acabado" = "materia_prima";
                if (formData.category === "Estampado" || formData.materials.toLowerCase().includes("tecido")) {
                  itemType = "tecido";
                } else if (formData.category === "Personalizado" || formData.category === "Uniforme") {
                  itemType = "produto_acabado";
                }

                // Criar item de estoque
                const inventoryResult = await createInventoryItem({
                  name: formData.name,
                  unit: "unidades",
                  quantity: 0,
                  min_quantity: 0,
                  item_type: itemType,
                  category: formData.category,
                  supplier: null,
                  cost_per_unit: formData.unit_price / 2, // Custo: metade do preço de venda
                  metadata: {},
                });

                if (inventoryResult.ok && inventoryResult.id) {
                  // Vincular item de estoque ao produto
                  await updateProduct(createResult.id, {
                    inventory_items: [inventoryResult.id],
                    inventory_quantities: [1],
                  });
                }
              } catch (inventoryError) {
                console.error("Erro ao criar item de estoque:", inventoryError);
                // Não falhar o processo se houver erro ao criar estoque
              }
            }
            
            return createResult;
          }
        },
        'CatalogoProdutos'
      );
      
      if (!result.ok) {
        toast.error(result.error || "Erro ao salvar produto");
        return;
      }
      
      // Log de sucesso
      if (editingProduct) {
        logger.userAction('product_updated', 'CATALOGO_PRODUTOS', { 
          productId: editingProduct.id, 
          name: formData.name, 
          category: formData.category 
        });
        toast.success("Produto atualizado com sucesso!");
      } else {
        logger.userAction('product_created', 'CATALOGO_PRODUTOS', { 
          productId: result.id, 
          name: formData.name, 
          category: formData.category,
          unit_price: formData.unit_price
        });
        toast.success("Produto adicionado com sucesso!");
      }
      
      // Sincronizar dados
      if (editingProduct) {
        syncAfterUpdate('products', editingProduct.id, result.data);
      } else {
        syncAfterCreate('products', result.data);
      }
      invalidateRelated('products');
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      refetch();
      
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast.error("Erro ao salvar produto");
    }
    
    setIsDialogOpen(false);
    setEditingProduct(null);
    setSelectedImage(null);
    setImagePreview(null);
    setCurrentImageUrl(null);
    setCreateInventoryFromProduct(false);
    setFormData({
      name: "",
      category: "",
      description: "",
      unit_price: 0,
      work_hours: 0,
      materials: ""
    });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      description: product.description,
      unit_price: product.unit_price,
      work_hours: product.work_hours,
      materials: product.materials.join(", ")
    });
    setCurrentImageUrl(product.image || null);
    setImagePreview(product.image || null);
    setSelectedImage(null);
    setIsDialogOpen(true);
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast.error("Por favor, selecione um arquivo de imagem");
        return;
      }
      
      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 5MB");
        return;
      }
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setCurrentImageUrl(null);
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteProduct(id);
      if (!result.ok) {
        toast.error(result.error || "Erro ao deletar produto");
        return;
      }
      
      toast.success("Produto removido com sucesso!");
      syncAfterDelete('products', id);
      invalidateRelated('products');
      refetch();
    } catch (error) {
      console.error("Erro ao deletar produto:", error);
      toast.error("Erro ao deletar produto");
    }
  };

  // Funções para seleção múltipla
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAll = () => {
    setSelectedProducts(filteredProducts.map(p => p.id));
  };

  const deselectAll = () => {
    setSelectedProducts([]);
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Selecione pelo menos um produto para excluir");
      return;
    }
    
    const confirmMessage = `Tem certeza que deseja excluir ${selectedProducts.length} produto(s)?\n\nEsta ação não pode ser desfeita!`;
    if (!confirm(confirmMessage)) {
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const productId of selectedProducts) {
      try {
        const result = await deleteProduct(productId);
        if (result.ok) {
          successCount++;
          syncAfterDelete('products', productId);
        } else {
          errorCount++;
          logger.error(`Erro ao excluir produto ${productId}:`, result.error);
        }
      } catch (error) {
        errorCount++;
        logger.error(`Erro ao excluir produto ${productId}:`, error);
      }
    }
    
    if (successCount > 0) {
      toast.success(`${successCount} produto(s) excluído(s) com sucesso!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} produto(s) não puderam ser excluídos`);
    }
    
    setSelectedProducts([]);
    setIsSelecting(false);
    invalidateRelated('products');
    refetch();
  };

  const handleCreateInventoryFromSelectedProducts = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Selecione pelo menos um produto para criar item no estoque");
      return;
    }

    const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
    let successCount = 0;
    let errorCount = 0;

    for (const product of selectedProductsData) {
      try {
        // Buscar dados completos do produto
        const productsData = await getProducts();
        const productFull = productsData.find(p => p.id === product.id);
        if (!productFull) {
          errorCount++;
          continue;
        }

        // Verificar se já existe item de estoque com esse nome
        const { data: existingItems } = await supabase
          .from("inventory_items")
          .select("id")
          .eq("name", product.name)
          .limit(1);

        if (existingItems && existingItems.length > 0) {
          // Se já existe, apenas vincular
          const inventoryItemId = existingItems[0].id;
          const parsed = parseLinksFromProductRow(productFull);
          
          if (!parsed.inventory_items.includes(inventoryItemId)) {
            parsed.inventory_items.push(inventoryItemId);
            parsed.inventory_quantities.push(1);
          }

          await updateProduct(product.id, {
            inventory_items: parsed.inventory_items,
            inventory_quantities: parsed.inventory_quantities,
          });
          successCount++;
        } else {
          // Determinar tipo de item baseado na categoria do produto
          let itemType: "materia_prima" | "tecido" | "produto_acabado" = "materia_prima";
          if (product.category === "Estampado" || productFull.materials?.some((m: string) => m.toLowerCase().includes("tecido"))) {
            itemType = "tecido";
          } else if (product.category === "Personalizado" || product.category === "Uniforme") {
            itemType = "produto_acabado";
          }

          // Criar item de estoque
          const inventoryResult = await createInventoryItem({
            name: product.name,
            unit: "unidades",
            quantity: 0,
            min_quantity: 0,
            item_type: itemType,
            category: product.category,
            supplier: null,
            cost_per_unit: product.unit_price / 2, // Custo: metade do preço de venda
            metadata: {},
          });

          if (inventoryResult.ok && inventoryResult.id) {
            // Vincular item de estoque ao produto
            const parsed = parseLinksFromProductRow(productFull);
            parsed.inventory_items.push(inventoryResult.id);
            parsed.inventory_quantities.push(1);

            await updateProduct(product.id, {
              inventory_items: parsed.inventory_items,
              inventory_quantities: parsed.inventory_quantities,
            });
            successCount++;
          } else {
            errorCount++;
          }
        }
      } catch (error) {
        errorCount++;
        logger.error(`Erro ao criar item de estoque para produto ${product.id}:`, error);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} item(ns) de estoque criado(s) e vinculado(s) com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelectedProducts([]);
      setIsSelecting(false);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} item(ns) de estoque não puderam ser criados`);
    }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      const result = await createProduct({
        name: `${product.name} (Cópia)`,
        type: product.category,
        materials: product.materials,
        work_hours: product.work_hours,
        unit_price: product.unit_price,
        profit_margin: 0
      });
      
      if (!result.ok) {
        toast.error(result.error || "Erro ao duplicar produto");
        return;
      }
      
      toast.success("Produto duplicado com sucesso!");
      syncAfterCreate('products', result.data);
      invalidateRelated('products');
      refetch();
    } catch (error) {
      console.error("Erro ao duplicar produto:", error);
      toast.error("Erro ao duplicar produto");
    }
  };

  const parseLinksFromProductRow = (productRow: any) => {
    let inventory_items: string[] = [];
    let inventory_quantities: number[] = [];

    if (productRow?.inventory_items) {
      if (typeof productRow.inventory_items === "string") {
        try {
          inventory_items = JSON.parse(productRow.inventory_items);
        } catch {
          inventory_items = [];
        }
      } else if (Array.isArray(productRow.inventory_items)) {
        inventory_items = productRow.inventory_items;
      }
    }

    if (productRow?.inventory_quantities) {
      if (typeof productRow.inventory_quantities === "string") {
        try {
          inventory_quantities = JSON.parse(productRow.inventory_quantities);
        } catch {
          inventory_quantities = [];
        }
      } else if (Array.isArray(productRow.inventory_quantities)) {
        inventory_quantities = productRow.inventory_quantities;
      }
    }

    const min = Math.min(inventory_items.length, inventory_quantities.length);
    return {
      inventory_items: inventory_items.slice(0, min).filter(Boolean),
      inventory_quantities: inventory_quantities.slice(0, min).map((n: any) => Number(n) || 0),
    };
  };

  const handleCopyLinksFromSelected = async () => {
    if (selectedProducts.length !== 1) {
      toast.error("Selecione exatamente 1 produto para copiar os vínculos");
      return;
    }

    try {
      const productsData = await getProducts();
      const productFull = productsData.find((p) => p.id === selectedProducts[0]);
      if (!productFull) {
        toast.error("Não foi possível carregar o produto para copiar vínculos");
        return;
      }
      const parsed = parseLinksFromProductRow(productFull);
      if (parsed.inventory_items.length === 0) {
        toast.warning("Este produto não possui vínculos para copiar");
        return;
      }
      setCopiedLinks({
        sourceProductId: productFull.id,
        sourceName: productFull.name,
        inventory_items: parsed.inventory_items,
        inventory_quantities: parsed.inventory_quantities,
      });
      toast.success(`Vínculos copiados de: ${productFull.name}`);
    } catch (e) {
      toast.error("Erro ao copiar vínculos");
    }
  };

  const applyCopiedLinksToSelected = async (mode: "replace" | "merge") => {
    if (!copiedLinks) {
      toast.error("Nenhum vínculo copiado");
      return;
    }
    if (selectedProducts.length === 0) {
      toast.error("Selecione pelo menos 1 produto");
      return;
    }

    if (mode === "replace") {
      const ok = confirm(
        `Você está prestes a SUBSTITUIR todos os vínculos de ${selectedProducts.length} produto(s) pelos vínculos copiados de "${copiedLinks.sourceName}".\n\nDeseja continuar?`
      );
      if (!ok) return;
    }

    let success = 0;
    let fail = 0;

    try {
      const productsData = await getProducts();
      const byId = new Map(productsData.map((p) => [p.id, p]));

      for (const productId of selectedProducts) {
        try {
          const row = byId.get(productId);
          if (!row) {
            fail++;
            continue;
          }

          if (mode === "replace") {
            const res = await updateProduct(productId, {
              inventory_items: copiedLinks.inventory_items,
              inventory_quantities: copiedLinks.inventory_quantities,
            });
            if (res.ok) success++;
            else fail++;
            continue;
          }

          // merge
          const existing = parseLinksFromProductRow(row);
          const mergedItems = [...existing.inventory_items];
          const mergedQtys = [...existing.inventory_quantities];

          copiedLinks.inventory_items.forEach((itemId, idx) => {
            const q = copiedLinks.inventory_quantities[idx] ?? 0;
            const existingIdx = mergedItems.indexOf(itemId);
            if (existingIdx >= 0) {
              mergedQtys[existingIdx] = q; // padrão: atualiza com o valor copiado
            } else {
              mergedItems.push(itemId);
              mergedQtys.push(q);
            }
          });

          const res = await updateProduct(productId, {
            inventory_items: mergedItems.length ? mergedItems : undefined,
            inventory_quantities: mergedQtys.length ? mergedQtys : undefined,
          });
          if (res.ok) success++;
          else fail++;
        } catch {
          fail++;
        }
      }

      if (success) toast.success(`${success} produto(s) atualizado(s)`);
      if (fail) toast.error(`${fail} produto(s) falharam`);
      if (success) {
        refetch();
        queryClient.invalidateQueries({ queryKey: ["products"] });
      }
    } catch {
      toast.error("Erro ao aplicar vínculos copiados");
    }
  };

  const createQuoteFromProduct = (product: Product) => {
    const quoteText = `
🧵 *ORÇAMENTO ATELIÊ PRO*

📦 *Produto:* ${product.name}
📋 *Categoria:* ${product.category}
📝 *Descrição:* ${product.description}

💰 *Preço Base:* ${formatCurrency(product.unit_price)}
⏱️ *Tempo Estimado:* ${product.work_hours}h
📦 *Materiais:* ${product.materials.join(", ")}

✅ *Prazo: A combinar*
📞 *Entrega: A combinar*

_Orçamento gerado pelo Ateliê Pro_
    `.trim();

    navigator.clipboard.writeText(quoteText);
    toast.success("Orçamento copiado para a área de transferência!");
  };

  const handleExportCSV = async () => {
    if (!products || products.length === 0) {
      toast.error("Nenhum produto para exportar");
      return;
    }

    try {
      // Buscar dados originais do Supabase para ter todos os campos
      const productsData = await getProducts();
      
      // Preparar dados para exportação
      const csvHeaders = [
        'Nome',
        'Tipo',
        'Materiais',
        'Horas Trabalho',
        'Preço Unitário',
        'Margem Lucro (%)',
        'Imagem URL'
      ];
      
      // Função para escapar valores CSV
      const escapeCSV = (value: string | null | undefined) => {
        if (value === null || value === undefined) return '';
        return `"${String(value).replace(/"/g, '""')}"`;
      };
      
      const csvRows = productsData.map(product => {
        // Processar materiais
        let materialsStr = '';
        if (product.materials) {
          if (Array.isArray(product.materials)) {
            materialsStr = product.materials
              .map((mat: unknown) => {
                if (typeof mat === 'string') return mat;
                if (typeof mat === 'object' && mat !== null && 'name' in mat) return String(mat.name);
                return String(mat);
              })
              .join(', ');
          } else if (typeof product.materials === 'string') {
            materialsStr = product.materials;
          }
        }

        return [
          escapeCSV(product.name),
          escapeCSV(product.type || ''),
          escapeCSV(materialsStr),
          (product.work_hours || 0).toString(),
          (product.unit_price || 0).toFixed(2),
          (product.profit_margin || 0).toString(),
          escapeCSV(product.image_url || '')
        ].join(',');
      });
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows
      ].join('\n');
      
      // Criar e baixar arquivo
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `catalogo_produtos_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Catálogo exportado com sucesso! (${productsData.length} produto(s))`);
      logger.info('Catálogo exportado para CSV', { productCount: productsData.length });
    } catch (error: any) {
      logger.error('Erro ao exportar catálogo:', error);
      toast.error("Erro ao exportar catálogo: " + (error.message || "Erro desconhecido"));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <SidebarTrigger className="text-gray-700 hover:bg-gray-100 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 md:w-6 md:h-6 text-purple-600 flex-shrink-0" />
                <span className="truncate">Catálogo de Produtos</span>
              </h1>
              <p className="text-gray-600 text-xs md:text-sm mt-0.5 truncate">Modelos prontos para reutilização</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {isSelecting && selectedProducts.length > 0 && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setDialogVinculosMassaOpen(true)}
                  className="w-full md:w-auto"
                >
                  <Link2 className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden md:inline">Vincular Estoque ({selectedProducts.length})</span>
                  <span className="md:hidden">Vincular</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCreateInventoryFromSelectedProducts}
                  className="w-full md:w-auto"
                >
                  <PackageSearch className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden md:inline">Criar item no Estoque ({selectedProducts.length})</span>
                  <span className="md:hidden">Criar Estoque</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLinksFromSelected}
                  disabled={selectedProducts.length !== 1}
                  className="w-full md:w-auto"
                  title="Copiar vínculos do produto selecionado"
                >
                  <Copy className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden md:inline">Copiar vínculos</span>
                  <span className="md:hidden">Copiar</span>
                </Button>
                {copiedLinks && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyCopiedLinksToSelected("merge")}
                      className="w-full md:w-auto"
                      title={`Mesclar vínculos copiados de ${copiedLinks.sourceName}`}
                    >
                      <Link2 className="w-4 h-4 mr-1 md:mr-2" />
                      <span className="hidden md:inline">Mesclar vínculos</span>
                      <span className="md:hidden">Mesclar</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => applyCopiedLinksToSelected("replace")}
                      className="w-full md:w-auto"
                      title={`Substituir vínculos pelos copiados de ${copiedLinks.sourceName}`}
                    >
                      <Link2 className="w-4 h-4 mr-1 md:mr-2" />
                      <span className="hidden md:inline">Substituir vínculos</span>
                      <span className="md:hidden">Substituir</span>
                    </Button>
                  </>
                )}
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={handleBulkDelete}
                  className="w-full md:w-auto"
                >
                  <Trash2 className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden md:inline">Excluir {selectedProducts.length} Selecionado(s)</span>
                  <span className="md:hidden">Excluir {selectedProducts.length}</span>
                </Button>
              </>
            )}
            {isSelecting && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setIsSelecting(false);
                  setSelectedProducts([]);
                }}
                className="w-full md:w-auto"
              >
                Cancelar Seleção
              </Button>
            )}
            {!isSelecting && (
              <>
                <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full md:w-auto"
                    >
                      <HelpCircle className="w-4 h-4 mr-1 md:mr-2" />
                      <span className="hidden md:inline">Ajuda</span>
                      <span className="md:hidden">Ajuda</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Ajuda rápida — Catálogo + Estoque</DialogTitle>
                      <DialogDescription>
                        O Catálogo guarda seus modelos de produtos. O Estoque guarda seus materiais/itens. A “mágica” é vincular um produto do catálogo aos itens do estoque para consumo por unidade.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 text-sm">
                      <div className="space-y-2">
                        <p className="font-semibold">1) Importar produtos com vínculo automático</p>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                          <li>Clique em <strong>Importar Produtos</strong> e use as colunas opcionais: <strong>Item Estoque</strong> e <strong>Quantidade por Unidade</strong>.</li>
                          <li>Se você incluir <strong>Estoque</strong> e marcar “Sobrescrever estoque”, o sistema vai ajustar o saldo do item do estoque pelo CSV.</li>
                          <li>Se marcar “Criar item no estoque automaticamente”, itens ausentes são criados pelo nome do CSV.</li>
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <p className="font-semibold">2) Vincular estoque em massa (mais rápido)</p>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                          <li>Clique em <strong>Selecionar</strong>, marque vários produtos e use <strong>Vincular</strong>.</li>
                          <li>Use “Substituir vínculos existentes” quando você quer que cada produto fique ligado apenas a 1 item.</li>
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <p className="font-semibold">3) Vincular estoque por produto (mais detalhado)</p>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                          <li>No card do produto, clique no ícone de <strong>Vínculos de Estoque</strong> (corrente).</li>
                          <li>Use isso quando um produto consome múltiplos itens (ex: tecido + linha + zíper).</li>
                        </ul>
                      </div>

                      <div className="rounded-lg border bg-muted/10 p-4 text-muted-foreground">
                        <p className="font-semibold text-foreground mb-1">Dica prática</p>
                        <p>
                          Padronize nomes (ex: “Tecido Algodão 30.1”) para facilitar o casamento automático. Se tiver dúvidas, exporte o estoque e use exatamente os mesmos nomes no CSV do catálogo.
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleExportCSV}
                  className="w-full md:w-auto"
                >
                  <Download className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden md:inline">Exportar CSV</span>
                  <span className="md:hidden">Exportar</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsSelecting(true)}
                  className="w-full md:w-auto"
                >
                  Selecionar
                </Button>
              </>
            )}
            <ImportProducts 
              onImportComplete={() => {
                refetch();
                queryClient.invalidateQueries({ queryKey: ["products"] });
              }} 
            />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full md:w-auto bg-gray-900 text-white hover:bg-gray-800 shadow-lg text-xs md:text-sm">
                  <Plus className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden md:inline">Novo Produto</span>
                  <span className="md:hidden">Novo</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>
                  {editingProduct ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Nome do Produto <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: Camiseta Polo Bordada"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Categoria <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Uniforme">Uniforme</SelectItem>
                        <SelectItem value="Personalizado">Personalizado</SelectItem>
                        <SelectItem value="Bordado">Bordado</SelectItem>
                        <SelectItem value="Estampado">Estampado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>
                    Descrição <span className="text-gray-400">(opcional)</span>
                  </Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descreva o produto..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Preço Base <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({...formData, unit_price: Number(e.target.value)})}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Tempo Estimado (horas) <span className="text-gray-400">(opcional)</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.work_hours}
                      onChange={(e) => setFormData({...formData, work_hours: Number(e.target.value)})}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>
                    Materiais (separados por vírgula) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.materials}
                    onChange={(e) => setFormData({...formData, materials: e.target.value})}
                    placeholder="Ex: Camiseta polo, Linha de bordado, Estabilizador"
                    required
                  />
                </div>
                
                {/* Upload de Imagem */}
                <div className="space-y-2">
                  <Label>
                    Foto do Produto <span className="text-gray-400">(opcional)</span>
                  </Label>
                  {imagePreview || currentImageUrl ? (
                    <div className="relative">
                      <div className="relative w-full h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden">
                        <img
                          src={imagePreview || currentImageUrl || ''}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveImage}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedImage ? "Nova imagem selecionada" : "Imagem atual"}
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <Label htmlFor="image-upload" className="cursor-pointer">
                        <span className="text-sm text-gray-600 hover:text-gray-900">
                          Clique para selecionar uma imagem
                        </span>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </Label>
                      <p className="text-xs text-gray-500 mt-2">
                        JPG, PNG ou GIF (máx. 5MB)
                      </p>
                    </div>
                  )}
                  {!imagePreview && !currentImageUrl && (
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-input"
                    />
                  )}
                </div>

                {/* Seção de Cálculo de Tempo */}
                {formData.work_hours > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3 max-h-48 overflow-y-auto">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <h3 className="font-medium text-blue-900 text-sm">Cálculo de Tempo por Quantidade</h3>
                    </div>
                    <p className="text-xs text-blue-700">
                      Este produto leva <strong>{formData.work_hours}h</strong> por unidade.
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="testQuantity" className="text-xs font-medium text-blue-800">
                          Teste quantidade:
                        </Label>
                        <Input
                          id="testQuantity"
                          type="number"
                          min="1"
                          value={testQuantity}
                          onChange={(e) => setTestQuantity(Number(e.target.value))}
                          className="w-16 h-7 text-xs"
                        />
                      </div>
                      <div className="text-xs text-blue-800">
                        <strong>{formData.work_hours}h × {testQuantity} = {formData.work_hours * testQuantity}h totais</strong>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600">
                      💡 <strong>Fórmula:</strong> Tempo por unidade × Quantidade = Tempo total
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="createInventoryFromProduct"
                    checked={createInventoryFromProduct}
                    onCheckedChange={(checked) => setCreateInventoryFromProduct(checked === true)}
                  />
                  <Label
                    htmlFor="createInventoryFromProduct"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Criar item no estoque
                  </Label>
                </div>
                
                <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-background pb-2 flex-shrink-0">
                  <Button type="submit" className="flex-1" disabled={isUploadingImage}>
                    {isUploadingImage ? (
                      <>
                        <Upload className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        {editingProduct ? "Atualizar" : "Criar"} Produto
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsDialogOpen(false);
                      setSelectedImage(null);
                      setImagePreview(null);
                      setCurrentImageUrl(null);
                    }}
                    disabled={isUploadingImage}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8">
        {/* Filtros */}
        <Card className="bg-white border border-gray-200/50 shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar produtos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {!isSelecting && (
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {categories.slice(1).map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {isSelecting && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedProducts.length} selecionado(s)
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectedProducts.length === filteredProducts.length ? deselectAll : selectAll}
                  >
                    {selectedProducts.length === filteredProducts.length ? "Desmarcar Todos" : "Selecionar Todos"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Grid de Produtos */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {products.length === 0 ? "Nenhum produto cadastrado" : "Nenhum produto encontrado"}
            </h3>
            <p className="text-gray-600 mb-6">
              {products.length === 0 
                ? "Comece adicionando seus primeiros produtos ao catálogo" 
                : "Tente ajustar os filtros de busca"}
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro Produto
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
            <Card key={product.id} className="bg-white border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
              {product.image && (
                <div className="w-full h-48 bg-gray-100 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-2 flex-1">
                    {isSelecting && (
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => toggleProductSelection(product.id)}
                        className="mt-1"
                      />
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <Badge variant="secondary" className="mt-2">
                        {product.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setProdutoParaVariacoes(product);
                        setDialogVariacoesOpen(true);
                      }}
                      className="text-purple-600 hover:text-purple-700"
                      title="Gerenciar Variações"
                    >
                      <Layers className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        // Buscar produto completo do Supabase
                        const productsData = await getProducts();
                        const productFull = productsData.find(p => p.id === product.id);
                        if (productFull) {
                          setProdutoParaVinculos(productFull);
                          setDialogVinculosOpen(true);
                        }
                      }}
                      className="text-orange-600 hover:text-orange-700"
                      title="Vínculos de Estoque"
                    >
                      <Link2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(product)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">{product.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Preço:</span>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(product.unit_price || 0)}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Tempo:</span>
                    <div className="text-lg font-bold text-blue-600">
                      {product.work_hours || 0}h
                    </div>
                  </div>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700 text-sm">Materiais:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.materials.map((material, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {material}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={() => createQuoteFromProduct(product)}
                  className="w-full"
                  variant="outline"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Gerar Orçamento
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        )}

        {/* Dialog de Variações */}
        {produtoParaVariacoes && (
          <DialogVariacoesProduto
            open={dialogVariacoesOpen}
            onOpenChange={setDialogVariacoesOpen}
            produtoId={produtoParaVariacoes.id}
            produtoNome={produtoParaVariacoes.name}
          />
        )}

        {/* Dialog de Vínculos de Estoque */}
        {produtoParaVinculos && (
          <DialogVinculosEstoque
            open={dialogVinculosOpen}
            onOpenChange={setDialogVinculosOpen}
            product={produtoParaVinculos}
            onSuccess={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ["products"] });
            }}
          />
        )}

        {/* Dialog de Vínculos de Estoque em Massa */}
        <DialogVinculosEstoqueMassa
          open={dialogVinculosMassaOpen}
          onOpenChange={setDialogVinculosMassaOpen}
          selectedProductIds={selectedProducts}
          onSuccess={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ["products"] });
            setSelectedProducts([]);
            setIsSelecting(false);
          }}
        />
      </div>
    </div>
  );
}


