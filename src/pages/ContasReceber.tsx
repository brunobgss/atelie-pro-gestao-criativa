import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  User
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSync } from "@/contexts/SyncContext";
import { listarContasReceber, criarContaReceber, atualizarContaReceber, deletarContaReceber, ContaReceber } from "@/integrations/supabase/contas-receber";
import { getCustomers } from "@/integrations/supabase/customers";
import { formatCurrency } from "@/utils/formatCurrency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ContasReceber() {
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaReceber | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ContaReceber>>({
    descricao: "",
    categoria: "",
    valor_total: 0,
    valor_recebido: 0,
    data_vencimento: "",
    data_recebimento: "",
    status: "pendente",
    forma_pagamento: "",
    observacoes: "",
    cliente_id: undefined,
    pedido_id: undefined
  });

  const { data: contas = [], isLoading } = useQuery({
    queryKey: ["contas_receber", filtroStatus],
    queryFn: () => listarContasReceber({ status: filtroStatus !== "todos" ? filtroStatus : undefined })
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers
  });

  const contasFiltradas = contas.filter(conta =>
    conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clientes.find(c => c.id === conta.cliente_id)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const estatisticas = {
    total: contas.reduce((acc, conta) => acc + conta.valor_total, 0),
    recebido: contas.filter(c => c.status === 'recebido').reduce((acc, conta) => acc + conta.valor_total, 0),
    pendente: contas.filter(c => c.status === 'pendente').reduce((acc, conta) => acc + conta.valor_total, 0),
    atrasado: contas.filter(c => c.status === 'atrasado').reduce((acc, conta) => acc + conta.valor_total, 0)
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'recebido':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Recebido</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'atrasado':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Atrasado</Badge>;
      case 'cancelado':
        return <Badge variant="outline">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleOpenDialog = (conta?: ContaReceber) => {
    if (conta) {
      setEditingConta(conta);
      setFormData({
        ...conta,
        data_vencimento: conta.data_vencimento.split('T')[0],
        data_recebimento: conta.data_recebimento?.split('T')[0] || ""
      });
    } else {
      setEditingConta(null);
      setFormData({
        descricao: "",
        categoria: "",
        valor_total: 0,
        valor_recebido: 0,
        data_vencimento: "",
        data_recebimento: "",
        status: "pendente",
        forma_pagamento: "",
        observacoes: "",
        cliente_id: undefined,
        pedido_id: undefined
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingConta(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.descricao?.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }

    if (!formData.valor_total || formData.valor_total <= 0) {
      toast.error("Valor total deve ser maior que zero");
      return;
    }

    if (!formData.data_vencimento) {
      toast.error("Data de vencimento é obrigatória");
      return;
    }

    try {
      if (editingConta?.id) {
        const result = await atualizarContaReceber(editingConta.id, formData);
        if (result.ok) {
          toast.success("Conta atualizada com sucesso!");
          invalidateRelated('contas_receber');
          handleCloseDialog();
        } else {
          toast.error(result.error || "Erro ao atualizar conta");
        }
      } else {
        const result = await criarContaReceber(formData as Omit<ContaReceber, 'id' | 'created_at' | 'updated_at' | 'empresa_id' | 'valor_recebido'>);
        if (result.ok) {
          toast.success("Conta criada com sucesso!");
          invalidateRelated('contas_receber');
          handleCloseDialog();
        } else {
          toast.error(result.error || "Erro ao criar conta");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar conta");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conta?")) {
      return;
    }

    try {
      setIsDeleting(id);
      const result = await deletarContaReceber(id);
      if (result.ok) {
        toast.success("Conta excluída com sucesso!");
        invalidateRelated('contas_receber');
      } else {
        toast.error(result.error || "Erro ao excluir conta");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir conta");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleMarcarComoRecebido = async (conta: ContaReceber) => {
    const result = await atualizarContaReceber(conta.id!, {
      valor_recebido: conta.valor_total,
      status: 'recebido',
      data_recebimento: new Date().toISOString().split('T')[0]
    });

    if (result.ok) {
      toast.success("Conta marcada como recebida!");
      invalidateRelated('contas_receber');
    } else {
      toast.error(result.error || "Erro ao atualizar conta");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <header className="border-b bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center">
          <SidebarTrigger />
          <div className="mr-4 hidden md:flex">
            <h1 className="text-lg font-semibold">Contas a Receber</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency({ value: estatisticas.total, currency: 'BRL' })}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recebido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency({ value: estatisticas.recebido, currency: 'BRL' })}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency({ value: estatisticas.pendente, currency: 'BRL' })}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Atrasado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency({ value: estatisticas.atrasado, currency: 'BRL' })}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contas..."
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
              <SelectItem value="recebido">Recebido</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>

        {/* Lista de Contas */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Carregando contas...</p>
          </div>
        ) : contasFiltradas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma conta encontrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {contasFiltradas.map((conta) => {
              const cliente = clientes.find(c => c.id === conta.cliente_id);
              return (
                <Card key={conta.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{conta.descricao}</h3>
                          {getStatusBadge(conta.status)}
                        </div>
                        {cliente && (
                          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Cliente: {cliente.name}
                          </p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Valor Total</p>
                            <p className="font-semibold">{formatCurrency({ value: conta.valor_total, currency: 'BRL' })}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Valor Recebido</p>
                            <p className="font-semibold">{formatCurrency({ value: conta.valor_recebido, currency: 'BRL' })}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Vencimento</p>
                            <p className="font-semibold">
                              {format(new Date(conta.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          {conta.data_recebimento && (
                            <div>
                              <p className="text-muted-foreground">Recebimento</p>
                              <p className="font-semibold">
                                {format(new Date(conta.data_recebimento), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {conta.status !== 'recebido' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarcarComoRecebido(conta)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Marcar como Recebido
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(conta)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(conta.id!)}
                          disabled={isDeleting === conta.id}
                        >
                          {isDeleting === conta.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingConta ? "Editar Conta a Receber" : "Nova Conta a Receber"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Input
                  id="descricao"
                  value={formData.descricao || ""}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente_id">Cliente</Label>
                  <Select
                    value={formData.cliente_id || "__none__"}
                    onValueChange={(value) => setFormData({ ...formData, cliente_id: value === "__none__" ? undefined : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Input
                    id="categoria"
                    value={formData.categoria || ""}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor_total">Valor Total *</Label>
                  <Input
                    id="valor_total"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_total || 0}
                    onChange={(e) => setFormData({ ...formData, valor_total: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor_recebido">Valor Recebido</Label>
                  <Input
                    id="valor_recebido"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_recebido || 0}
                    onChange={(e) => setFormData({ ...formData, valor_recebido: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
                  <Input
                    id="data_vencimento"
                    type="date"
                    value={formData.data_vencimento || ""}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_recebimento">Data de Recebimento</Label>
                  <Input
                    id="data_recebimento"
                    type="date"
                    value={formData.data_recebimento || ""}
                    onChange={(e) => setFormData({ ...formData, data_recebimento: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
                  <Select
                    value={formData.forma_pagamento || ""}
                    onValueChange={(value) => setFormData({ ...formData, forma_pagamento: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                      <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status || "pendente"}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="recebido">Recebido</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                <Button type="submit">
                  {editingConta ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

