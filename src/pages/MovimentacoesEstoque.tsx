import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw,
  Search, 
  Filter,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSync } from "@/contexts/SyncContext";
import { listarMovimentacoes, criarMovimentacao, MovimentacaoEstoque } from "@/integrations/supabase/movimentacoes-estoque";
import { getProducts } from "@/integrations/supabase/products";
import { listarVariacoes } from "@/integrations/supabase/variacoes";
import { formatCurrency } from "@/utils/formatCurrency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MovimentacoesEstoque() {
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<MovimentacaoEstoque>>({
    produto_id: undefined,
    variacao_id: undefined,
    tipo_movimentacao: "entrada",
    quantidade: 0,
    motivo: "",
    origem: "ajuste_manual",
    lote: "",
    valor_unitario: 0
  });

  const { data: movimentacoes = [], isLoading } = useQuery({
    queryKey: ["movimentacoes_estoque", filtroTipo],
    queryFn: () => listarMovimentacoes({ tipo_movimentacao: filtroTipo !== "todos" ? filtroTipo : undefined })
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts
  });

  const movimentacoesFiltradas = movimentacoes.filter(mov =>
    mov.motivo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produtos.find(p => p.id === mov.produto_id)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return <Badge className="bg-green-500"><TrendingUp className="h-3 w-3 mr-1" />Entrada</Badge>;
      case 'saida':
        return <Badge className="bg-red-500"><TrendingDown className="h-3 w-3 mr-1" />Saída</Badge>;
      case 'ajuste':
        return <Badge className="bg-blue-500"><RefreshCw className="h-3 w-3 mr-1" />Ajuste</Badge>;
      case 'perda':
        return <Badge className="bg-orange-500"><AlertTriangle className="h-3 w-3 mr-1" />Perda</Badge>;
      case 'devolucao':
        return <Badge className="bg-purple-500"><ArrowUp className="h-3 w-3 mr-1" />Devolução</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      produto_id: undefined,
      variacao_id: undefined,
      tipo_movimentacao: "entrada",
      quantidade: 0,
      motivo: "",
      origem: "ajuste_manual",
      lote: "",
      valor_unitario: 0
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Limpar valores "__none__" antes de validar
    const produtoId = formData.produto_id === "__none__" ? undefined : formData.produto_id;
    const variacaoId = formData.variacao_id === "__none__" ? undefined : formData.variacao_id;

    if (!produtoId && !variacaoId) {
      toast.error("Selecione um produto ou variação");
      return;
    }

    if (!formData.quantidade || formData.quantidade <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }

    if (!formData.motivo?.trim()) {
      toast.error("Motivo é obrigatório");
      return;
    }

    try {
      const dadosMovimentacao = {
        ...formData,
        produto_id: produtoId,
        variacao_id: variacaoId
      } as Omit<MovimentacaoEstoque, 'id' | 'created_at' | 'empresa_id' | 'usuario_id' | 'quantidade_anterior' | 'quantidade_atual'>;
      
      const result = await criarMovimentacao(dadosMovimentacao);
      if (result.ok) {
        toast.success("Movimentação registrada com sucesso!");
        invalidateRelated('movimentacoes_estoque');
        handleCloseDialog();
      } else {
        toast.error(result.error || "Erro ao registrar movimentação");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar movimentação");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <header className="border-b bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center">
          <SidebarTrigger />
          <div className="mr-4 hidden md:flex">
            <h1 className="text-lg font-semibold">Movimentações de Estoque</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* Header com busca e botão */}
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar movimentações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Tipos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
              <SelectItem value="ajuste">Ajuste</SelectItem>
              <SelectItem value="perda">Perda</SelectItem>
              <SelectItem value="devolucao">Devolução</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Movimentação
          </Button>
        </div>

        {/* Lista de Movimentações */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Carregando movimentações...</p>
          </div>
        ) : movimentacoesFiltradas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma movimentação encontrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {movimentacoesFiltradas.map((mov) => {
              const produto = produtos.find(p => p.id === mov.produto_id);
              return (
                <Card key={mov.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getTipoBadge(mov.tipo_movimentacao)}
                          <h3 className="font-semibold">
                            {produto?.name || "Produto"}
                          </h3>
                        </div>
                        {mov.motivo && (
                          <p className="text-sm text-muted-foreground mb-2">{mov.motivo}</p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Quantidade</p>
                            <p className="font-semibold">
                              {mov.tipo_movimentacao === 'entrada' || mov.tipo_movimentacao === 'devolucao' ? '+' : '-'}
                              {mov.quantidade}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Anterior</p>
                            <p className="font-semibold">{mov.quantidade_anterior || 0}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Atual</p>
                            <p className="font-semibold">{mov.quantidade_atual || 0}</p>
                          </div>
                          {mov.valor_unitario && (
                            <div>
                              <p className="text-muted-foreground">Valor Unit.</p>
                              <p className="font-semibold">{formatCurrency({ value: mov.valor_unitario, currency: 'BRL' })}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-muted-foreground">Data</p>
                            <p className="font-semibold">
                              {mov.created_at ? format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                            </p>
                          </div>
                        </div>
                        {mov.lote && (
                          <p className="text-xs text-muted-foreground mt-2">Lote: {mov.lote}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialog de nova movimentação */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Movimentação de Estoque</DialogTitle>
              <DialogDescription>
                Registre uma entrada, saída ou ajuste no estoque
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_movimentacao">Tipo de Movimentação *</Label>
                <Select
                  value={formData.tipo_movimentacao || "entrada"}
                  onValueChange={(value: any) => setFormData({ ...formData, tipo_movimentacao: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="ajuste">Ajuste</SelectItem>
                    <SelectItem value="perda">Perda</SelectItem>
                    <SelectItem value="devolucao">Devolução</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="produto_id">Produto</Label>
                <Select
                  value={formData.produto_id || "__none__"}
                  onValueChange={(value) => setFormData({ ...formData, produto_id: value === "__none__" ? undefined : value, variacao_id: undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {produtos.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.produto_id && formData.produto_id !== "__none__" && (
                <div className="space-y-2">
                  <Label htmlFor="variacao_id">Variação (Opcional)</Label>
                  <Select
                    value={formData.variacao_id || "__none__"}
                    onValueChange={(value) => setFormData({ ...formData, variacao_id: value === "__none__" ? undefined : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma variação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma</SelectItem>
                      {/* TODO: Carregar variações do produto selecionado */}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade *</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.quantidade || 0}
                    onChange={(e) => setFormData({ ...formData, quantidade: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor_unitario">Valor Unitário</Label>
                  <Input
                    id="valor_unitario"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_unitario || 0}
                    onChange={(e) => setFormData({ ...formData, valor_unitario: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo *</Label>
                <Textarea
                  id="motivo"
                  value={formData.motivo || ""}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  placeholder="Ex: Compra de fornecedor, Ajuste de inventário, etc."
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lote">Número do Lote</Label>
                  <Input
                    id="lote"
                    value={formData.lote || ""}
                    onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_validade">Data de Validade</Label>
                  <Input
                    id="data_validade"
                    type="date"
                    value={formData.data_validade || ""}
                    onChange={(e) => setFormData({ ...formData, data_validade: e.target.value || undefined })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Registrar Movimentação
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

