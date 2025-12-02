// Programa de Referência - Indique um amigo e ganhe recompensas
// Aumenta retenção e crescimento viral

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Users, 
  Gift, 
  Share2, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Trophy,
  Mail,
  MessageCircle,
  ArrowRight
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Referral {
  id: string;
  referral_code: string;
  status: string;
  referred_email?: string;
  created_at: string;
  signed_up_at?: string;
  converted_at?: string;
  reward_applied: boolean;
}

export function ReferralProgram() {
  const { empresa } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [referralCode, setReferralCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  // Buscar ou criar código de referência
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["referrals", empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      // Buscar código existente
      const { data: existing, error: fetchError } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_empresa_id", empresa.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Erro ao buscar referências:", fetchError);
        return [];
      }

      // Se não existe, criar um novo
      if (!existing || existing.length === 0) {
        const { data: newCode, error: createError } = await supabase
          .rpc("create_referral_code", { empresa_id: empresa.id });

        if (createError) {
          console.error("Erro ao criar código:", createError);
          return [];
        }

        // Buscar novamente após criar
        const { data: updated } = await supabase
          .from("referrals")
          .select("*")
          .eq("referrer_empresa_id", empresa.id)
          .order("created_at", { ascending: false });

        return updated || [];
      }

      return existing;
    },
    enabled: !!empresa?.id,
  });

  // Estatísticas
  const stats = {
    total: referrals.length,
    signedUp: referrals.filter(r => r.status === "signed_up" || r.status === "converted").length,
    converted: referrals.filter(r => r.status === "converted").length,
    rewarded: referrals.filter(r => r.reward_applied).length,
  };

  // Código de referência atual
  useEffect(() => {
    if (referrals.length > 0) {
      const code = referrals[0].referral_code;
      setReferralCode(code);
      setShareUrl(`${window.location.origin}/cadastro?ref=${code}`);
    }
  }, [referrals]);

  const handleCopy = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado!");
    }
  };

  const handleShareWhatsApp = () => {
    const message = `Olá! 🎉\n\nConheça o Ateliê Pro - o sistema completo de gestão para ateliês!\n\nUse meu código de indicação: ${referralCode}\n\nVocê ganha 7 dias grátis e eu ganho 1 mês grátis quando você assinar! 🎁\n\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleShareEmail = () => {
    const subject = "Conheça o Ateliê Pro - Sistema de Gestão para Ateliês";
    const body = `Olá!\n\nConheça o Ateliê Pro - o sistema completo de gestão para ateliês de costura, bordado e confecção.\n\nUse meu código de indicação: ${referralCode}\n\nVocê ganha 7 dias grátis e eu ganho 1 mês grátis quando você assinar!\n\n${shareUrl}\n\nAtenciosamente`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Não mostrar se não houver empresa
  if (!empresa?.id) {
    return null;
  }

  return (
    <Card className="mb-6 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg font-bold text-gray-900">
                🎁 Programa de Indicação
              </CardTitle>
            </div>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Indique um amigo e ganhe 1 mês grátis quando ele assinar!
          </p>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Resumo das Estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-lg border border-purple-200 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
                <div className="text-xs text-gray-600">Indicações</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-200 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.signedUp}</div>
                <div className="text-xs text-gray-600">Cadastraram</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-200 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.converted}</div>
                <div className="text-xs text-gray-600">Assinaram</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-200 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.rewarded}</div>
                <div className="text-xs text-gray-600">Recompensas</div>
              </div>
            </div>

            {/* Botão para ir à página completa */}
            <Button
              onClick={() => navigate("/indicacoes")}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              size="lg"
            >
              <Gift className="h-5 w-5 mr-2" />
              Ver Detalhes e Gerenciar Indicações
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

