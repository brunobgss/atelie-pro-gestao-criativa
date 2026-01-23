import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Search, Phone, Mail, Package, Plus, Edit, Trash2, FileText, ShoppingCart, ExternalLink, Eye, MapPin, RefreshCw, Trash } from "lucide-react";
import { ImportContacts } from "@/components/ImportContacts";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createCustomer, deleteCustomer, updateCustomer, deleteInvalidCustomers } from "@/integrations/supabase/customers";
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
        // Limpar completamente o cache e refetch
        queryClient.removeQueries({ queryKey: ["customers"] });
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        await refetch();
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

  const handleCleanInvalidCustomers = async () => {
    const confirmMessage = "Tem certeza que deseja excluir todos os clientes com nomes inválidos (BR, AO, AR, etc.)?\n\nEsta ação não pode ser desfeita!";
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      toast.loading("Limpando clientes inválidos...", { id: "clean-invalid" });
      const result = await deleteInvalidCustomers();
      
      if (result.ok) {
        toast.success(`✅ ${result.deletedCount || 0} clientes inválidos excluídos com sucesso!`, { id: "clean-invalid" });
        // Limpar cache e refetch
        queryClient.removeQueries({ queryKey: ["customers"] });
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        await refetch();
      } else {
        toast.error(result.error || "Erro ao limpar clientes inválidos", { id: "clean-invalid" });
      }
    } catch (error) {
      console.error("Erro ao limpar clientes inválidos:", error);
      toast.error("Erro ao limpar clientes inválidos", { id: "clean-invalid" });
    }
  };

  const handleDeleteClient = async (client: ClientWithHistory) => {
    const clientName = client.name || "este cliente";
    if (confirm(`Tem certeza que deseja excluir "${clientName}"?`)) {
      // Se for um cliente de demonstração, simular exclusão
      if (client.id.startsWith('demo-')) {
        console.log("🗑️ Excluindo cliente de demonstração:", clientName);
        
        // Simular delay de exclusão
        await new Promise(resolve => setTimeout(resolve, 300));
        
        toast.success(`Cliente "${clientName}" excluído com sucesso! (Modo demonstração)`);
        return;
      }
      
      // Para clientes reais, excluir do banco
      try {
        console.log("🗑️ Excluindo cliente real do banco:", client.id);
        
        const result = await deleteCustomer(client.id);
        if (result.ok) {
          toast.success("Cliente excluído com sucesso!");
          // Limpar completamente o cache e refetch
          queryClient.removeQueries({ queryKey: ["customers"] });
          queryClient.invalidateQueries({ queryKey: ["customers"] });
          await refetch();
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
  const createCustomerReal = async (data: {
    name: string;
    phone: string;
    email: string;
    cpf_cnpj?: string;
    address?: string;
    endereco_logradouro?: string;
    endereco_numero?: string;
    endereco_complemento?: string;
    endereco_bairro?: string;
    endereco_cidade?: string;
    endereco_uf?: string;
    endereco_cep?: string;
  }) => {
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
  const { data: realClients = [], isLoading, refetch, error: queryError } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      try {
        window.console.log("🔍 [CLIENTES] ===== INICIANDO BUSCA =====");
        window.console.log("🔍 [CLIENTES] Iniciando busca de clientes do banco de dados...");
        
        // Obter usuário logado
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          window.console.error("❌ [CLIENTES] Erro ao obter usuário:", userError);
          return [];
        }
        
        window.console.log("✅ [CLIENTES] Usuário logado:", user.id);
        
        // Obter empresa_id do usuário logado
        const { data: userEmpresa, error: userEmpresaError } = await supabase
          .from("user_empresas")
          .select("empresa_id")
          .eq("user_id", user.id)
          .single();
        
        window.console.log("🔍 [CLIENTES] Resultado user_empresas:", { 
          userEmpresa, 
          userEmpresaError,
          empresa_id: userEmpresa?.empresa_id 
        });
        
        if (userEmpresaError || !userEmpresa?.empresa_id) {
          window.console.error("❌ [CLIENTES] Usuário não tem empresa associada:", userEmpresaError);
          return [];
        }
        
        window.console.log("✅ [CLIENTES] Empresa ID encontrada:", userEmpresa.empresa_id);
        
        // Buscar TODOS os clientes da empresa (sem filtros adicionais)
        // IMPORTANTE: Não usar .limit() para garantir que todos sejam retornados
        const { data: customers, error: customersError } = await supabase
          .from("customers")
          .select("*")
          .eq("empresa_id", userEmpresa.empresa_id)
          .order("name", { ascending: true });
        
        window.console.log("🔍 [CLIENTES] Resultado consulta customers:", { 
          count: customers?.length || 0, 
          error: customersError,
          empresa_id_usada: userEmpresa.empresa_id,
          clientes_ids: customers?.map(c => ({ id: c.id, name: c.name, empresa_id: c.empresa_id }))
        });
        
        // Log detalhado de cada cliente para debug
        if (customers && customers.length > 0) {
          window.console.log("📋 [CLIENTES] Dados brutos dos clientes:", customers.map(c => ({
            id: c.id,
            name: c.name,
            name_length: c.name?.length || 0,
            name_type: typeof c.name,
            name_raw: JSON.stringify(c.name),
            phone: c.phone,
            email: c.email
          })));
        }
        
        if (customersError) {
          window.console.error("❌ [CLIENTES] Erro ao buscar clientes:", customersError);
          window.console.error("❌ [CLIENTES] Detalhes do erro:", JSON.stringify(customersError, null, 2));
          return [];
        }
        
        if (!customers || customers.length === 0) {
          window.console.warn("⚠️ [CLIENTES] Nenhum cliente encontrado no banco para empresa_id:", userEmpresa.empresa_id);
          return [];
        }
        
        window.console.log(`✅ [CLIENTES] ${customers.length} clientes encontrados no banco`);
        window.console.log(`✅ [CLIENTES] Nomes dos clientes:`, customers.map(c => c.name || "Sem nome"));
        
        // Filtrar clientes com nomes válidos (mais de 3 caracteres e não são códigos de país)
        const validClients = customers.filter(client => {
          const name = client.name?.trim() || "";
          // Filtrar nomes muito curtos (provavelmente dados corrompidos)
          // Códigos de país comuns: BR, AO, AR, BD, CO, CR, IN, MX, MZ, NI, PK, PT, TM
          const countryCodes = ['BR', 'AO', 'AR', 'BD', 'CO', 'CR', 'IN', 'MX', 'MZ', 'NI', 'PK', 'PT', 'TM'];
          return name.length > 3 && !countryCodes.includes(name.toUpperCase());
        });
        
        const invalidClients = customers.filter(client => {
          const name = client.name?.trim() || "";
          const countryCodes = ['BR', 'AO', 'AR', 'BD', 'CO', 'CR', 'IN', 'MX', 'MZ', 'NI', 'PK', 'PT', 'TM'];
          return name.length <= 3 || countryCodes.includes(name.toUpperCase());
        });
        
        if (invalidClients.length > 0) {
          window.console.warn(`⚠️ [CLIENTES] ${invalidClients.length} clientes com nomes inválidos detectados (serão exibidos sem histórico)`);
        }
        
        // Buscar TODOS os pedidos e orçamentos de uma vez (otimização)
        const allCustomerNames = validClients.map(c => c.name).filter(Boolean);
        
        // Buscar todos os pedidos de uma vez
        const { data: allOrders } = await (supabase
          .from("atelie_orders" as any)
          .select("code, value, paid, status, delivery_date, created_at, customer_name")
          .eq("empresa_id", userEmpresa.empresa_id)
          .in("customer_name", allCustomerNames)
          .order("created_at", { ascending: false }) as any);
        
        // Buscar todos os orçamentos de uma vez
        const { data: allQuotes } = await (supabase
          .from("atelie_quotes" as any)
          .select("code, total_value, status, date, created_at, customer_name")
          .eq("empresa_id", userEmpresa.empresa_id)
          .in("customer_name", allCustomerNames)
          .order("created_at", { ascending: false }) as any);
        
        // Agrupar pedidos e orçamentos por cliente
        const ordersByCustomer = new Map<string, any[]>();
        const quotesByCustomer = new Map<string, any[]>();
        
        (allOrders || []).forEach((order: any) => {
          if (order.customer_name) {
            if (!ordersByCustomer.has(order.customer_name)) {
              ordersByCustomer.set(order.customer_name, []);
            }
            ordersByCustomer.get(order.customer_name)!.push(order);
          }
        });
        
        (allQuotes || []).forEach((quote: any) => {
          if (quote.customer_name) {
            if (!quotesByCustomer.has(quote.customer_name)) {
              quotesByCustomer.set(quote.customer_name, []);
            }
            quotesByCustomer.get(quote.customer_name)!.push(quote);
          }
        });
        
        // Processar clientes válidos com histórico
        const clientsWithHistory = validClients.map((client) => {
          const orders = ordersByCustomer.get(client.name) || [];
          const quotes = quotesByCustomer.get(client.name) || [];
          
          const totalOrders = orders.length;
          const totalQuotes = quotes.length;
          const lastOrderDate = orders[0]?.created_at ? 
            new Date(orders[0].created_at).toISOString().split('T')[0] : null;
          const lastQuoteDate = quotes[0]?.created_at ? 
            new Date(quotes[0].created_at).toISOString().split('T')[0] : null;
          
          const totalValue = orders.reduce((sum, order) => sum + (order.value || 0), 0);
          const type = totalValue > 1000 ? "VIP" : "Regular";
          
          return {
            ...client,
            orders: totalOrders,
            quotes: totalQuotes,
            lastOrder: lastOrderDate,
            lastQuote: lastQuoteDate,
            totalValue: totalValue,
            type: type,
            ordersList: orders,
            quotesList: quotes
          };
        });
        
        // Adicionar clientes inválidos sem histórico (para que possam ser editados)
        const invalidClientsWithoutHistory = invalidClients.map(client => ({
          ...client,
          orders: 0,
          quotes: 0,
          lastOrder: null,
          lastQuote: null,
          totalValue: 0,
          type: "Regular",
          ordersList: [],
          quotesList: []
        }));
        
        // Combinar clientes válidos e inválidos
        const allClientsWithHistory = [...clientsWithHistory, ...invalidClientsWithoutHistory];
        
        console.log(`✅ [CLIENTES] Processamento concluído. Retornando ${clientsWithHistory.length} clientes com histórico`);
        return clientsWithHistory;
      } catch (error) {
        console.error("❌ [CLIENTES] Erro ao buscar clientes:", error);
        console.warn("⚠️ [CLIENTES] Retornando array vazio, será usado dados de demonstração");
        return [];
      }
    },
    retry: false,
    staleTime: 30000, // Cache de 30 segundos para melhorar performance
    refetchOnWindowFocus: false, // Não refetch automático para melhorar performance
    refetchOnMount: true,
  });

  // Logs de debug sempre visíveis
  // Usar clientes reais se disponíveis, senão usar demonstração
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

  // Logs que sempre aparecem (usando window.console para garantir)
  useEffect(() => {
    const debugInfo = {
      isLoading,
      queryError: queryError?.message || null,
      realClientsCount: realClients.length,
      realClientsNames: realClients.map(c => c.name || "Sem nome"),
      demoClientsCount: demoClients.length,
      searchTerm,
      allClientsCount: allClients.length,
      clientsCount: clients.length,
      clientsNames: clients.map(c => c.name || "Sem nome")
    };
    
    // Usar window.console para garantir que não seja removido
    window.console.log("🔍 [CLIENTES] ===== DEBUG INFO =====");
    window.console.log("🔍 [CLIENTES] Debug completo:", JSON.stringify(debugInfo, null, 2));
    window.console.log("🔍 [CLIENTES] isLoading:", isLoading);
    window.console.log("🔍 [CLIENTES] queryError:", queryError);
    window.console.log("🔍 [CLIENTES] realClients.length:", realClients.length);
    window.console.log("🔍 [CLIENTES] realClients:", realClients);
    window.console.log("🔍 [CLIENTES] allClients.length:", allClients.length);
    window.console.log("🔍 [CLIENTES] clients filtrados:", clients.length);
    window.console.log("🔍 [CLIENTES] clientes:", clients.map(c => ({ id: c.id, name: c.name || "Sem nome" })));
    window.console.log("🔍 [CLIENTES] =====================");
  }, [isLoading, queryError, realClients, allClients, clients, searchTerm]);

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
          <div className="flex gap-2 w-full md:w-auto">
            <ImportContacts onImportComplete={() => {
              queryClient.invalidateQueries({ queryKey: ["customers"] });
              refetch();
            }} />
            {realClients.length > 0 && (
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 md:flex-none text-xs md:text-sm border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={handleCleanInvalidCustomers}
                title="Limpar clientes com nomes inválidos (BR, AO, AR, etc.)"
              >
                <Trash className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Limpar Inválidos</span>
                <span className="md:hidden">Limpar</span>
              </Button>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-xs md:text-sm">
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cpf_cnpj" className="text-right">
                  CPF/CNPJ <span className="text-gray-400">(opcional)</span>
                </Label>
                <Input id="cpf_cnpj" className="col-span-3" placeholder="Digite o CPF ou CNPJ" />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Endereço <span className="text-gray-400">(opcional)</span>
                </Label>
                <Textarea
                  id="address"
                  className="col-span-3"
                  placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
                  rows={2}
                />
              </div>

              <div className="border-t pt-4 col-span-4">
                <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                  Endereço Detalhado (Campos Separados)
                  <span className="text-xs text-muted-foreground font-normal">Opcional - Facilita preenchimento</span>
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="endereco_logradouro" className="text-sm">Logradouro</Label>
                    <Input
                      id="endereco_logradouro"
                      placeholder="Rua, Avenida, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endereco_numero" className="text-sm">Número</Label>
                    <Input
                      id="endereco_numero"
                      placeholder="123"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endereco_complemento" className="text-sm">Complemento</Label>
                    <Input
                      id="endereco_complemento"
                      placeholder="Apto, bloco, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endereco_bairro" className="text-sm">Bairro</Label>
                    <Input
                      id="endereco_bairro"
                      placeholder="Bairro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endereco_cidade" className="text-sm">Cidade</Label>
                    <Input
                      id="endereco_cidade"
                      placeholder="Cidade"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endereco_uf" className="text-sm">UF</Label>
                    <Input
                      id="endereco_uf"
                      placeholder="SP"
                      maxLength={2}
                      onChange={(e) => {
                        const input = e.target as HTMLInputElement;
                        input.value = input.value.toUpperCase();
                      }}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="endereco_cep" className="text-sm">CEP</Label>
                    <Input
                      id="endereco_cep"
                      placeholder="00000-000"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={async () => {
                    const name = (document.getElementById("name") as HTMLInputElement)?.value;
                    const phone = (document.getElementById("phone") as HTMLInputElement)?.value;
                    const email = (document.getElementById("email") as HTMLInputElement)?.value;
                    const cpf_cnpj = (document.getElementById("cpf_cnpj") as HTMLInputElement)?.value;
                    const address = (document.getElementById("address") as HTMLTextAreaElement)?.value;
                    const endereco_logradouro = (document.getElementById("endereco_logradouro") as HTMLInputElement)?.value;
                    const endereco_numero = (document.getElementById("endereco_numero") as HTMLInputElement)?.value;
                    const endereco_complemento = (document.getElementById("endereco_complemento") as HTMLInputElement)?.value;
                    const endereco_bairro = (document.getElementById("endereco_bairro") as HTMLInputElement)?.value;
                    const endereco_cidade = (document.getElementById("endereco_cidade") as HTMLInputElement)?.value;
                    const endereco_uf = (document.getElementById("endereco_uf") as HTMLInputElement)?.value;
                    const endereco_cep = (document.getElementById("endereco_cep") as HTMLInputElement)?.value;

                    // Validação robusta
                    const validation = validateForm(
                      { name, phone, email },
                      {
                        name: validateName,
                        phone: validatePhone,
                        email: (value) => value && typeof value === 'string' ? validateEmail(value) : { isValid: true, errors: [] }
                      }
                    );

                    if (!validation.isValid) {
                      validation.errors.forEach(error => toast.error(error));
                      return;
                    }

                    const res = await createCustomerReal({
                      name,
                      phone,
                      email,
                      cpf_cnpj,
                      address,
                      endereco_logradouro,
                      endereco_numero,
                      endereco_complemento,
                      endereco_bairro,
                      endereco_cidade,
                      endereco_uf,
                      endereco_cep
                    });
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
                    (document.getElementById("cpf_cnpj") as HTMLInputElement).value = "";
                    (document.getElementById("address") as HTMLTextAreaElement).value = "";
                    (document.getElementById("endereco_logradouro") as HTMLInputElement).value = "";
                    (document.getElementById("endereco_numero") as HTMLInputElement).value = "";
                    (document.getElementById("endereco_complemento") as HTMLInputElement).value = "";
                    (document.getElementById("endereco_bairro") as HTMLInputElement).value = "";
                    (document.getElementById("endereco_cidade") as HTMLInputElement).value = "";
                    (document.getElementById("endereco_uf") as HTMLInputElement).value = "";
                    (document.getElementById("endereco_cep") as HTMLInputElement).value = "";
                    
                    // Fechar o modal
                    const dialog = document.querySelector('[role="dialog"]');
                    if (dialog) {
                      const closeButton = dialog.querySelector('[aria-label="Close"], [data-state="open"]');
                      if (closeButton) {
                        (closeButton as HTMLElement).click();
                      }
                    }
                    
                    // Limpar completamente o cache e refetch
                    queryClient.removeQueries({ queryKey: ["customers"] });
                    queryClient.invalidateQueries({ queryKey: ["customers"] });
                    await refetch();
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
        </div>
      </header>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Search */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-input"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  // Limpar completamente o cache
                  queryClient.removeQueries({ queryKey: ["customers"] });
                  queryClient.invalidateQueries({ queryKey: ["customers"] });
                  await refetch();
                  toast.success("Lista de clientes atualizada!");
                }}
                title="Atualizar lista"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
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
                        {client.name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-foreground">
                        {client.name || "Cliente sem nome"}
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
                  {viewingClient?.name?.charAt(0)?.toUpperCase() || "?"}
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
                    <p className="font-medium">{viewingClient.name || "Cliente sem nome"}</p>
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
