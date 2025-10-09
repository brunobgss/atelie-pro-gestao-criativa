import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Calendar, Package, AlertCircle } from "lucide-react";

export default function Agenda() {
  const events = [
    { date: "2025-10-10", client: "João Santos", type: "Uniforme", status: "Pronto" },
    { date: "2025-10-12", client: "Maria Silva", type: "Bordado", status: "Em produção" },
    { date: "2025-10-13", client: "Pedro Oliveira", type: "Camiseta", status: "Em produção" },
    { date: "2025-10-15", client: "Ana Costa", type: "Personalizado", status: "Aguardando" },
    { date: "2025-10-08", client: "Carlos Lima", type: "Uniforme", status: "Atrasado" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pronto":
        return "bg-accent/20 text-accent border-accent/30";
      case "Em produção":
        return "bg-secondary/20 text-secondary border-secondary/30";
      case "Atrasado":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground border-muted-foreground/30";
    }
  };

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Agenda de Produção</h1>
            <p className="text-sm text-muted-foreground">Calendário de entregas e produção</p>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Alerts */}
        <Card className="border-destructive/50 bg-destructive/5 animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">1 pedido atrasado</p>
                <p className="text-sm text-muted-foreground">Verifique os pedidos pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Timeline */}
        <Card className="border-border animate-fade-in">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Próximas Entregas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedEvents.map((event, index) => {
                const eventDate = new Date(event.date);
                const today = new Date();
                const isToday = eventDate.toDateString() === today.toDateString();
                const isPast = eventDate < today;

                return (
                  <div
                    key={index}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                      isToday
                        ? "border-accent bg-accent/5"
                        : isPast
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <div
                        className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center ${
                          isToday
                            ? "bg-accent text-accent-foreground"
                            : isPast
                            ? "bg-destructive/20 text-destructive"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        <span className="text-xs font-medium">
                          {eventDate.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
                        </span>
                        <span className="text-2xl font-bold">
                          {eventDate.getDate()}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-medium text-foreground">{event.client}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.type}</p>
                    </div>

                    <Badge variant="outline" className={getStatusColor(event.status)}>
                      {event.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
