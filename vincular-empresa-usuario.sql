-- Vincular empresa ao usuário
-- Substitua 'ID_DA_EMPRESA' pelo ID que você pegou no script anterior
-- Substitua 'SEU_USER_ID' pelo ID do seu usuário

INSERT INTO user_empresas (user_id, empresa_id) 
VALUES ('SEU_USER_ID', 'ID_DA_EMPRESA');

-- Para pegar seu USER_ID, execute este comando:
-- SELECT id, email FROM auth.users WHERE email = 'brunobgs1888@gmail.com';
