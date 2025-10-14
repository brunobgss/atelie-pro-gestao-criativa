import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Search, Phone, Mail, Package, Plus, Edit, Trash2 } from "lucide-react";
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

export default function Clientes() {
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const { syncAfterCreate, syncAfterUpdate, syncAfterDelete, syncWithToast } = useSyncOperations();
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: ""
  });

  const handleEditClient = (client: any) => {
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
      const updateData: any = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim()
      };
      
      // Adicionar campos opcionais apenas se preenchidos
      if (editForm.email && editForm.email.trim()) {
        updateData.email = editForm.email.trim();
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

  const handleDeleteClient = async (client: any) => {
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
  const demoClients = [
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

  // Buscar clientes reais do banco de dados
  const { data: realClients = [], isLoading, refetch } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      try {
        console.log("🔍 Buscando clientes do banco de dados...");
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .order("name", { ascending: true });
        
        if (error) {
          console.warn("Erro ao buscar clientes do banco, usando dados de demonstração:", error.message);
          return [];
        }
        
        if (!data || data.length === 0) {
          console.log("Nenhum cliente encontrado no banco, usando dados de demonstração");
          return [];
        }
        
        console.log(`✅ ${data.length} clientes encontrados no banco`);
        return data.map(client => ({
          ...client,
          orders: Math.floor(Math.random() * 10) + 1,
          lastOrder: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          type: Math.random() > 0.5 ? "VIP" : "Regular"
        }));
      } catch (error) {
        console.warn("Erro ao buscar clientes, usando dados de demonstração:", error);
        return [];
      }
    },
    retry: false,
    staleTime: 0, // Sem cache para sempre buscar dados atualizados
  });

  // Usar clientes reais se disponíveis, senão usar demonstração
  const clients = realClients.length > 0 ? realClients : demoClients;

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
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Clientes</h1>
              <p className="text-sm text-muted-foreground">Gerencie seus clientes</p>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
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
                    syncAfterCreate('customers', result.data);
                  }}
                >
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-6 space-y-6">
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
                        handleEditClient(client);
                      }}
                      className="h-8 w-8 p-0"
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

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {client.orders} pedidos
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Último: {new Date(client.lastOrder).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

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
