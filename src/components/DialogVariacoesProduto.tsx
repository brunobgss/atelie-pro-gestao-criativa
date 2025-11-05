import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listarVariacoes, criarVariacao, atualizarVariacao, deletarVariacao, VariacaoProduto } from "@/integrations/supabase/variacoes";
import { formatCurrency } from "@/utils/formatCurrency";

interface DialogVariacoesProdutoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtoId: string;
  produtoNome: string;
}

export function DialogVariacoesProduto({
  open,
  onOpenChange,
  produtoId,
  produtoNome
}: DialogVariacoesProdutoProps) {
  const queryClient = useQueryClient();
  const [variacoes, setVariacoes] = useState<VariacaoProduto[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<VariacaoProduto>>({
    tipo_variacao: 'tamanho',
    valor: '',
    codigo_barras: '',
    sku: '',
    estoque_atual: 0,
    estoque_minimo: 0,
    preco_venda: undefined,
    preco_custo: undefined,
    ativo: true
  });

  const { data: variacoesData = [], refetch } = useQuery({
    queryKey: ["variacoes", produtoId],
    queryFn: () => listarVariacoes(produtoId),
    enabled: open && !!produtoId
  });

  useEffect(() => {
    if (open) {
      setVariacoes(variacoesData);
    }
  }, [variacoesData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.valor?.trim()) {
      toast.error("Valor da variação é obrigatório");
      return;
    }

    // Verificar se já existe variação com mesmo tipo e valor
    const existe = variacoes.some(
      v => v.tipo_variacao === formData.tipo_variacao && 
           v.valor === formData.valor &&
           v.id !== formData.id
    );

    if (existe) {
      toast.error("Já existe uma variação com este tipo e valor");
      return;
    }

    try {
      setLoading(true);
      const result = await criarVariacao({
        produto_id: produtoId,
        tipo_variacao: formData.tipo_variacao!,
        valor: formData.valor!,
        codigo_barras: formData.codigo_barras || undefined,
        sku: formData.sku || undefined,
        estoque_atual: formData.estoque_atual || 0,
        estoque_minimo: formData.estoque_minimo || 0,
        preco_venda: formData.preco_venda,
        preco_custo: formData.preco_custo,
        ativo: formData.ativo ?? true
      });

      if (result.ok) {
        toast.success("Variação adicionada com sucesso!");
        setFormData({
          tipo_variacao: 'tamanho',
          valor: '',
          codigo_barras: '',
          sku: '',
          estoque_atual: 0,
          estoque_minimo: 0,
          preco_venda: undefined,
          preco_custo: undefined,
          ativo: true
        });
        queryClient.invalidateQueries({ queryKey: ["variacoes", produtoId] });
        refetch();
      } else {
        toast.error(result.error || "Erro ao adicionar variação");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar variação");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta variação?")) {
      return;
    }

    try {
      setLoading(true);
      const result = await deletarVariacao(id);
      if (result.ok) {
        toast.success("Variação excluída com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["variacoes", produtoId] });
        refetch();
      } else {
        toast.error(result.error || "Erro ao excluir variação");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir variação");
    } finally {
      setLoading(false);
    }
  };

  const agruparPorTipo = () => {
    const grupos: Record<string, VariacaoProduto[]> = {};
    variacoes.forEach(v => {
      if (!grupos[v.tipo_variacao]) {
        grupos[v.tipo_variacao] = [];
      }
      grupos[v.tipo_variacao].push(v);
    });
    return grupos;
  };

  const grupos = agruparPorTipo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Variações do Produto: {produtoNome}</DialogTitle>
          <DialogDescription>
            Gerencie tamanhos, cores, modelos e outras variações deste produto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formulário de nova variação */}
          <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Adicionar Nova Variação</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_variacao">Tipo *</Label>
                <Select
                  value={formData.tipo_variacao}
                  onValueChange={(value: any) => setFormData({ ...formData, tipo_variacao: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tamanho">Tamanho</SelectItem>
                    <SelectItem value="cor">Cor</SelectItem>
                    <SelectItem value="modelo">Modelo</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">Valor *</Label>
                <Input
                  id="valor"
                  value={formData.valor || ""}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  placeholder="Ex: P, M, G ou Azul, Vermelho"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku || ""}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Código SKU"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo_barras">Código de Barras</Label>
                <Input
                  id="codigo_barras"
                  value={formData.codigo_barras || ""}
                  onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                  placeholder="Código de barras"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estoque_atual">Estoque Atual</Label>
                <Input
                  id="estoque_atual"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estoque_atual || 0}
                  onChange={(e) => setFormData({ ...formData, estoque_atual: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
                <Input
                  id="estoque_minimo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estoque_minimo || 0}
                  onChange={(e) => setFormData({ ...formData, estoque_minimo: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preco_venda">Preço de Venda</Label>
                <Input
                  id="preco_venda"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.preco_venda || ""}
                  onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Variação
                </>
              )}
            </Button>
          </form>

          {/* Lista de variações agrupadas */}
          {Object.keys(grupos).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma variação cadastrada
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grupos).map(([tipo, vars]) => (
                <div key={tipo} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 capitalize">{tipo}s</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Valor</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Estoque</TableHead>
                        <TableHead>Est. Mín.</TableHead>
                        <TableHead>Preço Venda</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vars.map((variacao) => (
                        <TableRow key={variacao.id}>
                          <TableCell className="font-medium">{variacao.valor}</TableCell>
                          <TableCell>{variacao.sku || '-'}</TableCell>
                          <TableCell>
                            <span className={variacao.estoque_atual <= variacao.estoque_minimo ? 'text-red-600 font-semibold' : ''}>
                              {variacao.estoque_atual}
                            </span>
                          </TableCell>
                          <TableCell>{variacao.estoque_minimo}</TableCell>
                          <TableCell>
                            {variacao.preco_venda ? formatCurrency({ value: variacao.preco_venda, currency: 'BRL' }) : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(variacao.id!)}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

