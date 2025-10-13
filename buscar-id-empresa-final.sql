-- Buscar o ID da empresa "Ateliê Borges"
SELECT id, nome, email, telefone, responsavel, created_at
FROM empresas 
WHERE nome = 'Ateliê Borges' 
ORDER BY created_at DESC 
LIMIT 1;
