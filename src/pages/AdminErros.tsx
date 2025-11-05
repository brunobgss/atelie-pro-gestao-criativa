import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  AlertTriangle, 
  XCircle, 
  Info, 
  Trash2, 
  Download, 
  RefreshCw, 
  Search,
  Calendar,
  Filter,
  Copy,
  CheckCircle2
} from "lucide-react";
import { getErrors, getRecentErrors, errorTracker } from "@/utils/errorTracking";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";

export default function AdminErros() {
  const { user } = useAuth();
  
  // Verificar se o usuário é admin
  const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',') || [];
  const isAdmin = user?.email && adminEmails.includes(user.email);
  
  // Se não for admin, redirecionar para dashboard
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const [errors, setErrors] = useState(getErrors());
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("todos");
  const [timeFilter, setTimeFilter] = useState<string>("todos");
  const [selectedError, setSelectedError] = useState<string | null>(null);

  // Refrescar erros
  const refreshErrors = () => {
    setErrors(getErrors());
    toast.success("Erros atualizados");
  };

  // Filtrar erros
  const filteredErrors = useMemo(() => {
    let filtered = [...errors];

    // Filtro de tempo
    if (timeFilter !== "todos") {
      const hours = parseInt(timeFilter);
      filtered = getRecentErrors(hours);
    }

    // Filtro de severidade
    if (severityFilter !== "todos") {
      filtered = filtered.filter(e => e.severity === severityFilter);
    }

    // Busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.message.toLowerCase().includes(search) ||
        e.url.toLowerCase().includes(search) ||
        e.userId?.toLowerCase().includes(search) ||
        e.email?.toLowerCase().includes(search)
      );
    }

    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [errors, searchTerm, severityFilter, timeFilter]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = errors.length;
    const errors_count = errors.filter(e => e.severity === 'error').length;
    const warnings_count = errors.filter(e => e.severity === 'warning').length;
    const info_count = errors.filter(e => e.severity === 'info').length;
    const last24h = getRecentErrors(24).length;

    return {
      total,
      errors: errors_count,
      warnings: warnings_count,
      info: info_count,
      last24h
    };
  }, [errors]);

  // Limpar todos os erros
  const handleClearAll = () => {
    if (!confirm("Tem certeza que deseja limpar todos os erros? Esta ação não pode ser desfeita.")) {
      return;
    }
    errorTracker.clearErrors();
    setErrors([]);
    toast.success("Todos os erros foram limpos");
  };

  // Exportar erros
  const handleExport = () => {
    const json = errorTracker.exportErrors();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erros-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Erros exportados com sucesso");
  };

  // Copiar erro para clipboard
  const handleCopyError = (error: typeof errors[0]) => {
    const text = JSON.stringify(error, null, 2);
    navigator.clipboard.writeText(text);
    toast.success("Erro copiado para a área de transferência");
  };

  // Obter ícone de severidade
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Obter badge de severidade
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Aviso</Badge>;
      case 'info':
        return <Badge className="bg-blue-500">Info</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  const selectedErrorData = errors.find(e => e.id === selectedError);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <header className="border-b bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-lg font-semibold">Monitoramento de Erros</h1>
              <p className="text-sm text-muted-foreground">Visualize e gerencie erros do sistema</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshErrors}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClearAll}>
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Todos
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Erros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Avisos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.info}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                Últimas 24h
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.last24h}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por mensagem, URL, usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Severidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Severidades</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todo o Período</SelectItem>
                  <SelectItem value="1">Última Hora</SelectItem>
                  <SelectItem value="24">Últimas 24 Horas</SelectItem>
                  <SelectItem value="168">Última Semana</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Erros */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista */}
          <Card>
            <CardHeader>
              <CardTitle>Erros ({filteredErrors.length})</CardTitle>
              <CardDescription>
                {filteredErrors.length === 0 
                  ? "Nenhum erro encontrado" 
                  : "Clique em um erro para ver detalhes"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredErrors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>Nenhum erro encontrado</p>
                    <p className="text-sm">Tudo funcionando perfeitamente! 🎉</p>
                  </div>
                ) : (
                  filteredErrors.map((error) => (
                    <div
                      key={error.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedError === error.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedError(error.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {getSeverityIcon(error.severity)}
                            {getSeverityBadge(error.severity)}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(error.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm font-medium truncate">{error.message}</p>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {error.url}
                          </p>
                          {error.userId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Usuário: {error.email || error.userId}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyError(error);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detalhes */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Erro</CardTitle>
              <CardDescription>
                {selectedErrorData ? "Informações completas do erro selecionado" : "Selecione um erro para ver detalhes"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedErrorData ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Mensagem</h3>
                    <p className="text-sm bg-muted p-3 rounded-lg">{selectedErrorData.message}</p>
                  </div>

                  {selectedErrorData.stack && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Stack Trace</h3>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
                        {selectedErrorData.stack}
                      </pre>
                    </div>
                  )}

                  {selectedErrorData.componentStack && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Component Stack</h3>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
                        {selectedErrorData.componentStack}
                      </pre>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Data/Hora</h3>
                      <p className="text-sm">
                        {format(new Date(selectedErrorData.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Severidade</h3>
                      {getSeverityBadge(selectedErrorData.severity)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2">URL</h3>
                      <p className="text-sm break-all">{selectedErrorData.url}</p>
                    </div>
                    {selectedErrorData.userId && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Usuário</h3>
                        <p className="text-sm">{selectedErrorData.email || selectedErrorData.userId}</p>
                      </div>
                    )}
                  </div>

                  {selectedErrorData.context && Object.keys(selectedErrorData.context).length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Contexto</h3>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
                        {JSON.stringify(selectedErrorData.context, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-semibold mb-2">User Agent</h3>
                    <p className="text-xs bg-muted p-3 rounded-lg break-all">{selectedErrorData.userAgent}</p>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleCopyError(selectedErrorData)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Detalhes Completos
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-12 w-12 mx-auto mb-4" />
                  <p>Selecione um erro da lista para ver os detalhes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

