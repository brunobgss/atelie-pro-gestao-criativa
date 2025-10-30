import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Calendar, Package, AlertCircle, Clock, CheckCircle, Bell, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/integrations/supabase/orders";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

interface DeliveryEvent {
  id: string;
  date: string;
  client: string;
  type: string;
  status: string;
  orderCode: string;
  daysUntilDelivery: number;
  isOverdue: boolean;
  isUrgent: boolean;
}

export default function Agenda() {
  const [currentDate] = useState(new Date());
  const [notifications, setNotifications] = useState<string[]>([]);
  const { empresa } = useAuth();

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: listOrders,
  });

  // Processar pedidos para eventos de entrega
  const deliveryEvents: DeliveryEvent[] = orders
    .filter(order => order.delivery_date && order.status !== 'Cancelado' && order.status !== 'Entregue') // Filtrar pedidos com data de entrega, não cancelados e não entregues
    .map(order => {
      const deliveryDate = new Date(order.delivery_date!);
      const today = new Date();
      const diffTime = deliveryDate.getTime() - today.getTime();
      const daysUntilDelivery = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        id: order.id,
        date: order.delivery_date!,
        client: order.customer_name,
        type: order.type,
        status: order.status,
        orderCode: order.code,
        daysUntilDelivery,
        isOverdue: daysUntilDelivery < 0,
        isUrgent: daysUntilDelivery <= 2 && daysUntilDelivery >= 0,
      };
    });

  // Gerar notificações automáticas (sem duplicatas)
  useEffect(() => {
    const newNotifications: string[] = [];
    const processedOrders = new Set<string>(); // Para evitar duplicatas
    
    deliveryEvents.forEach(event => {
      const notificationKey = `${event.orderCode}-${event.isOverdue ? 'overdue' : 'urgent'}`;
      
      if (!processedOrders.has(notificationKey)) {
        processedOrders.add(notificationKey);
        
        if (event.isOverdue) {
          newNotifications.push(`🚨 URGENTE: Pedido ${event.orderCode} (${event.client}) está atrasado!`);
        } else if (event.isUrgent) {
          newNotifications.push(`⚠️ ATENÇÃO: Pedido ${event.orderCode} (${event.client}) vence em ${event.daysUntilDelivery} dias`);
        }
      }
    });

    // Só atualizar se realmente mudou
    if (JSON.stringify(newNotifications) !== JSON.stringify(notifications)) {
      setNotifications(newNotifications);
    }
  }, [deliveryEvents, notifications]);

  const getStatusColor = (status: string, isOverdue: boolean, isUrgent: boolean) => {
    if (isOverdue) {
      return "bg-red-100 text-red-700 border-red-300";
    }
    if (isUrgent) {
      return "bg-orange-100 text-orange-700 border-orange-300";
    }
    
    switch (status) {
      case "Pronto":
        return "bg-green-100 text-green-700 border-green-300";
      case "Em produção":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "Aguardando aprovação":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getDaysUntilDeliveryText = (days: number, isOverdue: boolean) => {
    if (isOverdue) {
      return `${Math.abs(days)} dias atrasado`;
    }
    if (days === 0) {
      return "Hoje";
    }
    if (days === 1) {
      return "Amanhã";
    }
    return `${days} dias`;
  };

  const sortedEvents = [...deliveryEvents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const sendWhatsAppReminder = (event: DeliveryEvent) => {
    const message = `Olá ${event.client}!

Lembramos que seu pedido ${event.orderCode} tem entrega prevista para ${new Date(event.date).toLocaleDateString('pt-BR')}.

*DETALHES:*
• Tipo: ${event.type}
• Status: ${event.status}
• Dias restantes: ${event.daysUntilDelivery > 0 ? event.daysUntilDelivery : 'Atrasado'}

Em caso de dúvidas, entre em contato conosco!

_${empresa?.nome || 'Ateliê'}_`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success("Mensagem do WhatsApp preparada!");
  };

  // Calendário Visual
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getEventColor = (event: DeliveryEvent) => {
    if (event.isOverdue) return "bg-red-100 border-red-300 text-red-700";
    if (event.isUrgent) return "bg-orange-100 border-orange-300 text-orange-700";
    if (event.status === 'Pronto') return "bg-green-100 border-green-300 text-green-700";
    if (event.status === 'Em produção') return "bg-blue-100 border-blue-300 text-blue-700";
    return "bg-gray-100 border-gray-300 text-gray-700";
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return deliveryEvents.filter(event => event.date.startsWith(dateStr));
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="p-4 md:p-6 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <SidebarTrigger className="text-gray-700 hover:bg-gray-100 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-purple-600 flex-shrink-0" />
                <span className="truncate">Agenda de Entregas</span>
              </h1>
              <p className="text-gray-600 text-xs md:text-sm mt-0.5 truncate">Calendário de produção com lembretes automáticos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Notificações Automáticas */}
        {notifications.length > 0 && (
          <Card className="border-red-200 bg-red-50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Lembretes Automáticos ({notifications.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {notifications.map((notification, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 md:p-3 bg-white rounded border border-red-200">
                    <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span className="text-red-800 text-xs md:text-sm break-words">{notification}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumo do Dia */}
        <div className="grid gap-3 md:gap-6 md:grid-cols-3">
          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Entregas Hoje</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-600">
                    {deliveryEvents.filter(e => e.daysUntilDelivery === 0).length}
                  </p>
                </div>
                <Calendar className="w-6 h-6 md:w-8 md:h-8 text-blue-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Próximos 3 Dias</p>
                  <p className="text-xl md:text-2xl font-bold text-orange-600">
                    {deliveryEvents.filter(e => e.daysUntilDelivery > 0 && e.daysUntilDelivery <= 3).length}
                  </p>
                </div>
                <Clock className="w-6 h-6 md:w-8 md:h-8 text-orange-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Atrasados</p>
                  <p className="text-xl md:text-2xl font-bold text-red-600">
                    {deliveryEvents.filter(e => e.isOverdue).length}
                  </p>
                </div>
                <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-red-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Entregas */}
        <Card className="bg-white border border-gray-200/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              Cronograma de Entregas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma entrega agendada</h3>
                <p className="text-gray-600">Crie pedidos para ver o cronograma de entregas</p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {sortedEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 md:p-4 rounded-lg border ${
                      event.isOverdue 
                        ? 'bg-red-50 border-red-200' 
                        : event.isUrgent 
                        ? 'bg-orange-50 border-orange-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          event.isOverdue 
                            ? 'bg-red-100 text-red-600' 
                            : event.isUrgent 
                            ? 'bg-orange-100 text-orange-600'
                            : event.status === 'Pronto'
                            ? 'bg-green-100 text-green-600'
                            : event.status === 'Em produção'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <Calendar className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm md:text-base text-gray-900 truncate">{event.client}</h3>
                            <Badge variant="outline" className={`text-xs ${getStatusColor(event.status, event.isOverdue, event.isUrgent)} flex-shrink-0`}>
                              {event.status}
                            </Badge>
                          </div>
                          <p className="text-xs md:text-sm text-gray-600 truncate">{event.type} - {event.orderCode}</p>
                          <p className="text-xs text-gray-500 truncate">
                            Entrega: {new Date(event.date).toLocaleDateString('pt-BR')} 
                            ({getDaysUntilDeliveryText(event.daysUntilDelivery, event.isOverdue)})
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end md:justify-start">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendWhatsAppReminder(event)}
                          className="text-green-600 border-green-200 hover:bg-green-50 flex-1 md:flex-none text-xs md:text-sm"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/pedidos/${event.orderCode}`, '_blank')}
                          className="flex-1 md:flex-none text-xs md:text-sm"
                        >
                          Ver Pedido
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendário Visual */}
        <Card className="bg-white border border-gray-200/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Visão do Mês - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {/* Cabeçalho do Calendário - Dias da Semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekdayNames.map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid do Calendário */}
            <div className="grid grid-cols-7 gap-1">
              {/* Dias vazios antes do primeiro dia do mês */}
              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}
              
              {/* Dias do mês */}
              {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
                const day = dayIndex + 1;
                const events = getEventsForDate(day);
                const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
                
                return (
                  <div 
                    key={day}
                    className={`aspect-square border border-gray-200 rounded-lg p-1 ${
                      isToday ? 'bg-purple-50 border-purple-300' : ''
                    }`}
                  >
                    <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-purple-700' : 'text-gray-700'}`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {events.slice(0, 2).map((event, eventIndex) => (
                        <div
                          key={event.id}
                          className={`text-[10px] p-1 rounded border ${getEventColor(event)} truncate`}
                          title={`${event.client} - ${event.orderCode}`}
                        >
                          {event.orderCode}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="text-[10px] text-gray-500 font-semibold">
                          +{events.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legenda de Cores */}
            <div className="mt-4 bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">Legenda de Cores:</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs px-2 py-0.5">
                  🔴 Atrasados
                </Badge>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-xs px-2 py-0.5">
                  🟠 Urgentes (2-3 dias)
                </Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs px-2 py-0.5">
                  🔵 Em Produção
                </Badge>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs px-2 py-0.5">
                  🟢 Prontos
                </Badge>
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-xs px-2 py-0.5">
                  ⚪ Outros
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}