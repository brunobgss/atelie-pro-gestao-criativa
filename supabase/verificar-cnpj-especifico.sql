-- Script para verificar especificamente o CNPJ "16.965.817/0001-34"
-- e ver se já está cadastrado na empresa da usuária ou em outra empresa

-- PASSO 1: Verificar se o CNPJ está cadastrado (com e sem formatação)
SELECT 
    f.id,
    f.nome_fantasia,
    f.cnpj AS cnpj_cadastrado,
    f.empresa_id,
    e.nome AS nome_empresa,
    e.email AS email_empresa,
    u.email AS email_usuario
FROM public.fornecedores f
LEFT JOIN public.empresas e ON e.id = f.empresa_id
LEFT JOIN public.user_empresas ue ON ue.empresa_id = e.id
LEFT JOIN auth.users u ON u.id = ue.user_id
WHERE f.cnpj = '16.965.817/0001-34'  -- Com formatação
   OR f.cnpj = '16965817000134'      -- Sem formatação
   OR f.cnpj = REPLACE(REPLACE(REPLACE('16.965.817/0001-34', '.', ''), '/', ''), '-', '')  -- Normalizado
ORDER BY f.created_at DESC;

-- PASSO 2: Verificar qual empresa_id pertence à usuária que está tendo o problema
-- (precisamos do email da usuária para identificar)
-- Substitua 'EMAIL_DA_USUARIA' pelo email real
SELECT 
    u.email AS email_usuario,
    e.id AS empresa_id,
    e.nome AS nome_empresa,
    ue.role AS role_usuario
FROM auth.users u
JOIN public.user_empresas ue ON ue.user_id = u.id
JOIN public.empresas e ON e.id = ue.empresa_id
WHERE u.email = 'EMAIL_DA_USUARIA'  -- SUBSTITUIR PELO EMAIL REAL
ORDER BY ue.created_at DESC;

-- PASSO 3: Verificar se há fornecedores com CNPJ similar (pode ter sido cadastrado com formatação diferente)
SELECT 
    f.id,
    f.nome_fantasia,
    f.cnpj,
    f.empresa_id,
    e.nome AS nome_empresa,
    -- Normalizar CNPJ para comparação
    REPLACE(REPLACE(REPLACE(f.cnpj, '.', ''), '/', ''), '-', '') AS cnpj_normalizado
FROM public.fornecedores f
LEFT JOIN public.empresas e ON e.id = f.empresa_id
WHERE REPLACE(REPLACE(REPLACE(f.cnpj, '.', ''), '/', ''), '-', '') = '16965817000134'
ORDER BY f.created_at DESC;

-- PASSO 4: Contar quantos fornecedores existem com esse CNPJ (normalizado)
SELECT 
    REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') AS cnpj_normalizado,
    COUNT(*) AS total_cadastros,
    STRING_AGG(DISTINCT empresa_id::text, ', ') AS empresas_ids,
    STRING_AGG(DISTINCT nome_fantasia, ' | ') AS nomes_fornecedores
FROM public.fornecedores
WHERE cnpj IS NOT NULL
  AND REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') = '16965817000134'
GROUP BY REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '');

