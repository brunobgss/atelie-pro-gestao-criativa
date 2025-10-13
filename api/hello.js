export default function handler(req, res) {
  res.status(200).json({ 
    message: "API funcionando!",
    method: req.method,
    timestamp: new Date().toISOString()
  });
}