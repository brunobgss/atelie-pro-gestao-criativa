import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  MessageCircle, 
  Mail,
  Clock,
  Star,
  Filter
} from "lucide-react";

export default function FAQ() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const faqData = [
    {
      id: 1,
      pergunta: "Como faço para criar meu primeiro pedido?",
      resposta: "Acesse a seção 'Pedidos' no menu lateral e clique em 'Novo Pedido'. Preencha as informações do cliente, adicione os produtos desejados com quantidades e defina o prazo de entrega. O sistema irá gerar automaticamente um número de pedido único.",
      categoria: "Pedidos",
      popularidade: 5,
      tags: ["pedidos", "primeiros passos", "criar"]
    },
    {
      id: 2,
      pergunta: "Posso personalizar os orçamentos com minha logo?",
      resposta: "Sim! Na seção 'Orçamentos', você pode fazer upload da sua logo, personalizar cores, adicionar informações da empresa e criar templates personalizados. Os orçamentos ficam com a identidade visual da sua empresa.",
      categoria: "Orçamentos",
      popularidade: 4,
      tags: ["orçamentos", "personalização", "logo"]
    },
    {
      id: 3,
      pergunta: "Como funciona o sistema de estoque?",
      resposta: "O sistema permite controlar o estoque de materiais e produtos. Você pode adicionar produtos, definir quantidades disponíveis, receber alertas quando o estoque estiver baixo e acompanhar movimentações. Usuários premium têm controle avançado de estoque.",
      categoria: "Estoque",
      popularidade: 4,
      tags: ["estoque", "materiais", "controle"]
    },
    {
      id: 4,
      pergunta: "Posso integrar com WhatsApp?",
      resposta: "Sim! O sistema permite enviar orçamentos e pedidos diretamente pelo WhatsApp para seus clientes. Você pode configurar mensagens automáticas, notificar status de pedidos e manter conversas organizadas em um só lugar.",
      categoria: "Integrações",
      popularidade: 5,
      tags: ["whatsapp", "integração", "comunicação"]
    },
    {
      id: 5,
      pergunta: "Como faço backup dos meus dados?",
      resposta: "Seus dados são automaticamente salvos na nuvem em tempo real. Usuários premium têm backup adicional e podem exportar relatórios em PDF. Não é necessário fazer backup manual - tudo é feito automaticamente.",
      categoria: "Segurança",
      popularidade: 3,
      tags: ["backup", "segurança", "dados"]
    },
    {
      id: 6,
      pergunta: "Posso usar em múltiplos dispositivos?",
      resposta: "Sim! O Ateliê PRO funciona em qualquer dispositivo com navegador - computador, tablet ou celular. Seus dados ficam sincronizados em tempo real entre todos os dispositivos.",
      categoria: "Acesso",
      popularidade: 4,
      tags: ["dispositivos", "móvel", "sincronização"]
    },
    {
      id: 7,
      pergunta: "Como funciona o sistema de pagamentos?",
      resposta: "O sistema integra com o Asaas para processar pagamentos. Você pode gerar cobranças, enviar por WhatsApp, receber notificações de pagamento e acompanhar o status financeiro de cada pedido automaticamente.",
      categoria: "Financeiro",
      popularidade: 4,
      tags: ["pagamentos", "asaas", "cobrança"]
    },
    {
      id: 8,
      pergunta: "Posso cancelar minha assinatura a qualquer momento?",
      resposta: "Sim! Você pode cancelar sua assinatura a qualquer momento sem taxas ou multas. Acesse 'Minha Conta' > 'Gerenciar Assinatura' para cancelar. Seus dados permanecem salvos por 30 dias após o cancelamento.",
      categoria: "Assinatura",
      popularidade: 3,
      tags: ["cancelamento", "assinatura", "sem taxas"]
    },
    {
      id: 9,
      pergunta: "Como configuro notificações de pedidos?",
      resposta: "Nas configurações da empresa, você pode ativar notificações por email e WhatsApp para novos pedidos, mudanças de status e lembretes de entrega. Configure os horários e tipos de notificação que deseja receber.",
      categoria: "Notificações",
      popularidade: 3,
      tags: ["notificações", "email", "whatsapp"]
    },
    {
      id: 10,
      pergunta: "Posso exportar relatórios para Excel?",
      resposta: "Sim! Todos os relatórios podem ser exportados em PDF e Excel. Acesse a seção 'Relatórios' para gerar relatórios de vendas, financeiro, produtos mais vendidos e outros. Usuários premium têm relatórios mais detalhados.",
      categoria: "Relatórios",
      popularidade: 4,
      tags: ["relatórios", "excel", "exportar"]
    },
    {
      id: 11,
      pergunta: "Como adiciono novos produtos ao catálogo?",
      resposta: "Acesse 'Catálogo' > 'Novo Produto' e preencha as informações: nome, descrição, preço, categoria e foto. Você pode organizar por categorias e definir preços diferentes para cada produto.",
      categoria: "Catálogo",
      popularidade: 4,
      tags: ["produtos", "catálogo", "adicionar"]
    },
    {
      id: 12,
      pergunta: "O sistema funciona offline?",
      resposta: "O Ateliê PRO é uma aplicação web que requer conexão com a internet para funcionar. Isso garante que seus dados estejam sempre sincronizados e seguros na nuvem. Uma conexão estável é recomendada para melhor experiência.",
      categoria: "Técnico",
      popularidade: 2,
      tags: ["offline", "internet", "conexão"]
    }
  ];

  const categorias = [
    { id: "todos", nome: "Todos", count: faqData.length },
    { id: "Pedidos", nome: "Pedidos", count: faqData.filter(item => item.categoria === "Pedidos").length },
    { id: "Orçamentos", nome: "Orçamentos", count: faqData.filter(item => item.categoria === "Orçamentos").length },
    { id: "Estoque", nome: "Estoque", count: faqData.filter(item => item.categoria === "Estoque").length },
    { id: "Integrações", nome: "Integrações", count: faqData.filter(item => item.categoria === "Integrações").length },
    { id: "Financeiro", nome: "Financeiro", count: faqData.filter(item => item.categoria === "Financeiro").length },
    { id: "Assinatura", nome: "Assinatura", count: faqData.filter(item => item.categoria === "Assinatura").length },
    { id: "Técnico", nome: "Técnico", count: faqData.filter(item => item.categoria === "Técnico").length }
  ];

  const filteredFAQs = faqData.filter(item => {
    const matchesSearch = item.pergunta.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.resposta.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "todos" || item.categoria === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const toggleExpanded = (id: number) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const getPopularityStars = (popularidade: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-3 h-3 ${i < popularidade ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-4 p-6 border-b border-border">
        <SidebarTrigger />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Perguntas Frequentes</h1>
          <p className="text-sm text-muted-foreground">
            Encontre respostas rápidas para as dúvidas mais comuns
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Busca e Filtros */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar perguntas, respostas ou palavras-chave..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 overflow-x-auto">
                {categorias.map((categoria) => (
                  <Button
                    key={categoria.id}
                    variant={selectedCategory === categoria.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(categoria.id)}
                    className="whitespace-nowrap"
                  >
                    {categoria.nome}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {categoria.count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {filteredFAQs.length} pergunta{filteredFAQs.length !== 1 ? 's' : ''} encontrada{filteredFAQs.length !== 1 ? 's' : ''}
            </h2>
            {searchTerm && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSearchTerm("")}
              >
                Limpar busca
              </Button>
            )}
          </div>

          {filteredFAQs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma pergunta encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Tente usar palavras-chave diferentes ou entre em contato conosco
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={() => window.open('https://wa.me/5535998498798', '_blank')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.open('mailto:suporte@ateliepro.online', '_blank')}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredFAQs.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => toggleExpanded(item.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base mb-2">{item.pergunta}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <Badge variant="outline">{item.categoria}</Badge>
                        <div className="flex items-center gap-1">
                          {getPopularityStars(item.popularidade)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>2 min de leitura</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="ml-4">
                      {expandedItems.includes(item.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                
                {expandedItems.includes(item.id) && (
                  <CardContent className="pt-0">
                    <div className="prose prose-sm max-w-none">
                      <p className="text-muted-foreground leading-relaxed">
                        {item.resposta}
                      </p>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Tags:</span>
                        {item.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Ajuda Adicional */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Não encontrou o que procurava?</h2>
            <p className="text-blue-100 mb-4">
              Nossa equipe de suporte está pronta para ajudar com qualquer dúvida específica
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                variant="secondary" 
                className="bg-white text-blue-600 hover:bg-gray-100"
                onClick={() => window.open('https://wa.me/5535998498798', '_blank')}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Falar no WhatsApp
              </Button>
              <Button 
                variant="outline" 
                className="border-white text-white hover:bg-white/20"
                onClick={() => window.open('mailto:suporte@ateliepro.online', '_blank')}
              >
                <Mail className="w-4 h-4 mr-2" />
                Enviar Email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
