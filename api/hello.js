// api/hello.js
export default function handler(req, res) {
  res.status(200).json({ 
    message: 'Hello World - Vite + Vercel funcionando!',
    method: req.method,
    timestamp: new Date().toISOString()
  });
}