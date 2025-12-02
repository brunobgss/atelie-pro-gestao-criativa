-- Tabela para armazenar templates de mensagem WhatsApp personalizados por empresa
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    template_type VARCHAR(50) NOT NULL DEFAULT 'dashboard_intro', -- 'dashboard_intro', 'quote', 'payment', etc.
    message_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(empresa_id, template_type)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_empresa ON public.whatsapp_templates(empresa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_type ON public.whatsapp_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_active ON public.whatsapp_templates(is_active);

-- RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver templates da própria empresa
DROP POLICY IF EXISTS "Users can view their own templates" ON public.whatsapp_templates;
CREATE POLICY "Users can view their own templates"
    ON public.whatsapp_templates
    FOR SELECT
    USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Política: Usuários podem criar templates para própria empresa
DROP POLICY IF EXISTS "Users can create their own templates" ON public.whatsapp_templates;
CREATE POLICY "Users can create their own templates"
    ON public.whatsapp_templates
    FOR INSERT
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Política: Usuários podem atualizar templates da própria empresa
DROP POLICY IF EXISTS "Users can update their own templates" ON public.whatsapp_templates;
CREATE POLICY "Users can update their own templates"
    ON public.whatsapp_templates
    FOR UPDATE
    USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Política: Usuários podem deletar templates da própria empresa
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.whatsapp_templates;
CREATE POLICY "Users can delete their own templates"
    ON public.whatsapp_templates
    FOR DELETE
    USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_templates_updated_at_trigger ON public.whatsapp_templates;
CREATE TRIGGER update_whatsapp_templates_updated_at_trigger
    BEFORE UPDATE ON public.whatsapp_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_templates_updated_at();

-- Comentários
COMMENT ON TABLE public.whatsapp_templates IS 'Templates de mensagem WhatsApp personalizados por empresa';
COMMENT ON COLUMN public.whatsapp_templates.template_type IS 'Tipo: dashboard_intro, quote, payment, etc.';
COMMENT ON COLUMN public.whatsapp_templates.message_text IS 'Texto da mensagem com suporte a variáveis como ${empresa?.nome}';

