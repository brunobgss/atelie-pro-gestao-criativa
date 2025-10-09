import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Upload, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function NovoPedido() {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Pedido criado com sucesso!");
    navigate("/pedidos");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4">
          <SidebarTrigger />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pedidos")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Novo Pedido</h1>
            <p className="text-sm text-muted-foreground">Cadastre um novo pedido</p>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <Card className="border-border animate-fade-in">
            <CardHeader>
              <CardTitle className="text-foreground">Informações do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente *</Label>
                  <Input
                    id="client"
                    placeholder="Nome do cliente"
                    required
                    className="border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Pedido *</Label>
                  <Select required>
                    <SelectTrigger className="border-input">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bordado">Bordado Computadorizado</SelectItem>
                      <SelectItem value="camiseta">Camiseta Personalizada</SelectItem>
                      <SelectItem value="uniforme">Uniforme</SelectItem>
                      <SelectItem value="personalizado">Personalizado</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição do Pedido *</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva os detalhes do pedido..."
                  rows={4}
                  required
                  className="border-input resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Arquivo / Arte</Label>
                <div className="border-2 border-dashed border-input rounded-lg p-6 text-center hover:border-secondary transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para fazer upload ou arraste o arquivo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, PDF até 10MB
                  </p>
                  <Input id="file" type="file" className="hidden" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Valor Total (R$) *</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    required
                    className="border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paid">Sinal Pago (R$)</Label>
                  <Input
                    id="paid"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery">Data de Entrega *</Label>
                  <Input
                    id="delivery"
                    type="date"
                    required
                    className="border-input"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Pedido
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/pedidos")}
                  className="border-border"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
