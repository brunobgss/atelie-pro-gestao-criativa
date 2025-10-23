import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthProvider';
import { useSync } from '@/contexts/SyncContext';
import { useSyncOperations } from '@/hooks/useSyncOperations';
import { getMedidas, createMedida, updateMedida, deleteMedida, Medida } from '@/integrations/supabase/medidas';
import { getCustomers } from '@/integrations/supabase/customers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { toast } from 'sonner';
import { 
  Ruler, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Download, 
  User,
  Calendar,
  FileText,
  Scissors
} from 'lucide-react';

export default function MedidasClientes() {
  const { empresa } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const { syncAfterCreate, syncAfterUpdate, syncAfterDelete } = useSyncOperations();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedida, setEditingMedida] = useState<Medida | null>(null);
  const [selectedClienteForForm, setSelectedClienteForForm] = useState<string>("");
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    cliente_id: "",
    cliente_nome: "",
    tipo_peca: "blusa" as const,
    
    // Medidas superiores
    busto: "",
    cintura: "",
    quadril: "",
    ombro: "",
    largura_costas: "",
    cava_manga: "",
    grossura_braco: "",
    comprimento_manga: "",
    cana_braco: "",
    alca: "",
    pescoco: "",
    comprimento: "",
    
    // Medidas inferiores
    coxa: "",
    tornozelo: "",
    comprimento_calca: "",
    
    // Detalhes
    detalhes_superior: "",
    detalhes_inferior: "",
    observacoes: "",
    
    // Datas
    data_primeira_prova: "",
    data_entrega: ""
  });

  // Buscar medidas
  const { data: medidas = [], isLoading, refetch } = useQuery({
    queryKey: ['medidas', empresa?.id],
    queryFn: () => getMedidas(empresa?.id || ''),
    enabled: !!empresa?.id
  });

  // Buscar clientes
  const { data: clientes = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers
  });

  // Filtrar medidas
  const filteredMedidas = medidas.filter(medida => {
    const matchesSearch = medida.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         medida.tipo_peca.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCliente = selectedCliente === "all" || medida.cliente_id === selectedCliente;
    return matchesSearch && matchesCliente;
  });

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      cliente_id: "",
      cliente_nome: "",
      tipo_peca: "blusa",
      busto: "",
      cintura: "",
      quadril: "",
      ombro: "",
      largura_costas: "",
      cava_manga: "",
      grossura_braco: "",
      comprimento_manga: "",
      cana_braco: "",
      alca: "",
      pescoco: "",
      comprimento: "",
      coxa: "",
      tornozelo: "",
      comprimento_calca: "",
      detalhes_superior: "",
      detalhes_inferior: "",
      observacoes: "",
      data_primeira_prova: "",
      data_entrega: ""
    });
    setSelectedClienteForForm("");
    setEditingMedida(null);
  };

  // Abrir dialog para criar/editar
  const openDialog = (medida?: Medida) => {
    if (medida) {
      setEditingMedida(medida);
      setFormData({
        cliente_id: medida.cliente_id,
        cliente_nome: medida.cliente_nome,
        tipo_peca: medida.tipo_peca,
        busto: medida.busto?.toString() || "",
        cintura: medida.cintura?.toString() || "",
        quadril: medida.quadril?.toString() || "",
        ombro: medida.ombro?.toString() || "",
        largura_costas: medida.largura_costas?.toString() || "",
        cava_manga: medida.cava_manga?.toString() || "",
        grossura_braco: medida.grossura_braco?.toString() || "",
        comprimento_manga: medida.comprimento_manga?.toString() || "",
        cana_braco: medida.cana_braco?.toString() || "",
        alca: medida.alca?.toString() || "",
        pescoco: medida.pescoco?.toString() || "",
        comprimento: medida.comprimento?.toString() || "",
        coxa: medida.coxa?.toString() || "",
        tornozelo: medida.tornozelo?.toString() || "",
        comprimento_calca: medida.comprimento_calca?.toString() || "",
        detalhes_superior: medida.detalhes_superior || "",
        detalhes_inferior: medida.detalhes_inferior || "",
        observacoes: medida.observacoes || "",
        data_primeira_prova: medida.data_primeira_prova || "",
        data_entrega: medida.data_entrega || ""
      });
      setSelectedClienteForForm(medida.cliente_id);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  // Salvar medida
  const handleSave = async () => {
    if (!selectedClienteForForm) {
      toast.error("Selecione um cliente");
      return;
    }

    const cliente = clientes.find(c => c.id === selectedClienteForForm);
    if (!cliente) {
      toast.error("Cliente não encontrado");
      return;
    }

    const medidaData = {
      cliente_id: selectedClienteForForm,
      cliente_nome: cliente.name,
      tipo_peca: formData.tipo_peca,
      empresa_id: empresa?.id || '',
      
      // Medidas superiores
      busto: formData.busto ? parseFloat(formData.busto) : undefined,
      cintura: formData.cintura ? parseFloat(formData.cintura) : undefined,
      quadril: formData.quadril ? parseFloat(formData.quadril) : undefined,
      ombro: formData.ombro ? parseFloat(formData.ombro) : undefined,
      largura_costas: formData.largura_costas ? parseFloat(formData.largura_costas) : undefined,
      cava_manga: formData.cava_manga ? parseFloat(formData.cava_manga) : undefined,
      grossura_braco: formData.grossura_braco ? parseFloat(formData.grossura_braco) : undefined,
      comprimento_manga: formData.comprimento_manga ? parseFloat(formData.comprimento_manga) : undefined,
      cana_braco: formData.cana_braco ? parseFloat(formData.cana_braco) : undefined,
      alca: formData.alca ? parseFloat(formData.alca) : undefined,
      pescoco: formData.pescoco ? parseFloat(formData.pescoco) : undefined,
      comprimento: formData.comprimento ? parseFloat(formData.comprimento) : undefined,
      
      // Medidas inferiores
      coxa: formData.coxa ? parseFloat(formData.coxa) : undefined,
      tornozelo: formData.tornozelo ? parseFloat(formData.tornozelo) : undefined,
      comprimento_calca: formData.comprimento_calca ? parseFloat(formData.comprimento_calca) : undefined,
      
      // Detalhes
      detalhes_superior: formData.detalhes_superior || undefined,
      detalhes_inferior: formData.detalhes_inferior || undefined,
      observacoes: formData.observacoes || undefined,
      
      // Datas
      data_primeira_prova: formData.data_primeira_prova || undefined,
      data_entrega: formData.data_entrega || undefined
    };

    try {
      let result;
      if (editingMedida) {
        result = await updateMedida(editingMedida.id, medidaData);
        if (result.ok) {
          toast.success("Medidas atualizadas com sucesso!");
          syncAfterUpdate('medidas', editingMedida.id, medidaData);
        } else {
          toast.error(result.error || "Erro ao atualizar medidas");
          return;
        }
      } else {
        result = await createMedida(medidaData);
        if (result.ok) {
          toast.success("Medidas salvas com sucesso!");
          syncAfterCreate('medidas', { ...medidaData, id: result.id });
        } else {
          toast.error(result.error || "Erro ao salvar medidas");
          return;
        }
      }

      invalidateRelated('medidas');
      refetch();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar medidas:", error);
      toast.error("Erro ao salvar medidas");
    }
  };

  // Deletar medida
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir estas medidas?")) return;

    try {
      const result = await deleteMedida(id);
      if (result.ok) {
        toast.success("Medidas excluídas com sucesso!");
        syncAfterDelete('medidas', id);
        invalidateRelated('medidas');
        refetch();
      } else {
        toast.error(result.error || "Erro ao excluir medidas");
      }
    } catch (error) {
      console.error("Erro ao excluir medidas:", error);
      toast.error("Erro ao excluir medidas");
    }
  };

  // Gerar PDF das medidas
  const generatePDF = (medida: Medida) => {
    const pdfHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Medidas - ${medida.cliente_nome}</title>
          <meta charset="utf-8">
          <style>
            @media print {
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; }
              .container { max-width: 800px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .header h1 { font-size: 24px; color: #333; margin-bottom: 10px; }
              .header p { color: #666; font-size: 16px; }
              .section { margin-bottom: 25px; }
              .section h2 { font-size: 18px; color: #2563eb; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
              .measurement-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
              .measurement-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
              .measurement-label { font-weight: bold; color: #374151; }
              .measurement-value { color: #6b7280; }
              .details { background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 10px; }
              .dates { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
              .date-item { text-align: center; }
              .date-label { font-weight: bold; color: #374151; margin-bottom: 5px; }
              .date-value { color: #6b7280; font-size: 16px; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>FICHA DE MEDIDAS</h1>
              <p><strong>Cliente:</strong> ${medida.cliente_nome}</p>
              <p><strong>Tipo de Peça:</strong> ${medida.tipo_peca.toUpperCase()}</p>
              <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
            
            <div class="section">
              <h2>📏 Medidas Superiores</h2>
              <div class="measurement-grid">
                <div>
                  ${medida.busto ? `<div class="measurement-item"><span class="measurement-label">Busto:</span><span class="measurement-value">${medida.busto}cm</span></div>` : ''}
                  ${medida.cintura ? `<div class="measurement-item"><span class="measurement-label">Cintura:</span><span class="measurement-value">${medida.cintura}cm</span></div>` : ''}
                  ${medida.quadril ? `<div class="measurement-item"><span class="measurement-label">Quadril:</span><span class="measurement-value">${medida.quadril}cm</span></div>` : ''}
                  ${medida.ombro ? `<div class="measurement-item"><span class="measurement-label">Ombro:</span><span class="measurement-value">${medida.ombro}cm</span></div>` : ''}
                  ${medida.largura_costas ? `<div class="measurement-item"><span class="measurement-label">Larg. Costas:</span><span class="measurement-value">${medida.largura_costas}cm</span></div>` : ''}
                  ${medida.cava_manga ? `<div class="measurement-item"><span class="measurement-label">Cava Manga:</span><span class="measurement-value">${medida.cava_manga}cm</span></div>` : ''}
                </div>
                <div>
                  ${medida.grossura_braco ? `<div class="measurement-item"><span class="measurement-label">Gross. Braço:</span><span class="measurement-value">${medida.grossura_braco}cm</span></div>` : ''}
                  ${medida.comprimento_manga ? `<div class="measurement-item"><span class="measurement-label">Comp. Manga:</span><span class="measurement-value">${medida.comprimento_manga}cm</span></div>` : ''}
                  ${medida.cana_braco ? `<div class="measurement-item"><span class="measurement-label">Cana Braço:</span><span class="measurement-value">${medida.cana_braco}cm</span></div>` : ''}
                  ${medida.alca ? `<div class="measurement-item"><span class="measurement-label">Alça:</span><span class="measurement-value">${medida.alca}cm</span></div>` : ''}
                  ${medida.pescoco ? `<div class="measurement-item"><span class="measurement-label">Pescoço:</span><span class="measurement-value">${medida.pescoco}cm</span></div>` : ''}
                  ${medida.comprimento ? `<div class="measurement-item"><span class="measurement-label">Comprimento:</span><span class="measurement-value">${medida.comprimento}cm</span></div>` : ''}
                </div>
              </div>
              ${medida.detalhes_superior ? `<div class="details"><strong>Detalhes:</strong> ${medida.detalhes_superior}</div>` : ''}
            </div>
            
            <div class="section">
              <h2>👖 Medidas Inferiores</h2>
              <div class="measurement-grid">
                <div>
                  ${medida.cintura ? `<div class="measurement-item"><span class="measurement-label">Cintura:</span><span class="measurement-value">${medida.cintura}cm</span></div>` : ''}
                  ${medida.quadril ? `<div class="measurement-item"><span class="measurement-label">Quadril:</span><span class="measurement-value">${medida.quadril}cm</span></div>` : ''}
                  ${medida.coxa ? `<div class="measurement-item"><span class="measurement-label">Coxa:</span><span class="measurement-value">${medida.coxa}cm</span></div>` : ''}
                </div>
                <div>
                  ${medida.tornozelo ? `<div class="measurement-item"><span class="measurement-label">Tornozelo:</span><span class="measurement-value">${medida.tornozelo}cm</span></div>` : ''}
                  ${medida.comprimento_calca ? `<div class="measurement-item"><span class="measurement-label">Comp. Calça:</span><span class="measurement-value">${medida.comprimento_calca}cm</span></div>` : ''}
                </div>
              </div>
              ${medida.detalhes_inferior ? `<div class="details"><strong>Detalhes:</strong> ${medida.detalhes_inferior}</div>` : ''}
            </div>
            
            ${medida.observacoes ? `
            <div class="section">
              <h2>📝 Observações</h2>
              <div class="details">${medida.observacoes}</div>
            </div>
            ` : ''}
            
            <div class="dates">
              <div class="date-item">
                <div class="date-label">Data da Primeira Prova</div>
                <div class="date-value">${medida.data_primeira_prova ? new Date(medida.data_primeira_prova).toLocaleDateString('pt-BR') : 'Não definida'}</div>
              </div>
              <div class="date-item">
                <div class="date-label">Data de Entrega</div>
                <div class="date-value">${medida.data_entrega ? new Date(medida.data_entrega).toLocaleDateString('pt-BR') : 'Não definida'}</div>
              </div>
            </div>
            
            <div class="footer">
              <p>Gerado em ${new Date().toLocaleString('pt-BR')} - Ateliê Pro</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(pdfHtml);
      newWindow.document.close();
      newWindow.onload = () => {
        newWindow.print();
      };
    } else {
      toast.error("Não foi possível abrir a janela. Verifique se os pop-ups estão bloqueados.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <SidebarTrigger />
          <Ruler className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Medidas de Clientes</h1>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando medidas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <SidebarTrigger />
        <Ruler className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Medidas de Clientes</h1>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por cliente ou tipo de peça..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedCliente} onValueChange={setSelectedCliente}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clientes.map((cliente) => (
              <SelectItem key={cliente.id} value={cliente.id}>
                {cliente.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Medida
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMedida ? 'Editar Medidas' : 'Nova Medida'}
              </DialogTitle>
              <DialogDescription>
                {editingMedida ? 'Atualize as medidas do cliente' : 'Cadastre as medidas do cliente'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Seleção de Cliente */}
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Select value={selectedClienteForForm} onValueChange={setSelectedClienteForForm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Peça */}
              <div className="space-y-2">
                <Label htmlFor="tipo_peca">Tipo de Peça *</Label>
                <Select value={formData.tipo_peca} onValueChange={(value: any) => setFormData({...formData, tipo_peca: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de peça" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blusa">Blusa</SelectItem>
                    <SelectItem value="vestido">Vestido</SelectItem>
                    <SelectItem value="calca">Calça</SelectItem>
                    <SelectItem value="bermuda">Bermuda</SelectItem>
                    <SelectItem value="saia">Saia</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Tabs defaultValue="superior" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="superior">Medidas Superiores</TabsTrigger>
                  <TabsTrigger value="inferior">Medidas Inferiores</TabsTrigger>
                </TabsList>
                
                <TabsContent value="superior" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="busto">Busto (cm)</Label>
                      <Input
                        id="busto"
                        type="number"
                        step="0.1"
                        value={formData.busto}
                        onChange={(e) => setFormData({...formData, busto: e.target.value})}
                        placeholder="Ex: 90"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cintura">Cintura (cm)</Label>
                      <Input
                        id="cintura"
                        type="number"
                        step="0.1"
                        value={formData.cintura}
                        onChange={(e) => setFormData({...formData, cintura: e.target.value})}
                        placeholder="Ex: 70"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quadril">Quadril (cm)</Label>
                      <Input
                        id="quadril"
                        type="number"
                        step="0.1"
                        value={formData.quadril}
                        onChange={(e) => setFormData({...formData, quadril: e.target.value})}
                        placeholder="Ex: 95"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ombro">Ombro (cm)</Label>
                      <Input
                        id="ombro"
                        type="number"
                        step="0.1"
                        value={formData.ombro}
                        onChange={(e) => setFormData({...formData, ombro: e.target.value})}
                        placeholder="Ex: 12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="largura_costas">Largura Costas (cm)</Label>
                      <Input
                        id="largura_costas"
                        type="number"
                        step="0.1"
                        value={formData.largura_costas}
                        onChange={(e) => setFormData({...formData, largura_costas: e.target.value})}
                        placeholder="Ex: 35"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cava_manga">Cava Manga (cm)</Label>
                      <Input
                        id="cava_manga"
                        type="number"
                        step="0.1"
                        value={formData.cava_manga}
                        onChange={(e) => setFormData({...formData, cava_manga: e.target.value})}
                        placeholder="Ex: 20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="grossura_braco">Grossura Braço (cm)</Label>
                      <Input
                        id="grossura_braco"
                        type="number"
                        step="0.1"
                        value={formData.grossura_braco}
                        onChange={(e) => setFormData({...formData, grossura_braco: e.target.value})}
                        placeholder="Ex: 30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comprimento_manga">Comprimento Manga (cm)</Label>
                      <Input
                        id="comprimento_manga"
                        type="number"
                        step="0.1"
                        value={formData.comprimento_manga}
                        onChange={(e) => setFormData({...formData, comprimento_manga: e.target.value})}
                        placeholder="Ex: 60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cana_braco">Cana Braço (cm)</Label>
                      <Input
                        id="cana_braco"
                        type="number"
                        step="0.1"
                        value={formData.cana_braco}
                        onChange={(e) => setFormData({...formData, cana_braco: e.target.value})}
                        placeholder="Ex: 25"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alca">Alça (cm)</Label>
                      <Input
                        id="alca"
                        type="number"
                        step="0.1"
                        value={formData.alca}
                        onChange={(e) => setFormData({...formData, alca: e.target.value})}
                        placeholder="Ex: 15"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pescoco">Pescoço (cm)</Label>
                      <Input
                        id="pescoco"
                        type="number"
                        step="0.1"
                        value={formData.pescoco}
                        onChange={(e) => setFormData({...formData, pescoco: e.target.value})}
                        placeholder="Ex: 35"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comprimento">Comprimento (cm)</Label>
                      <Input
                        id="comprimento"
                        type="number"
                        step="0.1"
                        value={formData.comprimento}
                        onChange={(e) => setFormData({...formData, comprimento: e.target.value})}
                        placeholder="Ex: 120"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detalhes_superior">Detalhes Superiores</Label>
                    <Textarea
                      id="detalhes_superior"
                      value={formData.detalhes_superior}
                      onChange={(e) => setFormData({...formData, detalhes_superior: e.target.value})}
                      placeholder="Observações específicas sobre as medidas superiores..."
                      rows={3}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="inferior" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="coxa">Coxa (cm)</Label>
                      <Input
                        id="coxa"
                        type="number"
                        step="0.1"
                        value={formData.coxa}
                        onChange={(e) => setFormData({...formData, coxa: e.target.value})}
                        placeholder="Ex: 55"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tornozelo">Tornozelo (cm)</Label>
                      <Input
                        id="tornozelo"
                        type="number"
                        step="0.1"
                        value={formData.tornozelo}
                        onChange={(e) => setFormData({...formData, tornozelo: e.target.value})}
                        placeholder="Ex: 22"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comprimento_calca">Comprimento Calça (cm)</Label>
                      <Input
                        id="comprimento_calca"
                        type="number"
                        step="0.1"
                        value={formData.comprimento_calca}
                        onChange={(e) => setFormData({...formData, comprimento_calca: e.target.value})}
                        placeholder="Ex: 100"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detalhes_inferior">Detalhes Inferiores</Label>
                    <Textarea
                      id="detalhes_inferior"
                      value={formData.detalhes_inferior}
                      onChange={(e) => setFormData({...formData, detalhes_inferior: e.target.value})}
                      placeholder="Observações específicas sobre as medidas inferiores..."
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Observações Gerais */}
              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações Gerais</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  placeholder="Observações gerais sobre as medidas..."
                  rows={3}
                />
              </div>

              {/* Datas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_primeira_prova">Data da Primeira Prova</Label>
                  <Input
                    id="data_primeira_prova"
                    type="date"
                    value={formData.data_primeira_prova}
                    onChange={(e) => setFormData({...formData, data_primeira_prova: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_entrega">Data de Entrega</Label>
                  <Input
                    id="data_entrega"
                    type="date"
                    value={formData.data_entrega}
                    onChange={(e) => setFormData({...formData, data_entrega: e.target.value})}
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  {editingMedida ? 'Atualizar' : 'Salvar'} Medidas
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Medidas */}
      <div className="grid gap-4">
        {filteredMedidas.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Ruler className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {searchTerm || selectedCliente !== "all" ? 'Nenhuma medida encontrada' : 'Nenhuma medida cadastrada'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedCliente !== "all" 
                  ? 'Tente ajustar os filtros de busca' 
                  : 'Comece cadastrando as medidas de um cliente'
                }
              </p>
              {(!searchTerm && selectedCliente === "all") && (
                <Button onClick={() => openDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Primeira Medida
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredMedidas.map((medida) => (
            <Card key={medida.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      {medida.cliente_nome}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Scissors className="w-3 h-3" />
                          {medida.tipo_peca.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(medida.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generatePDF(medida)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog(medida)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(medida.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {medida.busto && (
                    <div>
                      <span className="font-medium text-gray-600">Busto:</span>
                      <span className="ml-2">{medida.busto}cm</span>
                    </div>
                  )}
                  {medida.cintura && (
                    <div>
                      <span className="font-medium text-gray-600">Cintura:</span>
                      <span className="ml-2">{medida.cintura}cm</span>
                    </div>
                  )}
                  {medida.quadril && (
                    <div>
                      <span className="font-medium text-gray-600">Quadril:</span>
                      <span className="ml-2">{medida.quadril}cm</span>
                    </div>
                  )}
                  {medida.ombro && (
                    <div>
                      <span className="font-medium text-gray-600">Ombro:</span>
                      <span className="ml-2">{medida.ombro}cm</span>
                    </div>
                  )}
                  {medida.coxa && (
                    <div>
                      <span className="font-medium text-gray-600">Coxa:</span>
                      <span className="ml-2">{medida.coxa}cm</span>
                    </div>
                  )}
                  {medida.comprimento && (
                    <div>
                      <span className="font-medium text-gray-600">Comprimento:</span>
                      <span className="ml-2">{medida.comprimento}cm</span>
                    </div>
                  )}
                </div>
                {medida.observacoes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Observações:</strong> {medida.observacoes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
