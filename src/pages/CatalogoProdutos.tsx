import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Plus, Edit, Trash2, Copy, Search, Filter, Clock } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/integrations/supabase/products";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

  const categories = ["all", "Uniforme", "Personalizado", "Bordado", "Estampado"];

  // Buscar produtos do Supabase usando React Query
  const { data: products = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        console.log("🔍 Buscando produtos do catálogo...");
        const productsData = await getProducts();
        
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
        
        console.log("✅ Produtos carregados:", convertedProducts.length);
        return convertedProducts;
      } catch (error) {
        console.error("❌ Erro ao buscar produtos:", error);
        toast.error("Erro ao carregar produtos");
        return [];
      }
    },
    staleTime: 0, // Sempre buscar dados frescos
  });

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
      // Medir performance da operação
      const result = await performanceMonitor.measure(
        editingProduct ? 'updateProduct' : 'createProduct',
        async () => {
          if (editingProduct) {
            // Editar produto existente
            return await updateProduct(editingProduct.id, {
              name: formData.name,
              type: formData.category,
              materials: formData.materials.split(",").map(m => m.trim()),
              work_hours: formData.work_hours,
              unit_price: formData.unit_price,
              profit_margin: 0 // Pode ser calculado depois
            });
          } else {
            // Criar novo produto
            return await createProduct({
              name: formData.name,
              type: formData.category,
              materials: formData.materials.split(",").map(m => m.trim()),
              work_hours: formData.work_hours,
              unit_price: formData.unit_price,
              profit_margin: 0 // Pode ser calculado depois
            });
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
      refetch();
      
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast.error("Erro ao salvar produto");
    }
    
    setIsDialogOpen(false);
    setEditingProduct(null);
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
    setIsDialogOpen(true);
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
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full md:w-auto bg-gray-900 text-white hover:bg-gray-800 shadow-lg text-xs md:text-sm">
                <Plus className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Novo Produto</span>
                <span className="md:hidden">Novo</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingProduct ? "Atualizar" : "Criar"} Produto
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-4 md:p-8">
        {/* Filtros */}
        <Card className="bg-white border border-gray-200/50 shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
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
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <Badge variant="secondary" className="mt-2">
                      {product.category}
                    </Badge>
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
      </div>
    </div>
  );
}


