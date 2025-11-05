-- Script para liberar plano profissional para brunobgs1888@gmail.com
-- Execute este script no Supabase SQL Editor

-- Primeiro, vamos encontrar o usuário e empresa associada
DO $$
DECLARE
    v_user_id UUID;
    v_empresa_id UUID;
BEGIN
    -- Buscar o user_id pelo email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'brunobgs1888@gmail.com';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Usuário não encontrado com email: brunobgs1888@gmail.com';
    ELSE
        RAISE NOTICE 'Usuário encontrado: %', v_user_id;
        
        -- Buscar a empresa associada ao usuário
        SELECT empresa_id INTO v_empresa_id
        FROM public.user_empresas
        WHERE user_id = v_user_id
        LIMIT 1;
        
        IF v_empresa_id IS NULL THEN
            RAISE NOTICE 'Empresa não encontrada para o usuário';
        ELSE
            RAISE NOTICE 'Empresa encontrada: %', v_empresa_id;
            
            -- Atualizar a empresa para ter plano profissional
            UPDATE public.empresas
            SET 
                is_premium = true,
                tem_nota_fiscal = true,
                status = 'active',
                updated_at = NOW()
            WHERE id = v_empresa_id;
            
            RAISE NOTICE 'Plano profissional liberado com sucesso para a empresa: %', v_empresa_id;
        END IF;
    END IF;
END $$;

-- Verificar se foi atualizado corretamente
SELECT 
    e.id,
    e.nome,
    e.email,
    e.is_premium,
    e.tem_nota_fiscal,
    e.status,
    u.email as user_email
FROM public.empresas e
JOIN public.user_empresas ue ON ue.empresa_id = e.id
JOIN auth.users u ON u.id = ue.user_id
WHERE u.email = 'brunobgs1888@gmail.com';

