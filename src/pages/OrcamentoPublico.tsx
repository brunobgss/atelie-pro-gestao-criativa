import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import logoAteliePro from "@/assets/logo-atelie-pro.png";
import { getQuoteByCode } from "@/integrations/supabase/quotes";

type QuoteItem = { description: string; quantity: number; value: number };
type Quote = {
  id: string;
  client: string;
  date: string; // ISO
  items: QuoteItem[];
  observations?: string;
};


export default function OrcamentoPublico() {
  const { id } = useParams();
  const navigate = useNavigate();

  const code = id as string;
  const { data } = useQuery({
    queryKey: ["quote", code],
    queryFn: () => getQuoteByCode(code),
    enabled: Boolean(code),
  });
  const quote = useMemo(() => {
    if (data?.quote) {
      return {
        id: data.quote.code,
        client: data.quote.customer_name,
        date: data.quote.date,
        items: (data.items ?? []).map((it) => ({ description: it.description, quantity: it.quantity, value: it.unit_value || 0 })),
        observations: data.quote.observations ?? undefined,
      } as Quote;
    }
    return null;
  }, [data]);

  const total = quote?.items.reduce((sum, item) => sum + item.quantity * item.value, 0) ?? 0;

  if (!quote) {
    return (
      <div className="min-h-screen bg-white text-black p-6">
        <div className="max-w-3xl mx-auto">
          <p>Orçamento não encontrado.</p>
          <button className="underline" onClick={() => navigate("/")}>Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black p-6 print:p-0">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <img src={logoAteliePro} alt="Ateliê Pro" className="h-8" />
          <div className="text-right">
            <p className="font-semibold">Orçamento {quote.id}</p>
            <p className="text-sm">Data: {new Date(quote.date).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <Card className="shadow-none border">
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-medium">{quote.client}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Item</th>
                    <th className="text-right py-2">Qtd</th>
                    <th className="text-right py-2">Valor (R$)</th>
                    <th className="text-right py-2">Subtotal (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 pr-4">{item.description}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">{item.value.toFixed(2)}</td>
                      <td className="py-2 text-right">{(item.quantity * item.value).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="py-3 text-right font-semibold">Total</td>
                    <td className="py-3 text-right font-bold">R$ {total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {quote.observations && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">Observações</p>
                <p>{quote.observations}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 no-print">
          <button
            onClick={() => navigate("/orcamentos")}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            ← Voltar aos Orçamentos
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded bg-black text-white"
          >
            Imprimir
          </button>
          <button
            onClick={() => navigator.share?.({ title: `Orçamento ${quote.id}`, url: window.location.href }).catch(() => {})}
            className="px-4 py-2 rounded border"
          >
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
}


