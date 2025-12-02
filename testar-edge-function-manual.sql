-- 🧪 TESTE MANUAL DA EDGE FUNCTION
-- Execute este script para testar a função de emails de retenção
-- Simula o que o cron job faz diariamente

-- IMPORTANTE: Substitua SEU_SERVICE_ROLE_KEY pela sua chave real
-- Encontre em: Supabase Dashboard > Settings > API > service_role key

SELECT net.http_post(
    url := 'https://xthioxkfkxjvqcjqllfy.supabase.co/functions/v1/send-retention-emails',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer SEU_SERVICE_ROLE_KEY_AQUI'
    ),
    body := '{}'::jsonb
) as resultado;

-- Se funcionar, você verá um request_id
-- Para ver o resultado completo, execute:
-- SELECT * FROM net.http_response WHERE id = (SELECT id FROM net.http_request ORDER BY created_at DESC LIMIT 1);

