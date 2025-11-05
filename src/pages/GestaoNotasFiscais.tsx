import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  FileText, 
  Download, 
  RefreshCw, 
  Search, 
  Filter,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  Mail,
  Trash2,
  Edit,
  FileCheck,
  Calendar,
  TrendingUp,
  Package,
  FileEdit,
  MoreVertical,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/AuthProvider";
import { focusNFService } from "@/integrations/focusnf/service";
import { getCurrentEmpresaId } from "@/integrations/supabase/auth-utils";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type FocusNFNota = {
  id?: string;
  empresa_id: string;
  order_id?: string;
  order_code?: string;
  ref: string;
  tipo_nota: 'NFe' | 'NFSe' | 'NFCe' | 'CTe' | 'MDFe' | 'NFCom' | 'MDe';
  status: string;
  numero?: string;
  serie?: string;
  chave_acesso?: string;
  valor_total?: number;
  xml_url?: string;
  danfe_url?: string;
  ambiente?: string;
  erro_mensagem?: string;
  created_at?: string;
  updated_at?: string;
};

export default function GestaoNotasFiscais() {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const [notas, setNotas] = useState<FocusNFNota[]>([]);
  const [loading, setLoading] = useState(true);
  const [consultandoNota, setConsultandoNota] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    if (empresa?.tem_nota_fiscal) {
      loadNotas();
    } else {
      setLoading(false);
    }
  }, [empresa]);

  const loadNotas = async () => {
    try {
      setLoading(true);
      const todasNotas = await focusNFService.listarNotas();
      setNotas(todasNotas);
    } catch (error: any) {
      console.error('Erro ao carregar notas:', error);
      toast.error('Erro ao carregar notas fiscais');
    } finally {
      setLoading(false);
    }
  };

  const handleConsultarNota = async (ref: string) => {
    try {
      setConsultandoNota(ref);
      const result = await focusNFService.consultarNota(ref);
      
      if (result.ok && result.data) {
        // Atualizar nota no banco para limpar erros incorretos
        const { supabase } = await import('@/integrations/supabase/client');
        const empresa_id = await getCurrentEmpresaId();
        
        if (empresa_id) {
          const notaData = result.data;
          
          const { data: notaExistente } = await supabase
            .from('focusnf_notas')
            .select('id')
            .eq('ref', ref)
            .eq('empresa_id', empresa_id)
            .single();

          if (notaExistente) {
            // A resposta da API Focus NF tem campos específicos
            const responseData = notaData as any;
            await supabase
              .from('focusnf_notas')
              .update({
                status: responseData.status || 'processando_autorizacao',
                numero: responseData.numero,
                serie: responseData.serie,
                chave_acesso: responseData.chave_nfe || responseData.chave_acesso,
                xml_url: responseData.caminho_xml_nota_fiscal,
                danfe_url: responseData.caminho_danfe,
                dados_retornados: responseData,
                // Só salvar como erro se realmente for um erro (não autorizado)
                erro_mensagem: responseData.status === 'autorizado' || responseData.status === 'processando_autorizacao'
                  ? null // Limpar erro se autorizado
                  : (responseData.erro_mensagem || (responseData.status === 'erro_autorizacao' || responseData.status === 'denegado' ? responseData.mensagem_sefaz : null) || null),
                updated_at: new Date().toISOString(),
              })
              .eq('id', notaExistente.id);
          }
        }
        
        toast.success('Status atualizado!');
        await loadNotas();
      } else {
        toast.error(result.error || 'Erro ao consultar nota');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao consultar nota');
    } finally {
      setConsultandoNota(null);
    }
  };

  const [dialogCancelarOpen, setDialogCancelarOpen] = useState(false);
  const [notaParaCancelar, setNotaParaCancelar] = useState<string | null>(null);
  const [justificativaCancelamento, setJustificativaCancelamento] = useState('');
  const [cancelando, setCancelando] = useState(false);
  
  const [dialogCartaCorrecaoOpen, setDialogCartaCorrecaoOpen] = useState(false);
  const [notaParaCorrecao, setNotaParaCorrecao] = useState<string | null>(null);
  const [textoCorrecao, setTextoCorrecao] = useState('');
  const [emitindoCartaCorrecao, setEmitindoCartaCorrecao] = useState(false);
  const [excluindoNota, setExcluindoNota] = useState<string | null>(null);

  const handleCancelarNota = async (ref: string) => {
    setNotaParaCancelar(ref);
    setDialogCancelarOpen(true);
  };

  const confirmarCancelamento = async () => {
    if (!justificativaCancelamento || justificativaCancelamento.length < 15) {
      toast.error('Justificativa deve ter no mínimo 15 caracteres');
      return;
    }

    if (!notaParaCancelar) return;

    try {
      setCancelando(true);
      const result = await focusNFService.cancelarNota(notaParaCancelar, justificativaCancelamento);
      
      if (result.ok) {
        toast.success('Nota cancelada com sucesso!');
        setDialogCancelarOpen(false);
        setJustificativaCancelamento('');
        setNotaParaCancelar(null);
        await loadNotas();
      } else {
        toast.error(result.error || 'Erro ao cancelar nota');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar nota');
    } finally {
      setCancelando(false);
    }
  };

  const handleEnviarEmail = (nota: FocusNFNota) => {
    // TODO: Implementar envio de email via API Focus NF
    toast.info('Funcionalidade de envio por email em breve');
  };

  const handleEmitirCartaCorrecao = (ref: string) => {
    setNotaParaCorrecao(ref);
    setDialogCartaCorrecaoOpen(true);
  };

  const confirmarCartaCorrecao = async () => {
    if (!textoCorrecao.trim()) {
      toast.error('Texto da correção é obrigatório');
      return;
    }

    if (!notaParaCorrecao) return;

    try {
      setEmitindoCartaCorrecao(true);
      const result = await focusNFService.emitirCartaCorrecao(notaParaCorrecao, textoCorrecao);
      
      if (result.ok) {
        toast.success('Carta de Correção emitida com sucesso!');
        setDialogCartaCorrecaoOpen(false);
        setTextoCorrecao('');
        setNotaParaCorrecao(null);
        await loadNotas();
      } else {
        toast.error(result.error || 'Erro ao emitir carta de correção');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao emitir carta de correção');
    } finally {
      setEmitindoCartaCorrecao(false);
    }
  };

  const handleExcluirNota = async (notaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta nota fiscal do sistema? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setExcluindoNota(notaId);
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase
        .from('focusnf_notas')
        .delete()
        .eq('id', notaId);

      if (error) {
        throw error;
      }

      toast.success('Nota fiscal excluída com sucesso!');
      await loadNotas();
    } catch (error: any) {
      console.error('Erro ao excluir nota:', error);
      toast.error(error.message || 'Erro ao excluir nota fiscal');
    } finally {
      setExcluindoNota(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'autorizado':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Autorizado</Badge>;
      case 'processando_autorizacao':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Processando</Badge>;
      case 'erro_emissao':
      case 'erro_autorizacao':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      case 'cancelado':
        return <Badge className="bg-gray-500"><X className="h-3 w-3 mr-1" />Cancelado</Badge>;
      case 'denegado':
        return <Badge className="bg-orange-500"><AlertCircle className="h-3 w-3 mr-1" />Denegado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const notasFiltradas = notas.filter(nota => {
    if (filtroStatus !== 'todos' && nota.status !== filtroStatus) return false;
    if (filtroTipo !== 'todos' && nota.tipo_nota !== filtroTipo) return false;
    if (busca && !nota.ref.toLowerCase().includes(busca.toLowerCase()) && 
        !nota.numero?.toLowerCase().includes(busca.toLowerCase()) &&
        !nota.order_code?.toLowerCase().includes(busca.toLowerCase())) return false;
    if (dataInicio && nota.created_at && nota.created_at < dataInicio) return false;
    if (dataFim && nota.created_at && nota.created_at > dataFim + 'T23:59:59') return false;
    return true;
  });

  const estatisticas = {
    total: notas.length,
    autorizadas: notas.filter(n => n.status === 'autorizado').length,
    processando: notas.filter(n => n.status === 'processando_autorizacao').length,
    erros: notas.filter(n => n.status === 'erro_emissao' || n.status === 'erro_autorizacao').length,
    valorTotal: notas.filter(n => n.status === 'autorizado').reduce((acc, n) => acc + (n.valor_total || 0), 0)
  };

  if (!empresa?.tem_nota_fiscal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Notas Fiscais</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Você precisa ter o plano Profissional (com NF) para acessar esta funcionalidade.
              </p>
              <Button onClick={() => navigate('/assinatura')}>
                Ver Planos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center">
          <SidebarTrigger />
          <div className="mr-4 hidden md:flex">
            <h1 className="text-lg font-semibold">Gestão de Notas Fiscais</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.total}</div>
              <p className="text-xs text-muted-foreground mt-1">Notas emitidas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Autorizadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{estatisticas.autorizadas}</div>
              <p className="text-xs text-muted-foreground mt-1">Notas autorizadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processando</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{estatisticas.processando}</div>
              <p className="text-xs text-muted-foreground mt-1">Aguardando autorização</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency({ value: estatisticas.valorTotal, currency: 'BRL' })}</div>
              <p className="text-xs text-muted-foreground mt-1">Valor das notas autorizadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Filtre suas notas fiscais por status, tipo, data ou busca</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ref, número ou pedido..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="autorizado">Autorizado</SelectItem>
                  <SelectItem value="processando_autorizacao">Processando</SelectItem>
                  <SelectItem value="erro_emissao">Erro</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="NFe">NFe</SelectItem>
                  <SelectItem value="NFCe">NFCe</SelectItem>
                  <SelectItem value="NFSe">NFSe</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="Data Início"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />

              <Input
                type="date"
                placeholder="Data Fim"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>

            {(filtroStatus !== 'todos' || filtroTipo !== 'todos' || busca || dataInicio || dataFim) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setFiltroStatus('todos');
                  setFiltroTipo('todos');
                  setBusca('');
                  setDataInicio('');
                  setDataFim('');
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Lista de Notas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Notas Fiscais</CardTitle>
                <CardDescription>
                  {notasFiltradas.length} {notasFiltradas.length === 1 ? 'nota encontrada' : 'notas encontradas'}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadNotas} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-2">Carregando notas fiscais...</p>
              </div>
            ) : notasFiltradas.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma nota fiscal encontrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notasFiltradas.map((nota) => (
                  <Card key={nota.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className="h-5 w-5 text-purple-600" />
                            <div>
                              <h3 className="font-semibold">
                                {nota.tipo_nota} {nota.numero || nota.ref}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Ref: {nota.ref}
                                {nota.order_code && ` • Pedido: ${nota.order_code}`}
                              </p>
                            </div>
                            {getStatusBadge(nota.status)}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Valor</p>
                              <p className="font-semibold">{formatCurrency({ value: nota.valor_total || 0, currency: 'BRL' })}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Série/Numero</p>
                              <p className="font-semibold">{nota.serie || '-'}/{nota.numero || '-'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Data Emissão</p>
                              <p className="font-semibold">
                                {nota.created_at ? format(new Date(nota.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Ambiente</p>
                              <p className="font-semibold">{nota.ambiente === 'producao' ? 'Produção' : 'Homologação'}</p>
                            </div>
                          </div>

                          {nota.erro_mensagem && nota.status !== 'autorizado' && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-800 font-medium">Erro:</p>
                              <p className="text-sm text-red-600">{nota.erro_mensagem}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-start gap-2 ml-4">
                          {/* Menu de ações com dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {nota.status === 'processando_autorizacao' && (
                                <DropdownMenuItem
                                  onClick={() => handleConsultarNota(nota.ref)}
                                  disabled={consultandoNota === nota.ref}
                                >
                                  <RefreshCw className={`h-4 w-4 mr-2 ${consultandoNota === nota.ref ? 'animate-spin' : ''}`} />
                                  Consultar Status
                                </DropdownMenuItem>
                              )}

                              {nota.status === 'autorizado' && (
                                <>
                                  {nota.xml_url && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        const baseUrl = nota.ambiente === 'producao' 
                                          ? 'https://api.focusnfe.com.br'
                                          : 'https://homologacao.focusnfe.com.br';
                                        window.open(`${baseUrl}${nota.xml_url}`, '_blank');
                                      }}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Baixar XML
                                    </DropdownMenuItem>
                                  )}
                                  {nota.danfe_url && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        const baseUrl = nota.ambiente === 'producao' 
                                          ? 'https://api.focusnfe.com.br'
                                          : 'https://homologacao.focusnfe.com.br';
                                        window.open(`${baseUrl}${nota.danfe_url}`, '_blank');
                                      }}
                                    >
                                      <FileCheck className="h-4 w-4 mr-2" />
                                      Baixar DANFE
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleEmitirCartaCorrecao(nota.ref)}>
                                    <FileEdit className="h-4 w-4 mr-2" />
                                    Carta de Correção
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEnviarEmail(nota)}>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Enviar por Email
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleCancelarNota(nota.ref)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Cancelar Nota
                                  </DropdownMenuItem>
                                </>
                              )}

                              {(nota.status === 'erro_emissao' || nota.status === 'erro_autorizacao' || nota.status === 'cancelado') && (
                                <>
                                  {nota.id && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => handleExcluirNota(nota.id!)}
                                        disabled={excluindoNota === nota.id}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        {excluindoNota === nota.id ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4 mr-2" />
                                        )}
                                        Excluir do Sistema
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </>
                              )}

                              {nota.order_code && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => navigate(`/pedidos/${nota.order_code}`)}>
                                    <Package className="h-4 w-4 mr-2" />
                                    Ver Pedido Relacionado
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Cancelamento */}
        <Dialog open={dialogCancelarOpen} onOpenChange={setDialogCancelarOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar Nota Fiscal</DialogTitle>
              <DialogDescription>
                Informe a justificativa para cancelamento da nota fiscal.
                A justificativa deve ter entre 15 e 255 caracteres.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="justificativa">Justificativa *</Label>
                <Input
                  id="justificativa"
                  value={justificativaCancelamento}
                  onChange={(e) => setJustificativaCancelamento(e.target.value)}
                  placeholder="Ex: Erro no preenchimento dos dados do cliente"
                  maxLength={255}
                />
                <p className="text-xs text-muted-foreground">
                  {justificativaCancelamento.length}/255 caracteres (mínimo: 15)
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Atenção:</strong> O cancelamento de nota fiscal só é permitido em até 24 horas após a emissão.
                  Após esse prazo, algumas SEFAZes podem não permitir o cancelamento.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setDialogCancelarOpen(false);
                setJustificativaCancelamento('');
                setNotaParaCancelar(null);
              }} disabled={cancelando}>
                Cancelar
              </Button>
              <Button
                onClick={confirmarCancelamento}
                disabled={cancelando || justificativaCancelamento.length < 15}
                className="bg-red-600 hover:bg-red-700"
              >
                {cancelando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Confirmar Cancelamento
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Carta de Correção */}
        <Dialog open={dialogCartaCorrecaoOpen} onOpenChange={setDialogCartaCorrecaoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Emitir Carta de Correção Eletrônica (CCe)</DialogTitle>
              <DialogDescription>
                Informe o texto da correção que será registrado na Carta de Correção Eletrônica.
                Você pode emitir até 20 correções diferentes para a mesma nota.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="correcao">Texto da Correção *</Label>
                <textarea
                  id="correcao"
                  value={textoCorrecao}
                  onChange={(e) => setTextoCorrecao(e.target.value)}
                  placeholder="Ex: Correção do endereço do destinatário: Rua A, 123"
                  className="w-full min-h-[120px] p-3 border rounded-lg resize-none"
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground">
                  {textoCorrecao.length}/1000 caracteres
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Informação:</strong> A Carta de Correção pode ser usada para corrigir:
                </p>
                <ul className="text-sm text-blue-700 list-disc list-inside mt-2 space-y-1">
                  <li>Dados cadastrais (endereço, telefone, etc.)</li>
                  <li>Observações e informações complementares</li>
                </ul>
                <p className="text-sm text-blue-800 mt-2">
                  <strong>Não pode corrigir:</strong> valores, quantidades, base de cálculo, alíquota, 
                  dados do remetente/destinatário que mudem a identidade, ou data de emissão.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setDialogCartaCorrecaoOpen(false);
                setTextoCorrecao('');
                setNotaParaCorrecao(null);
              }} disabled={emitindoCartaCorrecao}>
                Cancelar
              </Button>
              <Button
                onClick={confirmarCartaCorrecao}
                disabled={emitindoCartaCorrecao || !textoCorrecao.trim()}
              >
                {emitindoCartaCorrecao ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Emitindo...
                  </>
                ) : (
                  <>
                    <FileEdit className="mr-2 h-4 w-4" />
                    Emitir Carta de Correção
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

