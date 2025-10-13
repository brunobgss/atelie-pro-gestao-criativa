import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard, 
  Settings, 
  LogOut,
  Edit,
  Save,
  X
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

export default function MinhaConta() {
  const navigate = useNavigate();
  const { empresa, user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nome: empresa?.nome || "",
    email: empresa?.email || "",
    telefone: empresa?.telefone || "",
    endereco: empresa?.endereco || "",
    responsavel: empresa?.responsavel || "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      // Aqui você implementaria a lógica para salvar os dados da empresa
      toast.success("Dados atualizados com sucesso!");
      setIsEditing(false);
    } catch (error) {
      toast.error("Erro ao atualizar dados");
    }
  };

  const handleCancel = () => {
    setFormData({
      nome: empresa?.nome || "",
      email: empresa?.email || "",
      telefone: empresa?.telefone || "",
      endereco: empresa?.endereco || "",
      responsavel: empresa?.responsavel || "",
    });
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
      toast.success("Logout realizado com sucesso!");
    } catch (error) {
      toast.error("Erro ao fazer logout");
    }
  };

  const getTrialStatus = () => {
    if (!empresa?.trial_end_date) return { status: "unknown", days: 0 };
    
    const trialEnd = new Date(empresa.trial_end_date);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return { status: "expired", days: 0 };
    } else if (diffDays <= 3) {
      return { status: "expiring", days: diffDays };
    } else {
      return { status: "active", days: diffDays };
    }
  };

  const trialStatus = getTrialStatus();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-4 p-6 border-b border-border">
        <SidebarTrigger />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Minha Conta</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas informações e configurações
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Status da Assinatura */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Status da Assinatura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Período de Teste</p>
                <p className="text-sm text-muted-foreground">
                  {trialStatus.status === "expired" 
                    ? "Período de teste expirado" 
                    : trialStatus.status === "expiring"
                    ? `${trialStatus.days} dias restantes`
                    : `${trialStatus.days} dias restantes`
                  }
                </p>
              </div>
              <Badge 
                variant={trialStatus.status === "expired" ? "destructive" : 
                        trialStatus.status === "expiring" ? "secondary" : "default"}
              >
                {trialStatus.status === "expired" ? "Expirado" :
                 trialStatus.status === "expiring" ? "Expirando" : "Ativo"}
              </Badge>
            </div>
            {trialStatus.status === "expired" && (
              <div className="mt-4">
                <Button 
                  onClick={() => navigate("/assinatura")}
                  className="w-full"
                >
                  Renovar Assinatura
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações da Empresa
              </div>
              {!isEditing ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCancel}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSave}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Empresa</Label>
                {isEditing ? (
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange("nome", e.target.value)}
                  />
                ) : (
                  <p className="text-sm font-medium">{formData.nome || "Não informado"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                ) : (
                  <p className="text-sm font-medium">{formData.email || "Não informado"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                {isEditing ? (
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange("telefone", e.target.value)}
                  />
                ) : (
                  <p className="text-sm font-medium">{formData.telefone || "Não informado"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsavel">Responsável</Label>
                {isEditing ? (
                  <Input
                    id="responsavel"
                    value={formData.responsavel}
                    onChange={(e) => handleInputChange("responsavel", e.target.value)}
                  />
                ) : (
                  <p className="text-sm font-medium">{formData.responsavel || "Não informado"}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              {isEditing ? (
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange("endereco", e.target.value)}
                />
              ) : (
                <p className="text-sm font-medium">{formData.endereco || "Não informado"}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informações da Conta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Informações da Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Criação</Label>
                <p className="text-sm font-medium">
                  {empresa?.created_at 
                    ? new Date(empresa.created_at).toLocaleDateString('pt-BR')
                    : "Não informado"
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label>Última Atualização</Label>
                <p className="text-sm font-medium">
                  {empresa?.updated_at 
                    ? new Date(empresa.updated_at).toLocaleDateString('pt-BR')
                    : "Não informado"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate("/assinatura")}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Gerenciar Assinatura
              </Button>
              
              <Separator />
              
              <Button 
                variant="destructive" 
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair da Conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


