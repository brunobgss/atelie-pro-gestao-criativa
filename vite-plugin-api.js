// Plugin Vite para servir APIs da pasta api/
import { createServer } from 'http';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, resolve, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function apiPlugin() {
  return {
    name: 'api-plugin',
    configureServer(server) {
      // Carregar variáveis de ambiente do Vite
      const env = loadEnv(server.config.mode || 'development', process.cwd(), '');
      
      // Disponibilizar variáveis de ambiente para os módulos de API
      // Isso garante que VITE_* e outras variáveis estejam disponíveis
      Object.keys(env).forEach(key => {
        if (!process.env[key]) {
          process.env[key] = env[key];
        }
      });
      
      console.log('🔧 API Plugin: Variáveis de ambiente carregadas');
      // Interceptar requisições /api/*
      server.middlewares.use('/api', async (req, res, next) => {
        try {
          // O pathname quando o middleware é chamado com '/api' já vem sem o '/api'
          // Então se a requisição foi /api/focusnf, o pathname aqui será /focusnf
          let pathname = req.url || '/';
          
          // Se não começar com /, adicionar
          if (!pathname.startsWith('/')) {
            pathname = '/' + pathname;
          }
          
          // Normalizar pathname - remover barras duplas e espaços
          pathname = pathname.replace(/\/+/g, '/').trim();
          
          // Remover /api/ do início se existir (caso venha completo)
          let path = pathname.replace(/^\/api\//, '').replace(/^\/api$/, '');
          
          // Remover leading/trailing slashes
          path = path.replace(/^\/+/, '').replace(/\/+$/, '');
          
          // Remover .js se existir
          path = path.replace(/\.js$/, '');
          
          if (!path) {
            console.error(`❌ Path vazio para: ${req.url} (pathname: ${pathname})`);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false,
              error: 'Especifique um endpoint, exemplo: /api/focusnf',
              originalUrl: req.url,
              pathname: pathname
            }));
            return;
          }
          
          console.log(`🔍 API Request: ${req.method} ${req.url} -> pathname: "${pathname}" -> path: "${path}"`);
          
          // Permitir CORS
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          
          if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
          }
          
          // Buscar o arquivo de API correspondente
          let apiFile;
          try {
            // Construir caminho absoluto usando join para evitar problemas com espaços
            const apiPath = join(process.cwd(), 'api', `${path}.js`);
            
            // Verificar se o arquivo existe
            if (!existsSync(apiPath)) {
              console.error(`❌ Arquivo não encontrado: ${apiPath}`);
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false,
                error: `API endpoint não encontrado: /api/${path}`,
                message: `Arquivo não existe: ${apiPath}`,
                path: path,
                apiPath: apiPath
              }));
              return;
            }
            
            // Converter para URL file:// usando pathToFileURL (funciona no Windows)
            const fileUrl = pathToFileURL(apiPath);
            
            console.log(`📂 Carregando API: ${fileUrl.href}`);
            apiFile = await import(fileUrl.href + `?t=${Date.now()}`);
            console.log(`✅ API carregada com sucesso: ${path}`);
          } catch (error) {
            console.error(`❌ Erro ao carregar API ${path}:`, error.message);
            console.error(`❌ Stack:`, error.stack);
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false,
              error: `API endpoint não encontrado: /api/${path}`,
              message: error.message,
              path: path,
              stack: error.stack
            }));
            return;
          }
          
          // Processar body da requisição
          let body = null;
          if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            const chunks = [];
            req.on('data', chunk => chunks.push(chunk));
            await new Promise((resolve) => req.on('end', resolve));
            const data = Buffer.concat(chunks).toString();
            try {
              body = data ? JSON.parse(data) : {};
            } catch (e) {
              body = {};
            }
          }
          
          // Criar objeto de requisição compatível com Vercel/Edge
          // Criar um objeto headers que simula a interface Headers mas também funciona como objeto simples
          const headers = {
            ...req.headers,
            get: (name) => {
              const lowerName = name.toLowerCase();
              for (const [key, value] of Object.entries(req.headers)) {
                if (key.toLowerCase() === lowerName) {
                  return value;
                }
              }
              return null;
            },
            has: (name) => {
              const lowerName = name.toLowerCase();
              return Object.keys(req.headers).some(key => key.toLowerCase() === lowerName);
            }
          };
          
          const request = {
            method: req.method,
            url: req.url,
            headers: headers,
            json: async () => body || {},
            text: async () => body ? JSON.stringify(body) : '',
          };
          
          // Chamar a função correspondente ao método HTTP
          let handler;
          if (req.method === 'GET' && apiFile.GET) {
            handler = apiFile.GET;
          } else if (req.method === 'POST' && apiFile.POST) {
            handler = apiFile.POST;
          } else if (req.method === 'PUT' && apiFile.PUT) {
            handler = apiFile.PUT;
          } else if (req.method === 'DELETE' && apiFile.DELETE) {
            handler = apiFile.DELETE;
          } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false,
              error: `Método ${req.method} não suportado para /api/${path}` 
            }));
            return;
          }
          
          // Executar handler
          const response = await handler(request);
          
          // Processar resposta
          const status = response.status || 200;
          const responseData = await response.json();
          
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(responseData));
          
        } catch (error) {
          console.error('❌ Erro no middleware API:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false,
            error: error.message || 'Erro interno do servidor',
            stack: error.stack
          }));
        }
      });
    }
  };
}

