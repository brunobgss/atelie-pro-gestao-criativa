import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Plus, Edit, Trash2, Copy, Search, Filter } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { getProducts } from "@/integrations/supabase/inventory";

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  estimatedTime: number;
  materials: string[];
  image?: string;
  createdAt: string;
}

export default function CatalogoProdutos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    basePrice: 0,
    estimatedTime: 0,
    materials: ""
  });

  const categories = ["all", "Uniforme", "Personalizado", "Bordado", "Estampado"];

  // Buscar produtos do Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log("🔍 Buscando produtos do catálogo...");
        const productsData = await getProducts();
        
        // Converter dados do Supabase para o formato da interface
        const convertedProducts: Product[] = productsData.map(product => ({
          id: product.id,
          name: product.name,
          category: product.type,
          description: `Produto ${product.type} - R$ ${product.unit_price.toFixed(2)}`,
          basePrice: product.unit_price,
          estimatedTime: product.work_hours,
          materials: Array.isArray(product.materials) ? product.materials : [],
          createdAt: product.created_at
        }));
        
        console.log("✅ Produtos carregados:", convertedProducts.length);
        setProducts(convertedProducts);
      } catch (error) {
        console.error("❌ Erro ao buscar produtos:", error);
        toast.error("Erro ao carregar produtos");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProduct) {
      // Editar produto existente
      setProducts(products.map(p => 
        p.id === editingProduct.id 
          ? { ...p, ...formData, materials: formData.materials.split(",").map(m => m.trim()) }
          : p
      ));
      toast.success("Produto atualizado com sucesso!");
    } else {
      // Criar novo produto
      const newProduct: Product = {
        id: Date.now().toString(),
        ...formData,
        materials: formData.materials.split(",").map(m => m.trim()),
        createdAt: new Date().toISOString().split('T')[0]
      };
      setProducts([...products, newProduct]);
      toast.success("Produto adicionado com sucesso!");
    }
    
    setIsDialogOpen(false);
    setEditingProduct(null);
    setFormData({
      name: "",
      category: "",
      description: "",
      basePrice: 0,
      estimatedTime: 0,
      materials: ""
    });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      description: product.description,
      basePrice: product.basePrice,
      estimatedTime: product.estimatedTime,
      materials: product.materials.join(", ")
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
    toast.success("Produto removido com sucesso!");
  };

  const handleDuplicate = (product: Product) => {
    const duplicatedProduct: Product = {
      ...product,
      id: Date.now().toString(),
      name: `${product.name} (Cópia)`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setProducts([...products, duplicatedProduct]);
    toast.success("Produto duplicado com sucesso!");
  };

  const createQuoteFromProduct = (product: Product) => {
    const quoteText = `
🧵 *ORÇAMENTO ATELIÊ PRO*

📦 *Produto:* ${product.name}
📋 *Categoria:* ${product.category}
📝 *Descrição:* ${product.description}

💰 *Preço Base:* R$ ${product.basePrice.toFixed(2)}
⏱️ *Tempo Estimado:* ${product.estimatedTime}h
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
        <div className="p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="text-gray-700 hover:bg-gray-100" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-purple-600" />
                Catálogo de Produtos
              </h1>
              <p className="text-gray-600 text-sm mt-0.5">Modelos prontos para reutilização</p>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gray-900 text-white hover:bg-gray-800 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Novo Produto
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
                    <Label>Nome do Produto</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: Camiseta Polo Bordada"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
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
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descreva o produto..."
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço Base (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({...formData, basePrice: Number(e.target.value)})}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tempo Estimado (horas)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.estimatedTime}
                      onChange={(e) => setFormData({...formData, estimatedTime: Number(e.target.value)})}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Materiais (separados por vírgula)</Label>
                  <Input
                    value={formData.materials}
                    onChange={(e) => setFormData({...formData, materials: e.target.value})}
                    placeholder="Ex: Camiseta polo, Linha de bordado, Estabilizador"
                    required
                  />
                </div>
                
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

      <div className="p-8">
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
                      R$ {product.basePrice.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Tempo:</span>
                    <div className="text-lg font-bold text-blue-600">
                      {product.estimatedTime}h
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


