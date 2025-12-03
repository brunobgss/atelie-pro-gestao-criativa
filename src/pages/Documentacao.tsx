import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  BookOpen, 
  Play, 
  FileText, 
  Users, 
  ArrowRight,
  CheckCircle,
  Clock,
  Star,
  Download,
  ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { GuiaInterativo } from "@/components/GuiaInterativo";

export default function Documentacao() {
  const navigate = useNavigate();
  const [guiaAberto, setGuiaAberto] = useState<any>(null);

  const handleGuiaClick = (guia: any) => {
    setGuiaAberto(guia);
  };

  const handleVideoClick = (titulo: string) => {
    toast.info("Vídeos tutoriais em breve! Por enquanto, use os guias passo a passo.");
  };

  const handleDownloadClick = (titulo: string, tipo: string) => {
    toast.success(`Iniciando download: ${titulo}`);
    
    // Simular download de arquivo
    const link = document.createElement('a');
    link.href = '#'; // Em produção, seria o link real do arquivo
    link.download = `${titulo}.${tipo.toLowerCase()}`;
    link.style.visibility = "hidden";
    link.style.position = "absolute";
    link.style.left = "-9999px";
    
    document.body.appendChild(link);
    link.click();
    
    // Remover o elemento de forma segura após um pequeno delay
    setTimeout(() => {
      try {
        if (link.parentNode === document.body) {
          document.body.removeChild(link);
        }
      } catch (e) {
        // Ignorar erro se o elemento já foi removido
        console.warn("Erro ao remover link de download:", e);
      }
    }, 100);
  };

  const handleWhatsAppSupport = () => {
    const message = encodeURIComponent("Olá! Preciso de ajuda com a documentação do Ateliê PRO. Podem me ajudar?");
    window.open(`https://wa.me/5535998498798?text=${message}`, '_blank');
  };

  const handleEmailSupport = () => {
    window.open('mailto:suporte@ateliepro.online?subject=Dúvida sobre documentação', '_blank');
  };
  const guias = [
    {
      id: 1,
      titulo: "Primeiros Passos",
      descricao: "Aprenda a configurar sua conta e começar a usar o Ateliê PRO",
      duracao: "5 min",
      nivel: "Iniciante",
      categoria: "Configuração",
      passos: [
        "Criar sua conta e fazer login",
        "Configurar informações da empresa",
        "Adicionar seus primeiros produtos",
        "Criar um cliente de teste",
        "Fazer seu primeiro orçamento"
      ]
    },
    {
      id: 2,
      titulo: "Gerenciamento de Pedidos",
      descricao: "Domine o sistema completo de pedidos e produção",
      duracao: "15 min",
      nivel: "Intermediário",
      categoria: "Pedidos",
      passos: [
        "Criar um novo pedido",
        "Adicionar produtos e quantidades",
        "Definir prazos de entrega",
        "Acompanhar status de produção",
        "Gerenciar entregas e retiradas"
      ]
    },
    {
      id: 3,
      titulo: "Sistema de Orçamentos",
      descricao: "Crie orçamentos profissionais e converta em vendas",
      duracao: "12 min",
      nivel: "Intermediário",
      categoria: "Orçamentos",
      passos: [
        "Configurar templates de orçamento",
        "Adicionar produtos e preços",
        "Personalizar layout e logo",
        "Enviar orçamento por WhatsApp",
        "Converter orçamento em pedido"
      ]
    },
    {
      id: 4,
      titulo: "Controle Financeiro",
      descricao: "Organize suas finanças e acompanhe receitas",
      duracao: "10 min",
      nivel: "Intermediário",
      categoria: "Financeiro",
      passos: [
        "Configurar formas de pagamento",
        "Registrar recebimentos",
        "Gerar relatórios financeiros",
        "Acompanhar inadimplência",
        "Exportar dados para contabilidade"
      ]
    },
    {
      id: 5,
      titulo: "Integração WhatsApp",
      descricao: "Automatize comunicação com clientes",
      duracao: "8 min",
      nivel: "Avançado",
      categoria: "Integrações",
      passos: [
        "Configurar número do WhatsApp",
        "Enviar orçamentos automaticamente",
        "Notificar status de pedidos",
        "Configurar mensagens personalizadas",
        "Gerenciar conversas centralizadas"
      ]
    },
    {
      id: 6,
      titulo: "Relatórios e Analytics",
      descricao: "Analise performance e tome decisões baseadas em dados",
      duracao: "7 min",
      nivel: "Avançado",
      categoria: "Relatórios",
      passos: [
        "Acessar dashboard de métricas",
        "Gerar relatórios de vendas",
        "Analisar produtos mais vendidos",
        "Acompanhar performance mensal",
        "Exportar relatórios em PDF"
      ]
    }
  ];

  const videos = [
    {
      titulo: "Tour Completo do Sistema",
      duracao: "8:45",
      visualizacoes: "1.2k",
      descricao: "Conheça todas as funcionalidades principais do Ateliê PRO"
    },
    {
      titulo: "Criando Seu Primeiro Pedido",
      duracao: "4:20",
      visualizacoes: "856",
      descricao: "Passo a passo para criar e gerenciar pedidos"
    },
    {
      titulo: "Configurando Orçamentos",
      duracao: "6:15",
      visualizacoes: "743",
      descricao: "Aprenda a criar orçamentos profissionais"
    },
    {
      titulo: "Integração WhatsApp",
      duracao: "5:30",
      visualizacoes: "612",
      descricao: "Configure e use o WhatsApp para comunicação"
    }
  ];

  const recursos = [
    {
      titulo: "Manual Completo",
      descricao: "Documentação técnica completa do sistema",
      tipo: "PDF",
      tamanho: "2.4 MB",
      downloads: "1.8k"
    },
    {
      titulo: "Templates de Orçamento",
      descricao: "Modelos prontos para personalizar",
      tipo: "ZIP",
      tamanho: "856 KB",
      downloads: "1.2k"
    },
    {
      titulo: "Guia de Integrações",
      descricao: "Como integrar com outras ferramentas",
      tipo: "PDF",
      tamanho: "1.1 MB",
      downloads: "945"
    },
    {
      titulo: "Checklist de Configuração",
      descricao: "Lista para configurar sua conta",
      tipo: "PDF",
      tamanho: "234 KB",
      downloads: "2.1k"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-4 p-6 border-b border-border">
        <SidebarTrigger />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Documentação</h1>
          <p className="text-sm text-muted-foreground">
            Guias completos, tutoriais e recursos para dominar o Ateliê PRO
          </p>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Guias Passo a Passo */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Guias Passo a Passo</h2>
            <Badge variant="secondary">6 guias disponíveis</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guias.map((guia) => (
              <Card key={guia.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{guia.titulo}</CardTitle>
                      <p className="text-sm text-muted-foreground mb-3">{guia.descricao}</p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {guia.categoria}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {guia.duracao}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {guia.nivel}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-2 mb-4">
                    <h4 className="text-sm font-medium">O que você vai aprender:</h4>
                    <ul className="space-y-1">
                      {guia.passos.map((passo, index) => (
                        <li key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          {passo}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={() => handleGuiaClick(guia)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Começar Guia
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Vídeos Tutoriais */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Vídeos Tutoriais</h2>
            <Badge variant="outline" className="text-orange-600 border-orange-200">Em breve</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videos.map((video, index) => (
              <Card key={index} className="opacity-60 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{video.titulo}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{video.descricao}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{video.duracao}</span>
                        <span>{video.visualizacoes} visualizações</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled
                      className="opacity-50 cursor-not-allowed"
                      onClick={() => handleVideoClick(video.titulo)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Em breve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Recursos para Download */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Recursos para Download</h2>
            <Badge variant="secondary">4 recursos disponíveis</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recursos.map((recurso, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-sm">{recurso.titulo}</h3>
                        <p className="text-xs text-muted-foreground">{recurso.descricao}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{recurso.tipo}</span>
                          <span>•</span>
                          <span>{recurso.tamanho}</span>
                          <span>•</span>
                          <span>{recurso.downloads} downloads</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadClick(recurso.titulo, recurso.tipo)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Dicas Rápidas */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Dicas Rápidas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-blue-900 mb-2">💡 Dica 1: Atalhos de Teclado</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Use Ctrl+N para novo pedido, Ctrl+O para novo orçamento e Ctrl+S para salvar rapidamente.
                </p>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Produtividade
                </Badge>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-green-900 mb-2">💡 Dica 2: Templates Salvos</h3>
                <p className="text-sm text-green-800 mb-3">
                  Crie templates de orçamento para produtos que vende frequentemente e acelere seu trabalho.
                </p>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Eficiência
                </Badge>
              </CardContent>
            </Card>
            
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-purple-900 mb-2">💡 Dica 3: Relatórios Automáticos</h3>
                <p className="text-sm text-purple-800 mb-3">
                  Configure relatórios automáticos para receber métricas importantes por email semanalmente.
                </p>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  Automação
                </Badge>
              </CardContent>
            </Card>
            
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-orange-900 mb-2">💡 Dica 4: Backup Automático</h3>
                <p className="text-sm text-orange-800 mb-3">
                  Seus dados são salvos automaticamente na nuvem. Usuários premium têm backup adicional.
                </p>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  Segurança
                </Badge>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Suporte */}
        <section>
          <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">Precisa de Ajuda Personalizada?</h2>
              <p className="text-purple-100 mb-4">
                Nossa equipe está pronta para ajudar você a dominar todas as funcionalidades do Ateliê PRO
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  variant="secondary" 
                  className="bg-white text-purple-600 hover:bg-gray-100"
                  onClick={handleWhatsAppSupport}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Falar no WhatsApp
                </Button>
                <Button 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/20"
                  onClick={handleEmailSupport}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Enviar Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Modal do Guia Interativo */}
      {guiaAberto && (
        <GuiaInterativo 
          guia={guiaAberto} 
          onClose={() => setGuiaAberto(null)} 
        />
      )}
    </div>
  );
}
