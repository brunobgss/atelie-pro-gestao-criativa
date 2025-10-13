// api/test.js - API de teste simples
export default function handler(req, res) {
  console.log('🚀 Test API chamada:', req.method);
  
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Test API funcionando!',
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  if (req.method === 'POST') {
    return res.status(200).json({ 
      message: 'POST funcionando!',
      method: req.method,
      body: req.body,
      timestamp: new Date().toISOString()
    });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}