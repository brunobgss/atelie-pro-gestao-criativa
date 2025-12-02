// Página para personalizar template de mensagem WhatsApp
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { MessageCircle, Save, RotateCcw, Info } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ConfiguracaoWhatsApp() {
  const { empresa } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  // Template padrão
  const defaultTemplate = `Olá!

Sou do ${empresa?.nome || 'Atelie'} e gostaria de saber como posso ajudar você hoje!

*NOSSOS SERVIÇOS:*
• Bordados computadorizados
• Uniformes personalizados  
• Camisetas estampadas
• Produtos personalizados

*Entre em contato conosco para um orçamento personalizado!*

_${empresa?.nome || 'Atelie'} - Qualidade e criatividade em cada peça_`;

  // Buscar template personalizado
  const { data: template, isLoading } = useQuery({
    queryKey: ["whatsapp-template", empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return null;

      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("empresa_id", empresa.id)
        .eq("template_type", "dashboard_intro")
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar template:", error);
        return null;
      }

      return data;
    },
    enabled: !!empresa?.id,
  });

  // Carregar template quando disponível
  useEffect(() => {
    if (template?.message_text) {
      setMessage(template.message_text);
    } else {
      setMessage(defaultTemplate);
    }
  }, [template, empresa]);

  // Salvar template
  const handleSave = async () => {
    if (!empresa?.id) {
      toast.error("Empresa não encontrada");
      return;
    }

    try {
      const { error } = await supabase
        .from("whatsapp_templates")
        .upsert({
          empresa_id: empresa.id,
          template_type: "dashboard_intro",
          message_text: message,
          is_active: true,
        }, {
          onConflict: "empresa_id,template_type"
        });

      if (error) throw error;

      toast.success("Template salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-template", empresa.id] });
    } catch (error: any) {
      console.error("Erro ao salvar template:", error);
      toast.error("Erro ao salvar template: " + error.message);
    }
  };

  // Restaurar template padrão
  const handleReset = () => {
    setMessage(defaultTemplate);
    toast.info("Template padrão restaurado");
  };

  // Testar template
  const handleTest = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success("Abrindo WhatsApp para testar...");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-slate-50">
      <header className="bg-white/90 backdrop-blur-lg border-b border-purple-100 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-4 p-4 md:p-6">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Personalizar Template WhatsApp</h1>
            <p className="text-gray-600 text-sm mt-0.5">Configure a mensagem que será enviada pelo botão do Dashboard</p>
          </div>
        </div>
      </header>

      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
              Template de Mensagem
            </CardTitle>
            <CardDescription>
              Personalize a mensagem que será aberta quando clicar no botão "Template WhatsApp" no Dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Variáveis disponíveis */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Variáveis disponíveis:</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• <code className="bg-blue-100 px-1 rounded">{"${empresa?.nome}"}</code> - Nome da empresa</li>
                    <li>• Use <code className="bg-blue-100 px-1 rounded">*texto*</code> para <strong>negrito</strong></li>
                    <li>• Use <code className="bg-blue-100 px-1 rounded">_texto_</code> para <em>itálico</em></li>
                    <li>• Use <code className="bg-blue-100 px-1 rounded">•</code> para listas</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Editor de mensagem */}
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem personalizada..."
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                {message.length} caracteres
              </p>
            </div>

            {/* Botões de ação */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button
                onClick={handleSave}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={isLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Template
              </Button>
              <Button
                onClick={handleTest}
                variant="outline"
                className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Testar no WhatsApp
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar Padrão
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
            <CardDescription>Como a mensagem aparecerá no WhatsApp</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 whitespace-pre-wrap text-sm">
              {message.replace(/\$\{empresa\?\.nome\}/g, empresa?.nome || 'Atelie')}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

