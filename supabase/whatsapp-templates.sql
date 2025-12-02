-- Tabela para armazenar templates de mensagem WhatsApp personalizados por empresa
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    template_type VARCHAR(50) NOT NULL DEFAULT 'dashboard_intro', 
    -- Tipos: 'dashboard_intro', 'quote', 'payment', 'delivery', 'stock_alert'
    message_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(empresa_id, template_type)
);

-- Tabela para configurações gerais de WhatsApp por empresa
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    whatsapp_number VARCHAR(20), -- Número do WhatsApp (ex: 5511999999999)
    default_signature TEXT, -- Assinatura padrão para mensagens
    enable_emojis BOOLEAN DEFAULT true, -- Usar emojis nas mensagens
    auto_send_enabled BOOLEAN DEFAULT false, -- Enviar automaticamente (futuro)
    send_hours_start INTEGER DEFAULT 8, -- Horário início (8h)
    send_hours_end INTEGER DEFAULT 20, -- Horário fim (20h)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(empresa_id)
);

-- Índices para templates
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_empresa ON public.whatsapp_templates(empresa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_type ON public.whatsapp_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_active ON public.whatsapp_templates(is_active);

-- Índices para settings
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_empresa ON public.whatsapp_settings(empresa_id);

-- RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

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

-- Políticas RLS para whatsapp_settings
DROP POLICY IF EXISTS "Users can view their own settings" ON public.whatsapp_settings;
CREATE POLICY "Users can view their own settings"
    ON public.whatsapp_settings
    FOR SELECT
    USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create their own settings" ON public.whatsapp_settings;
CREATE POLICY "Users can create their own settings"
    ON public.whatsapp_settings
    FOR INSERT
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own settings" ON public.whatsapp_settings;
CREATE POLICY "Users can update their own settings"
    ON public.whatsapp_settings
    FOR UPDATE
    USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Trigger para atualizar updated_at em settings
CREATE OR REPLACE FUNCTION update_whatsapp_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_settings_updated_at_trigger ON public.whatsapp_settings;
CREATE TRIGGER update_whatsapp_settings_updated_at_trigger
    BEFORE UPDATE ON public.whatsapp_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_settings_updated_at();

-- Comentários
COMMENT ON TABLE public.whatsapp_templates IS 'Templates de mensagem WhatsApp personalizados por empresa';
COMMENT ON COLUMN public.whatsapp_templates.template_type IS 'Tipo: dashboard_intro, quote, payment, delivery, stock_alert';
COMMENT ON COLUMN public.whatsapp_templates.message_text IS 'Texto da mensagem com suporte a variáveis como ${empresa?.nome}';
COMMENT ON TABLE public.whatsapp_settings IS 'Configurações gerais de WhatsApp por empresa';
COMMENT ON COLUMN public.whatsapp_settings.whatsapp_number IS 'Número do WhatsApp no formato internacional (ex: 5511999999999)';
COMMENT ON COLUMN public.whatsapp_settings.default_signature IS 'Assinatura padrão adicionada automaticamente nas mensagens';

