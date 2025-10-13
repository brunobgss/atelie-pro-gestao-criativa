-- Vincular empresa ao usuário
-- Substitua 'ID_DA_EMPRESA' pelo ID da empresa "Ateliê Borges"

INSERT INTO user_empresas (user_id, empresa_id) 
VALUES ('313bfb51-8657-41bd-b543-0f3faa61fefd', 'ID_DA_EMPRESA_AQUI');

-- Para pegar o ID da empresa, execute primeiro:
-- SELECT id, nome FROM empresas WHERE nome = 'Ateliê Borges' ORDER BY created_at DESC LIMIT 1;
