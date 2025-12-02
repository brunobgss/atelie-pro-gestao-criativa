// Página completa para personalizar todos os templates e configurações WhatsApp
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  MessageCircle, 
  Save, 
  RotateCcw, 
  Info, 
  Phone,
  Clock,
  Settings,
  FileText,
  DollarSign,
  Package,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type TemplateType = 'dashboard_intro' | 'quote' | 'payment' | 'delivery' | 'stock_alert';

interface Template {
  type: TemplateType;
  name: string;
  description: string;
  icon: React.ReactNode;
  defaultTemplate: (empresa?: any) => string;
  variables: string[];
}

const templateTypes: Template[] = [
  {
    type: 'dashboard_intro',
    name: 'Introdução (Dashboard)',
    description: 'Mensagem do botão "Template WhatsApp" no Dashboard',
    icon: <MessageCircle className="h-5 w-5" />,
    defaultTemplate: (empresa) => `Olá!

Sou do ${empresa?.nome || 'Atelie'} e gostaria de saber como posso ajudar você hoje!

*NOSSOS SERVIÇOS:*
• Bordados computadorizados
• Uniformes personalizados  
• Camisetas estampadas
• Produtos personalizados

*Entre em contato conosco para um orçamento personalizado!*

_${empresa?.nome || 'Atelie'} - Qualidade e criatividade em cada peça_`,
    variables: ['${empresa?.nome}']
  },
  {
    type: 'quote',
    name: 'Orçamentos',
    description: 'Mensagem enviada ao compartilhar orçamento',
    icon: <FileText className="h-5 w-5" />,
    defaultTemplate: (empresa) => `*ORÇAMENTO ${empresa?.nome || 'ATELIÊ'}*

Olá *{cliente}*!

Seu orçamento está pronto!

*Produtos:*
{produtos}

*Valor Total: {valor_total}*

*Próximos passos:*
1. Confirme se está de acordo
2. Informe a forma de pagamento
3. Defina a data de entrega

Para aprovar ou fazer alterações, responda esta mensagem!

Atenciosamente,
${empresa?.nome || 'Ateliê'}`,
    variables: ['${empresa?.nome}', '{cliente}', '{produtos}', '{valor_total}']
  },
  {
    type: 'payment',
    name: 'Cobranças',
    description: 'Mensagem de lembrete de pagamento',
    icon: <DollarSign className="h-5 w-5" />,
    defaultTemplate: (empresa) => `Olá {cliente}!

Lembramos sobre o pagamento do pedido {codigo_pedido}.

*VALORES:*
• Total: {valor_total}
• Pago: {valor_pago}
• Restante: {valor_restante}

{aviso_atraso}

Por favor, entre em contato para quitar o saldo.

_${empresa?.nome || 'Ateliê'}_`,
    variables: ['${empresa?.nome}', '{cliente}', '{codigo_pedido}', '{valor_total}', '{valor_pago}', '{valor_restante}', '{aviso_atraso}']
  },
  {
    type: 'delivery',
    name: 'Entregas',
    description: 'Lembrete de entrega da Agenda',
    icon: <Package className="h-5 w-5" />,
    defaultTemplate: (empresa) => `Olá {cliente}!

Lembramos que seu pedido {codigo_pedido} tem entrega prevista para {data_entrega}.

*DETALHES:*
• Tipo: {tipo}
• Status: {status}
• Dias restantes: {dias_restantes}

Em caso de dúvidas, entre em contato conosco!

_${empresa?.nome || 'Ateliê'}_`,
    variables: ['${empresa?.nome}', '{cliente}', '{codigo_pedido}', '{data_entrega}', '{tipo}', '{status}', '{dias_restantes}']
  },
  {
    type: 'stock_alert',
    name: 'Alertas de Estoque',
    description: 'Mensagem de alerta quando estoque está baixo',
    icon: <AlertTriangle className="h-5 w-5" />,
    defaultTemplate: (empresa) => `⚠️ *ALERTA DE ESTOQUE BAIXO*

Os seguintes itens estão com estoque baixo:

{itens_estoque}

💡 *SUGESTÃO:* Considere repor estes itens em breve.

_${empresa?.nome || 'Ateliê'}_`,
    variables: ['${empresa?.nome}', '{itens_estoque}']
  }
];

export default function ConfiguracaoWhatsApp() {
  const { empresa } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TemplateType>('dashboard_intro');
  const [templates, setTemplates] = useState<Record<TemplateType, string>>({} as Record<TemplateType, string>);
  const [settings, setSettings] = useState({
    whatsapp_number: '',
    default_signature: '',
    enable_emojis: true,
    auto_send_enabled: false,
    send_hours_start: 8,
    send_hours_end: 20,
  });

  // Buscar templates
  const { data: savedTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["whatsapp-templates", empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("empresa_id", empresa.id)
        .eq("is_active", true);

      if (error) {
        console.error("Erro ao buscar templates:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Buscar configurações
  const { data: savedSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["whatsapp-settings", empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return null;

      const { data, error } = await supabase
        .from("whatsapp_settings")
        .select("*")
        .eq("empresa_id", empresa.id)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar configurações:", error);
        return null;
      }

      return data;
    },
    enabled: !!empresa?.id,
  });

  // Carregar templates e configurações
  useEffect(() => {
    if (savedTemplates.length > 0) {
      const templatesMap: Record<TemplateType, string> = {} as Record<TemplateType, string>;
      savedTemplates.forEach((t: any) => {
        templatesMap[t.template_type as TemplateType] = t.message_text;
      });
      setTemplates(templatesMap);
    } else {
      // Carregar templates padrão
      const defaultTemplates: Record<TemplateType, string> = {} as Record<TemplateType, string>;
      templateTypes.forEach(t => {
        defaultTemplates[t.type] = t.defaultTemplate(empresa);
      });
      setTemplates(defaultTemplates);
    }
  }, [savedTemplates, empresa]);

  useEffect(() => {
    if (savedSettings) {
      setSettings({
        whatsapp_number: savedSettings.whatsapp_number || '',
        default_signature: savedSettings.default_signature || '',
        enable_emojis: savedSettings.enable_emojis ?? true,
        auto_send_enabled: savedSettings.auto_send_enabled ?? false,
        send_hours_start: savedSettings.send_hours_start || 8,
        send_hours_end: savedSettings.send_hours_end || 20,
      });
    } else {
      // Configurações padrão
      setSettings({
        whatsapp_number: '',
        default_signature: empresa?.nome || 'Ateliê',
        enable_emojis: true,
        auto_send_enabled: false,
        send_hours_start: 8,
        send_hours_end: 20,
      });
    }
  }, [savedSettings, empresa]);

  // Salvar template
  const handleSaveTemplate = async (type: TemplateType) => {
    if (!empresa?.id) {
      toast.error("Empresa não encontrada");
      return;
    }

    try {
      const { error } = await supabase
        .from("whatsapp_templates")
        .upsert({
          empresa_id: empresa.id,
          template_type: type,
          message_text: templates[type],
          is_active: true,
        }, {
          onConflict: "empresa_id,template_type"
        });

      if (error) throw error;

      toast.success(`Template "${templateTypes.find(t => t.type === type)?.name}" salvo com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates", empresa.id] });
    } catch (error: any) {
      console.error("Erro ao salvar template:", error);
      toast.error("Erro ao salvar template: " + error.message);
    }
  };

  // Salvar configurações
  const handleSaveSettings = async () => {
    if (!empresa?.id) {
      toast.error("Empresa não encontrada");
      return;
    }

    try {
      const { error } = await supabase
        .from("whatsapp_settings")
        .upsert({
          empresa_id: empresa.id,
          ...settings,
        }, {
          onConflict: "empresa_id"
        });

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-settings", empresa.id] });
    } catch (error: any) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações: " + error.message);
    }
  };

  // Restaurar template padrão
  const handleResetTemplate = (type: TemplateType) => {
    const template = templateTypes.find(t => t.type === type);
    if (template) {
      setTemplates(prev => ({
        ...prev,
        [type]: template.defaultTemplate(empresa)
      }));
      toast.info("Template padrão restaurado");
    }
  };

  // Testar template
  const handleTestTemplate = (type: TemplateType) => {
    let message = templates[type];
    
    // Substituir variáveis com exemplos
    message = message.replace(/\$\{empresa\?\.nome\}/g, empresa?.nome || 'Atelie');
    message = message.replace(/\{cliente\}/g, 'João Silva');
    message = message.replace(/\{produtos\}/g, '• Camiseta personalizada - Qtd: 5 - R$ 250,00');
    message = message.replace(/\{valor_total\}/g, 'R$ 250,00');
    message = message.replace(/\{codigo_pedido\}/g, 'PED-001');
    message = message.replace(/\{valor_pago\}/g, 'R$ 100,00');
    message = message.replace(/\{valor_restante\}/g, 'R$ 150,00');
    message = message.replace(/\{aviso_atraso\}/g, 'ATENÇÃO: Este pedido está em atraso!');
    message = message.replace(/\{data_entrega\}/g, new Date().toLocaleDateString('pt-BR'));
    message = message.replace(/\{tipo\}/g, 'Bordado');
    message = message.replace(/\{status\}/g, 'Em produção');
    message = message.replace(/\{dias_restantes\}/g, '3');
    message = message.replace(/\{itens_estoque\}/g, '• Linha vermelha: 2 unidades (mín: 10)\n• Tecido azul: 5 metros (mín: 20)');
    
    // Adicionar assinatura se configurada
    if (settings.default_signature && !message.includes(settings.default_signature)) {
      message += `\n\n_${settings.default_signature}_`;
    }

    const whatsappUrl = `https://wa.me/${settings.whatsapp_number || ''}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success("Abrindo WhatsApp para testar...");
  };

  // Salvar todos os templates
  const handleSaveAll = async () => {
    if (!empresa?.id) {
      toast.error("Empresa não encontrada");
      return;
    }

    try {
      const templatesToSave = templateTypes.map(t => ({
        empresa_id: empresa.id,
        template_type: t.type,
        message_text: templates[t.type],
        is_active: true,
      }));

      const { error } = await supabase
        .from("whatsapp_templates")
        .upsert(templatesToSave, {
          onConflict: "empresa_id,template_type"
        });

      if (error) throw error;

      toast.success("Todos os templates salvos com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates", empresa.id] });
    } catch (error: any) {
      console.error("Erro ao salvar templates:", error);
      toast.error("Erro ao salvar templates: " + error.message);
    }
  };

  if (!empresa?.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-slate-50 p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentTemplate = templateTypes.find(t => t.type === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-slate-50">
      <header className="bg-white/90 backdrop-blur-lg border-b border-purple-100 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-4 p-4 md:p-6">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configurações WhatsApp</h1>
            <p className="text-gray-600 text-sm mt-0.5">Personalize todas as mensagens WhatsApp do Ateliê Pro</p>
          </div>
        </div>
      </header>

      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
        {/* Configurações Gerais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              Configurações Gerais
            </CardTitle>
            <CardDescription>
              Configure número, assinatura e preferências gerais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp_number">Número do WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="whatsapp_number"
                    placeholder="5511999999999"
                    value={settings.whatsapp_number}
                    onChange={(e) => setSettings(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-gray-500">Formato: código do país + DDD + número (sem espaços ou caracteres)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_signature">Assinatura Padrão</Label>
                <Input
                  id="default_signature"
                  placeholder={empresa?.nome || 'Ateliê'}
                  value={settings.default_signature}
                  onChange={(e) => setSettings(prev => ({ ...prev, default_signature: e.target.value }))}
                />
                <p className="text-xs text-gray-500">Será adicionada automaticamente nas mensagens</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="send_hours_start">Horário Início</Label>
                <Input
                  id="send_hours_start"
                  type="number"
                  min="0"
                  max="23"
                  value={settings.send_hours_start}
                  onChange={(e) => setSettings(prev => ({ ...prev, send_hours_start: parseInt(e.target.value) || 8 }))}
                />
                <p className="text-xs text-gray-500">Horário mínimo para envio (0-23)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="send_hours_end">Horário Fim</Label>
                <Input
                  id="send_hours_end"
                  type="number"
                  min="0"
                  max="23"
                  value={settings.send_hours_end}
                  onChange={(e) => setSettings(prev => ({ ...prev, send_hours_end: parseInt(e.target.value) || 20 }))}
                />
                <p className="text-xs text-gray-500">Horário máximo para envio (0-23)</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-1">
                <Label htmlFor="enable_emojis" className="cursor-pointer">Usar Emojis nas Mensagens</Label>
                <p className="text-xs text-gray-500">Ative para incluir emojis automaticamente</p>
              </div>
              <Switch
                id="enable_emojis"
                checked={settings.enable_emojis}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enable_emojis: checked }))}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-1">
                <Label htmlFor="auto_send" className="cursor-pointer">Envio Automático (Futuro)</Label>
                <p className="text-xs text-gray-500">Enviar mensagens automaticamente (em desenvolvimento)</p>
              </div>
              <Switch
                id="auto_send"
                checked={settings.auto_send_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_send_enabled: checked }))}
                disabled
              />
            </div>

            <Button onClick={handleSaveSettings} className="w-full md:w-auto">
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>

        {/* Templates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-emerald-600" />
                  Templates de Mensagens
                </CardTitle>
                <CardDescription>
                  Personalize cada tipo de mensagem WhatsApp
                </CardDescription>
              </div>
              <Button onClick={handleSaveAll} variant="outline" size="sm">
                <Save className="h-4 w-4 mr-2" />
                Salvar Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateType)}>
              <TabsList className="grid w-full grid-cols-5">
                {templateTypes.map(template => (
                  <TabsTrigger key={template.type} value={template.type} className="flex items-center gap-2">
                    {template.icon}
                    <span className="hidden md:inline">{template.name}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {templateTypes.map(template => (
                <TabsContent key={template.type} value={template.type} className="space-y-4 mt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900 mb-2">{template.description}</p>
                        <p className="text-xs text-blue-800 mb-2">Variáveis disponíveis:</p>
                        <div className="flex flex-wrap gap-2">
                          {template.variables.map(v => (
                            <Badge key={v} variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                              <code className="text-xs">{v}</code>
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-blue-700 mt-2">
                          • Use <code className="bg-blue-100 px-1 rounded">*texto*</code> para <strong>negrito</strong>
                          <br />
                          • Use <code className="bg-blue-100 px-1 rounded">_texto_</code> para <em>itálico</em>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`template-${template.type}`}>Mensagem</Label>
                    <Textarea
                      id={`template-${template.type}`}
                      value={templates[template.type] || ''}
                      onChange={(e) => setTemplates(prev => ({ ...prev, [template.type]: e.target.value }))}
                      placeholder="Digite sua mensagem personalizada..."
                      rows={12}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      {(templates[template.type] || '').length} caracteres
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-4 border-t">
                    <Button
                      onClick={() => handleSaveTemplate(template.type)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Template
                    </Button>
                    <Button
                      onClick={() => handleTestTemplate(template.type)}
                      variant="outline"
                      className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Testar no WhatsApp
                    </Button>
                    <Button
                      onClick={() => handleResetTemplate(template.type)}
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restaurar Padrão
                    </Button>
                  </div>

                  {/* Preview */}
                  <Card className="bg-gray-50">
                    <CardHeader>
                      <CardTitle className="text-lg">Preview</CardTitle>
                      <CardDescription>Como a mensagem aparecerá no WhatsApp</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-white border border-gray-200 rounded-lg p-4 whitespace-pre-wrap text-sm">
                        {(templates[template.type] || '')
                          .replace(/\$\{empresa\?\.nome\}/g, empresa?.nome || 'Atelie')
                          .replace(/\{cliente\}/g, 'João Silva')
                          .replace(/\{produtos\}/g, '• Camiseta personalizada - Qtd: 5 - R$ 250,00')
                          .replace(/\{valor_total\}/g, 'R$ 250,00')
                          .replace(/\{codigo_pedido\}/g, 'PED-001')
                          .replace(/\{valor_pago\}/g, 'R$ 100,00')
                          .replace(/\{valor_restante\}/g, 'R$ 150,00')
                          .replace(/\{aviso_atraso\}/g, 'ATENÇÃO: Este pedido está em atraso!')
                          .replace(/\{data_entrega\}/g, new Date().toLocaleDateString('pt-BR'))
                          .replace(/\{tipo\}/g, 'Bordado')
                          .replace(/\{status\}/g, 'Em produção')
                          .replace(/\{dias_restantes\}/g, '3')
                          .replace(/\{itens_estoque\}/g, '• Linha vermelha: 2 unidades (mín: 10)\n• Tecido azul: 5 metros (mín: 20)')}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
