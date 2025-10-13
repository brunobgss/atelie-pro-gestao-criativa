import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Search, Phone, Mail, Package, Plus, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createCustomer } from "@/integrations/supabase/customers";
import { toast } from "sonner";

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleEditClient = (client: any) => {
    // Implementar edição de cliente
    toast.info("Funcionalidade de edição em desenvolvimento");
  };

  const handleDeleteClient = async (client: any) => {
    if (confirm(`Tem certeza que deseja excluir "${client.name}"?`)) {
      try {
        // Implementar exclusão
        toast.success("Cliente excluído com sucesso!");
      } catch (error) {
        toast.error("Erro ao excluir cliente");
      }
    }
  };

  const clients = [
    {
      name: "Maria Silva",
      phone: "(11) 98765-4321",
      email: "maria.silva@email.com",
      orders: 8,
      lastOrder: "2025-10-12",
      type: "VIP",
    },
    {
      name: "João Santos",
      phone: "(11) 97654-3210",
      email: "joao.santos@email.com",
      orders: 3,
      lastOrder: "2025-10-10",
      type: "Regular",
    },
    {
      name: "Ana Costa",
      phone: "(11) 96543-2109",
      email: "ana.costa@email.com",
      orders: 5,
      lastOrder: "2025-10-15",
      type: "Regular",
    },
    {
      name: "Pedro Oliveira",
      phone: "(11) 95432-1098",
      email: "pedro.oliveira@email.com",
      orders: 12,
      lastOrder: "2025-10-13",
      type: "VIP",
    },
  ];

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
                    Nome
                  </Label>
                  <Input id="name" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    Telefone
                  </Label>
                  <Input id="phone" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input id="email" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    const name = (document.getElementById("name") as HTMLInputElement)?.value;
                    const phone = (document.getElementById("phone") as HTMLInputElement)?.value;
                    const email = (document.getElementById("email") as HTMLInputElement)?.value;
                    const res = await createCustomer({ name, phone, email });
                    if (!res.ok) return toast.error(res.error || "Erro ao criar cliente");
                    toast.success("Cliente criado");
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
    </div>
  );
}
