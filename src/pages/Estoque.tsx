import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Plus, AlertTriangle, TrendingDown } from "lucide-react";

export default function Estoque() {
  const items = [
    { name: "Linha Preta", quantity: 45, unit: "bobinas", min: 20, status: "ok" },
    { name: "Linha Branca", quantity: 32, unit: "bobinas", min: 20, status: "ok" },
    { name: "Linha Azul", quantity: 8, unit: "bobinas", min: 15, status: "low" },
    { name: "Tecido Algodão", quantity: 150, unit: "metros", min: 50, status: "ok" },
    { name: "Tecido Poliéster", quantity: 25, unit: "metros", min: 40, status: "low" },
    { name: "Zíperes", quantity: 3, unit: "unidades", min: 20, status: "critical" },
    { name: "Botões", quantity: 180, unit: "unidades", min: 100, status: "ok" },
    { name: "Elástico", quantity: 12, unit: "metros", min: 15, status: "low" },
  ];

  const getStatusInfo = (status: string, quantity: number, min: number) => {
    switch (status) {
      case "critical":
        return {
          badge: <Badge className="bg-destructive/20 text-destructive border-destructive/30">Crítico</Badge>,
          icon: <AlertTriangle className="w-5 h-5 text-destructive" />,
          message: "Estoque crítico!",
        };
      case "low":
        return {
          badge: <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">Baixo</Badge>,
          icon: <TrendingDown className="w-5 h-5 text-orange-600" />,
          message: "Estoque baixo",
        };
      default:
        return {
          badge: <Badge className="bg-accent/20 text-accent border-accent/30">Normal</Badge>,
          icon: null,
          message: "",
        };
    }
  };

  const criticalItems = items.filter((item) => item.status === "critical").length;
  const lowItems = items.filter((item) => item.status === "low").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Controle de Estoque</h1>
              <p className="text-sm text-muted-foreground">Gerencie materiais e insumos</p>
            </div>
          </div>
          <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Item
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Alerts */}
        {(criticalItems > 0 || lowItems > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            {criticalItems > 0 && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">
                        {criticalItems} {criticalItems === 1 ? "item" : "itens"} em estoque crítico
                      </p>
                      <p className="text-sm text-muted-foreground">Reposição urgente necessária</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {lowItems > 0 && (
              <Card className="border-orange-500/50 bg-orange-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-600">
                        {lowItems} {lowItems === 1 ? "item" : "itens"} com estoque baixo
                      </p>
                      <p className="text-sm text-muted-foreground">Planeje reposição em breve</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Items List */}
        <div className="grid gap-3">
          {items.map((item, index) => {
            const statusInfo = getStatusInfo(item.status, item.quantity, item.min);
            
            return (
              <Card
                key={index}
                className={`border-border hover:shadow-md transition-all animate-fade-in ${
                  item.status === "critical"
                    ? "border-l-4 border-l-destructive"
                    : item.status === "low"
                    ? "border-l-4 border-l-orange-500"
                    : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {statusInfo.icon}
                      <div>
                        <h3 className="font-medium text-foreground">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Mínimo: {item.min} {item.unit}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-foreground">{item.quantity}</p>
                        <p className="text-xs text-muted-foreground">{item.unit}</p>
                      </div>
                      {statusInfo.badge}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
