import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";

interface NotaItem {
  numero_item: number;
  codigo_produto: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export interface ClienteData {
  nome: string;
  cpf_cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  };
}

interface DialogEmitirNotaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmitir: (items: NotaItem[], tipoNota: 'NFe' | 'NFCe' | 'NFSe', cliente: ClienteData) => Promise<void>;
  valorTotalPadrao?: number;
  orderCode?: string;
  loading?: boolean;
  clienteInicial?: ClienteData;
}

export function DialogEmitirNota({
  open,
  onOpenChange,
  onEmitir,
  valorTotalPadrao = 0,
  orderCode = '',
  loading = false,
  clienteInicial
}: DialogEmitirNotaProps) {
  const [tipoNota, setTipoNota] = useState<'NFe' | 'NFCe' | 'NFSe'>('NFe');
  const [items, setItems] = useState<NotaItem[]>([
    {
      numero_item: 1,
      codigo_produto: orderCode || '1',
      descricao: `Pedido ${orderCode}` || 'Produto',
      ncm: '6204.62.00', // NCM padrão para confecções
      cfop: '5102', // CFOP padrão para venda consumidor final
      unidade: 'UN',
      quantidade: 1,
      valor_unitario: valorTotalPadrao,
      valor_total: valorTotalPadrao
    }
  ]);

  // Estado para dados do cliente
  const [cliente, setCliente] = useState<ClienteData>({
    nome: clienteInicial?.nome || '',
    cpf_cnpj: clienteInicial?.cpf_cnpj || '',
    email: clienteInicial?.email || '',
    telefone: clienteInicial?.telefone || '',
    endereco: {
      logradouro: clienteInicial?.endereco?.logradouro || '',
      numero: clienteInicial?.endereco?.numero || '',
      complemento: clienteInicial?.endereco?.complemento || '',
      bairro: clienteInicial?.endereco?.bairro || '',
      cidade: clienteInicial?.endereco?.cidade || '',
      uf: clienteInicial?.endereco?.uf || '',
      cep: clienteInicial?.endereco?.cep || '',
    }
  });

  // Atualizar dados do cliente quando clienteInicial mudar
  useEffect(() => {
    if (clienteInicial && open) {
      setCliente({
        nome: clienteInicial.nome || '',
        cpf_cnpj: clienteInicial.cpf_cnpj || '',
        email: clienteInicial.email || '',
        telefone: clienteInicial.telefone || '',
        endereco: {
          logradouro: clienteInicial.endereco?.logradouro || '',
          numero: clienteInicial.endereco?.numero || '',
          complemento: clienteInicial.endereco?.complemento || '',
          bairro: clienteInicial.endereco?.bairro || '',
          cidade: clienteInicial.endereco?.cidade || '',
          uf: clienteInicial.endereco?.uf || '',
          cep: clienteInicial.endereco?.cep || '',
        }
      });
    }
  }, [clienteInicial, open]);

  useEffect(() => {
    if (open && valorTotalPadrao > 0) {
      // Atualizar o primeiro item quando o valor padrão mudar
      setItems(prev => {
        const newItems = [...prev];
        if (newItems.length > 0) {
          newItems[0] = {
            ...newItems[0],
            valor_unitario: valorTotalPadrao,
            valor_total: valorTotalPadrao * newItems[0].quantidade
          };
        }
        return newItems;
      });
    }
  }, [valorTotalPadrao, open]);

  const adicionarItem = () => {
    const novoItem: NotaItem = {
      numero_item: items.length + 1,
      codigo_produto: `${orderCode || 'PROD'}-${items.length + 1}`,
      descricao: '',
      ncm: '6204.62.00',
      cfop: '5102',
      unidade: 'UN',
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0
    };
    setItems([...items, novoItem]);
  };

  const removerItem = (index: number) => {
    if (items.length === 1) {
      toast.error('A nota deve ter pelo menos um item');
      return;
    }
    const novosItems = items.filter((_, i) => i !== index);
    // Renumerar itens
    novosItems.forEach((item, i) => {
      item.numero_item = i + 1;
    });
    setItems(novosItems);
  };

  const atualizarItem = (index: number, campo: keyof NotaItem, valor: string | number) => {
    const novosItems = [...items];
    novosItems[index] = {
      ...novosItems[index],
      [campo]: valor
    };
    
    // Recalcular valor_total quando quantidade ou valor_unitario mudar
    if (campo === 'quantidade' || campo === 'valor_unitario') {
      novosItems[index].valor_total = novosItems[index].quantidade * novosItems[index].valor_unitario;
    }
    
    setItems(novosItems);
  };

  const valorTotal = items.reduce((acc, item) => acc + item.valor_total, 0);

  const handleEmitir = async () => {
    // Validações de itens
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    for (const item of items) {
      if (!item.descricao.trim()) {
        toast.error(`Item ${item.numero_item}: Descrição é obrigatória`);
        return;
      }
      if (item.quantidade <= 0) {
        toast.error(`Item ${item.numero_item}: Quantidade deve ser maior que zero`);
        return;
      }
      if (item.valor_unitario <= 0) {
        toast.error(`Item ${item.numero_item}: Valor unitário deve ser maior que zero`);
        return;
      }
      if (!item.ncm || item.ncm.length < 8) {
        toast.error(`Item ${item.numero_item}: NCM deve ter 8 dígitos`);
        return;
      }
    }

    // Validações do cliente (CPF/CNPJ é importante para nota fiscal válida)
    if (!cliente.nome.trim()) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }

    // CPF/CNPJ não é obrigatório em homologação, mas recomendado
    if (cliente.cpf_cnpj) {
      const cpfCnpjLimpo = cliente.cpf_cnpj.replace(/\D/g, '');
      if (cpfCnpjLimpo.length !== 11 && cpfCnpjLimpo.length !== 14) {
        toast.error('CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos');
        return;
      }
    }

    await onEmitir(items, tipoNota, cliente);
  };

  const formatarCPFCNPJ = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 11) {
      // CPF: 000.000.000-00
      if (numeros.length <= 3) return numeros;
      if (numeros.length <= 6) return numeros.replace(/(\d{3})(\d+)/, '$1.$2');
      if (numeros.length <= 9) return numeros.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
      return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      // CNPJ: 00.000.000/0000-00
      if (numeros.length <= 2) return numeros;
      if (numeros.length <= 5) return numeros.replace(/(\d{2})(\d+)/, '$1.$2');
      if (numeros.length <= 8) return numeros.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
      if (numeros.length <= 12) return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
      return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const formatarCEP = (valor: string) => {
    const numeros = valor.replace(/\D/g, '').substring(0, 8);
    return numeros.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Emitir Nota Fiscal</DialogTitle>
          <DialogDescription>
            Configure os itens da nota fiscal antes de emitir
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados do Cliente */}
          <div className="space-y-4 border rounded-lg p-4 bg-slate-50">
            <div>
              <h3 className="text-sm font-semibold mb-3">Dados do Cliente (Destinatário)</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Estes dados aparecerão na nota fiscal. CPF/CNPJ é recomendado para notas válidas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="cliente-nome">Nome/Razão Social *</Label>
                <Input
                  id="cliente-nome"
                  value={cliente.nome}
                  onChange={(e) => setCliente({ ...cliente, nome: e.target.value })}
                  placeholder="Nome completo ou razão social"
                  required
                />
              </div>

              <div>
                <Label htmlFor="cliente-cpf-cnpj">CPF/CNPJ</Label>
                <Input
                  id="cliente-cpf-cnpj"
                  value={cliente.cpf_cnpj}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, '');
                    if (valor === '') {
                      setCliente({ ...cliente, cpf_cnpj: '' });
                    } else {
                      setCliente({ ...cliente, cpf_cnpj: formatarCPFCNPJ(valor) });
                    }
                  }}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  maxLength={18}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {cliente.cpf_cnpj?.replace(/\D/g, '').length === 11 ? 'CPF' : 
                   cliente.cpf_cnpj?.replace(/\D/g, '').length === 14 ? 'CNPJ' : 
                   'Digite CPF (11 dígitos) ou CNPJ (14 dígitos)'}
                </p>
              </div>

              <div>
                <Label htmlFor="cliente-email">Email</Label>
                <Input
                  id="cliente-email"
                  type="email"
                  value={cliente.email || ''}
                  onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <Label htmlFor="cliente-telefone">Telefone</Label>
                <Input
                  id="cliente-telefone"
                  value={cliente.telefone || ''}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, '').substring(0, 11);
                    setCliente({ ...cliente, telefone: valor });
                  }}
                  placeholder="(00) 00000-0000"
                />
              </div>

              {/* Endereço */}
              <div className="md:col-span-2 border-t pt-4 mt-2">
                <h4 className="text-sm font-medium mb-3">Endereço</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="cliente-logradouro">Logradouro (Rua, Avenida, etc.)</Label>
                    <Input
                      id="cliente-logradouro"
                      value={cliente.endereco?.logradouro || ''}
                      onChange={(e) => setCliente({
                        ...cliente,
                        endereco: { ...cliente.endereco, logradouro: e.target.value }
                      })}
                      placeholder="Rua, Avenida, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="cliente-numero">Número</Label>
                    <Input
                      id="cliente-numero"
                      value={cliente.endereco?.numero || ''}
                      onChange={(e) => setCliente({
                        ...cliente,
                        endereco: { ...cliente.endereco, numero: e.target.value }
                      })}
                      placeholder="123"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cliente-complemento">Complemento</Label>
                    <Input
                      id="cliente-complemento"
                      value={cliente.endereco?.complemento || ''}
                      onChange={(e) => setCliente({
                        ...cliente,
                        endereco: { ...cliente.endereco, complemento: e.target.value }
                      })}
                      placeholder="Apto, Bloco, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="cliente-bairro">Bairro</Label>
                    <Input
                      id="cliente-bairro"
                      value={cliente.endereco?.bairro || ''}
                      onChange={(e) => setCliente({
                        ...cliente,
                        endereco: { ...cliente.endereco, bairro: e.target.value }
                      })}
                      placeholder="Bairro"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cliente-cidade">Cidade</Label>
                    <Input
                      id="cliente-cidade"
                      value={cliente.endereco?.cidade || ''}
                      onChange={(e) => setCliente({
                        ...cliente,
                        endereco: { ...cliente.endereco, cidade: e.target.value }
                      })}
                      placeholder="Cidade"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cliente-uf">UF</Label>
                    <Input
                      id="cliente-uf"
                      value={cliente.endereco?.uf || ''}
                      onChange={(e) => {
                        const uf = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 2);
                        setCliente({
                          ...cliente,
                          endereco: { ...cliente.endereco, uf }
                        });
                      }}
                      placeholder="MG"
                      maxLength={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cliente-cep">CEP</Label>
                    <Input
                      id="cliente-cep"
                      value={cliente.endereco?.cep || ''}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/\D/g, '').substring(0, 8);
                        setCliente({
                          ...cliente,
                          endereco: { ...cliente.endereco, cep: formatarCEP(valor) }
                        });
                      }}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tipo de Nota */}
          <div className="space-y-2">
            <Label htmlFor="tipoNota">Tipo de Nota *</Label>
            <Select value={tipoNota} onValueChange={(value: 'NFe' | 'NFCe' | 'NFSe') => setTipoNota(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NFe">NFe - Nota Fiscal Eletrônica</SelectItem>
                <SelectItem value="NFCe">NFCe - Nota Fiscal ao Consumidor Eletrônica</SelectItem>
                <SelectItem value="NFSe">NFSe - Nota Fiscal de Serviços Eletrônica</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {tipoNota === 'NFe' && 'Para vendas de produtos com validade fiscal'}
              {tipoNota === 'NFCe' && 'Para vendas ao consumidor final (rápida)'}
              {tipoNota === 'NFSe' && 'Para prestação de serviços'}
            </p>
          </div>

          {/* Tabela de Itens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens da Nota Fiscal</Label>
              <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição *</TableHead>
                    <TableHead>NCM *</TableHead>
                    <TableHead>CFOP</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="w-24">Qtd *</TableHead>
                    <TableHead className="w-32">Valor Unit. *</TableHead>
                    <TableHead className="w-32">Valor Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.numero_item}</TableCell>
                      <TableCell>
                        <Input
                          value={item.codigo_produto}
                          onChange={(e) => atualizarItem(index, 'codigo_produto', e.target.value)}
                          className="w-32"
                          placeholder="Código"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.descricao}
                          onChange={(e) => atualizarItem(index, 'descricao', e.target.value)}
                          placeholder="Descrição do produto"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.ncm}
                          onChange={(e) => {
                            const valor = e.target.value.replace(/\D/g, '').substring(0, 8);
                            atualizarItem(index, 'ncm', valor);
                          }}
                          className="w-28"
                          placeholder="00000000"
                          maxLength={8}
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.cfop}
                          onChange={(e) => {
                            const valor = e.target.value.replace(/\D/g, '').substring(0, 4);
                            atualizarItem(index, 'cfop', valor);
                          }}
                          className="w-20"
                          placeholder="5102"
                          maxLength={4}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.unidade}
                          onValueChange={(value) => atualizarItem(index, 'unidade', value)}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UN">UN</SelectItem>
                            <SelectItem value="KG">KG</SelectItem>
                            <SelectItem value="M">M</SelectItem>
                            <SelectItem value="M2">M²</SelectItem>
                            <SelectItem value="PC">PC</SelectItem>
                            <SelectItem value="CX">CX</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => atualizarItem(index, 'quantidade', parseFloat(e.target.value) || 0)}
                          className="w-24"
                          min={0.01}
                          step={0.01}
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.valor_unitario}
                          onChange={(e) => atualizarItem(index, 'valor_unitario', parseFloat(e.target.value) || 0)}
                          className="w-32"
                          min={0.01}
                          step={0.01}
                          required
                        />
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency({ value: item.valor_total, currency: 'BRL' })}
                      </TableCell>
                      <TableCell>
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removerItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Total */}
            <div className="flex justify-end pt-2 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor Total:</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency({ value: valorTotal, currency: 'BRL' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleEmitir} disabled={loading || items.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Emitindo...
              </>
            ) : (
              'Emitir Nota Fiscal'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

