import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  HelpCircle, 
  MessageCircle, 
  Mail, 
  Clock, 
  CheckCircle,
  BookOpen,
  Video,
  FileText,
  Users,
  Package,
  FileText as FileTextIcon,
  Calculator,
  BookOpen as BookOpenIcon,
  Archive,
  DollarSign,
  Calendar,
  Ruler,
  BarChart3,
  Receipt,
  Building2,
  Wrench,
  ArrowRight,
  Sparkles,
  Upload,
  Download,
  Trash2,
  Link2,
  Zap
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

  const funcionalidades = [
    {
      icon: Package,
      title: "Pedidos",
      description: "Gerencie todos os seus pedidos de forma completa",
      features: [
        "Criação e edição de pedidos",
        "Controle de status (Aguardando, Em produção, Pronto, Entregue, Cancelado)",
        "Controle de pagamentos (Pendente, Parcial, Pago)",
        "Soma automática de valores (produtos do catálogo + serviços rápidos)",
        "Geração de ordens de produção em PDF",
        "Histórico completo de pedidos",
        "Filtros avançados por status, cliente, data"
      ],
      url: "/pedidos"
    },
    {
      icon: FileTextIcon,
      title: "Orçamentos",
      description: "Crie e gerencie orçamentos profissionais",
      features: [
        "Criação de orçamentos detalhados",
        "Lista de itens com quantidades e valores",
        "Geração de PDFs para impressão",
        "Compartilhamento público de orçamentos",
        "Envio via WhatsApp",
        "Conversão de orçamento em pedido",
        "Personalização com logo e informações da empresa"
      ],
      url: "/orcamentos"
    },
    {
      icon: BookOpenIcon,
      title: "Catálogo de Produtos",
      description: "Gerencie seu catálogo completo de produtos e serviços",
      features: [
        "Cadastro de produtos com preços, materiais e horas de trabalho",
        "Cadastro de serviços rápidos",
        "Importação em massa via CSV (até 1000 produtos)",
        "Exportação do catálogo para CSV",
        "Exclusão em massa de produtos",
        "Vinculação de estoque em massa",
        "Vinculação automática de estoque durante importação",
        "Categorização e organização",
        "Imagens e descrições detalhadas"
      ],
      url: "/catalogo"
    },
    {
      icon: Archive,
      title: "Estoque",
      description: "Controle completo do seu inventário",
      features: [
        "Controle de inventário de materiais e produtos",
        "Alertas de estoque baixo",
        "Importação em massa via CSV",
        "Exclusão em massa de itens",
        "Movimentações de entrada e saída",
        "Histórico de movimentações",
        "Categorização por tipo (Matéria-prima, Tecido, Produto acabado)",
        "Controle de fornecedores e custos",
        "Subtract automático ao vender produtos vinculados"
      ],
      url: "/estoque"
    },
    {
      icon: Users,
      title: "Clientes",
      description: "Gerencie sua base de clientes",
      features: [
        "Cadastro completo de clientes",
        "Histórico de pedidos por cliente",
        "Importação em massa via CSV",
        "Contatos e informações detalhadas",
        "Medidas personalizadas por cliente",
        "Busca e filtros avançados"
      ],
      url: "/clientes"
    },
    {
      icon: Wrench,
      title: "Serviços",
      description: "Gerencie seus serviços oferecidos",
      features: [
        "Cadastro de serviços",
        "Preços e descrições",
        "Importação em massa via CSV",
        "Categorização",
        "Uso em pedidos e orçamentos"
      ],
      url: "/servicos"
    },
    {
      icon: Calendar,
      title: "Agenda",
      description: "Organize entregas e compromissos",
      features: [
        "Visualização de entregas por data",
        "Lembretes automáticos via WhatsApp",
        "Controle de prazos",
        "Calendário visual",
        "Filtros por período"
      ],
      url: "/agenda"
    },
    {
      icon: DollarSign,
      title: "Financeiro",
      description: "Controle financeiro completo",
      features: [
        "Registro de receitas e pagamentos",
        "Controle de valores pagos por pedido",
        "Relatórios financeiros detalhados",
        "Lembretes de pagamento via WhatsApp",
        "Fluxo de caixa",
        "Contas a pagar e receber",
        "Gráficos e estatísticas"
      ],
      url: "/financeiro"
    },
    {
      icon: Building2,
      title: "Fornecedores",
      description: "Gerencie seus fornecedores",
      features: [
        "Cadastro de fornecedores",
        "Pedidos de compra",
        "Histórico de compras",
        "Contatos e informações",
        "Organização por categoria"
      ],
      url: "/fornecedores"
    },
    {
      icon: Calculator,
      title: "Calculadora de Preços",
      description: "Calcule preços de forma precisa",
      features: [
        "Cálculo baseado em materiais",
        "Horas de trabalho",
        "Margem de lucro",
        "Custos variáveis",
        "Histórico de cálculos"
      ],
      url: "/calculadora"
    },
    {
      icon: Ruler,
      title: "Medidas de Clientes",
      description: "Armazene medidas personalizadas",
      features: [
        "Cadastro de medidas por cliente",
        "Histórico de medidas",
        "Organização e busca",
        "Uso em pedidos personalizados"
      ],
      url: "/medidas"
    },
    {
      icon: BarChart3,
      title: "Relatórios",
      description: "Análises e estatísticas do seu negócio",
      features: [
        "Relatórios de vendas",
        "Relatórios financeiros",
        "Relatórios de estoque",
        "Gráficos e visualizações",
        "Exportação de dados",
        "Filtros por período"
      ],
      url: "/relatorios"
    },
    {
      icon: Receipt,
      title: "Notas Fiscais",
      description: "Emissão e gestão de notas fiscais",
      features: [
        "Integração com Focus NF",
        "Emissão de notas fiscais",
        "Gestão completa de NF-e",
        "Histórico e consultas",
        "Configuração de certificados"
      ],
      url: "/notas-fiscais",
      requiresNF: true
    }
  ];

  const faqItems = [
    {
      question: "Como faço para criar meu primeiro pedido?",
      answer: "Acesse a seção 'Pedidos' no menu lateral e clique em 'Novo Pedido'. Preencha as informações do cliente, adicione produtos do catálogo ou serviços rápidos. O valor será calculado automaticamente!"
    },
    {
      question: "Como funciona a soma automática de valores no pedido?",
      answer: "Quando você adiciona produtos do catálogo ou serviços rápidos, o sistema soma automaticamente todos os valores. O campo de valor total é atualizado em tempo real. Você pode editar manualmente se necessário."
    },
    {
      question: "Como importar produtos em massa?",
      answer: "Na página 'Catálogo', clique em 'Importar Produtos'. Baixe o arquivo de exemplo CSV, preencha com seus produtos e faça o upload. Você pode importar até 1000 produtos de uma vez. O sistema também permite vincular estoque automaticamente durante a importação!"
    },
    {
      question: "Como exportar o catálogo para CSV?",
      answer: "Na página 'Catálogo', clique no botão 'Exportar CSV' no topo da página. O arquivo será baixado com todos os produtos e suas informações, incluindo vínculos de estoque."
    },
    {
      question: "Como fazer exclusão em massa?",
      answer: "Tanto no Catálogo quanto no Estoque, clique no botão 'Selecionar', marque os itens desejados usando os checkboxes, e depois clique em 'Excluir Selecionados'. Confirme a ação."
    },
    {
      question: "Como vincular estoque em massa?",
      answer: "No Catálogo, selecione múltiplos produtos usando o modo de seleção, depois clique em 'Vincular Estoque'. Escolha o item de estoque e a quantidade por unidade. Todos os produtos selecionados serão vinculados de uma vez!"
    },
    {
      question: "Como funciona a vinculação automática de estoque na importação?",
      answer: "Ao importar produtos via CSV, adicione as colunas 'Item Estoque' (nome do item) e 'Quantidade por Unidade'. O sistema buscará automaticamente o item no estoque e criará o vínculo durante a importação."
    },
    {
      question: "Posso personalizar os orçamentos?",
      answer: "Sim! Na seção 'Orçamentos' você pode criar orçamentos personalizados com sua logo e informações da empresa. Os orçamentos podem ser enviados por WhatsApp ou compartilhados via link público."
    },
    {
      question: "Como funciona o controle de estoque?",
      answer: "O sistema permite controlar materiais e produtos. Você pode adicionar itens manualmente ou importar via CSV. Quando um produto vendido está vinculado ao estoque, a quantidade é subtraída automaticamente. Configure alertas de estoque baixo!"
    },
    {
      question: "Posso integrar com WhatsApp?",
      answer: "Sim! Configure na seção 'Config. WhatsApp'. O sistema permite enviar orçamentos, pedidos e lembretes diretamente pelo WhatsApp para seus clientes."
    },
    {
      question: "Como funciona o fluxo de caixa?",
      answer: "Na seção 'Fluxo de Caixa' você gerencia contas a pagar e receber. Registre todas as movimentações financeiras e acompanhe o saldo em tempo real. Use os filtros para visualizar períodos específicos."
    },
    {
      question: "Como usar a calculadora de preços?",
      answer: "A calculadora ajuda a definir preços baseados em materiais, horas de trabalho e margem de lucro. Informe os custos e o sistema calculará o preço final sugerido."
    },
    {
      question: "Como faço backup dos meus dados?",
      answer: "Seus dados são automaticamente salvos na nuvem. Você pode exportar relatórios e o catálogo em CSV para ter backups locais. Usuários premium têm recursos adicionais de backup."
    },
    {
      question: "Posso usar em múltiplos dispositivos?",
      answer: "Sim! O Ateliê PRO funciona em qualquer dispositivo com navegador - computador, tablet ou celular. Todos os dados são sincronizados automaticamente."
    },
    {
      question: "Como emitir notas fiscais?",
      answer: "A emissão de notas fiscais está disponível no plano Profissional. Configure a integração com Focus NF na seção 'Config. Notas Fiscais' e comece a emitir suas NF-e."
    }
  ];

  const novidades = [
    {
      icon: Zap,
      title: "Soma Automática de Valores",
      description: "O sistema agora soma automaticamente produtos do catálogo e serviços rápidos ao criar pedidos."
    },
    {
      icon: Upload,
      title: "Importação Inteligente",
      description: "Importe produtos com vinculação automática de estoque durante a importação via CSV."
    },
    {
      icon: Download,
      title: "Exportação de Catálogo",
      description: "Exporte todo o seu catálogo para CSV com um clique, incluindo vínculos de estoque."
    },
    {
      icon: Trash2,
      title: "Exclusão em Massa",
      description: "Exclua múltiplos produtos ou itens de estoque de uma vez, economizando tempo."
    },
    {
      icon: Link2,
      title: "Vinculação em Massa",
      description: "Vincule o mesmo item de estoque a múltiplos produtos simultaneamente."
    }
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

        {/* Novidades */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Novidades e Melhorias Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {novidades.map((novidade, index) => (
                <div key={index} className="p-4 bg-white rounded-lg border border-purple-100 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <novidade.icon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-purple-900 mb-1">{novidade.title}</h3>
                      <p className="text-sm text-purple-700">{novidade.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Funcionalidades Principais */}
        <Card>
          <CardHeader>
            <CardTitle>Funcionalidades do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {funcionalidades.map((func, index) => (
                <div key={index} className="border rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <func.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">{func.title}</h3>
                        {func.requiresNF && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            Requer NF
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{func.description}</p>
                      <ul className="space-y-2 mb-4">
                        {func.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(func.url)}
                        className="gap-2"
                      >
                        Acessar {func.title}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dicas Úteis */}
        <Card>
          <CardHeader>
            <CardTitle>Dicas e Truques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-2">💡 Organização</h3>
                <p className="text-sm text-blue-800">
                  Use o sistema de categorias para organizar melhor seus produtos e facilitar a busca. Isso acelera muito o processo de criação de pedidos!
                </p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <h3 className="font-semibold text-green-900 mb-2">💡 Automação</h3>
                <p className="text-sm text-green-800">
                  Configure lembretes automáticos via WhatsApp para não esquecer de acompanhar pedidos em produção e entregas.
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <h3 className="font-semibold text-purple-900 mb-2">💡 Análise</h3>
                <p className="text-sm text-purple-800">
                  Use os relatórios financeiros regularmente para acompanhar o crescimento do seu negócio e tomar decisões baseadas em dados.
                </p>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                <h3 className="font-semibold text-orange-900 mb-2">💡 Eficiência</h3>
                <p className="text-sm text-orange-800">
                  Mantenha sempre atualizado o cadastro de clientes e use a importação em massa para cadastrar muitos produtos de uma vez.
                </p>
              </div>

              <div className="p-4 bg-pink-50 rounded-lg border border-pink-100">
                <h3 className="font-semibold text-pink-900 mb-2">💡 Estoque</h3>
                <p className="text-sm text-pink-800">
                  Vincule produtos ao estoque para que o sistema subtraia automaticamente quando um produto for vendido. Configure alertas de estoque baixo!
                </p>
              </div>

              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <h3 className="font-semibold text-indigo-900 mb-2">💡 Backup</h3>
                <p className="text-sm text-indigo-800">
                  Exporte regularmente seu catálogo para CSV como backup. Use a exportação antes de fazer grandes alterações.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
