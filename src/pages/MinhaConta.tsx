import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useSync } from "@/contexts/SyncContext";
import { validateName, validateEmail, validatePhone, validateCpfCnpj, validateForm } from "@/utils/validators";
import { errorHandler } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { performanceMonitor } from "@/utils/performanceMonitor";
import { supabase } from "@/integrations/supabase/client";
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
  X,
  Flag
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { useInternationalization } from "@/contexts/InternationalizationContext";
import { Country, COUNTRIES, AVAILABLE_COUNTRIES } from "@/types/internationalization";

export default function MinhaConta() {
  const navigate = useNavigate();
  const { empresa, user, logout, refreshEmpresa } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const { refreshCountry } = useInternationalization();
  const [isEditing, setIsEditing] = useState(false);
  const [shouldReload, setShouldReload] = useState(false);

  // Buscar email do usuário (primeiro tenta profiles, depois empresas)
  const { data: userProfile } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      try {
        // Primeiro tenta buscar na tabela profiles
        const { data, error } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", user.id)
          .single();
        
        if (error && error.code === 'PGRST116') {
          // Perfil não existe, usar email da empresa
          console.log("Perfil não encontrado, usando email da empresa");
          return { email: empresa?.email || user.email || "" };
        }
        
        if (error) {
          console.warn("Erro ao buscar perfil do usuário:", error);
          return { email: empresa?.email || user.email || "" };
        }
        
        return data;
      } catch (error) {
        console.warn("Erro geral ao buscar perfil:", error);
        return { email: empresa?.email || user.email || "" };
      }
    },
    enabled: !!user?.id,
  });

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    endereco: "",
    responsavel: "",
    cpf_cnpj: "",
    country: "BR",
  });

  // Atualizar formData quando empresa e userProfile carregarem
  useEffect(() => {
    if (empresa) {
      setFormData(prev => ({
        ...prev,
        nome: empresa.nome || "",
        telefone: empresa.telefone || "",
        endereco: empresa.endereco || "",
        responsavel: empresa.responsavel || "",
        cpf_cnpj: empresa.cpf_cnpj || "",
        country: empresa.country || "BR",
      }));
    }
  }, [empresa]);

  // Atualizar email quando userProfile carregar
  useEffect(() => {
    if (userProfile?.email) {
      setFormData(prev => ({
        ...prev,
        email: userProfile.email
      }));
    }
  }, [userProfile?.email]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (field === 'country' && value !== empresa?.country) {
      setShouldReload(true);
    }
  };


  // Atualizar contexto quando o país for alterado
  useEffect(() => {
    if (shouldReload) {
      toast.info("País alterado! Aplicando mudanças...", { duration: 1500 });
      const timer = setTimeout(() => {
        // Invalidar cache da empresa para forçar reload
        invalidateRelated('empresas');
        queryClient.refetchQueries({ queryKey: ['empresa'] });
        
        // Atualizar contexto de internacionalização
        refreshCountry();
        
        setShouldReload(false);
        toast.success("Mudanças aplicadas com sucesso!");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [shouldReload, refreshCountry, invalidateRelated, queryClient]);

  const handleSave = async () => {
    // Validação robusta
    const validation = validateForm(
      {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone, 
        cpf_cnpj: formData.cpf_cnpj,
        responsavel: formData.responsavel
        // endereco: formData.endereco // Campo removido - coluna não existe na tabela
      },
      {
        nome: validateName,
        email: validateEmail,
        telefone: validatePhone,
        cpf_cnpj: validateCpfCnpj,
        responsavel: (value) => value ? validateName(value) : { isValid: true, errors: [] },
        // endereco: (value) => value ? { isValid: true, errors: [] } : { isValid: true, errors: [] } // Campo removido
      }
    );
    
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    try {
      // Medir performance da atualização
      await performanceMonitor.measure(
        'updateCompanyData',
        async () => {
          // Importar supabase
          const { supabase } = await import("@/integrations/supabase/client");
          
          // Atualizar dados da empresa no Supabase
          const { error } = await supabase
            .from("empresas")
            .update({
              nome: formData.nome,
              telefone: formData.telefone,
              responsavel: formData.responsavel,
              cpf_cnpj: formData.cpf_cnpj,
              country: formData.country,
              updated_at: new Date().toISOString()
            })
            .eq("id", empresa?.id);

          if (error) {
            throw error;
          }

          // Atualizar email no perfil do usuário (se a tabela existir)
          if (formData.email && user?.id) {
            try {
              const { error: profileError } = await supabase
                .from("profiles")
                .update({
                  email: formData.email,
                  updated_at: new Date().toISOString()
                })
                .eq("user_id", user.id);

              if (profileError) {
                console.warn("Erro ao atualizar email no perfil:", profileError);
                // Se a tabela não existir, atualizar na empresa
                const { error: empresaEmailError } = await supabase
                  .from("empresas")
                  .update({ email: formData.email })
                  .eq("id", empresa?.id);
                
                if (empresaEmailError) {
                  console.warn("Erro ao atualizar email na empresa:", empresaEmailError);
                }
              }
            } catch (error) {
              console.warn("Erro ao tentar atualizar perfil:", error);
              // Fallback: atualizar email na empresa
              const { error: empresaEmailError } = await supabase
                .from("empresas")
                .update({ email: formData.email })
                .eq("id", empresa?.id);
              
              if (empresaEmailError) {
                console.warn("Erro ao atualizar email na empresa:", empresaEmailError);
              }
            }
          }

          if (error) {
            throw error;
          }

          return { success: true };
        },
        'MinhaConta'
      );

      logger.userAction('company_data_updated', 'MINHA_CONTA', { 
        companyId: empresa?.id, 
        fields: Object.keys(formData).filter(key => formData[key as keyof typeof formData])
      });
      
      toast.success("Dados atualizados com sucesso!");
      setIsEditing(false);
      
      // Invalidar cache e recursos relacionados
      invalidateRelated('empresas');
      // Refetch automático
      queryClient.refetchQueries({ queryKey: ["empresa"] });
      
      // Recarregar dados da empresa no AuthProvider
      try {
        await refreshEmpresa();
        console.log("✅ Dados da empresa recarregados com sucesso");
      } catch (error) {
        console.warn("⚠️ Erro ao recarregar empresa:", error);
        // Não falhar o processo por causa disso
      }
    } catch (error: unknown) {
      const appError = errorHandler.handleSupabaseError(error, 'updateCompanyData');
      logger.error('Falha ao atualizar dados da empresa', 'MINHA_CONTA', { 
        companyId: empresa?.id, 
        error: error.message 
      });
      toast.error(appError.message);
    }
  };

  const handleCancel = () => {
    setFormData({
      nome: empresa?.nome || "",
      email: empresa?.email || "",
      telefone: empresa?.telefone || "",
      endereco: empresa?.endereco || "",
      responsavel: empresa?.responsavel || "",
      cpf_cnpj: empresa?.cpf_cnpj || "",
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
    // PRIMEIRO: Verificar se o usuário tem premium ativo
    if (empresa?.is_premium === true) {
      return { status: "premium", days: 0 };
    }
    
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
                <p className="font-medium">
                  {trialStatus.status === "premium" ? "Assinatura Premium" : "Período de Teste"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {trialStatus.status === "premium" 
                    ? "Sua assinatura está ativa e você tem acesso a todos os recursos premium"
                    : trialStatus.status === "expired" 
                    ? "Período de teste expirado" 
                    : trialStatus.status === "expiring"
                    ? `${trialStatus.days} dias restantes`
                    : `${trialStatus.days} dias restantes`
                  }
                </p>
              </div>
              <Badge 
                variant={trialStatus.status === "premium" ? "default" :
                        trialStatus.status === "expired" ? "destructive" : 
                        trialStatus.status === "expiring" ? "secondary" : "default"}
                className={trialStatus.status === "premium" ? "bg-green-100 text-green-800 border-green-200" : ""}
              >
                {trialStatus.status === "premium" ? "Ativo" :
                 trialStatus.status === "expired" ? "Expirado" :
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
            {trialStatus.status === "premium" && (
              <div className="mt-4">
                <Button 
                  onClick={() => navigate("/assinatura")}
                  variant="outline"
                  className="w-full"
                >
                  Gerenciar Assinatura
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
                <Label htmlFor="nome">
                  Nome da Empresa <span className="text-red-500">*</span>
                </Label>
                {isEditing ? (
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange("nome", e.target.value)}
                    placeholder="Nome da sua empresa"
                  />
                ) : (
                  <p className="text-sm font-medium">{formData.nome || "Não informado"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="seu@email.com"
                  />
                ) : (
                  <p className="text-sm font-medium">{formData.email || "Não informado"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">
                  Telefone <span className="text-red-500">*</span>
                </Label>
                {isEditing ? (
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange("telefone", e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                ) : (
                  <p className="text-sm font-medium">{formData.telefone || "Não informado"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsavel">
                  Responsável <span className="text-red-500">*</span>
                </Label>
                {isEditing ? (
                  <Input
                    id="responsavel"
                    value={formData.responsavel}
                    onChange={(e) => handleInputChange("responsavel", e.target.value)}
                    placeholder="Nome do responsável"
                  />
                ) : (
                  <p className="text-sm font-medium">{formData.responsavel || "Não informado"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf_cnpj">
                  CPF/CNPJ <span className="text-red-500">*</span>
                </Label>
                {isEditing ? (
                  <Input
                    id="cpf_cnpj"
                    value={formData.cpf_cnpj}
                    onChange={(e) => handleInputChange("cpf_cnpj", e.target.value)}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  />
                ) : (
                  <p className="text-sm font-medium">{formData.cpf_cnpj || "Não informado"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">
                  País <span className="text-red-500">*</span>
                  {shouldReload && (
                    <span className="ml-2 text-sm text-blue-600 font-medium">
                      (Aplicando mudanças...)
                    </span>
                  )}
                </Label>
                {isEditing ? (
                  <Select value={formData.country} onValueChange={(value) => handleInputChange("country", value)}>
                    <SelectTrigger className={shouldReload ? "border-blue-500 bg-blue-50" : ""}>
                      <SelectValue placeholder="Selecione seu país" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_COUNTRIES.map((country) => {
                        const config = COUNTRIES[country];
                        return (
                          <SelectItem key={country} value={country}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{config.flag}</span>
                              <span>{config.name}</span>
                              <span className="text-muted-foreground text-sm">
                                ({config.currencySymbol})
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{COUNTRIES[formData.country as Country]?.flag}</span>
                    <p className="text-sm font-medium">{COUNTRIES[formData.country as Country]?.name}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">
                Endereço <span className="text-gray-400">(opcional)</span>
              </Label>
              {isEditing ? (
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange("endereco", e.target.value)}
                  placeholder="Endereço completo da empresa"
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


