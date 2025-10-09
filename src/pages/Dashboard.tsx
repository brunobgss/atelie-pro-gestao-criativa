import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, CheckCircle, Plus, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary">
      {/* Header */}
      <div className="bg-primary/50 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
        <div className="p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="text-white hover:bg-white/10" />
            <div>
              <h1 className="text-2xl font-bold text-white">Bem-vindo ao Ateliê Pro</h1>
              <p className="text-white/80 text-sm mt-0.5">Gerencie seus pedidos e acompanhe o desempenho</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => navigate("/novo-orcamento")} 
              variant="outline" 
              size="lg"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Orçamento
            </Button>
            <Button 
              onClick={() => navigate("/novo-pedido")} 
              size="lg"
              className="bg-white text-primary hover:bg-white/90 shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Pedido
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white/95 backdrop-blur border-0 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pedidos em Andamento
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">89</div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-secondary" />
                <p className="text-xs text-secondary font-medium">+12% este mês</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Produção
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">34</div>
              <div className="flex items-center gap-1 mt-2">
                <p className="text-xs text-muted-foreground">3 com prazo próximo</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Concluídos Hoje
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">12</div>
              <div className="flex items-center gap-1 mt-2">
                <p className="text-xs text-muted-foreground">Aguardando retirada</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receita do Mês
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">R$ 8.4k</div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-secondary" />
                <p className="text-xs text-secondary font-medium">+18% vs mês anterior</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders Table */}
        <Card className="bg-white/95 backdrop-blur border-0 shadow-lg">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Grupos</CardTitle>
              <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                + Adicionar grupo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Nome do grupo</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Leads</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Clientes</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Criado em</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { nome: "Uniformes Escolares", tipo: "Bordado", leads: "LEADS: 14.630", clientes: "CLIENTES: 320", status: "Ativo", cor: "secondary", data: "15/12/2024" },
                    { nome: "Camisetas Personalizadas", tipo: "Personalizado", leads: "LEADS: 8.420", clientes: "CLIENTES: 156", status: "Ativo", cor: "secondary", data: "12/12/2024" },
                    { nome: "Toalhas de Mesa", tipo: "Bordado", leads: "LEADS: 12.100", clientes: "CLIENTES: 89", status: "Ativo", cor: "secondary", data: "10/12/2024" },
                    { nome: "Uniformes Corporativos", tipo: "Uniforme", leads: "LEADS: 5.890", clientes: "CLIENTES: 234", status: "Ativo", cor: "secondary", data: "08/12/2024" },
                    { nome: "Enxovais Personalizados", tipo: "Personalizado", leads: "LEADS: 9.670", clientes: "CLIENTES: 167", status: "Pendente", cor: "accent", data: "05/12/2024" },
                  ].map((pedido, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-secondary" />
                          <span className="font-medium text-foreground">{pedido.nome}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="bg-muted/50 text-foreground border-0 font-normal">
                          {pedido.leads}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">{pedido.clientes}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${pedido.status === "Ativo" ? "bg-secondary" : "bg-accent"}`} />
                          <span className="text-sm text-muted-foreground">{pedido.data}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant={pedido.status === "Ativo" ? "default" : "outline"}
                          className={pedido.status === "Ativo" ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : "bg-accent/10 text-accent border-0"}
                        >
                          {pedido.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Button variant="outline" size="sm" className="text-xs hover:bg-muted">
                          Editar grupo
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
