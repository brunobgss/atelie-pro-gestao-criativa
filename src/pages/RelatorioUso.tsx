import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export default function RelatorioUso() {
  const { empresa } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (empresa) {
      // Aguardar um pouco para empresas carregarem
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [empresa]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📊 Relatório de Uso</h1>
        <p className="text-muted-foreground mt-2">
          Análise de engajamento e atividade dos usuários
        </p>
      </div>

      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>⚠️ Acesso Admin Necessário</AlertTitle>
        <AlertDescription>
          <p className="mb-4">
            Este relatório mostra dados de <strong>todas as empresas</strong> cadastradas no sistema.
          </p>
          <p className="mb-4">
            Para ver dados globais, você tem 2 opções:
          </p>
          <ol className="list-decimal list-inside space-y-2 mb-4">
            <li>
              <strong>Via SQL no Supabase:</strong> Execute o arquivo{' '}
              <code className="bg-muted px-1 py-0.5 rounded">verificar-uso-usuarios.sql</code>{' '}
              no SQL Editor do Supabase
            </li>
            <li>
              <strong>Via SQL direto:</strong> Acesse o Supabase Dashboard → SQL Editor e cole:
            </li>
          </ol>
          
          <div className="bg-muted p-4 rounded-lg mt-4">
            <p className="text-sm font-mono whitespace-pre-wrap">
{`SELECT 
  au.email as usuario,
  e.nome as empresa,
  e.created_at as cadastro,
  (SELECT COUNT(*) FROM customers WHERE empresa_id = e.id) as clientes,
  (SELECT COUNT(*) FROM atelie_orders WHERE empresa_id = e.id) as pedidos,
  (SELECT COUNT(*) FROM atelie_quotes WHERE empresa_id = e.id) as orcamentos,
  e.is_premium as premium
FROM auth.users au
JOIN user_empresas ue ON au.id = ue.user_id
JOIN empresas e ON ue.empresa_id = e.id
ORDER BY e.created_at DESC;`}
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {empresa && (
        <Card>
          <CardHeader>
            <CardTitle>Sua Empresa: {empresa.nome}</CardTitle>
            <CardDescription>
              Dados da sua empresa apenas (filtrado por segurança)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Para ver dados globais de todos os usuários, use o método SQL acima.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
