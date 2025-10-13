// api/simple.js
export default function handler(req, res) {
  res.status(200).json({ 
    message: 'API simples funcionando na raiz!',
    method: req.method,
    timestamp: new Date().toISOString()
  });
}
