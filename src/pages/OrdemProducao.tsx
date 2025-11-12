import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, Download, Package, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getOrderByCode } from "@/integrations/supabase/orders";
import { getMedidas } from "@/integrations/supabase/medidas";
import { toast } from "sonner";
import PrintLayout from "@/components/PrintLayout";
import { useAuth } from "@/components/AuthProvider";

// Função para formatar moeda
const formatCurrency = (value: number) => {
  try {
    // Verificar se o valor é válido
    if (value === null || value === undefined || isNaN(value)) {
      console.warn("formatCurrency: valor inválido:", value);
      return "R$ 0,00";
    }
    
    const numValue = Number(value);
    if (isNaN(numValue)) {
      console.warn("formatCurrency: conversão falhou:", value);
      return "R$ 0,00";
    }
    
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
    
    console.log("formatCurrency: valor formatado:", formatted);
    return formatted;
  } catch (error) {
    console.error("formatCurrency error:", error, "value:", value);
    return "R$ 0,00";
  }
};

export default function OrdemProducao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { empresa } = useAuth();

  // Buscar dados do pedido
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderByCode(id!),
    enabled: !!id,
  });

  // Buscar medidas do cliente
  const { data: medidas = [] } = useQuery({
    queryKey: ["medidas", empresa?.id],
    queryFn: () => getMedidas(empresa?.id || ''),
    enabled: !!empresa?.id && !!order?.customer_name,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando ordem de produção...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    console.error("Order is null or undefined");
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Pedido não encontrado</h2>
          <p className="text-gray-600 mb-6">O pedido solicitado não foi encontrado ou não existe.</p>
          <Button onClick={() => navigate('/pedidos')} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Pedidos
          </Button>
        </div>
      </div>
    );
  }

  // Criar objeto seguro com valores padrão
  const safeOrder = {
    id: order.id || '',
    code: order.code || 'N/A',
    type: order.type || 'N/A',
    status: order.status || 'N/A',
    customer_name: order.customer_name || 'N/A',
    customer_phone: order.customer_phone || 'N/A',
    customer_email: order.customer_email || 'N/A',
    description: order.description || 'N/A',
    value: order.value !== null && order.value !== undefined && !isNaN(Number(order.value)) ? Number(order.value) : 0,
    paid: order.paid !== null && order.paid !== undefined && !isNaN(Number(order.paid)) ? Number(order.paid) : 0,
    delivery_date: order.delivery_date || 'N/A',
    observations: order.observations || 'Sem observações',
    file_url: order.file_url || null,
    created_at: order.created_at || new Date().toISOString(),
    updated_at: order.updated_at || new Date().toISOString(),
    personalizations: Array.isArray(order.personalizations) ? order.personalizations : [],
  };

  console.log("=== ORDEM DE PRODUÇÃO - DADOS SEGUROS ===");
  console.log("Order original:", order);
  console.log("Order keys:", Object.keys(order || {}));
  console.log("Order value field:", order?.value, "type:", typeof order?.value);
  console.log("Order paid field:", order?.paid, "type:", typeof order?.paid);
  console.log("Safe Order:", safeOrder);
  console.log("Safe Order value:", safeOrder.value, "type:", typeof safeOrder.value);
  console.log("Safe Order paid:", safeOrder.paid, "type:", typeof safeOrder.paid);
  console.log("formatCurrency test:", formatCurrency(safeOrder.value));
  console.log("formatCurrency test paid:", formatCurrency(safeOrder.paid));

  // Função para gerar PDF (reutilizável)
  const generatePDF = () => {
    console.log("=== GERANDO PDF ORDEM DE PRODUÇÃO ===");
    console.log("Safe Order:", safeOrder);
    console.log("Medidas disponíveis:", medidas);
    
    // Filtrar medidas do cliente atual
    const medidasCliente = medidas.filter(medida => 
      medida.cliente_nome.toLowerCase().includes(safeOrder.customer_name.toLowerCase())
    );
    console.log("Medidas do cliente:", medidasCliente);
    
    // Gerar HTML completo do PDF
    const pdfHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordem de Produção - ${safeOrder.code}</title>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              line-height: 1.6; 
              color: #333; 
              background: white; 
              padding: 20px; 
            }
            .container { max-width: 800px; margin: 0 auto; }
            .header { 
              text-align: center; 
              margin-bottom: 40px; 
              border-bottom: 3px solid #2563eb; 
              padding-bottom: 20px; 
            }
            .header h1 { font-size: 28px; font-weight: bold; margin: 0; margin-bottom: 10px; color: #1e40af; }
            .header .subtitle { font-size: 16px; color: #6b7280; }
            .section { 
              margin-bottom: 30px; 
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #2563eb;
            }
            .section h2 { 
              font-size: 20px; 
              font-weight: bold; 
              margin-bottom: 15px; 
              color: #1e40af; 
            }
            .grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 20px; 
              margin-bottom: 20px; 
            }
            .item { 
              display: flex; 
              flex-direction: column; 
            }
            .label { 
              font-size: 12px; 
              color: #6b7280; 
              font-weight: bold; 
              text-transform: uppercase; 
              margin-bottom: 5px; 
            }
            .value { 
              font-size: 16px; 
              color: #1f2937; 
              font-weight: 500; 
            }
            .status-badge { 
              display: inline-block; 
              padding: 6px 12px; 
              border-radius: 20px; 
              font-size: 12px; 
              font-weight: bold; 
              background: #f3f4f6; 
              color: #374151; 
            }
            .logo-section { 
              text-align: center; 
              margin: 20px 0; 
              padding: 20px;
              background: white;
              border-radius: 8px;
              border: 2px dashed #d1d5db;
            }
            .logo-section img { 
              max-width: 300px; 
              max-height: 200px; 
              border: 2px solid #e5e7eb; 
              border-radius: 8px; 
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .checklist { 
              background: #fef3c7; 
              padding: 20px; 
              border-radius: 8px; 
              border-left: 4px solid #f59e0b; 
            }
            .checklist h3 { 
              margin-bottom: 15px; 
              color: #92400e; 
              font-size: 18px; 
            }
            .checklist ul { 
              list-style: none; 
              padding: 0; 
            }
            .checklist li { 
              margin-bottom: 10px; 
              display: flex; 
              align-items: center; 
              font-size: 14px;
            }
            .checklist li span { 
              color: #059669; 
              margin-right: 10px; 
              font-weight: bold; 
            }
            .personal-table { 
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            .personal-table th,
            .personal-table td { 
              border: 1px solid #d1d5db; 
              padding: 8px; 
              font-size: 13px; 
              text-align: left; 
            }
            .personal-table th { 
              background: #e0f2fe; 
              color: #0369a1; 
              text-transform: uppercase; 
              font-weight: 700; 
            }
            .personal-table td:first-child { 
              font-weight: 600; 
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              font-size: 12px; 
              color: #6b7280; 
              border-top: 1px solid #e5e7eb; 
              padding-top: 20px; 
            }
            @media print {
              body { padding: 0; }
              .container { max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ORDEM DE PRODUÇÃO</h1>
              <div class="subtitle">Código: ${safeOrder.code}</div>
              <div class="subtitle">Data: ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
            
            <div class="section">
              <h2>📋 Informações do Pedido</h2>
              <div class="grid">
                <div class="item">
                  <div class="label">Código</div>
                  <div class="value">${safeOrder.code}</div>
                </div>
                <div class="item">
                  <div class="label">Tipo</div>
                  <div class="value">${safeOrder.type}</div>
                </div>
                <div class="item">
                  <div class="label">Status</div>
                  <div class="value">
                    <span class="status-badge">${safeOrder.status}</span>
                  </div>
                </div>
                <div class="item">
                  <div class="label">Data de Entrega</div>
                  <div class="value">${safeOrder.delivery_date}</div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h2>👤 Informações do Cliente</h2>
              <div class="grid">
                <div class="item">
                  <div class="label">Nome</div>
                  <div class="value">${safeOrder.customer_name}</div>
                </div>
                <div class="item">
                  <div class="label">Telefone</div>
                  <div class="value">${safeOrder.customer_phone}</div>
                </div>
                <div class="item">
                  <div class="label">Email</div>
                  <div class="value">${safeOrder.customer_email}</div>
                </div>
              </div>
            </div>

            ${safeOrder.personalizations.length ? `
            <div class="section">
              <h2>🧵 Personalizações Individuais</h2>
              <p style="margin-bottom: 12px;">Detalhamento das peças personalizadas fornecidas pelo cliente.</p>
              <table class="personal-table">
                <thead>
                  <tr>
                    <th>Nome / Identificação</th>
                    <th>Tamanho</th>
                    <th>Quantidade</th>
                    <th>Observações</th>
                  </tr>
                </thead>
                <tbody>
                  ${safeOrder.personalizations.map((item: any) => `
                    <tr>
                      <td>${item.person_name || ''}</td>
                      <td>${item.size || '—'}</td>
                      <td>${item.quantity ?? 1}</td>
                      <td>${item.notes || ''}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            ${medidasCliente.length > 0 ? `
            <div class="section">
              <h2>📏 Medidas do Cliente</h2>
              ${medidasCliente.map(medida => `
                <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                  <h3 style="font-size: 16px; font-weight: bold; color: #1e40af; margin-bottom: 10px;">
                    ${medida.tipo_peca.toUpperCase()}
                  </h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                    ${medida.busto ? `<div><strong>Busto:</strong> ${medida.busto}cm</div>` : ''}
                    ${medida.cintura ? `<div><strong>Cintura:</strong> ${medida.cintura}cm</div>` : ''}
                    ${medida.quadril ? `<div><strong>Quadril:</strong> ${medida.quadril}cm</div>` : ''}
                    ${medida.ombro ? `<div><strong>Ombro:</strong> ${medida.ombro}cm</div>` : ''}
                    ${medida.largura_costas ? `<div><strong>Larg. Costas:</strong> ${medida.largura_costas}cm</div>` : ''}
                    ${medida.cava_manga ? `<div><strong>Cava Manga:</strong> ${medida.cava_manga}cm</div>` : ''}
                    ${medida.grossura_braco ? `<div><strong>Gross. Braço:</strong> ${medida.grossura_braco}cm</div>` : ''}
                    ${medida.comprimento_manga ? `<div><strong>Comp. Manga:</strong> ${medida.comprimento_manga}cm</div>` : ''}
                    ${medida.cana_braco ? `<div><strong>Cana Braço:</strong> ${medida.cana_braco}cm</div>` : ''}
                    ${medida.alca ? `<div><strong>Alça:</strong> ${medida.alca}cm</div>` : ''}
                    ${medida.pescoco ? `<div><strong>Pescoço:</strong> ${medida.pescoco}cm</div>` : ''}
                    ${medida.comprimento ? `<div><strong>Comprimento:</strong> ${medida.comprimento}cm</div>` : ''}
                    ${medida.coxa ? `<div><strong>Coxa:</strong> ${medida.coxa}cm</div>` : ''}
                    ${medida.tornozelo ? `<div><strong>Tornozelo:</strong> ${medida.tornozelo}cm</div>` : ''}
                    ${medida.comprimento_calca ? `<div><strong>Comp. Calça:</strong> ${medida.comprimento_calca}cm</div>` : ''}
                  </div>
                  ${medida.detalhes_superior ? `
                    <div style="margin-top: 10px; padding: 8px; background: #f3f4f6; border-radius: 4px;">
                      <strong>Detalhes Superiores:</strong> ${medida.detalhes_superior}
                    </div>
                  ` : ''}
                  ${medida.detalhes_inferior ? `
                    <div style="margin-top: 10px; padding: 8px; background: #f3f4f6; border-radius: 4px;">
                      <strong>Detalhes Inferiores:</strong> ${medida.detalhes_inferior}
                    </div>
                  ` : ''}
                  ${medida.observacoes ? `
                    <div style="margin-top: 10px; padding: 8px; background: #fef3c7; border-radius: 4px;">
                      <strong>Observações:</strong> ${medida.observacoes}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
            ` : ''}
            
            ${safeOrder.file_url ? `
            <div class="section">
              <h2>🎨 Logo/Arte do Pedido</h2>
              <div class="logo-section">
                <img src="${safeOrder.file_url}" alt="Logo/Arte do Pedido" />
                <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">Arte anexada pelo cliente</p>
              </div>
            </div>
            ` : ''}
            
            <div class="section">
              <h2>📦 Detalhes do Pedido</h2>
              <div class="item">
                <div class="label">Descrição</div>
                <div class="value">${safeOrder.description}</div>
              </div>
              <div class="grid">
                <div class="item">
                  <div class="label">Valor Total</div>
                  <div class="value"><strong style="color: #059669; font-size: 18px;">${formatCurrency(safeOrder.value)}</strong></div>
                </div>
                <div class="item">
                  <div class="label">Valor Pago</div>
                  <div class="value"><strong style="color: #2563eb; font-size: 18px;">${formatCurrency(safeOrder.paid)}</strong></div>
                </div>
              </div>
              ${safeOrder.observations && safeOrder.observations !== 'Sem observações' ? `
              <div class="item">
                <div class="label">Observações</div>
                <div class="value">${safeOrder.observations}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="section">
              <h2>⚙️ Instruções de Produção</h2>
              <div class="checklist">
                <h3>Checklist de Produção</h3>
                <ul>
                  <li><span>✓</span> Verificar especificações técnicas antes de iniciar</li>
                  <li><span>✓</span> Confirmar materiais e insumos necessários</li>
                  <li><span>✓</span> Seguir cronograma de produção estabelecido</li>
                  <li><span>✓</span> Manter controle de qualidade durante o processo</li>
                  <li><span>✓</span> Comunicar eventuais problemas ou atrasos</li>
                  <li><span>✓</span> Finalizar com inspeção final de qualidade</li>
                </ul>
              </div>
            </div>
            
            <div class="footer">
              <p>Gerado em ${new Date().toLocaleString('pt-BR')} - Ateliê Pro</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Abrir nova janela e imprimir
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(pdfHtml);
      newWindow.document.close();
      
      // Aguardar o conteúdo carregar e então imprimir
      newWindow.onload = () => {
        newWindow.print();
      };
    }
  };

  // Função para imprimir
  const handlePrint = () => {
    generatePDF();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/pedidos')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ordem de Produção</h1>
            <p className="text-gray-600">Código: {safeOrder.code}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
          <Button
            onClick={generatePDF}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Baixar PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações do Pedido */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Informações do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Código</label>
                <p className="text-lg font-semibold">{safeOrder.code}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Tipo</label>
                <p className="text-lg font-semibold">{safeOrder.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <Badge variant="secondary" className="mt-1">
                  {safeOrder.status}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Data de Entrega</label>
                <p className="text-lg font-semibold">{safeOrder.delivery_date}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações do Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Nome</label>
              <p className="text-lg font-semibold">{safeOrder.customer_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Telefone</label>
                <p className="text-lg font-semibold">{safeOrder.customer_phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-lg font-semibold">{safeOrder.customer_email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalhes do Pedido */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Detalhes do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Descrição</label>
              <p className="text-lg font-semibold mt-1">{safeOrder.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Valor Total</label>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(safeOrder.value)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Valor Pago</label>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(safeOrder.paid)}</p>
              </div>
            </div>

            {safeOrder.observations && safeOrder.observations !== 'Sem observações' && (
              <div>
                <label className="text-sm font-medium text-gray-500">Observações</label>
                <p className="text-lg font-semibold mt-1">{safeOrder.observations}</p>
              </div>
            )}

            {safeOrder.file_url && (
              <div>
                <label className="text-sm font-medium text-gray-500">Logo/Arte do Pedido</label>
                <div className="mt-2">
                  <img 
                    src={safeOrder.file_url} 
                    alt="Logo/Arte do Pedido" 
                    className="max-w-xs max-h-48 object-contain border rounded-lg"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {safeOrder.personalizations.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Personalizações Individuais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-blue-50 text-blue-700">
                      <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide">Nome / Identificação</th>
                      <th className="px-4 py-2 text-center font-semibold uppercase tracking-wide">Tamanho</th>
                      <th className="px-4 py-2 text-center font-semibold uppercase tracking-wide">Quantidade</th>
                      <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide">Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeOrder.personalizations.map((item: any) => (
                      <tr key={item.id ?? `${item.person_name}-${item.size}`} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium text-gray-800">{item.person_name || "—"}</td>
                        <td className="px-4 py-2 text-center text-gray-600">{item.size || "—"}</td>
                        <td className="px-4 py-2 text-center text-gray-600">{item.quantity ?? 1}</td>
                        <td className="px-4 py-2 text-gray-600">{item.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Medidas do Cliente */}
        {medidas.filter(medida => 
          medida.cliente_nome.toLowerCase().includes(safeOrder.customer_name.toLowerCase())
        ).length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Medidas do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {medidas
                  .filter(medida => 
                    medida.cliente_nome.toLowerCase().includes(safeOrder.customer_name.toLowerCase())
                  )
                  .map((medida) => (
                    <div key={medida.id} className="p-4 bg-gray-50 rounded-lg border">
                      <h3 className="font-semibold text-lg mb-3 text-blue-600">
                        {medida.tipo_peca.toUpperCase()}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        {medida.busto && (
                          <div><strong>Busto:</strong> {medida.busto}cm</div>
                        )}
                        {medida.cintura && (
                          <div><strong>Cintura:</strong> {medida.cintura}cm</div>
                        )}
                        {medida.quadril && (
                          <div><strong>Quadril:</strong> {medida.quadril}cm</div>
                        )}
                        {medida.ombro && (
                          <div><strong>Ombro:</strong> {medida.ombro}cm</div>
                        )}
                        {medida.largura_costas && (
                          <div><strong>Larg. Costas:</strong> {medida.largura_costas}cm</div>
                        )}
                        {medida.cava_manga && (
                          <div><strong>Cava Manga:</strong> {medida.cava_manga}cm</div>
                        )}
                        {medida.grossura_braco && (
                          <div><strong>Gross. Braço:</strong> {medida.grossura_braco}cm</div>
                        )}
                        {medida.comprimento_manga && (
                          <div><strong>Comp. Manga:</strong> {medida.comprimento_manga}cm</div>
                        )}
                        {medida.cana_braco && (
                          <div><strong>Cana Braço:</strong> {medida.cana_braco}cm</div>
                        )}
                        {medida.alca && (
                          <div><strong>Alça:</strong> {medida.alca}cm</div>
                        )}
                        {medida.pescoco && (
                          <div><strong>Pescoço:</strong> {medida.pescoco}cm</div>
                        )}
                        {medida.comprimento && (
                          <div><strong>Comprimento:</strong> {medida.comprimento}cm</div>
                        )}
                        {medida.coxa && (
                          <div><strong>Coxa:</strong> {medida.coxa}cm</div>
                        )}
                        {medida.tornozelo && (
                          <div><strong>Tornozelo:</strong> {medida.tornozelo}cm</div>
                        )}
                        {medida.comprimento_calca && (
                          <div><strong>Comp. Calça:</strong> {medida.comprimento_calca}cm</div>
                        )}
                      </div>
                      
                      {medida.detalhes_superior && (
                        <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                          <strong>Detalhes Superiores:</strong> {medida.detalhes_superior}
                        </div>
                      )}
                      
                      {medida.detalhes_inferior && (
                        <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                          <strong>Detalhes Inferiores:</strong> {medida.detalhes_inferior}
                        </div>
                      )}
                      
                      {medida.observacoes && (
                        <div className="mt-3 p-2 bg-yellow-50 rounded text-sm">
                          <strong>Observações:</strong> {medida.observacoes}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instruções de Produção */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Instruções de Produção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
              <h3 className="font-semibold text-lg mb-3 text-yellow-800">Checklist de Produção</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Verificar especificações técnicas antes de iniciar
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Confirmar materiais e insumos necessários
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Seguir cronograma de produção estabelecido
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Manter controle de qualidade durante o processo
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Comunicar eventuais problemas ou atrasos
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Finalizar com inspeção final de qualidade
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
