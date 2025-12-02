// Componente de In-App Messages e Notificações
// Mostra dicas contextuais e notificações para guiar o usuário

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Lightbulb, Bell, AlertCircle, CheckCircle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/integrations/supabase/orders";
import { listQuotes } from "@/integrations/supabase/quotes";

interface InAppMessage {
  id: string;
  type: "tip" | "notification" | "alert" | "success";
  title: string;
  message: string;
  action?: {
    label: string;
    route: string;
  };
  dismissible: boolean;
  priority: number; // 1 = alta, 2 = média, 3 = baixa
}

const MESSAGES_STORAGE_KEY = "atelie_pro_dismissed_messages";

export function InAppMessages() {
  const navigate = useNavigate();
  const [dismissedMessages, setDismissedMessages] = useState<Set<string>>(new Set());

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: listOrders,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["quotes"],
    queryFn: listQuotes,
  });

  // Carregar mensagens dispensadas do localStorage
  useEffect(() => {
    const stored = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (stored) {
      try {
        const dismissedArray = JSON.parse(stored);
        setDismissedMessages(new Set(dismissedArray));
      } catch (e) {
        console.error("Erro ao carregar mensagens dispensadas:", e);
      }
    }
  }, []);

  // Gerar mensagens baseadas no contexto
  const messages = useMemo<InAppMessage[]>(() => {
    const msgs: InAppMessage[] = [];

    // Mensagem: Dica do dia (rotaciona)
    const diasDaSemana = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
    const diaAtual = diasDaSemana[new Date().getDay()];
    
    const dicasDoDia = [
      {
        id: "tip-whatsapp",
        message: "💡 Dica: Use o botão WhatsApp nos orçamentos para enviar automaticamente aos clientes!",
      },
      {
        id: "tip-status",
        message: "💡 Dica: Atualize o status dos pedidos regularmente para manter seus clientes informados!",
      },
      {
        id: "tip-quotes",
        message: "💡 Dica: Orçamentos aumentam a conversão em até 40%! Use sempre que possível.",
      },
      {
        id: "tip-customers",
        message: "💡 Dica: Cadastre seus clientes para ter histórico completo de pedidos!",
      },
    ];

    const dicaIndex = new Date().getDate() % dicasDoDia.length;
    const dicaDoDia = dicasDoDia[dicaIndex];

    msgs.push({
      id: `tip-${diaAtual}`,
      type: "tip",
      title: "Dica do Dia",
      message: dicaDoDia.message,
      dismissible: true,
      priority: 3,
    });

    // Notificação: Pedidos pendentes
    const pedidosPendentes = orders.filter(
      (o) => o.status === "Aguardando aprovação" || o.status === "Em produção"
    );
    if (pedidosPendentes.length > 0) {
      msgs.push({
        id: "pending-orders",
        type: "notification",
        title: "Pedidos Pendentes",
        message: `Você tem ${pedidosPendentes.length} pedido${pedidosPendentes.length > 1 ? "s" : ""} em andamento. Não esqueça de atualizar o status!`,
        action: {
          label: "Ver Pedidos",
          route: "/pedidos",
        },
        dismissible: true,
        priority: 2,
      });
    }

    // Notificação: Orçamentos não convertidos
    const orcamentosNaoConvertidos = quotes.filter((q) => {
      // Verificar se não foi convertido em pedido
      return !orders.some((o) => o.code === q.code);
    });
    if (orcamentosNaoConvertidos.length > 3) {
      msgs.push({
        id: "unconverted-quotes",
        type: "alert",
        title: "Orçamentos Pendentes",
        message: `Você tem ${orcamentosNaoConvertidos.length} orçamentos. Que tal converter alguns em pedidos?`,
        action: {
          label: "Ver Orçamentos",
          route: "/orcamentos",
        },
        dismissible: true,
        priority: 2,
      });
    }

    // Sucesso: Primeiro pedido
    if (orders.length === 1) {
      msgs.push({
        id: "first-order-success",
        type: "success",
        title: "Parabéns! 🎉",
        message: "Você criou seu primeiro pedido! Continue assim!",
        dismissible: true,
        priority: 1,
      });
    }

    // Sucesso: Primeiro orçamento
    if (quotes.length === 1 && orders.length === 0) {
      msgs.push({
        id: "first-quote-success",
        type: "success",
        title: "Ótimo! 🎯",
        message: "Você criou seu primeiro orçamento! Agora converta em pedido quando aprovado.",
        action: {
          label: "Ver Orçamento",
          route: "/orcamentos",
        },
        dismissible: true,
        priority: 1,
      });
    }

    return msgs;
  }, [orders, quotes]);

  // Filtrar mensagens visíveis (não dispensadas) usando useMemo para evitar loops
  // Usamos uma string serializada do Set como dependência para comparação estável
  const dismissedMessagesKey = useMemo(() => {
    return Array.from(dismissedMessages).sort().join(',');
  }, [dismissedMessages]);

  const visibleMessages = useMemo(() => {
    const dismissedSet = new Set(Array.from(dismissedMessages));
    return messages
      .filter((msg) => !dismissedSet.has(msg.id))
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3); // Mostrar no máximo 3 mensagens
  }, [messages, dismissedMessagesKey]);

  const handleDismiss = (messageId: string) => {
    const newDismissed = new Set(dismissedMessages);
    newDismissed.add(messageId);
    setDismissedMessages(newDismissed);
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(Array.from(newDismissed)));
  };

  const handleAction = (route: string) => {
    navigate(route);
  };

  if (visibleMessages.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "tip":
        return <Lightbulb className="h-5 w-5 text-yellow-600" />;
      case "notification":
        return <Bell className="h-5 w-5 text-blue-600" />;
      case "alert":
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "tip":
        return "bg-yellow-50 border-yellow-200";
      case "notification":
        return "bg-blue-50 border-blue-200";
      case "alert":
        return "bg-orange-50 border-orange-200";
      case "success":
        return "bg-green-50 border-green-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="space-y-3 mb-6">
      {visibleMessages.map((message) => (
        <Card
          key={message.id}
          className={`border-2 ${getBgColor(message.type)} shadow-md`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">{getIcon(message.type)}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1">{message.title}</h3>
                <p className="text-sm text-gray-700">{message.message}</p>
                {message.action && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => handleAction(message.action!.route)}
                  >
                    {message.action.label}
                  </Button>
                )}
              </div>
              {message.dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={() => handleDismiss(message.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

