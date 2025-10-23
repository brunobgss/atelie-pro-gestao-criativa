import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Play, 
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Passo {
  id: number;
  titulo: string;
  descricao: string;
  acao?: string;
  url?: string;
  imagem?: string;
  dica?: string;
}

interface GuiaInterativoProps {
  guia: {
    id: number;
    titulo: string;
    descricao: string;
    duracao: string;
    nivel: string;
    categoria: string;
    passos: string[];
  };
  onClose: () => void;
}

export function GuiaInterativo({ guia, onClose }: GuiaInterativoProps) {
  const [passoAtual, setPassoAtual] = useState(0);
  const navigate = useNavigate();

  // Converter os passos do guia em passos interativos
  const passosInterativos: Passo[] = guia.passos.map((passo, index) => ({
    id: index + 1,
    titulo: passo,
    descricao: getDescricaoDetalhada(guia.id, index),
    acao: getAcaoPasso(guia.id, index),
    url: getUrlPasso(guia.id, index),
    dica: getDicaPasso(guia.id, index)
  }));

  const progresso = ((passoAtual + 1) / passosInterativos.length) * 100;

  const proximoPasso = () => {
    if (passoAtual < passosInterativos.length - 1) {
      setPassoAtual(passoAtual + 1);
    } else {
      // Guia concluído
      onClose();
    }
  };

  const passoAnterior = () => {
    if (passoAtual > 0) {
      setPassoAtual(passoAtual - 1);
    }
  };

  const executarAcao = () => {
    const passo = passosInterativos[passoAtual];
    if (passo.url) {
      navigate(passo.url);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{guia.titulo}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{guia.descricao}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-4 mt-4">
            <Badge variant="outline">{guia.categoria}</Badge>
            <Badge variant="secondary">{guia.nivel}</Badge>
            <span className="text-sm text-muted-foreground">{guia.duracao}</span>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Progresso do guia</span>
              <span>{passoAtual + 1} de {passosInterativos.length}</span>
            </div>
            <Progress value={progresso} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                {passoAtual + 1}
              </div>
              <h3 className="text-lg font-semibold">
                {passosInterativos[passoAtual].titulo}
              </h3>
            </div>
            
            <p className="text-muted-foreground leading-relaxed">
              {passosInterativos[passoAtual].descricao}
            </p>

            {passosInterativos[passoAtual].dica && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                    💡
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Dica</h4>
                    <p className="text-blue-800 text-sm">
                      {passosInterativos[passoAtual].dica}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {passosInterativos[passoAtual].acao && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">Ação Prática</h4>
                    <p className="text-green-800 text-sm">
                      {passosInterativos[passoAtual].acao}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={executarAcao}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Executar
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={passoAnterior}
              disabled={passoAtual === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
            
            <div className="flex items-center gap-2">
              {passoAtual === passosInterativos.length - 1 ? (
                <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Concluir Guia
                </Button>
              ) : (
                <Button onClick={proximoPasso}>
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Funções auxiliares para gerar conteúdo específico de cada guia
function getDescricaoDetalhada(guiaId: number, passoIndex: number): string {
  const descricoes: { [key: number]: string[] } = {
    1: [ // Primeiros Passos
      "Vamos começar configurando sua conta. Acesse a seção 'Minha Conta' para preencher as informações básicas da sua empresa.",
      "Adicione o nome da empresa, telefone, CPF/CNPJ e endereço. Essas informações aparecerão nos seus orçamentos e documentos.",
      "Agora vamos adicionar seus primeiros produtos. Vá para 'Catálogo' e clique em 'Novo Produto' para começar.",
      "Para cada produto, defina nome, descrição, preço e categoria. Isso facilitará a criação de orçamentos futuros.",
      "Crie um cliente de teste para praticar. Vá para 'Clientes' e adicione um cliente com dados fictícios.",
      "Agora vamos criar seu primeiro orçamento! Vá para 'Orçamentos' e clique em 'Novo Orçamento'."
    ],
    2: [ // Gerenciamento de Pedidos
      "Acesse a seção 'Pedidos' no menu lateral. Aqui você verá todos os pedidos organizados por status.",
      "Clique em 'Novo Pedido' para criar um pedido. Preencha as informações do cliente e selecione os produtos.",
      "Defina a quantidade de cada produto e o prazo de entrega. O sistema calculará automaticamente o valor total.",
      "Após criar o pedido, você pode acompanhar seu progresso mudando o status: Aguardando → Em Produção → Pronto → Entregue.",
      "Use a seção 'Ordem de Produção' para organizar a fabricação e acompanhar o andamento dos pedidos em produção."
    ],
    3: [ // Sistema de Orçamentos
      "Vá para 'Orçamentos' e clique em 'Novo Orçamento'. Selecione o cliente e adicione os produtos desejados.",
      "Personalize o orçamento com sua logo e informações da empresa. Isso dará um visual profissional ao documento.",
      "Defina preços, descontos e condições de pagamento. O sistema calculará automaticamente os valores.",
      "Use o botão 'Enviar por WhatsApp' para compartilhar o orçamento diretamente com o cliente.",
      "Quando o cliente aprovar, converta o orçamento em pedido clicando em 'Converter em Pedido'."
    ],
    4: [ // Controle Financeiro
      "Acesse 'Financeiro' para ver um resumo completo das suas receitas e despesas.",
      "Configure as formas de pagamento aceitas pela sua empresa (PIX, cartão, dinheiro, etc.).",
      "Registre os recebimentos de cada pedido para manter o controle financeiro atualizado.",
      "Use os relatórios financeiros para analisar o desempenho mensal e identificar tendências.",
      "Exporte os dados para Excel ou PDF para facilitar a contabilidade da sua empresa."
    ],
    5: [ // Integração WhatsApp
      "Configure seu número do WhatsApp nas configurações da empresa para ativar a integração.",
      "Use o botão 'Enviar por WhatsApp' nos orçamentos para compartilhar documentos automaticamente.",
      "Configure mensagens automáticas para notificar clientes sobre mudanças de status dos pedidos.",
      "Personalize as mensagens padrão para manter a identidade da sua empresa na comunicação.",
      "Acompanhe todas as conversas centralizadas no sistema para não perder nenhum cliente."
    ],
    6: [ // Relatórios e Analytics
      "Acesse 'Relatórios' para ver métricas importantes do seu negócio em tempo real.",
      "Analise os produtos mais vendidos para otimizar seu catálogo e estoque.",
      "Acompanhe a receita mensal e compare com períodos anteriores para identificar crescimento.",
      "Use os relatórios de clientes para identificar seus melhores compradores e criar estratégias de fidelização.",
      "Exporte relatórios em PDF para apresentações ou análises mais detalhadas."
    ]
  };

  return descricoes[guiaId]?.[passoIndex] || "Siga as instruções do guia para completar este passo.";
}

function getAcaoPasso(guiaId: number, passoIndex: number): string {
  const acoes: { [key: number]: string[] } = {
    1: [
      "Abrir página de configuração da conta",
      "Preencher informações da empresa",
      "Acessar catálogo de produtos",
      "Adicionar primeiro produto",
      "Criar cliente de teste",
      "Criar primeiro orçamento"
    ],
    2: [
      "Abrir seção de pedidos",
      "Criar novo pedido",
      "Adicionar produtos ao pedido",
      "Definir status do pedido",
      "Acessar ordem de produção"
    ],
    3: [
      "Criar novo orçamento",
      "Personalizar layout do orçamento",
      "Definir preços e condições",
      "Enviar orçamento por WhatsApp",
      "Converter orçamento em pedido"
    ],
    4: [
      "Abrir painel financeiro",
      "Configurar formas de pagamento",
      "Registrar recebimento",
      "Gerar relatório financeiro",
      "Exportar dados para Excel"
    ],
    5: [
      "Configurar WhatsApp",
      "Enviar orçamento por WhatsApp",
      "Configurar notificações automáticas",
      "Personalizar mensagens",
      "Acompanhar conversas"
    ],
    6: [
      "Abrir relatórios",
      "Analisar produtos mais vendidos",
      "Verificar receita mensal",
      "Analisar relatório de clientes",
      "Exportar relatório em PDF"
    ]
  };

  return acoes[guiaId]?.[passoIndex] || "";
}

function getUrlPasso(guiaId: number, passoIndex: number): string {
  const urls: { [key: number]: string[] } = {
    1: ["/minha-conta", "/minha-conta", "/catalogo", "/catalogo", "/clientes", "/orcamentos"],
    2: ["/pedidos", "/pedidos/novo", "/pedidos", "/pedidos", "/pedidos"],
    3: ["/orcamentos/novo", "/orcamentos", "/orcamentos", "/orcamentos", "/orcamentos"],
    4: ["/financeiro", "/minha-conta", "/financeiro", "/relatorios", "/relatorios"],
    5: ["/minha-conta", "/orcamentos", "/minha-conta", "/minha-conta", "/orcamentos"],
    6: ["/relatorios", "/relatorios", "/relatorios", "/relatorios", "/relatorios"]
  };

  return urls[guiaId]?.[passoIndex] || "";
}

function getDicaPasso(guiaId: number, passoIndex: number): string {
  const dicas: { [key: number]: string[] } = {
    1: [
      "As informações da empresa aparecerão automaticamente nos seus orçamentos e documentos.",
      "Mantenha as informações sempre atualizadas para evitar problemas com clientes.",
      "Organize os produtos por categorias para facilitar a busca durante a criação de orçamentos.",
      "Defina preços competitivos baseados no mercado e nos seus custos de produção.",
      "Use dados realistas para o cliente de teste, isso ajudará a validar o fluxo completo.",
      "O primeiro orçamento é sempre o mais difícil, mas depois fica muito mais fácil!"
    ],
    2: [
      "Use filtros para encontrar pedidos específicos rapidamente.",
      "Sempre confirme os dados do cliente antes de finalizar o pedido.",
      "Defina prazos realistas considerando sua capacidade de produção.",
      "Mantenha o status dos pedidos sempre atualizado para melhor controle.",
      "Use a ordem de produção para organizar a sequência de fabricação."
    ],
    3: [
      "Personalize o layout do orçamento para dar uma identidade profissional à sua empresa.",
      "Sempre inclua condições de pagamento e prazo de validade no orçamento.",
      "Use o WhatsApp para enviar orçamentos rapidamente e aumentar as chances de conversão.",
      "Siga up com clientes que não responderam ao orçamento após alguns dias.",
      "Converta orçamentos aprovados em pedidos para manter o controle completo do processo."
    ],
    4: [
      "Revise o painel financeiro regularmente para manter o controle da saúde financeira.",
      "Configure todas as formas de pagamento que você aceita para facilitar o recebimento.",
      "Registre recebimentos imediatamente para manter o controle atualizado.",
      "Use os relatórios para identificar tendências e tomar decisões estratégicas.",
      "Mantenha backups dos relatórios para facilitar a contabilidade."
    ],
    5: [
      "Configure o WhatsApp corretamente para evitar problemas de envio.",
      "Teste o envio de orçamentos antes de usar com clientes reais.",
      "Personalize as mensagens para manter a identidade da sua empresa.",
      "Configure notificações para não perder nenhuma interação importante.",
      "Use a centralização de conversas para melhor atendimento ao cliente."
    ],
    6: [
      "Consulte os relatórios regularmente para acompanhar o desempenho do negócio.",
      "Identifique produtos com baixa performance para otimizar o catálogo.",
      "Compare períodos diferentes para identificar tendências de crescimento.",
      "Use dados de clientes para criar estratégias de fidelização.",
      "Exporte relatórios para análises mais detalhadas e apresentações."
    ]
  };

  return dicas[guiaId]?.[passoIndex] || "";
}
