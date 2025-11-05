-- Limpar mensagens de erro incorretas em notas autorizadas
-- A mensagem "Autorizado o uso da NF-e" não é um erro, é uma confirmação de sucesso

UPDATE public.focusnf_notas
SET erro_mensagem = NULL
WHERE status = 'autorizado'
  AND (
    erro_mensagem LIKE '%Autorizado%'
    OR erro_mensagem LIKE '%autorizado%'
    OR erro_mensagem = 'Autorizado o uso da NF-e'
  );

