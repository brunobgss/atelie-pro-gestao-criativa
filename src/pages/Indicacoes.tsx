// Página de Gerenciamento de Indicações
// Permite usuários acompanharem e gerenciarem suas indicações

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  Gift, 
  Share2, 
  Copy, 
  Check, 
  Users, 
  Trophy, 
  Clock, 
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Download,
  Mail,
  MessageCircle,
  Calendar,
  TrendingUp,
  Star,
  Award,
  Crown,
  Sparkles,
  Zap,
  Target,
  Medal,
  Gem
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Referral {
  id: string;
  referral_code: string;
  referred_email?: string;
  status: string;
  reward_applied: boolean;
  reward_type?: string;
  created_at: string;
  signed_up_at?: string;
  converted_at?: string;
  rewarded_at?: string;
}

export default function Indicacoes() {
  const { empresa } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [referralCode, setReferralCode] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Buscar referências
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["referrals", empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_empresa_id", empresa.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar referências:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Buscar ou criar código de referência
  useQuery({
    queryKey: ["referral-code", empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return "";

      // Buscar código existente
      const { data: existing } = await supabase
        .from("referrals")
        .select("referral_code")
        .eq("referrer_empresa_id", empresa.id)
        .limit(1)
        .single();

      if (existing?.referral_code) {
        setReferralCode(existing.referral_code);
        return existing.referral_code;
      }

      // Criar novo código
      const { data: newCode, error } = await supabase
        .rpc("create_referral_code", { empresa_id: empresa.id });

      if (error) {
        console.error("Erro ao criar código:", error);
        return "";
      }

      if (newCode) {
        setReferralCode(newCode);
        return newCode;
      }

      return "";
    },
    enabled: !!empresa?.id && !referralCode,
  });

  // Estatísticas
  const stats = {
    total: referrals.length,
    pending: referrals.filter(r => r.status === "pending").length,
    signedUp: referrals.filter(r => r.status === "signed_up").length,
    converted: referrals.filter(r => r.status === "converted").length,
    rewarded: referrals.filter(r => r.reward_applied).length,
  };

  // Sistema de Níveis
  interface Level {
    id: string;
    name: string;
    minConverted: number;
    icon: React.ReactNode;
    color: string;
    bgGradient: string;
    borderColor: string;
    description: string;
    reward: string;
    physicalReward?: string;
    commission?: {
      type: "one_time" | "recurring";
      percentage: number;
      description: string;
    };
  }

  const levels: Level[] = [
    {
      id: "iniciante",
      name: "Iniciante",
      minConverted: 0,
      icon: <Star className="h-6 w-6" />,
      color: "text-gray-600",
      bgGradient: "from-gray-50 to-gray-100",
      borderColor: "border-gray-300",
      description: "Começando sua jornada de indicações",
      reward: "Continue indicando!",
    },
    {
      id: "bronze",
      name: "Bronze",
      minConverted: 1,
      icon: <Medal className="h-6 w-6" />,
      color: "text-amber-700",
      bgGradient: "from-amber-50 to-orange-50",
      borderColor: "border-amber-300",
      description: "Primeira indicação convertida!",
      reward: "1 mês grátis ganho",
    },
    {
      id: "prata",
      name: "Prata",
      minConverted: 3,
      icon: <Award className="h-6 w-6" />,
      color: "text-slate-600",
      bgGradient: "from-slate-50 to-gray-50",
      borderColor: "border-slate-300",
      description: "Você está no caminho certo!",
      reward: "3 meses grátis acumulados",
      commission: {
        type: "one_time",
        percentage: 5,
        description: "5% comissão na primeira assinatura do indicado",
      },
    },
    {
      id: "ouro",
      name: "Ouro",
      minConverted: 5,
      icon: <Trophy className="h-6 w-6" />,
      color: "text-yellow-600",
      bgGradient: "from-yellow-50 to-amber-50",
      borderColor: "border-yellow-300",
      description: "Excelente trabalho!",
      reward: "5 meses grátis acumulados",
      physicalReward: "🎁 Pulseira personalizada Ateliê Pro",
      commission: {
        type: "one_time",
        percentage: 10,
        description: "10% comissão na primeira assinatura",
      },
    },
    {
      id: "platina",
      name: "Platina",
      minConverted: 10,
      icon: <Gem className="h-6 w-6" />,
      color: "text-cyan-600",
      bgGradient: "from-cyan-50 to-blue-50",
      borderColor: "border-cyan-300",
      description: "Você é um embaixador!",
      reward: "10 meses grátis acumulados",
      physicalReward: "🏆 Placa personalizada 'Embaixador Ateliê Pro'",
      commission: {
        type: "recurring",
        percentage: 15,
        description: "15% comissão recorrente mensal",
      },
    },
    {
      id: "diamante",
      name: "Diamante",
      minConverted: 20,
      icon: <Sparkles className="h-6 w-6" />,
      color: "text-purple-600",
      bgGradient: "from-purple-50 to-pink-50",
      borderColor: "border-purple-300",
      description: "Incrível! Você é um especialista!",
      reward: "20 meses grátis acumulados",
      commission: {
        type: "recurring",
        percentage: 20,
        description: "20% comissão recorrente mensal",
      },
    },
    {
      id: "lendario",
      name: "Lendário",
      minConverted: 50,
      icon: <Crown className="h-6 w-6" />,
      color: "text-yellow-500",
      bgGradient: "from-yellow-100 via-orange-100 to-yellow-100",
      borderColor: "border-yellow-400",
      description: "LENDÁRIO! Você é uma lenda!",
      reward: "50+ meses grátis acumulados",
      physicalReward: "👑 Kit Premium (Pulseira + Placa + Brinde exclusivo)",
      commission: {
        type: "recurring",
        percentage: 25,
        description: "25% comissão recorrente mensal + Status VIP",
      },
    },
  ];

  // Calcular nível atual
  const currentLevelIndex = levels.findIndex(
    (level, index) => 
      stats.converted >= level.minConverted && 
      (index === levels.length - 1 || stats.converted < levels[index + 1].minConverted)
  );
  const currentLevel = levels[Math.max(0, currentLevelIndex)];
  const nextLevel = currentLevelIndex < levels.length - 1 ? levels[currentLevelIndex + 1] : null;
  
  // Progresso para o próximo nível
  const progressToNext = nextLevel 
    ? ((stats.converted - currentLevel.minConverted) / (nextLevel.minConverted - currentLevel.minConverted)) * 100
    : 100;
  
  const isMaxLevel = !nextLevel;

  // Filtrar referências
  const filteredReferrals = referrals.filter((referral) => {
    const matchesSearch = 
      !searchTerm ||
      referral.referral_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (referral.referred_email?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesStatus = 
      statusFilter === "all" || referral.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCopy = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/cadastro?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const handleShareWhatsApp = () => {
    const message = `Olá! 🎉\n\nConheça o Ateliê Pro - o sistema completo de gestão para ateliês!\n\nUse meu código de indicação: ${referralCode}\n\nVocê ganha 7 dias grátis e eu ganho 1 mês grátis quando você assinar! 🎁\n\n${window.location.origin}/cadastro?ref=${referralCode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const getStatusBadge = (status: string, rewardApplied: boolean) => {
    if (rewardApplied) {
      return (
        <Badge className="bg-green-500 text-white">
          <Trophy className="h-3 w-3 mr-1" />
          Recompensado
        </Badge>
      );
    }
    
    switch (status) {
      case "converted":
        return <Badge className="bg-blue-500 text-white">Assinou Premium</Badge>;
      case "signed_up":
        return <Badge className="bg-purple-500 text-white">Cadastrou</Badge>;
      case "pending":
        return <Badge variant="outline">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!empresa?.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-slate-50 p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-slate-50">
      <header className="bg-white/90 backdrop-blur-lg border-b border-purple-100 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-4 p-4 md:p-6">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Indicações</h1>
            <p className="text-gray-600 text-sm mt-0.5">Gerencie e acompanhe suas indicações</p>
          </div>
        </div>
      </header>

      <div className="p-6 md:p-10 space-y-6">
        {/* Sistema de Níveis */}
        <Card className={`border-2 ${currentLevel.borderColor} bg-gradient-to-br ${currentLevel.bgGradient} shadow-xl`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`${currentLevel.color} p-3 rounded-full bg-white/80 shadow-lg`}>
                  {currentLevel.icon}
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Nível {currentLevel.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{currentLevel.description}</p>
                </div>
              </div>
              {isMaxLevel && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-yellow-500 font-bold text-lg px-4 py-2 animate-pulse">
                  <Crown className="h-5 w-5 mr-2" />
                  MÁXIMO
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-semibold text-gray-700">Indicações Convertidas:</span>
                <span className={`ml-2 text-2xl font-bold ${currentLevel.color}`}>
                  {stats.converted}
                </span>
              </div>
              {nextLevel && (
                <div className="text-right">
                  <span className="text-gray-600">Próximo nível:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-gray-900">{nextLevel.name}</span>
                    <span className="text-gray-500">({nextLevel.minConverted} indicações)</span>
                  </div>
                </div>
              )}
            </div>
            
            {!isMaxLevel && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 bg-gradient-to-r ${currentLevel.bgGradient} ${currentLevel.borderColor} border-2`}
                    style={{ width: `${Math.min(progressToNext, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{stats.converted} de {nextLevel.minConverted} indicações</span>
                  <span>{Math.round(progressToNext)}% completo</span>
                </div>
              </>
            )}

            {isMaxLevel && (
              <div className="p-4 bg-gradient-to-r from-yellow-100 via-orange-100 to-yellow-100 rounded-lg border-2 border-yellow-300 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-6 w-6 text-yellow-600" />
                  <h3 className="font-bold text-lg text-yellow-800">Parabéns, Lenda!</h3>
                </div>
                <p className="text-sm text-yellow-900">
                  Você alcançou o nível máximo! 🎊 Você é um verdadeiro embaixador do Ateliê Pro!
                </p>
                <p className="text-xs text-yellow-700 mt-2">
                  Continue indicando para ajudar mais pessoas e ganhar ainda mais recompensas! 🚀
                </p>
              </div>
            )}

            {/* Recompensas atuais */}
            <div className="space-y-2">
              {/* Meses grátis */}
              <div className="flex items-center gap-2 p-3 bg-white/60 rounded-lg border border-white/80">
                <Gift className={`h-5 w-5 ${currentLevel.color}`} />
                <div>
                  <span className="text-xs text-gray-600">Meses grátis:</span>
                  <p className="font-semibold text-gray-900">{currentLevel.reward}</p>
                </div>
              </div>

              {/* Presente físico */}
              {currentLevel.physicalReward && (
                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-300 shadow-md">
                  <Sparkles className="h-5 w-5 text-yellow-600" />
                  <div className="flex-1">
                    <span className="text-xs text-gray-600">Presente físico:</span>
                    <p className="font-semibold text-gray-900">{currentLevel.physicalReward}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Enviaremos para você quando alcançar este nível!
                    </p>
                  </div>
                </div>
              )}

              {/* Comissão */}
              {currentLevel.commission && (
                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-300 shadow-md">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <span className="text-xs text-gray-600">Comissão:</span>
                    <p className="font-semibold text-gray-900">
                      {currentLevel.commission.percentage}% {currentLevel.commission.type === "recurring" ? "recorrente" : "única"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {currentLevel.commission.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Todos os Níveis */}
        <Card className="bg-white border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Todos os Níveis e Recompensas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {levels.map((level, index) => {
                const isUnlocked = stats.converted >= level.minConverted;
                const isCurrent = level.id === currentLevel.id;
                
                return (
                  <div
                    key={level.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isCurrent
                        ? `${level.bgGradient} ${level.borderColor} shadow-lg`
                        : isUnlocked
                        ? "bg-gray-50 border-gray-300"
                        : "bg-white border-gray-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 ${isCurrent ? level.color : isUnlocked ? "text-gray-600" : "text-gray-400"}`}>
                        <div className={`p-3 rounded-full bg-white ${isCurrent ? "shadow-md" : ""}`}>
                          {level.icon}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className={`font-bold text-lg ${isCurrent ? "text-gray-900" : isUnlocked ? "text-gray-700" : "text-gray-500"}`}>
                            Nível {level.name}
                          </h3>
                          {isCurrent && (
                            <Badge className="bg-purple-600 text-white">Atual</Badge>
                          )}
                          {isUnlocked && !isCurrent && (
                            <Badge variant="outline" className="bg-green-50">✓ Desbloqueado</Badge>
                          )}
                          <span className="text-sm text-gray-500 ml-auto">
                            {level.minConverted === 0 ? "Início" : `${level.minConverted}+ indicações`}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{level.description}</p>
                        
                        <div className="space-y-2">
                          {/* Meses grátis */}
                          <div className="flex items-center gap-2 text-sm">
                            <Gift className="h-4 w-4 text-purple-600" />
                            <span className="text-gray-700">{level.reward}</span>
                          </div>
                          
                          {/* Presente físico */}
                          {level.physicalReward && (
                            <div className="flex items-center gap-2 text-sm">
                              <Sparkles className="h-4 w-4 text-yellow-600" />
                              <span className="text-gray-700 font-semibold">{level.physicalReward}</span>
                            </div>
                          )}
                          
                          {/* Comissão */}
                          {level.commission && (
                            <div className="flex items-center gap-2 text-sm">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="text-gray-700">
                                <strong>{level.commission.percentage}%</strong> comissão {level.commission.type === "recurring" ? "recorrente" : "única"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Card de Código de Referência */}
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg font-bold text-gray-900">
                Seu Código de Indicação
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white p-4 rounded-lg border-2 border-purple-200 font-mono text-xl font-bold text-purple-600 text-center">
                {isLoading ? "Carregando..." : referralCode || "Gerando..."}
              </div>
              <Button onClick={handleCopy} variant="outline" size="lg">
                {copied ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button onClick={handleCopyLink} variant="outline" className="w-full">
                <Share2 className="h-4 w-4 mr-2" />
                Copiar Link
              </Button>
              <Button 
                onClick={handleShareWhatsApp} 
                variant="outline" 
                className="w-full bg-green-50 hover:bg-green-100 border-green-200"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Compartilhar WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas Detalhadas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="h-4 w-4 text-purple-600" />
                <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
              </div>
              <div className="text-xs text-gray-600 font-semibold">Total de Indicações</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-gray-600" />
                <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
              </div>
              <div className="text-xs text-gray-600 font-semibold">Pendentes</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                <div className="text-2xl font-bold text-purple-600">{stats.signedUp}</div>
              </div>
              <div className="text-xs text-gray-600 font-semibold">Cadastraram</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-blue-600" />
                <div className="text-2xl font-bold text-blue-600">{stats.converted}</div>
              </div>
              <div className="text-xs text-gray-600 font-semibold">Assinaram Premium</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Gift className="h-4 w-4 text-green-600" />
                <div className="text-2xl font-bold text-green-600">{stats.rewarded}</div>
              </div>
              <div className="text-xs text-gray-600 font-semibold">Recompensas Ganhas</div>
              {stats.rewarded > 0 && (
                <div className="text-xs text-green-700 font-bold mt-1">
                  {stats.rewarded} mês{stats.rewarded > 1 ? 'es' : ''} grátis!
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Busca */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por código ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  Todos
                </Button>
                <Button
                  variant={statusFilter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("pending")}
                >
                  Pendentes
                </Button>
                <Button
                  variant={statusFilter === "signed_up" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("signed_up")}
                >
                  Cadastrados
                </Button>
                <Button
                  variant={statusFilter === "converted" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("converted")}
                >
                  Convertidos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Indicações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Indicações ({filteredReferrals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : filteredReferrals.length === 0 ? (
              <div className="text-center py-8">
                <Gift className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Nenhuma indicação encontrada</p>
                <p className="text-sm text-gray-500 mt-2">
                  Compartilhe seu código para começar a receber indicações!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReferrals.map((referral) => (
                  <Card key={referral.id} className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-mono font-bold text-purple-600 text-lg">
                              {referral.referral_code}
                            </div>
                            {getStatusBadge(referral.status, referral.reward_applied)}
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            {referral.referred_email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                {referral.referred_email}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              Criado em: {format(new Date(referral.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>
                            {referral.signed_up_at && (
                              <div className="flex items-center gap-2 text-purple-600">
                                <CheckCircle className="h-3 w-3" />
                                Cadastrou em: {format(new Date(referral.signed_up_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </div>
                            )}
                            {referral.converted_at && (
                              <div className="flex items-center gap-2 text-blue-600">
                                <Trophy className="h-3 w-3" />
                                Assinou em: {format(new Date(referral.converted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </div>
                            )}
                            {referral.rewarded_at && (
                              <div className="flex items-center gap-2 text-green-600">
                                <Gift className="h-3 w-3" />
                                Recompensa aplicada em: {format(new Date(referral.rewarded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {referral.reward_applied && (
                            <Badge className="bg-green-500 text-white">
                              <Trophy className="h-3 w-3 mr-1" />
                              1 mês grátis aplicado
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conquistas Especiais de Indicação */}
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-600" />
              Conquistas Especiais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Primeira Conversão */}
              <div className={`p-4 rounded-lg border-2 ${
                stats.converted >= 1 
                  ? "bg-gradient-to-br from-yellow-100 to-orange-100 border-yellow-300 shadow-md" 
                  : "bg-white border-gray-200 opacity-60"
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <Medal className={`h-6 w-6 ${stats.converted >= 1 ? "text-yellow-600" : "text-gray-400"}`} />
                  <div>
                    <h4 className={`font-bold ${stats.converted >= 1 ? "text-gray-900" : "text-gray-500"}`}>
                      Primeira Conversão
                    </h4>
                    <p className="text-xs text-gray-600">Sua primeira indicação assinou!</p>
                  </div>
                </div>
                {stats.converted >= 1 ? (
                  <Badge className="bg-yellow-500 text-white">✓ Desbloqueado</Badge>
                ) : (
                  <Badge variant="outline">Em progresso</Badge>
                )}
              </div>

              {/* Embaixador */}
              <div className={`p-4 rounded-lg border-2 ${
                stats.converted >= 10 
                  ? "bg-gradient-to-br from-cyan-100 to-blue-100 border-cyan-300 shadow-md" 
                  : "bg-white border-gray-200 opacity-60"
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <Gem className={`h-6 w-6 ${stats.converted >= 10 ? "text-cyan-600" : "text-gray-400"}`} />
                  <div>
                    <h4 className={`font-bold ${stats.converted >= 10 ? "text-gray-900" : "text-gray-500"}`}>
                      Embaixador
                    </h4>
                    <p className="text-xs text-gray-600">10 indicações convertidas</p>
                  </div>
                </div>
                {stats.converted >= 10 ? (
                  <Badge className="bg-cyan-500 text-white">✓ Desbloqueado</Badge>
                ) : (
                  <Badge variant="outline">{stats.converted}/10</Badge>
                )}
              </div>

              {/* Lenda */}
              <div className={`p-4 rounded-lg border-2 ${
                stats.converted >= 50 
                  ? "bg-gradient-to-br from-yellow-100 via-orange-100 to-yellow-100 border-yellow-400 shadow-lg animate-pulse" 
                  : "bg-white border-gray-200 opacity-60"
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <Crown className={`h-6 w-6 ${stats.converted >= 50 ? "text-yellow-600" : "text-gray-400"}`} />
                  <div>
                    <h4 className={`font-bold ${stats.converted >= 50 ? "text-gray-900" : "text-gray-500"}`}>
                      Lenda
                    </h4>
                    <p className="text-xs text-gray-600">50 indicações convertidas</p>
                  </div>
                </div>
                {stats.converted >= 50 ? (
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold">
                    ✓ LENDÁRIO
                  </Badge>
                ) : (
                  <Badge variant="outline">{stats.converted}/50</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações sobre o Programa */}
        <Card className="bg-gradient-to-r from-purple-100 to-pink-100 border-purple-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-600" />
              Como Funciona o Programa de Indicação
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">1.</span>
                <span>Compartilhe seu código único com amigos e conhecidos</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">2.</span>
                <span>Eles ganham <strong>7 dias grátis adicionais</strong> ao se cadastrar com seu código</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">3.</span>
                <span>Quando eles assinarem o plano premium, você ganha <strong>1 mês grátis automaticamente</strong>!</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">4.</span>
                <span>A recompensa é aplicada automaticamente - sem complicação!</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

