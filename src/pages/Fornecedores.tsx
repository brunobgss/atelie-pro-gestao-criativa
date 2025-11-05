import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Phone, 
  Mail, 
  MapPin,
  FileText,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSync } from "@/contexts/SyncContext";
import { listarFornecedores, criarFornecedor, atualizarFornecedor, deletarFornecedor, Fornecedor } from "@/integrations/supabase/fornecedores";
import { validateCpfCnpj, validatePhone, validateEmail } from "@/utils/validators";

export default function Fornecedores() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Fornecedor>>({
    nome_fantasia: "",
    razao_social: "",
    cnpj: "",
    cpf: "",
    inscricao_estadual: "",
    email: "",
    telefone: "",
    celular: "",
    endereco_logradouro: "",
    endereco_numero: "",
    endereco_complemento: "",
    endereco_bairro: "",
    endereco_cidade: "",
    endereco_uf: "",
    endereco_cep: "",
    observacoes: "",
    ativo: true
  });

  const { data: fornecedores = [], isLoading } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: listarFornecedores
  });

  const fornecedoresFiltrados = fornecedores.filter(fornecedor =>
    fornecedor.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fornecedor.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fornecedor.cnpj?.includes(searchTerm) ||
    fornecedor.cpf?.includes(searchTerm)
  );

  const handleOpenDialog = (fornecedor?: Fornecedor) => {
    if (fornecedor) {
      setEditingFornecedor(fornecedor);
      setFormData(fornecedor);
    } else {
      setEditingFornecedor(null);
      setFormData({
        nome_fantasia: "",
        razao_social: "",
        cnpj: "",
        cpf: "",
        inscricao_estadual: "",
        email: "",
        telefone: "",
        celular: "",
        endereco_logradouro: "",
        endereco_numero: "",
        endereco_complemento: "",
        endereco_bairro: "",
        endereco_cidade: "",
        endereco_uf: "",
        endereco_cep: "",
        observacoes: "",
        ativo: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFornecedor(null);
    setFormData({
      nome_fantasia: "",
      razao_social: "",
      cnpj: "",
      cpf: "",
      inscricao_estadual: "",
      email: "",
      telefone: "",
      celular: "",
      endereco_logradouro: "",
      endereco_numero: "",
      endereco_complemento: "",
      endereco_bairro: "",
      endereco_cidade: "",
      endereco_uf: "",
      endereco_cep: "",
      observacoes: "",
      ativo: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome_fantasia?.trim()) {
      toast.error("Nome fantasia é obrigatório");
      return;
    }

    if (formData.cnpj && !validateCpfCnpj(formData.cnpj)) {
      toast.error("CNPJ inválido");
      return;
    }

    if (formData.cpf && !validateCpfCnpj(formData.cpf)) {
      toast.error("CPF inválido");
      return;
    }

    if (formData.email && !validateEmail(formData.email)) {
      toast.error("Email inválido");
      return;
    }

    try {
      if (editingFornecedor?.id) {
        const result = await atualizarFornecedor(editingFornecedor.id, formData);
        if (result.ok) {
          toast.success("Fornecedor atualizado com sucesso!");
          invalidateRelated('fornecedores');
          handleCloseDialog();
        } else {
          toast.error(result.error || "Erro ao atualizar fornecedor");
        }
      } else {
        const result = await criarFornecedor(formData as Omit<Fornecedor, 'id' | 'created_at' | 'updated_at' | 'empresa_id'>);
        if (result.ok) {
          toast.success("Fornecedor criado com sucesso!");
          invalidateRelated('fornecedores');
          handleCloseDialog();
        } else {
          toast.error(result.error || "Erro ao criar fornecedor");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar fornecedor");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este fornecedor?")) {
      return;
    }

    try {
      setIsDeleting(id);
      const result = await deletarFornecedor(id);
      if (result.ok) {
        toast.success("Fornecedor excluído com sucesso!");
        invalidateRelated('fornecedores');
      } else {
        toast.error(result.error || "Erro ao excluir fornecedor");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir fornecedor");
    } finally {
      setIsDeleting(null);
    }
  };

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <header className="border-b bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center">
          <SidebarTrigger />
          <div className="mr-4 hidden md:flex">
            <h1 className="text-lg font-semibold">Fornecedores</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* Header com busca e botão */}
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fornecedores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Fornecedor
          </Button>
        </div>

        {/* Lista de fornecedores */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Carregando fornecedores...</p>
          </div>
        ) : fornecedoresFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fornecedoresFiltrados.map((fornecedor) => (
              <Card key={fornecedor.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{fornecedor.nome_fantasia}</CardTitle>
                      {fornecedor.razao_social && (
                        <CardDescription>{fornecedor.razao_social}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(fornecedor)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(fornecedor.id!)}
                        disabled={isDeleting === fornecedor.id}
                      >
                        {isDeleting === fornecedor.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(fornecedor.cnpj || fornecedor.cpf) && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{fornecedor.cnpj || fornecedor.cpf}</span>
                    </div>
                  )}
                  {fornecedor.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{fornecedor.email}</span>
                    </div>
                  )}
                  {(fornecedor.telefone || fornecedor.celular) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{fornecedor.celular || fornecedor.telefone}</span>
                    </div>
                  )}
                  {fornecedor.endereco_cidade && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {fornecedor.endereco_cidade}
                        {fornecedor.endereco_uf && `, ${fornecedor.endereco_uf}`}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog de criar/editar */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingFornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do fornecedor
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_fantasia">Nome Fantasia *</Label>
                  <Input
                    id="nome_fantasia"
                    value={formData.nome_fantasia || ""}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razao_social">Razão Social</Label>
                  <Input
                    id="razao_social"
                    value={formData.razao_social || ""}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj || ""}
                    onChange={(e) => setFormData({ ...formData, cnpj: formatCpfCnpj(e.target.value), cpf: "" })}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf || ""}
                    onChange={(e) => setFormData({ ...formData, cpf: formatCpfCnpj(e.target.value), cnpj: "" })}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                  <Input
                    id="inscricao_estadual"
                    value={formData.inscricao_estadual || ""}
                    onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone || ""}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="celular">Celular</Label>
                  <Input
                    id="celular"
                    value={formData.celular || ""}
                    onChange={(e) => setFormData({ ...formData, celular: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="endereco_logradouro">Logradouro</Label>
                  <Input
                    id="endereco_logradouro"
                    value={formData.endereco_logradouro || ""}
                    onChange={(e) => setFormData({ ...formData, endereco_logradouro: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco_numero">Número</Label>
                  <Input
                    id="endereco_numero"
                    value={formData.endereco_numero || ""}
                    onChange={(e) => setFormData({ ...formData, endereco_numero: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endereco_complemento">Complemento</Label>
                  <Input
                    id="endereco_complemento"
                    value={formData.endereco_complemento || ""}
                    onChange={(e) => setFormData({ ...formData, endereco_complemento: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco_bairro">Bairro</Label>
                  <Input
                    id="endereco_bairro"
                    value={formData.endereco_bairro || ""}
                    onChange={(e) => setFormData({ ...formData, endereco_bairro: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco_cep">CEP</Label>
                  <Input
                    id="endereco_cep"
                    value={formData.endereco_cep || ""}
                    onChange={(e) => setFormData({ ...formData, endereco_cep: formatCep(e.target.value) })}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endereco_cidade">Cidade</Label>
                  <Input
                    id="endereco_cidade"
                    value={formData.endereco_cidade || ""}
                    onChange={(e) => setFormData({ ...formData, endereco_cidade: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco_uf">UF</Label>
                  <Input
                    id="endereco_uf"
                    value={formData.endereco_uf || ""}
                    onChange={(e) => setFormData({ ...formData, endereco_uf: e.target.value.toUpperCase().substring(0, 2) })}
                    placeholder="SP"
                    maxLength={2}
                  />
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
                  {editingFornecedor ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

