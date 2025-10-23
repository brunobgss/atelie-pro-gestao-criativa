import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  HelpCircle, 
  MessageCircle, 
  Mail, 
  Phone, 
  Clock, 
  CheckCircle,
  ExternalLink,
  BookOpen,
  Video,
  FileText,
  Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Ajuda() {
  const navigate = useNavigate();

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent("Olá! Preciso de ajuda com o Ateliê PRO. Podem me ajudar?");
    window.open(`https://wa.me/5535998498798?text=${message}`, '_blank');
  };

  const handleEmailContact = () => {
    window.open('mailto:suporte@ateliepro.online?subject=Dúvida sobre o Ateliê PRO', '_blank');
  };

  const faqItems = [
    {
      question: "Como faço para criar meu primeiro pedido?",
      answer: "Acesse a seção 'Pedidos' no menu lateral e clique em 'Novo Pedido'. Preencha as informações do cliente e os detalhes do produto."
    },
    {
      question: "Posso personalizar os orçamentos?",
      answer: "Sim! Na seção 'Orçamentos' você pode criar orçamentos personalizados com sua logo e informações da empresa."
    },
    {
      question: "Como funciona o sistema de estoque?",
      answer: "O sistema permite controlar o estoque de materiais e produtos. Você pode adicionar, editar e acompanhar as quantidades disponíveis."
    },
    {
      question: "Posso integrar com WhatsApp?",
      answer: "Sim! O sistema permite enviar orçamentos e pedidos diretamente pelo WhatsApp para seus clientes."
    },
    {
      question: "Como faço backup dos meus dados?",
      answer: "Seus dados são automaticamente salvos na nuvem. Usuários premium têm backup adicional e podem exportar relatórios."
    },
    {
      question: "Posso usar em múltiplos dispositivos?",
      answer: "Sim! O Ateliê PRO funciona em qualquer dispositivo com navegador - computador, tablet ou celular."
    }
  ];

  const features = [
    { icon: BookOpen, title: "Documentação", description: "Guias completos e tutoriais" },
    { icon: Video, title: "Vídeos", description: "Tutoriais em vídeo passo a passo" },
    { icon: FileText, title: "FAQ", description: "Perguntas frequentes respondidas" },
    { icon: Users, title: "Comunidade", description: "Suporte da comunidade de usuários" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-4 p-6 border-b border-border">
        <SidebarTrigger />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Central de Ajuda</h1>
          <p className="text-sm text-muted-foreground">
            Encontre respostas para suas dúvidas e entre em contato conosco
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Contato Rápido */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Precisa de Ajuda Imediata?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-green-700">WhatsApp Suporte</h3>
                <p className="text-sm text-muted-foreground">
                  Resposta rápida via WhatsApp. Atendimento de segunda a sexta, 8h às 18h.
                </p>
                <Button 
                  onClick={handleWhatsAppContact}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Falar no WhatsApp
                </Button>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-blue-700">Email Suporte</h3>
                <p className="text-sm text-muted-foreground">
                  Envie sua dúvida por email. Respondemos em até 24 horas.
                </p>
                <Button 
                  onClick={handleEmailContact}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar Email
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recursos de Ajuda */}
        <Card>
          <CardHeader>
            <CardTitle>Recursos de Ajuda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                className="text-center p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate('/documentacao')}
              >
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Documentação</h3>
                <p className="text-sm text-muted-foreground">Guias completos e tutoriais</p>
              </div>
              
              <div 
                className="text-center p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate('/faq')}
              >
                <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">FAQ</h3>
                <p className="text-sm text-muted-foreground">Perguntas frequentes respondidas</p>
              </div>
              
              <div className="text-center p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <Video className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Vídeos</h3>
                <p className="text-sm text-muted-foreground">Tutoriais em vídeo passo a passo</p>
              </div>
              
              <div className="text-center p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Comunidade</h3>
                <p className="text-sm text-muted-foreground">Suporte da comunidade de usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Perguntas Frequentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    {item.question}
                  </h3>
                  <p className="text-sm text-muted-foreground ml-6">{item.answer}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Informações de Contato */}
        <Card>
          <CardHeader>
            <CardTitle>Informações de Contato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-1">WhatsApp</h3>
                <p className="text-sm text-muted-foreground mb-2">(35) 99849-8798</p>
                <Badge variant="secondary">Resposta rápida</Badge>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-1">Email</h3>
                <p className="text-sm text-muted-foreground mb-2">suporte@ateliepro.online</p>
                <Badge variant="secondary">Até 24h</Badge>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold mb-1">Horário</h3>
                <p className="text-sm text-muted-foreground mb-2">Seg - Sex: 8h às 18h</p>
                <Badge variant="secondary">Horário comercial</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dicas Úteis */}
        <Card>
          <CardHeader>
            <CardTitle>Dicas Úteis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">💡 Dica 1</h3>
                <p className="text-sm text-blue-800">
                  Use o sistema de categorias para organizar melhor seus produtos e facilitar a busca.
                </p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">💡 Dica 2</h3>
                <p className="text-sm text-green-800">
                  Configure lembretes automáticos para não esquecer de acompanhar pedidos em produção.
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">💡 Dica 3</h3>
                <p className="text-sm text-purple-800">
                  Use os relatórios financeiros para acompanhar o crescimento do seu negócio.
                </p>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg">
                <h3 className="font-semibold text-orange-900 mb-2">💡 Dica 4</h3>
                <p className="text-sm text-orange-800">
                  Mantenha sempre atualizado o cadastro de clientes para facilitar futuros pedidos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
