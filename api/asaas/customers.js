// api/asaas/customers.js
// API intermediária para criar clientes no ASAAS

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar se é POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, phone, cpfCnpj } = req.body;

    // Validar dados obrigatórios
    if (!name || !email || !cpfCnpj) {
      return res.status(400).json({ 
        error: 'Dados obrigatórios: name, email, cpfCnpj' 
      });
    }

    // Fazer chamada para ASAAS
    const asaasResponse = await fetch('https://www.asaas.com/api/v3/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.VITE_ASAAS_API_KEY
      },
      body: JSON.stringify({
        name,
        email,
        phone,
        cpfCnpj,
        notificationDisabled: false
      })
    });

    const asaasData = await asaasResponse.json();

    if (!asaasResponse.ok) {
      console.error('Erro ASAAS:', asaasData);
      return res.status(400).json({ 
        error: 'Erro ao criar cliente no ASAAS',
        details: asaasData 
      });
    }

    console.log('✅ Cliente criado no ASAAS:', asaasData);

    // Retornar dados do cliente criado
    res.status(200).json({
      success: true,
      customer: asaasData
    });

  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
}
