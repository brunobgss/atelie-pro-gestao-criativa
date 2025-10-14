import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logoAteliePro from "@/assets/logo-atelie-pro.png";

export default function Cadastro() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    empresa: "",
    nome: "",
    telefone: "",
    cpfCnpj: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);

    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        console.log("Usuário criado:", authData.user.id);
        
        // Aguardar um pouco para garantir que o usuário foi criado
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Criar empresa com trial de 7 dias
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);
        
        const { data: empresaData, error: empresaError } = await supabase
          .from("empresas")
          .insert({
            nome: formData.empresa,
            email: formData.email,
            telefone: formData.telefone,
            responsavel: formData.nome,
            cpf_cnpj: formData.cpfCnpj,
            trial_end_date: trialEndDate.toISOString(),
          })
          .select("id")
          .single();

        if (empresaError) {
          console.error("Erro ao criar empresa:", empresaError);
          throw empresaError;
        }

        console.log("Empresa criada:", empresaData.id);

        // Vincular usuário à empresa
        const { error: userEmpresaError } = await supabase
          .from("user_empresas")
          .insert({
            user_id: authData.user.id,
            empresa_id: empresaData.id,
            role: "owner"
          });

        if (userEmpresaError) {
          console.error("Erro ao vincular usuário à empresa:", userEmpresaError);
          throw userEmpresaError;
        }

        console.log("Usuário vinculado à empresa com sucesso");
        toast.success("Cadastro realizado com sucesso!");
        navigate("/login");
      }
    } catch (error: unknown) {
      console.error("Erro no cadastro:", error);
      toast.error(error.message || "Erro ao fazer cadastro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoAteliePro} alt="Ateliê Pro" className="h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Ateliê Pro</h1>
          <p className="text-purple-100">Gestão profissional para ateliês</p>
        </div>

        <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">Cadastro</CardTitle>
            <p className="text-purple-100">Crie sua conta e empresa</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCadastro} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="empresa" className="text-white">
                  Nome da Empresa <span className="text-red-300">*</span>
                </Label>
                <Input
                  id="empresa"
                  name="empresa"
                  value={formData.empresa}
                  onChange={handleChange}
                  className="bg-white/20 border-white/30 text-white placeholder:text-purple-200"
                  placeholder="Ex: Ateliê da Maria"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-white">
                  Seu Nome <span className="text-red-300">*</span>
                </Label>
                <Input
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className="bg-white/20 border-white/30 text-white placeholder:text-purple-200"
                  placeholder="Maria Silva"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  Email <span className="text-red-300">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="bg-white/20 border-white/30 text-white placeholder:text-purple-200"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpfCnpj" className="text-white">
                  CPF ou CNPJ <span className="text-red-300">*</span>
                </Label>
                <Input
                  id="cpfCnpj"
                  name="cpfCnpj"
                  value={formData.cpfCnpj}
                  onChange={handleChange}
                  className="bg-white/20 border-white/30 text-white placeholder:text-purple-200"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-white">
                  Telefone <span className="text-red-300">*</span>
                </Label>
                <Input
                  id="telefone"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  className="bg-white/20 border-white/30 text-white placeholder:text-purple-200"
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Senha <span className="text-red-300">*</span>
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="bg-white/20 border-white/30 text-white placeholder:text-purple-200"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">
                  Confirmar Senha <span className="text-red-300">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="bg-white/20 border-white/30 text-white placeholder:text-purple-200"
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 hover:from-purple-700 hover:via-purple-600 hover:to-pink-600 text-white font-semibold py-3"
                disabled={loading}
              >
                {loading ? "Criando conta..." : "Criar Conta"}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-purple-100">
                Já tem uma conta?{" "}
                <Link to="/login" className="text-purple-300 hover:text-purple-200 font-medium">
                  Faça login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
