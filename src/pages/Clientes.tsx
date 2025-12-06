import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Search, Phone, Mail, Package, Plus, Edit, Trash2, FileText, ShoppingCart, ExternalLink, Eye, MapPin } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createCustomer, deleteCustomer, updateCustomer } from "@/integrations/supabase/customers";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSync } from "@/contexts/SyncContext";
import { useSyncOperations } from "@/hooks/useSyncOperations";
import { validateName, validatePhone, validateEmail, validateForm } from "@/utils/validators";
import { errorHandler } from "@/utils/errorHandler";
import { useNavigate } from "react-router-dom";
import { CustomerRow } from "@/integrations/supabase/customers";

type ClientWithHistory = CustomerRow & {
  orders?: number;
  quotes?: number;
  lastOrder?: string | null;
  lastQuote?: string | null;
  totalValue?: number;
  type?: string;
  ordersList?: unknown[];
  quotesList?: unknown[];
};

export default function Clientes() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { invalidateRelated } = useSync();
  const { syncAfterCreate, syncAfterUpdate, syncAfterDelete, syncWithToast } = useSyncOperations();
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState<ClientWithHistory | null>(null);
  const [editingClient, setEditingClient] = useState<ClientWithHistory | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: ""
  });

  const handleViewClient = (client: ClientWithHistory) => {
    setViewingClient(client);
    setIsViewDialogOpen(true);
  };

  const handleEditClient = (client: ClientWithHistory) => {
    setEditingClient(client);
    setEditForm({
      name: client.name || "",
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingClient) return;
    
    // Se for um cliente de demonstração, simular sucesso
    if (editingClient.id.startsWith('demo-')) {
      console.log("📝 Editando cliente de demonstração:", editingClient.name);
      console.log("📝 Novos dados:", editForm);
      
      // Simular delay de salvamento
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success(`Cliente "${editForm.name}" atualizado com sucesso! (Modo demonstração)`);
      setIsEditDialogOpen(false);
      setEditingClient(null);
      return;
    }
    
    // Para clientes reais, salvar no banco
    try {
      console.log("💾 Salvando cliente real no banco:", editingClient.id);
      console.log("📝 Dados do formulário:", editForm);
      
      // Validar campos obrigatórios
      if (!editForm.name || !editForm.name.trim()) {
        toast.error("Nome é obrigatório");
        return;
      }
      
      if (!editForm.phone || !editForm.phone.trim()) {
        toast.error("Telefone é obrigatório");
        return;
      }
      
      // Preparar dados para atualização
      const updateData: {
        name: string;
        phone: string;
        email?: string;
        address?: string | null;
      } = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim()
      };
      
      // Adicionar campos opcionais apenas se preenchidos
      if (editForm.email && editForm.email.trim()) {
        updateData.email = editForm.email.trim();
      }
      
      if (editForm.address && editForm.address.trim()) {
        updateData.address = editForm.address.trim();
      } else {
        // Se o campo estiver vazio, definir como null para limpar o valor
        updateData.address = null;
      }
      
      console.log("📝 Dados preparados para atualização:", updateData);
      
      const result = await updateCustomer(editingClient.id, updateData);
      
      if (result.ok) {
        toast.success("Cliente atualizado com sucesso!");
        setIsEditDialogOpen(false);
        setEditingClient(null);
        // Sincronização automática
        syncAfterUpdate('customers', editingClient.id, result.data);
      } else {
        console.error("Erro ao atualizar cliente:", result.error);
        toast.error(result.error || "Erro ao atualizar cliente");
      }
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      toast.error("Erro ao atualizar cliente");
    }
  };

  const handleDeleteClient = async (client: ClientWithHistory) => {
    if (confirm(`Tem certeza que deseja excluir "${client.name}"?`)) {
      // Se for um cliente de demonstração, simular exclusão
      if (client.id.startsWith('demo-')) {
        console.log("🗑️ Excluindo cliente de demonstração:", client.name);
        
        // Simular delay de exclusão
        await new Promise(resolve => setTimeout(resolve, 300));
        
        toast.success(`Cliente "${client.name}" excluído com sucesso! (Modo demonstração)`);
        return;
      }
      
      // Para clientes reais, excluir do banco
      try {
        console.log("🗑️ Excluindo cliente real do banco:", client.id);
        
        const result = await deleteCustomer(client.id);
        if (result.ok) {
          toast.success("Cliente excluído com sucesso!");
          // Sincronização automática
          syncAfterDelete('customers', client.id);
        } else {
          toast.error(result.error || "Erro ao excluir cliente");
        }
      } catch (error) {
        console.error("Erro ao excluir cliente:", error);
        toast.error("Erro ao excluir cliente");
      }
    }
  };

  // Função para criar cliente (modo real)
  const createCustomerReal = async (data: { name: string; phone: string; email: string }) => {
    console.log("➕ Criando cliente real no banco:", data);
    
    try {
      const result = await createCustomer(data);
      return result;
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      return { ok: false, error: "Erro ao criar cliente" };
    }
  };

  // Dados de demonstração (sempre funcionam)
  const demoClients: ClientWithHistory[] = [
    {
      id: "demo-1",
      name: "Maria Silva",
      phone: "(11) 98765-4321",
      email: "maria.silva@email.com",
      address: "Rua das Flores, 123",
      orders: 8,
      lastOrder: "2025-10-12",
      type: "VIP",
    },
    {
      id: "demo-2", 
      name: "João Santos",
      phone: "(11) 97654-3210",
      email: "joao.santos@email.com",
      address: "Av. Principal, 456",
      orders: 3,
      lastOrder: "2025-10-10",
      type: "Regular",
    },
    {
      id: "demo-3",
      name: "Ana Costa",
      phone: "(11) 96543-2109",
      email: "ana.costa@email.com",
      address: "Rua da Paz, 789",
      orders: 5,
      lastOrder: "2025-10-15",
      type: "VIP",
    },
    {
      id: "demo-4",
      name: "Carlos Oliveira",
      phone: "(11) 95432-1098",
      email: "carlos.oliveira@email.com",
      address: "Rua do Comércio, 321",
      orders: 2,
      lastOrder: "2025-10-08",
      type: "Regular",
    }
  ];

  // Buscar clientes reais do banco de dados com histórico
  const { data: realClients = [], isLoading, refetch } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      try {
        console.log("🔍 Buscando clientes do banco de dados...");
        
        // Obter usuário logado
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error("Usuário não logado");
          return [];
        }
        
        console.log("🔍 Usuário logado:", user.id);
        
        // Obter empresa_id do usuário logado
        const { data: userEmpresa, error: userEmpresaError } = await supabase
          .from("user_empresas")
          .select("empresa_id")
          .eq("user_id", user.id)
          .single();
        
        console.log("🔍 Resultado user_empresas:", { userEmpresa, userEmpresaError });
        
        if (userEmpresaError || !userEmpresa?.empresa_id) {
          console.error("Usuário não tem empresa associada:", userEmpresaError);
          return [];
        }
        
        console.log("🔍 Empresa ID encontrada:", userEmpresa.empresa_id);
        
        const { data: customers, error: customersError } = await supabase
          .from("customers")
          .select("*")
          .eq("empresa_id", userEmpresa.empresa_id)
          .order("name", { ascending: true });
        
        console.log("🔍 Resultado consulta customers:", { customers, customersError });
        
        if (customersError) {
          console.warn("Erro ao buscar clientes do banco, usando dados de demonstração:", customersError);
          return [];
        }
        
        if (!customers || customers.length === 0) {
          console.log("Nenhum cliente encontrado no banco, usando dados de demonstração");
          return [];
        }
        
        console.log(`✅ ${customers.length} clientes encontrados no banco`);
        
        // Buscar histórico real de pedidos e orçamentos para cada cliente
        const clientsWithHistory = await Promise.all(
          customers.map(async (client) => {
            // Buscar pedidos do cliente (filtrado por empresa)
            const { data: orders } = await supabase
              .from("atelie_orders")
              .select("code, value, paid, status, delivery_date, created_at")
              .eq("customer_name", client.name)
              .eq("empresa_id", userEmpresa.empresa_id)
              .order("created_at", { ascending: false });
            
            // Buscar orçamentos do cliente (filtrado por empresa)
            const { data: quotes } = await supabase
              .from("atelie_quotes")
              .select("code, total_value, status, date, created_at")
              .eq("customer_name", client.name)
              .eq("empresa_id", userEmpresa.empresa_id)
              .order("created_at", { ascending: false });
            
            // Calcular estatísticas reais
            const totalOrders = orders?.length || 0;
            const totalQuotes = quotes?.length || 0;
            const lastOrderDate = orders?.[0]?.created_at ? 
              new Date(orders[0].created_at).toISOString().split('T')[0] : null;
            const lastQuoteDate = quotes?.[0]?.created_at ? 
              new Date(quotes[0].created_at).toISOString().split('T')[0] : null;
            
            // Determinar tipo de cliente baseado no histórico
            const totalValue = orders?.reduce((sum, order) => sum + (order.value || 0), 0) || 0;
            const type = totalValue > 1000 ? "VIP" : "Regular";
            
            return {
              ...client,
              orders: totalOrders,
              quotes: totalQuotes,
              lastOrder: lastOrderDate,
              lastQuote: lastQuoteDate,
              totalValue: totalValue,
              type: type,
              ordersList: orders || [],
              quotesList: quotes || []
            };
          })
        );
        
        return clientsWithHistory;
      } catch (error) {
        console.warn("Erro ao buscar clientes, usando dados de demonstração:", error);
        return [];
      }
    },
    retry: false,
    staleTime: 0, // Sem cache para sempre buscar dados atualizados
  });

  // Usar clientes reais se disponíveis, senão usar demonstração
  console.log("🔍 Debug - realClients:", realClients);
  console.log("🔍 Debug - realClients.length:", realClients.length);
  console.log("🔍 Debug - demoClients.length:", demoClients.length);
  
  const allClients = realClients.length > 0 ? realClients : demoClients;
  
  // Filtrar clientes pelo termo de busca
  const clients = allClients.filter((client) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      client.name?.toLowerCase().includes(search) ||
      client.phone?.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.address?.toLowerCase().includes(search)
    );
  });
  
  console.log("🔍 Debug - clients final:", clients.length, "clientes");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <SidebarTrigger className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-semibold text-foreground truncate">Clientes</h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">Gerencie seus clientes</p>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full md:w-auto bg-primary hover:bg-primary/90 text-xs md:text-sm">
                <Plus className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Novo Cliente</span>
                <span className="md:hidden">Novo</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Cliente</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome <span className="text-red-500">*</span>
                  </Label>
                  <Input id="name" className="col-span-3" placeholder="Nome completo do cliente" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    Telefone <span className="text-red-500">*</span>
                  </Label>
                  <Input id="phone" className="col-span-3" placeholder="(11) 99999-9999" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email <span className="text-gray-400">(opcional)</span>
                  </Label>
                  <Input id="email" className="col-span-3" placeholder="cliente@email.com" />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    const name = (document.getElementById("name") as HTMLInputElement)?.value;
                    const phone = (document.getElementById("phone") as HTMLInputElement)?.value;
                    const email = (document.getElementById("email") as HTMLInputElement)?.value;
                    
                    // Validação robusta
                    const validation = validateForm(
                      { name, phone, email },
                      {
                        name: validateName,
                        phone: validatePhone,
                        email: (value) => value ? validateEmail(value) : { isValid: true, errors: [] }
                      }
                    );
                    
                    if (!validation.isValid) {
                      validation.errors.forEach(error => toast.error(error));
                      return;
                    }
                    
                    const res = await createCustomerReal({ name, phone, email });
                    if (!res.ok) {
                      const appError = errorHandler.handleSupabaseError(
                        { message: res.error, code: 'CREATE_CUSTOMER_ERROR' },
                        'createCustomer'
                      );
                      toast.error(appError.message);
                      return;
                    }
                    
                    toast.success(`Cliente "${name}" criado com sucesso!`);
                    
                    // Limpar os campos
                    (document.getElementById("name") as HTMLInputElement).value = "";
                    (document.getElementById("phone") as HTMLInputElement).value = "";
                    (document.getElementById("email") as HTMLInputElement).value = "";
                    
                    // Fechar o modal
                    const dialog = document.querySelector('[role="dialog"]');
                    if (dialog) {
                      const closeButton = dialog.querySelector('[aria-label="Close"], [data-state="open"]');
                      if (closeButton) {
                        (closeButton as HTMLElement).click();
                      }
                    }
                    
                    // Sincronização automática
                    syncAfterCreate('customers', res.data);
                  }}
                >
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Search */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Clients Grid */}
        {clients.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm 
                  ? `Nenhum cliente encontrado para "${searchTerm}"`
                  : "Nenhum cliente cadastrado ainda"}
              </p>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="mt-4"
                >
                  Limpar busca
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clients.map((client, index) => (
            <Card
              key={index}
              className="border-border hover:shadow-md transition-all animate-fade-in cursor-pointer"
            >
              <CardHeader>
                  <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {client.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-foreground">
                        {client.name}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={
                          client.type === "VIP"
                            ? "bg-accent/20 text-accent border-accent/30"
                            : "bg-muted text-muted-foreground border-muted-foreground/30"
                        }
                      >
                        {client.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewClient(client);
                      }}
                      className="h-8 w-8 p-0"
                      title="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClient(client);
                      }}
                      className="h-8 w-8 p-0"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClient(client);
                      }}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{client.phone}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{client.email}</span>
                  </div>

                  {/* Histórico Real de Pedidos e Orçamentos */}
                  <div className="pt-3 border-t border-border space-y-2">
                    <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {client.orders} pedidos
                      </span>
                    </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {client.quotes} orçamentos
                    </span>
                      </div>
                    </div>
                    
                    {client.totalValue > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Total gasto: R$ {client.totalValue.toFixed(2)}
                      </div>
                    )}
                    
                    {(client.lastOrder || client.lastQuote) && (
                      <div className="text-xs text-muted-foreground">
                        Última atividade: {
                          client.lastOrder && client.lastQuote ? 
                            (new Date(client.lastOrder) > new Date(client.lastQuote) ? 
                              `Pedido em ${new Date(client.lastOrder).toLocaleDateString('pt-BR')}` :
                              `Orçamento em ${new Date(client.lastQuote).toLocaleDateString('pt-BR')}`) :
                            client.lastOrder ? 
                              `Pedido em ${new Date(client.lastOrder).toLocaleDateString('pt-BR')}` :
                              `Orçamento em ${new Date(client.lastQuote).toLocaleDateString('pt-BR')}`
                        }
                      </div>
                    )}
                    
                    {/* Links para ver histórico */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      {client.orders > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/pedidos');
                          }}
                          className="h-8 text-xs flex-1"
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          Ver Pedidos
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                      {client.quotes > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/orcamentos');
                          }}
                          className="h-8 text-xs flex-1"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Ver Orçamentos
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        )}
      </div>

      {/* Modal de Visualização de Cliente */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {viewingClient?.name?.charAt(0) || ""}
                </span>
              </div>
              <span>Detalhes do Cliente</span>
            </DialogTitle>
          </DialogHeader>
          {viewingClient && (
            <div className="space-y-6 py-4">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Informações Básicas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">Nome</Label>
                    <p className="font-medium">{viewingClient.name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Telefone
                    </Label>
                    <p className="font-medium">{viewingClient.phone || "Não informado"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <p className="font-medium">{viewingClient.email || "Não informado"}</p>
                  </div>
                  {viewingClient.address && (
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-muted-foreground text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Endereço
                      </Label>
                      <p className="font-medium">{viewingClient.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Estatísticas */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Estatísticas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{viewingClient.orders || 0}</div>
                    <div className="text-sm text-muted-foreground">Pedidos</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{viewingClient.quotes || 0}</div>
                    <div className="text-sm text-muted-foreground">Orçamentos</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      R$ {(viewingClient.totalValue || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Gasto</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <Badge
                      variant="outline"
                      className={
                        viewingClient.type === "VIP"
                          ? "bg-accent/20 text-accent border-accent/30"
                          : "bg-muted text-muted-foreground border-muted-foreground/30"
                      }
                    >
                      {viewingClient.type || "Regular"}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-2">Tipo</div>
                  </div>
                </div>
              </div>

              {/* Última Atividade */}
              {(viewingClient.lastOrder || viewingClient.lastQuote) && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Última Atividade</h3>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm">
                      {viewingClient.lastOrder && viewingClient.lastQuote ? 
                        (new Date(viewingClient.lastOrder) > new Date(viewingClient.lastQuote) ? 
                          `Último pedido em ${new Date(viewingClient.lastOrder).toLocaleDateString('pt-BR')}` :
                          `Último orçamento em ${new Date(viewingClient.lastQuote).toLocaleDateString('pt-BR')}`) :
                        viewingClient.lastOrder ? 
                          `Último pedido em ${new Date(viewingClient.lastOrder).toLocaleDateString('pt-BR')}` :
                          `Último orçamento em ${new Date(viewingClient.lastQuote).toLocaleDateString('pt-BR')}`
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Ações Rápidas */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleEditClient(viewingClient);
                  }}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Cliente
                </Button>
                {viewingClient.orders > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      navigate('/pedidos');
                    }}
                    className="flex-1"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Ver Pedidos
                  </Button>
                )}
                {viewingClient.quotes > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      navigate('/orcamentos');
                    }}
                    className="flex-1"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Ver Orçamentos
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Cliente */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                placeholder="Nome do cliente"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">
                Telefone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">
                Email <span className="text-gray-400">(opcional)</span>
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                placeholder="cliente@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">
                Endereço <span className="text-gray-400">(opcional)</span>
              </Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                placeholder="Endereço completo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
