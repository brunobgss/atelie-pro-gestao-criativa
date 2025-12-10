import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  DollarSign, 
  Tag,
  Loader2,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSync } from "@/contexts/SyncContext";
import { useSyncOperations } from "@/hooks/useSyncOperations";
import { 
  listServicos, 
  createServico, 
  updateServico, 
  deleteServico,
  type ServicoRow 
} from "@/integrations/supabase/servicos";
import { formatCurrency } from "@/utils/formatCurrency";

export default function Servicos() {
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const { syncAfterCreate, syncAfterUpdate, syncAfterDelete } = useSyncOperations();
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos");
  const [filtroAtivo, setFiltroAtivo] = useState<string>("ativos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<ServicoRow | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    preco_padrao: "",
    tempo_estimado: "",
    categoria: "",
    ativo: true
  });

  const { data: servicos = [], isLoading } = useQuery({
    queryKey: ["servicos"],
    queryFn: () => listServicos()
  });

  const servicosFiltrados = servicos.filter(servico => {
    const matchSearch = servico.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        servico.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = filtroCategoria === "todos" || servico.categoria === filtroCategoria;
    const matchAtivo = filtroAtivo === "todos" || 
                      (filtroAtivo === "ativos" && servico.ativo) ||
                      (filtroAtivo === "inativos" && !servico.ativo);
    return matchSearch && matchCategoria && matchAtivo;
  });

  const categorias = Array.from(new Set(servicos.map(s => s.categoria).filter(Boolean)));

  const handleOpenDialog = (servico?: ServicoRow) => {
    if (servico) {
      setEditingServico(servico);
      setFormData({
        nome: servico.nome || "",
        descricao: servico.descricao || "",
        preco_padrao: servico.preco_padrao?.toString() || "0",
        tempo_estimado: servico.tempo_estimado?.toString() || "",
        categoria: servico.categoria || "",
        ativo: servico.ativo ?? true
      });
    } else {
      setEditingServico(null);
      setFormData({
        nome: "",
        descricao: "",
        preco_padrao: "",
        tempo_estimado: "",
        categoria: "",
        ativo: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingServico(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      if (editingServico?.id) {
        const result = await updateServico(editingServico.id, {
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || undefined,
          preco_padrao: formData.preco_padrao ? parseFloat(formData.preco_padrao) : 0,
          tempo_estimado: formData.tempo_estimado ? parseInt(formData.tempo_estimado) : undefined,
          categoria: formData.categoria.trim() || undefined,
          ativo: formData.ativo
        });

        if (result.ok) {
          toast.success("Serviço atualizado com sucesso!");
          syncAfterUpdate('servicos', editingServico.id);
          invalidateRelated('servicos');
          queryClient.invalidateQueries({ queryKey: ["servicos"] });
          handleCloseDialog();
        } else {
          toast.error(result.error || "Erro ao atualizar serviço");
        }
      } else {
        const result = await createServico({
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || undefined,
          preco_padrao: formData.preco_padrao ? parseFloat(formData.preco_padrao) : 0,
          tempo_estimado: formData.tempo_estimado ? parseInt(formData.tempo_estimado) : undefined,
          categoria: formData.categoria.trim() || undefined,
          ativo: formData.ativo
        });

        if (result.ok) {
          toast.success("Serviço criado com sucesso!");
          syncAfterCreate('servicos', result.data);
          invalidateRelated('servicos');
          queryClient.invalidateQueries({ queryKey: ["servicos"] });
          handleCloseDialog();
        } else {
          toast.error(result.error || "Erro ao criar serviço");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar serviço");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este serviço?")) {
      return;
    }

    try {
      setIsDeleting(id);
      const result = await deleteServico(id);
      if (result.ok) {
        toast.success("Serviço excluído com sucesso!");
        syncAfterDelete('servicos', id);
        invalidateRelated('servicos');
        queryClient.invalidateQueries({ queryKey: ["servicos"] });
      } else {
        toast.error(result.error || "Erro ao excluir serviço");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir serviço");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <SidebarTrigger className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-semibold text-foreground truncate">Serviços</h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">Gerencie seus serviços para lançamento rápido</p>
            </div>
          </div>
          <Button onClick={() => handleOpenDialog()} size="sm" className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Novo Serviço
          </Button>
        </div>
      </header>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Filtros */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar serviços..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as categorias</SelectItem>
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat || ""}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroAtivo} onValueChange={setFiltroAtivo}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativos">Apenas ativos</SelectItem>
                  <SelectItem value="inativos">Apenas inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Serviços */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Carregando serviços...</p>
          </div>
        ) : servicosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum serviço encontrado</p>
              <Button onClick={() => handleOpenDialog()} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Serviço
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servicosFiltrados.map((servico) => (
              <Card key={servico.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{servico.nome}</CardTitle>
                      {servico.categoria && (
                        <Badge variant="outline" className="mt-2">
                          <Tag className="h-3 w-3 mr-1" />
                          {servico.categoria}
                        </Badge>
                      )}
                    </div>
                    {servico.ativo ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {servico.descricao && (
                    <p className="text-sm text-muted-foreground mb-4">{servico.descricao}</p>
                  )}
                  <div className="space-y-2 mb-4">
                    {servico.preco_padrao > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {formatCurrency({ value: servico.preco_padrao, currency: 'BRL' })}
                        </span>
                      </div>
                    )}
                    {servico.tempo_estimado && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{servico.tempo_estimado} minutos</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(servico)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(servico.id)}
                      disabled={isDeleting === servico.id}
                      className="flex-1"
                    >
                      {isDeleting === servico.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog de criar/editar */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingServico ? "Editar Serviço" : "Novo Serviço"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Serviço *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Conserto de Zíper"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o serviço..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preco_padrao">Preço Padrão (R$) *</Label>
                  <Input
                    id="preco_padrao"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.preco_padrao}
                    onChange={(e) => setFormData({ ...formData, preco_padrao: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tempo_estimado">Tempo Estimado (minutos)</Label>
                  <Input
                    id="tempo_estimado"
                    type="number"
                    min="0"
                    value={formData.tempo_estimado}
                    onChange={(e) => setFormData({ ...formData, tempo_estimado: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Input
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    placeholder="Ex: Conserto, Ajuste, Personalização"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ativo">Status</Label>
                  <Select
                    value={formData.ativo ? "ativo" : "inativo"}
                    onValueChange={(value) => setFormData({ ...formData, ativo: value === "ativo" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingServico ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

