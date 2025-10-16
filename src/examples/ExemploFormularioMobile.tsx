import React, { useState } from "react";
import { MobileForm, MobileFormField, MobileInput, MobileTextarea, MobileSelect, MobileFormActions, MobileSubmitButton } from "@/components/ui/mobile-form";
import { PageTransition, FadeIn } from "@/components/ui/page-transition";
import { LoadingSpinner } from "@/components/ui/loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Exemplo de como usar os novos componentes de formulário mobile
export default function ExemploFormularioMobile() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    tipo: "",
    observacoes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simular envio
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsLoading(false);
    console.log("Dados enviados:", formData);
  };

  return (
    <PageTransition className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <FadeIn>
          <Card className="bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">
                Exemplo de Formulário Mobile
              </CardTitle>
              <p className="text-muted-foreground text-center">
                Demonstração dos novos componentes otimizados para mobile
              </p>
            </CardHeader>
            <CardContent>
              <MobileForm onSubmit={handleSubmit}>
                <MobileInput
                  label="Nome Completo"
                  placeholder="Digite seu nome completo"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                />

                <MobileInput
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />

                <MobileInput
                  label="Telefone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  required
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                />

                <MobileSelect
                  label="Tipo de Serviço"
                  placeholder="Selecione um serviço"
                  required
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({...formData, tipo: value})}
                >
                  <option value="bordado">Bordado Computadorizado</option>
                  <option value="uniforme">Uniforme Personalizado</option>
                  <option value="camiseta">Camiseta Estampada</option>
                  <option value="catalogo">Item do Catálogo</option>
                  <option value="outro">Outro</option>
                </MobileSelect>

                <MobileTextarea
                  label="Observações"
                  placeholder="Descreva suas necessidades..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                />

                <MobileFormActions>
                  <MobileSubmitButton
                    isLoading={isLoading}
                    loadingText="Enviando..."
                    className="flex-1"
                  >
                    Enviar Solicitação
                  </MobileSubmitButton>
                </MobileFormActions>
              </MobileForm>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Exemplo de Loading States */}
        <FadeIn delay={200}>
          <Card className="bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold">
                Exemplos de Loading States
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center space-y-2">
                  <LoadingSpinner size="sm" text="Carregando..." />
                  <p className="text-sm text-muted-foreground">Loading Pequeno</p>
                </div>
                
                <div className="text-center space-y-2">
                  <LoadingSpinner size="md" text="Processando..." />
                  <p className="text-sm text-muted-foreground">Loading Médio</p>
                </div>
                
                <div className="text-center space-y-2">
                  <LoadingSpinner size="lg" text="Finalizando..." />
                  <p className="text-sm text-muted-foreground">Loading Grande</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
