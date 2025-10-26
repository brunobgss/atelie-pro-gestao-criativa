import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Zap, Clock, Package, Save, FileText, Shirt, Coffee, Crown, Users, Trash2, Plus, TrendingUp } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useInternationalization } from "@/contexts/InternationalizationContext";
import { saveProduct } from "@/integrations/supabase/inventory";

interface Material {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  materialType?: "fabric" | "other";
  fabricWidth?: number; // Largura do tecido (em metros)
  fabricLength?: number; // Comprimento do tecido comprado (em metros)
  pieceWidth?: number; // Largura da peça necessária (em cm)
  pieceLength?: number; // Comprimento da peça necessária (em cm)
  calculatedUsage?: number; // Uso calculado em metros
}

interface ProductTemplate {
  name: string;
  baseCost: number;
  timeHours: number;
  materials: Material[];
}

export default function CalculadoraPrecos() {
  const navigate = useNavigate();
  const { formatCurrency } = useInternationalization();
  const [productType, setProductType] = useState<"bordado" | "camiseta" | "caneca" | "bone" | "uniforme" | "personalizado">("bordado");
  
  // Bordado
  const [calculationMode, setCalculationMode] = useState<"pontos" | "horas">("pontos");
  const [points, setPoints] = useState<number>(0);
  const [pricePerThousandPoints, setPricePerThousandPoints] = useState<number>(1.5);
  
  // Geral
  const [workHours, setWorkHours] = useState<number>(0);
  const [hourlyRate, setHourlyRate] = useState<number>(25);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [profitMargin, setProfitMargin] = useState<number>(35);
  const [newMaterial, setNewMaterial] = useState({ 
    name: "", 
    quantity: 0, 
    unitPrice: 0,
    materialType: "other" as "fabric" | "other",
    fabricWidth: 0,
    fabricLength: 0,
    pieceWidth: 0,
    pieceLength: 0
  });
  
  // Produto personalizado
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [setupCost, setSetupCost] = useState<number>(0);
  
  // Templates de produtos
  const productTemplates: Record<string, ProductTemplate> = {
    camiseta: {
      name: "Camiseta Personalizada",
      baseCost: 15,
      timeHours: 0.5,
      materials: [
        { id: "1", name: "Camiseta básica", quantity: 1, unitPrice: 12 },
        { id: "2", name: "Tinta/Vinil", quantity: 1, unitPrice: 3 }
      ]
    },
    caneca: {
      name: "Caneca Personalizada", 
      baseCost: 8,
      timeHours: 0.3,
      materials: [
        { id: "1", name: "Caneca branca", quantity: 1, unitPrice: 6 },
        { id: "2", name: "Sublimação", quantity: 1, unitPrice: 2 }
      ]
    },
    bone: {
      name: "Boné Personalizado",
      baseCost: 20,
      timeHours: 0.8,
      materials: [
        { id: "1", name: "Boné básico", quantity: 1, unitPrice: 15 },
        { id: "2", name: "Bordado/Patch", quantity: 1, unitPrice: 5 }
      ]
    },
    uniforme: {
      name: "Uniforme Completo",
      baseCost: 45,
      timeHours: 2,
      materials: [
        { id: "1", name: "Camisa", quantity: 1, unitPrice: 25 },
        { id: "2", name: "Calça", quantity: 1, unitPrice: 20 },
        { id: "3", name: "Bordados", quantity: 2, unitPrice: 8 }
      ]
    }
  };

  // Aplicar template
  const applyTemplate = (type: string) => {
    const template = productTemplates[type];
    if (template) {
      setWorkHours(template.timeHours);
      setMaterials(template.materials);
      setUnitCost(template.baseCost);
      toast.success(`Template "${template.name}" aplicado!`);
    }
  };

  // Cálculos
  const getProductionCost = () => {
    switch (productType) {
      case "bordado":
        return calculationMode === "pontos" 
          ? (points / 1000) * pricePerThousandPoints 
          : workHours * hourlyRate;
      case "personalizado":
        return (unitCost * quantity) + setupCost + (workHours * hourlyRate);
      default:
        return workHours * hourlyRate;
    }
  };

  // Novo: Cálculo de tempo baseado na quantidade
  const getTotalWorkHours = () => {
    if (productType === "personalizado") {
      // Para produtos personalizados, multiplicar horas por quantidade
      return workHours * quantity;
    }
    return workHours;
  };

  // Novo: Cálculo de tempo com setup
  const getTotalTimeWithSetup = () => {
    const totalHours = getTotalWorkHours();
    const setupHours = setupCost / hourlyRate; // Converter setup em horas
    return totalHours + setupHours;
  };

  // Calcula o uso de tecido baseado nas dimensões (retorna metros de tecido POR PEÇA)
  const calculateFabricUsage = (material: { materialType?: string, fabricWidth?: number, pieceWidth?: number, pieceLength?: number, quantity?: number }) => {
    if (material.materialType !== "fabric" || !material.fabricWidth || !material.pieceWidth || !material.pieceLength) {
      return material.quantity || 0;
    }
    
    const fabricWidthInM = material.fabricWidth; // já em metros
    const pieceWidthInM = material.pieceWidth / 100; // converter cm para metros
    const pieceLengthInM = material.pieceLength / 100; // converter cm para metros
    
    // Calcula quantos pedaços cabem na largura do tecido
    const piecesPerWidth = Math.floor(fabricWidthInM / pieceWidthInM);
    
    if (piecesPerWidth === 0) {
      // Se não cabe na largura, precisa do comprimento total por peça
      return pieceLengthInM;
    }
    
    // Calcula o uso de tecido POR PEÇA
    // Se cabem N peças na largura, cada peça usa (1/N) da largura
    // Então: metros_por_peca = (1 / piecesPerWidth) * pieceLengthInM
    // Simplificando: comprimento necessário dividido pelo número de peças na largura
    const fabricUsagePerPiece = pieceLengthInM / piecesPerWidth;
    
    return fabricUsagePerPiece;
  };

  // Calcula o custo de materiais POR PEÇA
  const materialsCostPerUnit = materials.reduce((total, material) => {
    let costPerUnit = 0;
    
    // Se for tecido, calcula o uso real por peça
    if (material.materialType === "fabric" && material.calculatedUsage !== undefined) {
      // calculatedUsage = metros de tecido POR PEÇA (já calculado)
      // material.unitPrice = preço do metro de tecido
      costPerUnit = material.calculatedUsage * material.unitPrice;
    } else {
      // Para outros materiais, o unitPrice já é por peça
      costPerUnit = material.quantity * material.unitPrice;
    }
    
    return total + costPerUnit;
  }, 0);

  const productionCost = getProductionCost();
  // Multiplica o custo por peça pela quantidade total de peças
  const totalMaterialsCost = materialsCostPerUnit * quantity;
  const subtotal = productionCost + totalMaterialsCost;
  const profitAmount = (subtotal * profitMargin) / 100;
  const finalPrice = subtotal + profitAmount;
  const unitPrice = quantity > 1 ? finalPrice / quantity : finalPrice;

  const addMaterial = () => {
    if (newMaterial.name && newMaterial.unitPrice >= 0) {
      // Calcular uso se for tecido (sempre calcula para 1 peça)
      let calculatedUsage = newMaterial.quantity || 0;
      if (newMaterial.materialType === "fabric" && newMaterial.fabricWidth && newMaterial.pieceWidth && newMaterial.pieceLength) {
        calculatedUsage = calculateFabricUsage({
          materialType: newMaterial.materialType,
          fabricWidth: newMaterial.fabricWidth,
          pieceWidth: newMaterial.pieceWidth,
          pieceLength: newMaterial.pieceLength,
          quantity: 1 // Sempre calcula para 1 peça
        });
      }
      
      setMaterials([...materials, { ...newMaterial, calculatedUsage, id: Date.now().toString() }]);
      setNewMaterial({ 
        name: "", 
        quantity: 0, 
        unitPrice: 0, 
        materialType: "other",
        fabricWidth: 0,
        fabricLength: 0,
        pieceWidth: 0,
        pieceLength: 0
      });
    }
  };

  const removeMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const generateQuote = () => {
    const productName = productType === "personalizado" ? "Produto Personalizado" : productTemplates[productType]?.name || "Bordado";
    
    const quoteText = `
🎨 *ORÇAMENTO PROFISSIONAL*

📦 *Produto:* ${productName}
${quantity > 1 ? `📊 *Quantidade:* ${quantity} unidades` : ""}

💰 *Detalhamento de Custos:*
${productType === "bordado" && calculationMode === "pontos" 
  ? `• Bordado: ${points.toLocaleString()} pontos × ${formatCurrency(pricePerThousandPoints)}/mil = ${formatCurrency(productionCost)}`
  : `• Mão de obra: ${workHours}h × ${formatCurrency(hourlyRate)}/h = ${formatCurrency(workHours * hourlyRate)}`}
${productType === "personalizado" && setupCost > 0 ? `• Custo de setup: ${formatCurrency(setupCost)}` : ""}
${productType === "personalizado" && unitCost > 0 ? `• Custo unitário: ${formatCurrency(unitCost)} × ${quantity} = ${formatCurrency(unitCost * quantity)}` : ""}

📦 *Materiais e Insumos:*
${materials.map(m => `• ${m.name}: ${m.quantity} × ${formatCurrency(m.unitPrice)} = ${formatCurrency(m.quantity * m.unitPrice)}`).join('\n')}
• *Total materiais:* ${formatCurrency(totalMaterialsCost)}

📊 *Resumo Financeiro:*
• Subtotal: ${formatCurrency(subtotal)}
• Margem de lucro (${profitMargin}%): ${formatCurrency(profitAmount)}
• *VALOR TOTAL: ${formatCurrency(finalPrice)}*
${quantity > 1 ? `• *Valor unitário: ${formatCurrency(unitPrice)}*` : ""}

✅ *Condições:*
• Prazo de entrega: A combinar
• Forma de pagamento: A combinar
• Validade: 7 dias

📞 *Próximos passos:*
1. Confirme se está de acordo
2. Defina prazo e forma de pagamento
3. Envie aprovação para iniciarmos

_Orçamento gerado pela Calculadora Profissional_
    `.trim();

    navigator.clipboard.writeText(quoteText);
    toast.success("Orçamento copiado para área de transferência!");
  };

  const saveAsProduct = async () => {
    try {
      console.log("🔍 Iniciando salvamento do produto...");
      
      const productData = {
        name: productType === "personalizado" ? "Produto Personalizado" : productTemplates[productType]?.name || "Bordado",
        type: productType,
        materials,
        workHours,
        unitPrice: unitPrice,
        profitMargin,
      };
      
      console.log("📦 Dados do produto:", productData);
      
      const result = await saveProduct(productData);
      
      console.log("📋 Resultado do salvamento:", result);
      
      if (!result.ok) {
        console.error("❌ Falha ao salvar produto:", result.error);
        toast.error(result.error || "Erro ao salvar produto");
        return;
      }
      
      // Salvar também no localStorage para backup
      const savedProducts = JSON.parse(localStorage.getItem('savedProducts') || '[]');
      savedProducts.push({ ...productData, id: result.id, createdAt: new Date().toISOString() });
      localStorage.setItem('savedProducts', JSON.stringify(savedProducts));
      
      console.log("✅ Produto salvo com sucesso!");
      toast.success("Produto salvo no catálogo!");
    } catch (error) {
      console.error("❌ Erro inesperado ao salvar produto:", error);
      toast.error("Erro ao salvar produto");
    }
  };

  const createQuoteFromCalculation = () => {
    const quoteData = {
      customer_name: "",
      items: [{
        description: productType === "personalizado" ? "Produto Personalizado" : productTemplates[productType]?.name || "Bordado",
        quantity: quantity,
        value: unitPrice
      }],
      observations: `Calculado com margem de ${profitMargin}%\nMateriais: ${materials.map(m => m.name).join(", ")}`
    };
    
    localStorage.setItem('calculatorQuoteData', JSON.stringify(quoteData));
    navigate('/orcamentos/novo');
    toast.success("Redirecionando para criar orçamento...");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10 shadow-soft">
        <div className="p-6 flex justify-between items-center">
          <div className="flex items-center gap-4 animate-slide-in">
            <SidebarTrigger className="text-gray-700 hover:bg-gray-100 transition-all duration-200" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Calculator className="w-6 h-6 text-purple-600 animate-float" />
                <span className="text-gradient-purple">Calculadora de Precificação Profissional</span>
              </h1>
              <p className="text-gray-600 text-sm mt-0.5">Ferramenta completa para calcular preços com precisão</p>
            </div>
          </div>
          <div className="flex gap-3 animate-slide-in">
            <Button onClick={generateQuote} variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50 button-hover shadow-soft">
              <FileText className="w-4 h-4 mr-2" />
              Gerar Orçamento
            </Button>
            <Button onClick={createQuoteFromCalculation} className="bg-purple-600 hover:bg-purple-700 button-hover shadow-medium">
              <Save className="w-4 h-4 mr-2" />
              Criar Orçamento
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuração */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tipo de Produto */}
            <Card className="bg-white border border-gray-200/50 shadow-soft card-hover animate-scale-in">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  Tipo de Produto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { id: "bordado", name: "Bordado", icon: "🧵" },
                    { id: "camiseta", name: "Camiseta", icon: "👕" },
                    { id: "caneca", name: "Caneca", icon: "☕" },
                    { id: "bone", name: "Boné", icon: "🧢" },
                    { id: "uniforme", name: "Uniforme", icon: "👔" },
                    { id: "personalizado", name: "Personalizado", icon: "🎨" }
                  ].map((type) => (
                    <Button
                      key={type.id}
                      variant={productType === type.id ? "default" : "outline"}
                      onClick={() => {
                        setProductType(type.id as any);
                        if (type.id !== "bordado" && type.id !== "personalizado") {
                          applyTemplate(type.id);
                        }
                      }}
                      className={`h-auto p-4 flex flex-col items-center gap-2 transition-all duration-300 ${
                        productType === type.id 
                          ? "bg-purple-600 hover:bg-purple-700 shadow-medium transform scale-105" 
                          : "hover:shadow-soft hover:scale-105"
                      }`}
                    >
                      <span className="text-2xl animate-pulse-soft">{type.icon}</span>
                      <span className="text-sm">{type.name}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Configurações específicas por tipo */}
            <Tabs defaultValue="production" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="production">Produção</TabsTrigger>
                <TabsTrigger value="materials">Materiais</TabsTrigger>
                <TabsTrigger value="pricing">Precificação</TabsTrigger>
              </TabsList>

              <TabsContent value="production" className="space-y-4">
                <Card className="bg-white border border-gray-200/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Custos de Produção
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {productType === "bordado" && (
                      <>
                        <div className="flex gap-4">
                          <Button
                            variant={calculationMode === "pontos" ? "default" : "outline"}
                            onClick={() => setCalculationMode("pontos")}
                            className="flex-1"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Por Pontos
                          </Button>
                          <Button
                            variant={calculationMode === "horas" ? "default" : "outline"}
                            onClick={() => setCalculationMode("horas")}
                            className="flex-1"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Por Horas
                          </Button>
                        </div>

                        {calculationMode === "pontos" ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="points">Número de Pontos</Label>
                              <Input
                                id="points"
                                type="number"
                                value={points}
                                onChange={(e) => setPoints(Number(e.target.value))}
                                placeholder="Ex: 15000"
                              />
                            </div>
                            <div>
                              <Label htmlFor="pricePerThousand">Preço por 1000 pontos</Label>
                              <Input
                                id="pricePerThousand"
                                type="number"
                                step="0.01"
                                value={pricePerThousandPoints}
                                onChange={(e) => setPricePerThousandPoints(Number(e.target.value))}
                                placeholder="Ex: 1.50"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="workHours">Horas de Trabalho</Label>
                              <Input
                                id="workHours"
                                type="number"
                                step="0.1"
                                value={workHours}
                                onChange={(e) => setWorkHours(Number(e.target.value))}
                                placeholder="Ex: 2.5"
                              />
                            </div>
                            <div>
                              <Label htmlFor="hourlyRate">Valor por Hora</Label>
                              <Input
                                id="hourlyRate"
                                type="number"
                                step="0.01"
                                value={hourlyRate}
                                onChange={(e) => setHourlyRate(Number(e.target.value))}
                                placeholder="Ex: 25.00"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {productType === "personalizado" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="quantity">Quantidade</Label>
                          <Input
                            id="quantity"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            placeholder="Ex: 10"
                          />
                        </div>
                        <div>
                          <Label htmlFor="unitCost">Custo Unitário</Label>
                          <Input
                            id="unitCost"
                            type="number"
                            step="0.01"
                            value={unitCost}
                            onChange={(e) => setUnitCost(Number(e.target.value))}
                            placeholder="Ex: 15.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="setupCost">Custo de Setup</Label>
                          <Input
                            id="setupCost"
                            type="number"
                            step="0.01"
                            value={setupCost}
                            onChange={(e) => setSetupCost(Number(e.target.value))}
                            placeholder="Ex: 50.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="workHours">Horas de Trabalho</Label>
                          <Input
                            id="workHours"
                            type="number"
                            step="0.1"
                            value={workHours}
                            onChange={(e) => setWorkHours(Number(e.target.value))}
                            placeholder="Ex: 1.5"
                          />
                        </div>
                      </div>
                    )}

                    {productType !== "bordado" && productType !== "personalizado" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="workHours">Horas de Trabalho</Label>
                          <Input
                            id="workHours"
                            type="number"
                            step="0.1"
                            value={workHours}
                            onChange={(e) => setWorkHours(Number(e.target.value))}
                            placeholder="Ex: 1.0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="hourlyRate">Valor por Hora</Label>
                          <Input
                            id="hourlyRate"
                            type="number"
                            step="0.01"
                            value={hourlyRate}
                            onChange={(e) => setHourlyRate(Number(e.target.value))}
                            placeholder="Ex: 25.00"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="materials" className="space-y-4">
                {/* Info Card */}
                <Card className="bg-blue-50 border border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">💡</div>
                      <div className="flex-1 text-sm text-blue-900">
                        <strong className="font-semibold">Calculadora de Tecido:</strong>
                        <p className="mt-1 text-blue-800">
                          Para calcular o uso de tecido automaticamente, selecione <strong>"Tecido"</strong> e informe:
                        </p>
                        <ul className="list-disc list-inside mt-1 space-y-1 text-blue-800">
                          <li>Largura do tecido (ex: Tricoline tem 1.5m)</li>
                          <li>Dimensões da peça necessária (largura × comprimento em cm)</li>
                          <li>Quantidade de peças</li>
                          <li>Preço por metro</li>
                        </ul>
                        <p className="mt-2 italic">O sistema calculará automaticamente quanto tecido você precisa comprar!</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <Package className="w-5 h-5 text-green-600" />
                      Materiais e Insumos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Tipo de Material */}
                    <div className="space-y-2">
                      <Label>Tipo de Material</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={newMaterial.materialType === "fabric" ? "default" : "outline"}
                          onClick={() => setNewMaterial({...newMaterial, materialType: "fabric"})}
                          className="flex-1"
                        >
                          🧵 Tecido
                        </Button>
                        <Button
                          type="button"
                          variant={newMaterial.materialType === "other" ? "default" : "outline"}
                          onClick={() => setNewMaterial({...newMaterial, materialType: "other"})}
                          className="flex-1"
                        >
                          📦 Outro
                        </Button>
                      </div>
                    </div>

                    {/* Nome e Tipo */}
                    <div className="space-y-2">
                      <Label>Nome do Material *</Label>
                      <Input
                        placeholder={newMaterial.materialType === "fabric" ? "Ex: Tricoline" : "Ex: Linha de bordado"}
                        value={newMaterial.name}
                        onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                        className="border-input focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    </div>

                    {newMaterial.materialType === "fabric" ? (
                      <>
                        {/* Info sobre como funciona */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs text-blue-800">
                            ℹ️ O cálculo é automático por peça. A quantidade que você adicionar aqui será a quantidade TOTAL de peças que você vai produzir.
                          </p>
                        </div>

                        {/* Dimensões do Tecido */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Largura do tecido (m) *</Label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Ex: 1.5"
                              value={newMaterial.fabricWidth || ""}
                              onChange={(e) => setNewMaterial({...newMaterial, fabricWidth: Number(e.target.value)})}
                            />
                            <p className="text-xs text-gray-500">Ex: Tricoline tem 1.5m de largura</p>
                          </div>
                          <div className="space-y-2">
                            <Label>Comprimento do tecido comprado (m)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Ex: 1.0"
                              value={newMaterial.fabricLength || ""}
                              onChange={(e) => setNewMaterial({...newMaterial, fabricLength: Number(e.target.value)})}
                            />
                          </div>
                        </div>

                        {/* Dimensões da Peça */}
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Dimensões da peça necessária:</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Largura da peça (cm) *</Label>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="Ex: 20"
                                value={newMaterial.pieceWidth || ""}
                                onChange={(e) => setNewMaterial({...newMaterial, pieceWidth: Number(e.target.value)})}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Comprimento da peça (cm) *</Label>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="Ex: 68"
                                value={newMaterial.pieceLength || ""}
                                onChange={(e) => setNewMaterial({...newMaterial, pieceLength: Number(e.target.value)})}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Quantidade de Peças */}
                        <div className="space-y-2">
                          <Label>Quantidade TOTAL de peças a produzir *</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 5"
                            value={newMaterial.quantity || ""}
                            onChange={(e) => setNewMaterial({...newMaterial, quantity: Number(e.target.value)})}
                            className="border-input focus:ring-2 focus:ring-purple-500 transition-all"
                          />
                          <p className="text-xs text-gray-500">
                            O sistema calcula automaticamente o uso de tecido por peça e multiplica pela quantidade total.
                          </p>
                        </div>

                        {/* Preço por metro */}
                        <div className="space-y-2">
                          <Label>Preço por metro *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 15.00"
                            value={newMaterial.unitPrice || ""}
                            onChange={(e) => setNewMaterial({...newMaterial, unitPrice: Number(e.target.value)})}
                            className="border-input focus:ring-2 focus:ring-purple-500 transition-all"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Material normal */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Quantidade *</Label>
                            <Input
                              type="number"
                              placeholder="Ex: 5"
                              value={newMaterial.quantity || ""}
                              onChange={(e) => setNewMaterial({...newMaterial, quantity: Number(e.target.value)})}
                              className="border-input focus:ring-2 focus:ring-purple-500 transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Preço Unitário *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ex: 2.50"
                              value={newMaterial.unitPrice || ""}
                              onChange={(e) => setNewMaterial({...newMaterial, unitPrice: Number(e.target.value)})}
                              className="border-input focus:ring-2 focus:ring-purple-500 transition-all"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <Button onClick={addMaterial} className="w-full bg-green-600 hover:bg-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Material
                    </Button>

                    {/* Lista de Materiais */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Materiais adicionados:</Label>
                      {materials.length === 0 ? (
                        <p className="text-sm text-gray-500 italic text-center py-4">Nenhum material adicionado ainda</p>
                      ) : (
                        materials.map((material) => (
                          <div key={material.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{material.name}</span>
                                  {material.materialType === "fabric" && (
                                    <Badge variant="outline" className="text-xs">🧵 Tecido</Badge>
                                  )}
                                </div>
                                
                                {material.materialType === "fabric" ? (
                                  <div className="text-sm text-gray-600 space-y-1">
                                    <div>
                                      <strong>Tecido:</strong> {material.fabricWidth}m de largura
                                      {material.fabricLength && ` × ${material.fabricLength}m (comprado)`}
                                    </div>
                                    <div>
                                      <strong>Peça:</strong> {material.pieceWidth}cm × {material.pieceLength}cm
                                    </div>
                                    <div>
                                      <strong>Quantidade:</strong> {material.quantity} peça(s)
                                    </div>
                                    {material.calculatedUsage !== undefined && (
                                      <div className="text-green-700 font-medium">
                                        <strong>Uso calculado:</strong> {material.calculatedUsage.toFixed(2)}m 
                                        × {formatCurrency(material.unitPrice)}/m = {formatCurrency(material.calculatedUsage * material.unitPrice)}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-600">
                                    {material.quantity} un. × {formatCurrency(material.unitPrice)} = {formatCurrency(material.quantity * material.unitPrice)}
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMaterial(material.id)}
                                className="text-red-600 hover:text-red-700 ml-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4">
                <Card className="bg-white border border-gray-200/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-purple-600" />
                      Configurações de Preço
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="profitMargin">Margem de Lucro (%)</Label>
                      <Input
                        id="profitMargin"
                        type="number"
                        value={profitMargin}
                        onChange={(e) => setProfitMargin(Number(e.target.value))}
                        placeholder="Ex: 35"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Margem recomendada: 30-50% para produtos artesanais
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Resultado */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/50 shadow-strong card-hover animate-scale-in">
              <CardHeader>
                <CardTitle className="text-purple-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 animate-float" />
                  Resultado Final
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm transition-all duration-200 hover:bg-white/50 p-2 rounded">
                    <span className="text-gray-600">Custo de produção:</span>
                    <span className="font-medium">{formatCurrency(productionCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm transition-all duration-200 hover:bg-white/50 p-2 rounded">
                    <span className="text-gray-600">Materiais:</span>
                    <span className="font-medium">{formatCurrency(totalMaterialsCost)}</span>
                  </div>
                  {productType === "personalizado" && quantity > 1 && (
                    <>
                      <div className="flex justify-between text-sm transition-all duration-200 hover:bg-white/50 p-2 rounded">
                        <span className="text-gray-600">Tempo por unidade:</span>
                        <span className="font-medium">{workHours}h</span>
                      </div>
                      <div className="flex justify-between text-sm transition-all duration-200 hover:bg-white/50 p-2 rounded">
                        <span className="text-gray-600">Tempo total ({quantity} unidades):</span>
                        <span className="font-medium text-blue-600">{getTotalWorkHours().toFixed(1)}h</span>
                      </div>
                      {setupCost > 0 && (
                        <div className="flex justify-between text-sm transition-all duration-200 hover:bg-white/50 p-2 rounded">
                          <span className="text-gray-600">Tempo total + setup:</span>
                          <span className="font-medium text-purple-600">{getTotalTimeWithSetup().toFixed(1)}h</span>
                        </div>
                      )}
                    </>
                  )}
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Lucro ({profitMargin}%):</span>
                    <span className="font-medium text-green-600">{formatCurrency(profitAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold bg-white/70 p-3 rounded-lg shadow-soft">
                    <span className="text-gray-900">Valor Total:</span>
                    <span className="text-purple-600 text-gradient-purple animate-pulse-soft">{formatCurrency(finalPrice)}</span>
                  </div>
                  {quantity > 1 && (
                    <div className="flex justify-between text-sm bg-white/50 p-2 rounded">
                      <span className="text-gray-600">Valor unitário:</span>
                      <span className="font-medium">{formatCurrency(unitPrice)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 space-y-2">
                  <Button onClick={saveAsProduct} variant="outline" className="w-full button-hover shadow-soft">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Produto
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Análise de Rentabilidade */}
            <Card className="bg-white border border-gray-200/50 shadow-medium card-hover animate-fade-in">
              <CardHeader>
                <CardTitle className="text-gray-900 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Análise de Rentabilidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-xs transition-all duration-200 hover:bg-gray-50 p-2 rounded">
                  <span>Margem de lucro:</span>
                  <Badge variant={profitMargin >= 30 ? "default" : "destructive"} className="animate-pulse-soft">
                    {((profitAmount / finalPrice) * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between text-xs transition-all duration-200 hover:bg-gray-50 p-2 rounded">
                  <span>Custo vs Preço:</span>
                  <span className="text-gray-600">
                    {((subtotal / finalPrice) * 100).toFixed(1)}% custos
                  </span>
                </div>
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded transition-all duration-200">
                  {profitMargin >= 35 ? "✅ Margem saudável" : 
                   profitMargin >= 25 ? "⚠️ Margem adequada" : 
                   "❌ Margem baixa"}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}