import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Plus, FileText, Calendar, DollarSign, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function Orcamentos() {
  const quotes = [
    {
      id: "ORC-001",
      client: "Roberto Alves",
      description: "100 camisetas bordadas logo empresa",
      value: 2500,
      date: "2025-10-08",
      status: "Pendente",
    },
    {
      id: "ORC-002",
      client: "Escola Municipal",
      description: "200 uniformes escolares diversos tamanhos",
      value: 4800,
      date: "2025-10-07",
      status: "Aprovado",
    },
    {
      id: "ORC-003",
      client: "Mariana Souza",
      description: "Kit toalhinhas personalizadas",
      value: 480,
      date: "2025-10-09",
      status: "Enviado",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Aprovado":
        return "bg-accent/20 text-accent border-accent/30";
      case "Enviado":
        return "bg-secondary/20 text-secondary border-secondary/30";
      default:
        return "bg-muted text-muted-foreground border-muted-foreground/30";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Orçamentos</h1>
              <p className="text-sm text-muted-foreground">Gerencie propostas e orçamentos</p>
            </div>
          </div>
          <Link to="/orcamentos/novo">
            <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Novo Orçamento
            </Button>
          </Link>
        </div>
      </header>

      <div className="p-6">
        <div className="grid gap-4">
          {quotes.map((quote) => (
            <Card
              key={quote.id}
              className="border-border hover:shadow-md transition-all animate-fade-in"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <FileText className="w-5 h-5 text-secondary" />
                      {quote.id}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{quote.client}</p>
                  </div>
                  <Badge variant="outline" className={getStatusColor(quote.status)}>
                    {quote.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-foreground">{quote.description}</p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Valor</p>
                          <p className="text-sm font-medium text-foreground">
                            R$ {quote.value.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Data</p>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(quote.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="border-secondary text-secondary hover:bg-secondary/10">
                      <Share2 className="w-4 h-4 mr-2" />
                      Compartilhar
                    </Button>
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
