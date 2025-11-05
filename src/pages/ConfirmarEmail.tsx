import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logoAteliePro from "@/assets/logo-atelie-pro.png";
import { Mail, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

export default function ConfirmarEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // Verificar se há um token de confirmação na URL
    const token = searchParams.get("token");
    const type = searchParams.get("type");
    const emailParam = searchParams.get("email");

    if (emailParam) {
      setEmail(emailParam);
    }

    if (token && type === "signup") {
      handleConfirmEmail(token);
    }
  }, [searchParams]);

  const handleConfirmEmail = async (token: string) => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: "signup",
      });

      if (error) throw error;

      setConfirmed(true);
      toast.success("Email confirmado com sucesso!");
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao confirmar email");
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      toast.error("Digite seu email para reenviar a confirmação");
      return;
    }

    setResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/confirmar-email`,
        },
      });

      if (error) throw error;

      toast.success("Email de confirmação reenviado! Verifique sua caixa de entrada.");
    } catch (error: any) {
      toast.error(error?.message || "Erro ao reenviar email de confirmação");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoAteliePro} alt="Ateliê Pro" className="h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Ateliê Pro</h1>
          <p className="text-purple-100">Confirmação de Email</p>
        </div>

        <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            {confirmed ? (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <CardTitle className="text-2xl font-bold text-white">Email Confirmado!</CardTitle>
                <p className="text-purple-100 mt-2">Redirecionando para o login...</p>
              </>
            ) : (
              <>
                <Mail className="h-16 w-16 text-purple-300 mx-auto mb-4" />
                <CardTitle className="text-2xl font-bold text-white">Confirme seu Email</CardTitle>
                <p className="text-purple-100 mt-2">
                  {loading
                    ? "Verificando..."
                    : "Verifique sua caixa de entrada e clique no link de confirmação"}
                </p>
              </>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-300" />
              </div>
            ) : confirmed ? (
              <div className="text-center py-4">
                <p className="text-white">Seu email foi confirmado com sucesso!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-purple-500/20 border border-purple-300/30 rounded-lg p-4">
                  <p className="text-sm text-purple-100 mb-4">
                    Não recebeu o email? Verifique sua pasta de spam ou reenvie o email de confirmação.
                  </p>
                  <div className="space-y-3">
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                    <Button
                      onClick={handleResendEmail}
                      disabled={resending || !email}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {resending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Reenviando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reenviar Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={() => navigate("/login")}
                  variant="outline"
                  className="w-full border-white/30 text-white hover:bg-white/20"
                >
                  Voltar para Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

