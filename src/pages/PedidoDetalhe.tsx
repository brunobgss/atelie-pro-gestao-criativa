import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Calendar, CheckCircle2, Clock, Package, Upload, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getOrderByCode } from "@/integrations/supabase/orders";

type OrderItem = {
  id: string;
  client: string;
  type: string;
  description: string;
  value: number;
  paid: number;
  delivery: string; // ISO
  status: "Aguardando aprovação" | "Em produção" | "Pronto" | "Aguardando retirada";
  file?: string;
};

const MOCK_ORDERS: OrderItem[] = [
  {
    id: "PED-001",
    client: "Maria Silva",
    type: "Bordado Computadorizado",
    description: "Logo empresa em 50 camisetas",
    value: 850,
    paid: 425,
    delivery: "2025-10-12",
    status: "Em produção",
  },
  {
    id: "PED-002",
    client: "João Santos",
    type: "Uniforme Escolar",
    description: "15 uniformes tam. P-M-G",
    value: 1200,
    paid: 1200,
    delivery: "2025-10-10",
    status: "Pronto",
  },
  {
    id: "PED-003",
    client: "Ana Costa",
    type: "Personalizado",
    description: "Toalhinhas com bordado nome",
    value: 320,
    paid: 160,
    delivery: "2025-10-15",
    status: "Aguardando aprovação",
  },
  {
    id: "PED-004",
    client: "Pedro Oliveira",
    type: "Camiseta Estampada",
    description: "30 camisetas estampa personalizada",
    value: 600,
    paid: 300,
    delivery: "2025-10-13",
    status: "Em produção",
  },
];

function getStatusStepIndex(status: OrderItem["status"]) {
  const steps: OrderItem["status"][] = [
    "Aguardando aprovação",
    "Em produção",
    "Pronto",
    "Aguardando retirada",
  ];
  return steps.indexOf(status);
}

export default function PedidoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();

  const code = id as string;
  const { data: orderDb } = useQuery({
    queryKey: ["order", code],
    queryFn: () => getOrderByCode(code),
    enabled: Boolean(code),
  });
  const order = useMemo(() => {
    if (orderDb) {
      return {
        id: orderDb.code,
        client: orderDb.customer_name,
        type: orderDb.type,
        description: orderDb.description ?? "",
        value: Number(orderDb.value || 0),
        paid: Number(orderDb.paid || 0),
        delivery: orderDb.delivery_date ?? "",
        status: orderDb.status,
        file: orderDb.file_url ?? undefined,
      } as OrderItem;
    }
    return MOCK_ORDERS.find((o) => o.id === id);
  }, [orderDb, id]);

  const steps: { key: OrderItem["status"]; label: string }[] = [
    { key: "Aguardando aprovação", label: "Aguardando aprovação" },
    { key: "Em produção", label: "Em produção" },
    { key: "Pronto", label: "Pronto" },
    { key: "Aguardando retirada", label: "Aguardando retirada" },
  ];

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4 p-4">
            <SidebarTrigger />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/pedidos")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Pedido não encontrado</h1>
              <p className="text-sm text-muted-foreground">Verifique o código e tente novamente</p>
            </div>
          </div>
        </header>
      </div>
    );
  }

  const currentStep = getStatusStepIndex(order.status);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4">
          <SidebarTrigger />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pedidos")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{order.id}</h1>
            <p className="text-sm text-muted-foreground">Detalhes do pedido</p>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Informações do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="text-sm font-medium text-foreground">{order.client}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Entrega</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(order.delivery).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="text-sm font-medium text-foreground">{order.type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor / Pago</p>
                  <p className="text-sm font-medium text-foreground">R$ {order.value} / R$ {order.paid}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className="bg-secondary/20 text-secondary border-secondary/30">
                    {order.status}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p className="text-foreground mt-1">{order.description}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Arquivo / Arte</p>
                {order.file ? (
                  <a
                    href={order.file}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <Upload className="w-4 h-4" /> Baixar arquivo
                  </a>
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhum arquivo enviado</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Timeline do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative border-l border-border ml-3 space-y-6">
                {steps.map((step, index) => {
                  const isDone = index <= currentStep;
                  return (
                    <li key={step.key} className="ml-4">
                      <div className="absolute -left-3 w-6 h-6 rounded-full flex items-center justify-center bg-card border border-border">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-secondary" />
                        ) : (
                          <Clock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <p className={`text-sm ${isDone ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


