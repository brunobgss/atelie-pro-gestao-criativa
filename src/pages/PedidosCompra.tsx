import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ShoppingCart, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Calendar,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Building2,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSync } from "@/contexts/SyncContext";
import { 
  listarPedidosCompra, 
  criarPedidoCompra, 
  atualizarPedidoCompra, 
  deletarPedidoCompra,
  getPedidoCompraItens,
  PedidoCompra,
  PedidoCompraItem
} from "@/integrations/supabase/pedidos-compra";
import { listarFornecedores } from "@/integrations/supabase/fornecedores";
import { formatCurrency } from "@/utils/formatCurrency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PedidosCompra() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPedido, setEditingPedido] = useState<PedidoCompra | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PedidoCompra>>({
    fornecedor_id: "",
    codigo: "",
    data_emissao: new Date().toISOString().split('T')[0],
    data_entrega_prevista: "",
    status: "pendente",
    observacoes: ""
  });
  const [itens, setItens] = useState<Omit<PedidoCompraItem, 'id' | 'pedido_compra_id' | 'created_at' | 'updated_at' | 'quantidade_recebida' | 'valor_total'>[]>([]);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["pedidos_compra", filtroStatus],
    queryFn: () => listarPedidosCompra({ status: filtroStatus !== "todos" ? filtroStatus : undefined })
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: listarFornecedores
  });

  const pedidosFiltrados = pedidos.filter(pedido =>
    pedido.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fornecedores.find(f => f.id === pedido.fornecedor_id)?.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'recebido':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Recebido</Badge>;
      case 'enviado':
        return <Badge className="bg-blue-500"><Package className="h-3 w-3 mr-1" />Enviado</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'cancelado':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleOpenDialog = async (pedido?: PedidoCompra) => {
    if (pedido) {
      setEditingPedido(pedido);
      setFormData({
        ...pedido,
        data_emissao: pedido.data_emissao.split('T')[0],
        data_entrega_prevista: pedido.data_entrega_prevista?.split('T')[0] || ""
      });
      // Carregar itens
      const itensPedido = await getPedidoCompraItens(pedido.id!);
      setItens(itensPedido.map(item => ({
        produto_id: item.produto_id,
        variacao_id: item.variacao_id,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario
      })));
    } else {
      setEditingPedido(null);
      setFormData({
        fornecedor_id: "",
        codigo: "",
        data_emissao: new Date().toISOString().split('T')[0],
        data_entrega_prevista: "",
        status: "pendente",
        observacoes: ""
      });
      setItens([]);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPedido(null);
    setItens([]);
  };

  const adicionarItem = () => {
    setItens([...itens, {
      produto_id: undefined,
      variacao_id: undefined,
      descricao: "",
      quantidade: 1,
      valor_unitario: 0
    }]);
  };

  const removerItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const atualizarItem = (index: number, campo: keyof PedidoCompraItem, valor: any) => {
    const novosItens = [...itens];
    novosItens[index] = {
      ...novosItens[index],
      [campo]: valor
    };
    setItens(novosItens);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fornecedor_id) {
      toast.error("Selecione um fornecedor");
      return;
    }

    if (itens.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    for (const item of itens) {
      if (!item.descricao.trim()) {
        toast.error("Descrição do item é obrigatória");
        return;
      }
      if (item.quantidade <= 0) {
        toast.error("Quantidade deve ser maior que zero");
        return;
      }
      if (item.valor_unitario <= 0) {
        toast.error("Valor unitário deve ser maior que zero");
        return;
      }
    }

    try {
      if (editingPedido?.id) {
        // TODO: Implementar atualização de pedido e itens
        toast.info("Atualização de pedido será implementada em breve");
      } else {
        const result = await criarPedidoCompra(formData as Omit<PedidoCompra, 'id' | 'created_at' | 'updated_at' | 'empresa_id' | 'valor_total'>, itens);
        if (result.ok) {
          toast.success("Pedido de compra criado com sucesso!");
          invalidateRelated('pedidos_compra');
          handleCloseDialog();
        } else {
          toast.error(result.error || "Erro ao criar pedido");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar pedido");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este pedido de compra?")) {
      return;
    }

    try {
      setIsDeleting(id);
      const result = await deletarPedidoCompra(id);
      if (result.ok) {
        toast.success("Pedido excluído com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["pedidos_compra"] });
      } else {
        toast.error(result.error || "Erro ao excluir pedido");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir pedido");
    } finally {
      setIsDeleting(null);
    }
  };

  const valorTotal = itens.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <header className="border-b bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center">
          <SidebarTrigger />
          <div className="mr-4 hidden md:flex">
            <h1 className="text-lg font-semibold">Pedidos de Compra</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* Filtros */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar pedidos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="recebido">Recebido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pedido
          </Button>
        </div>

        {/* Lista de Pedidos */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Carregando pedidos...</p>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum pedido de compra encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pedidosFiltrados.map((pedido) => {
              const fornecedor = fornecedores.find(f => f.id === pedido.fornecedor_id);
              return (
                <Card key={pedido.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{pedido.codigo}</h3>
                          {getStatusBadge(pedido.status)}
                        </div>
                        {fornecedor && (
                          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {fornecedor.nome_fantasia}
                          </p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Valor Total</p>
                            <p className="font-semibold">{formatCurrency({ value: pedido.valor_total, currency: 'BRL' })}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Data Emissão</p>
                            <p className="font-semibold">
                              {format(new Date(pedido.data_emissao), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          {pedido.data_entrega_prevista && (
                            <div>
                              <p className="text-muted-foreground">Entrega Prevista</p>
                              <p className="font-semibold">
                                {format(new Date(pedido.data_entrega_prevista), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(pedido)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                        {pedido.status !== 'recebido' && pedido.status !== 'cancelado' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(pedido)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {pedido.status !== 'recebido' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(pedido.id!)}
                            disabled={isDeleting === pedido.id}
                          >
                            {isDeleting === pedido.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialog de criar/editar */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPedido ? "Editar Pedido de Compra" : "Novo Pedido de Compra"}
              </DialogTitle>
              <DialogDescription>
                {editingPedido ? "Visualize e edite o pedido de compra" : "Crie um novo pedido de compra para seu fornecedor"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fornecedor_id">Fornecedor *</Label>
                  <Select
                    value={formData.fornecedor_id || ""}
                    onValueChange={(value) => setFormData({ ...formData, fornecedor_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {fornecedores.map((fornecedor) => (
                        <SelectItem key={fornecedor.id} value={fornecedor.id!}>
                          {fornecedor.nome_fantasia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo || ""}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Será gerado automaticamente se vazio"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_emissao">Data de Emissão *</Label>
                  <Input
                    id="data_emissao"
                    type="date"
                    value={formData.data_emissao || ""}
                    onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_entrega_prevista">Data de Entrega Prevista</Label>
                  <Input
                    id="data_entrega_prevista"
                    type="date"
                    value={formData.data_entrega_prevista || ""}
                    onChange={(e) => setFormData({ ...formData, data_entrega_prevista: e.target.value })}
                  />
                </div>
              </div>

              {/* Tabela de Itens */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Itens do Pedido *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-24">Qtd</TableHead>
                        <TableHead className="w-32">Valor Unit.</TableHead>
                        <TableHead className="w-32">Total</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itens.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                            Nenhum item adicionado
                          </TableCell>
                        </TableRow>
                      ) : (
                        itens.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Input
                                value={item.descricao}
                                onChange={(e) => atualizarItem(index, 'descricao', e.target.value)}
                                placeholder="Descrição do produto"
                                required
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={item.quantidade}
                                onChange={(e) => atualizarItem(index, 'quantidade', parseFloat(e.target.value) || 0)}
                                required
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={item.valor_unitario}
                                onChange={(e) => atualizarItem(index, 'valor_unitario', parseFloat(e.target.value) || 0)}
                                required
                              />
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency({ value: item.quantidade * item.valor_unitario, currency: 'BRL' })}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removerItem(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {itens.length > 0 && (
                  <div className="flex justify-end pt-2 border-t">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total do Pedido:</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency({ value: valorTotal, currency: 'BRL' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes || ""}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                {!editingPedido && (
                  <Button type="submit">
                    Criar Pedido
                  </Button>
                )}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

