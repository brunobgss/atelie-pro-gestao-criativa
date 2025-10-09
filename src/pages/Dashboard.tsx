import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, DollarSign, Clock, CheckCircle2, Plus, TrendingUp } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const stats = [
    {
      title: "Pedidos Hoje",
      value: "12",
      icon: Package,
      trend: "+3 desde ontem",
      color: "text-primary",
    },
    {
      title: "Em Produção",
      value: "8",
      icon: Clock,
      trend: "4 atrasados",
      color: "text-secondary",
    },
    {
      title: "Prontos",
      value: "5",
      icon: CheckCircle2,
      trend: "Aguardando retirada",
      color: "text-accent",
    },
    {
      title: "Faturamento Mês",
      value: "R$ 8.450",
      icon: DollarSign,
      trend: "+15% vs mês anterior",
      color: "text-accent",
    },
  ];

  const recentOrders = [
    { id: 1, client: "Maria Silva", type: "Bordado", status: "Em produção", delivery: "2025-10-12" },
    { id: 2, client: "João Santos", type: "Uniforme", status: "Pronto", delivery: "2025-10-10" },
    { id: 3, client: "Ana Costa", type: "Personalizado", status: "Aguardando", delivery: "2025-10-15" },
    { id: 4, client: "Pedro Oliveira", type: "Camiseta", status: "Em produção", delivery: "2025-10-13" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Bem-vindo ao Ateliê Pro</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/pedidos/novo">
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Novo Pedido
              </Button>
            </Link>
            <Link to="/orcamentos/novo">
              <Button variant="outline" className="border-secondary text-secondary hover:bg-secondary/10">
                <Plus className="w-4 h-4 mr-2" />
                Novo Orçamento
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="border-border hover:shadow-md transition-shadow animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Orders */}
        <Card className="border-border animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground">Pedidos Recentes</CardTitle>
              <Link to="/pedidos">
                <Button variant="ghost" size="sm" className="text-secondary hover:text-secondary/80">
                  Ver todos
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{order.client}</p>
                      <p className="text-sm text-muted-foreground">{order.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">Entrega</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.delivery).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === "Pronto"
                          ? "bg-accent/20 text-accent"
                          : order.status === "Em produção"
                          ? "bg-secondary/20 text-secondary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
