// Página Admin para gerenciar pagamentos de comissões de afiliados
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  DollarSign, 
  Search, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Download,
  Filter,
  User,
  Calendar,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Commission {
  id: string;
  referral_id: string;
  referrer_empresa_id: string;
  referred_empresa_id: string;
  commission_type: string;
  percentage: number;
  amount: number;
  subscription_value: number;
  status: string;
  payment_date?: string;
  period_start?: string;
  period_end?: string;
  created_at: string;
  updated_at: string;
  referrer_empresa?: {
    nome: string;
    email: string;
  };
  referred_empresa?: {
    nome: string;
    email: string;
  };
}

export default function AdminComissoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);

  // Verificar se o usuário é admin
  const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',') || [];
  const isAdmin = user?.email && adminEmails.includes(user.email);

  // Se não for admin, redirecionar
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Buscar todas as comissões
  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () => {
      // Buscar comissões
      const { data: commissionsData, error: commissionsError } = await supabase
        .from("referral_commissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (commissionsError) {
        console.error("Erro ao buscar comissões:", commissionsError);
        toast.error("Erro ao carregar comissões. Verifique se você tem permissão de admin.");
        return [];
      }

      if (!commissionsData || commissionsData.length === 0) {
        return [];
      }

      // Buscar empresas relacionadas
      const empresaIds = new Set<string>();
      commissionsData.forEach((c: any) => {
        if (c.referrer_empresa_id) empresaIds.add(c.referrer_empresa_id);
        if (c.referred_empresa_id) empresaIds.add(c.referred_empresa_id);
      });

      const { data: empresasData } = await supabase
        .from("empresas")
        .select("id, nome, email")
        .in("id", Array.from(empresaIds));

      // Mapear empresas
      const empresasMap = new Map();
      empresasData?.forEach((e: any) => {
        empresasMap.set(e.id, { nome: e.nome, email: e.email });
      });

      // Combinar dados
      return commissionsData.map((c: any) => ({
        ...c,
        referrer_empresa: empresasMap.get(c.referrer_empresa_id),
        referred_empresa: empresasMap.get(c.referred_empresa_id),
      }));
    },
  });

  // Filtrar comissões
  const filteredCommissions = useMemo(() => {
    return commissions.filter((comm: Commission) => {
      const matchesSearch = 
        !searchTerm ||
        comm.referrer_empresa?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.referrer_empresa?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.referred_empresa?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || comm.status === statusFilter;
      const matchesType = typeFilter === "all" || comm.commission_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [commissions, searchTerm, statusFilter, typeFilter]);

  // Estatísticas
  const stats = useMemo(() => {
    const pending = commissions.filter((c: Commission) => c.status === 'pending');
    const paid = commissions.filter((c: Commission) => c.status === 'paid');
    
    const pendingAmount = pending.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);
    const paidAmount = paid.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);
    
    const recurringPending = pending.filter((c: Commission) => c.commission_type === 'recurring');
    const recurringPaid = paid.filter((c: Commission) => c.commission_type === 'recurring');
    
    const recurringMonthly = recurringPaid.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);

    return {
      total: commissions.length,
      pending: pending.length,
      paid: paid.length,
      pendingAmount,
      paidAmount,
      recurringPending: recurringPending.length,
      recurringPaid: recurringPaid.length,
      recurringMonthly,
    };
  }, [commissions]);

  // Marcar como pago
  const handleMarkAsPaid = async () => {
    if (!selectedCommission) return;

    try {
      const { error } = await supabase
        .from("referral_commissions")
        .update({
          status: 'paid',
          payment_date: new Date().toISOString(),
        })
        .eq("id", selectedCommission.id);

      if (error) throw error;

      toast.success("Comissão marcada como paga!");
      setMarkPaidDialogOpen(false);
      setSelectedCommission(null);
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
      queryClient.invalidateQueries({ queryKey: ["referral-commissions"] });
    } catch (error: any) {
      console.error("Erro ao marcar como pago:", error);
      toast.error("Erro ao marcar como pago: " + error.message);
    }
  };

  // Exportar relatório
  const handleExport = () => {
    const csv = [
      ["ID", "Tipo", "Status", "Valor", "Porcentagem", "Referrer", "Referred", "Criado em", "Pago em"].join(","),
      ...filteredCommissions.map((c: Commission) => [
        c.id,
        c.commission_type,
        c.status,
        c.amount,
        c.percentage,
        c.referrer_empresa?.nome || "N/A",
        c.referred_empresa?.nome || "N/A",
        format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        c.payment_date ? format(new Date(c.payment_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "Não pago"
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `comissoes-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    link.style.position = "absolute";
    link.style.left = "-9999px";
    
    document.body.appendChild(link);
    link.click();
    
    // Remover o elemento de forma segura após um pequeno delay
    setTimeout(() => {
      try {
        if (link.parentNode === document.body) {
          document.body.removeChild(link);
        }
      } catch (e) {
        // Ignorar erro se o elemento já foi removido
        console.warn("Erro ao remover link de download:", e);
      }
      URL.revokeObjectURL(url);
    }, 100);
    
    toast.success("Relatório exportado!");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-slate-50">
      <header className="bg-white/90 backdrop-blur-lg border-b border-purple-100 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-4 p-4 md:p-6">
          <SidebarTrigger />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Gerenciar Comissões de Afiliados</h1>
            <p className="text-gray-600 text-sm mt-0.5">Gerencie pagamentos de comissões do programa de indicações</p>
          </div>
        </div>
      </header>

      <div className="p-6 md:p-10 space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                  <div className="text-xs text-gray-600">Pendentes</div>
                  <div className="text-sm font-semibold text-yellow-700">
                    {formatCurrency(stats.pendingAmount)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
                  <div className="text-xs text-gray-600">Pagas</div>
                  <div className="text-sm font-semibold text-green-700">
                    {formatCurrency(stats.paidAmount)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.recurringPaid}</div>
                  <div className="text-xs text-gray-600">Recorrentes Ativas</div>
                  <div className="text-sm font-semibold text-blue-700">
                    {formatCurrency(stats.recurringMonthly)}/mês
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
                  <div className="text-xs text-gray-600">Total</div>
                  <div className="text-sm font-semibold text-purple-700">
                    {formatCurrency(stats.pendingAmount + stats.paidAmount)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="one_time">Única</SelectItem>
                    <SelectItem value="recurring">Recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex items-end">
                <Button onClick={handleExport} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Comissões */}
        <Card>
          <CardHeader>
            <CardTitle>
              Comissões ({filteredCommissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : filteredCommissions.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Nenhuma comissão encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCommissions.map((commission: Commission) => (
                  <Card 
                    key={commission.id} 
                    className={`border-l-4 ${
                      commission.status === 'paid' 
                        ? 'border-l-green-500' 
                        : commission.status === 'pending'
                        ? 'border-l-yellow-500'
                        : 'border-l-red-500'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(parseFloat(commission.amount.toString()))}
                            </div>
                            <Badge 
                              className={
                                commission.status === 'paid' 
                                  ? 'bg-green-500' 
                                  : commission.status === 'pending'
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }
                            >
                              {commission.status === 'paid' ? 'Pago' : commission.status === 'pending' ? 'Pendente' : 'Cancelado'}
                            </Badge>
                            <Badge variant="outline">
                              {commission.commission_type === 'recurring' ? 'Recorrente' : 'Única'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>
                                <strong>Afiliado:</strong> {commission.referrer_empresa?.nome || "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>
                                <strong>Indicado:</strong> {commission.referred_empresa?.nome || "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              <span>
                                <strong>Comissão:</strong> {commission.percentage}% de {formatCurrency(parseFloat(commission.subscription_value.toString()))}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                <strong>Criado:</strong> {format(new Date(commission.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            {commission.payment_date && (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span>
                                  <strong>Pago em:</strong> {format(new Date(commission.payment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                            )}
                            {commission.commission_type === 'recurring' && commission.period_start && (
                              <div className="flex items-center gap-2 text-blue-600">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  <strong>Período:</strong> {format(new Date(commission.period_start), "dd/MM/yyyy", { locale: ptBR })}
                                  {commission.period_end && ` - ${format(new Date(commission.period_end), "dd/MM/yyyy", { locale: ptBR })}`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {commission.status === 'pending' && (
                          <Button
                            onClick={() => {
                              setSelectedCommission(commission);
                              setMarkPaidDialogOpen(true);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marcar como Pago
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para marcar como pago */}
      <Dialog open={markPaidDialogOpen} onOpenChange={setMarkPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Comissão como Paga</DialogTitle>
            <DialogDescription>
              Confirme que a comissão foi paga para o afiliado.
            </DialogDescription>
          </DialogHeader>
          {selectedCommission && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Afiliado:</span>
                  <span className="font-medium">{selectedCommission.referrer_empresa?.nome || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Valor:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(parseFloat(selectedCommission.amount.toString()))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tipo:</span>
                  <span className="font-medium">
                    {selectedCommission.commission_type === 'recurring' ? 'Recorrente' : 'Única'}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMarkAsPaid} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

