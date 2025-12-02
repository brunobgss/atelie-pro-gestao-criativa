import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Clock, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

interface TrialBannerProps {
  onClose?: () => void;
}

export function TrialBannerSmall({ onClose }: TrialBannerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();
  const { empresa } = useAuth();

  // PRIMEIRO: Verificar se o usuário tem premium ativo
  if (empresa?.is_premium === true) {
    console.log("✅ Usuário premium detectado - ocultando banner de trial");
    return null;
  }

  useEffect(() => {
    // Sempre usar dados do Supabase quando disponíveis
    if (!empresa?.trial_end_date) {
      console.log('⚠️ Trial end date não encontrado, aguardando dados do Supabase...');
      return;
    }

    const trialEnd = new Date(empresa.trial_end_date);
    
    const updateTimer = () => {
      const now = new Date();
      const difference = trialEnd.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [empresa?.trial_end_date]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleUpgrade = () => {
    navigate("/assinatura");
  };

  if (!isVisible) return null;

  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  return (
    <Card className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white border-0 shadow-lg">
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <Crown className="w-3 h-3 md:w-4 md:h-4" />
              <span className="font-semibold text-xs md:text-sm whitespace-nowrap">Teste Grátis</span>
            </div>
            
            {!isExpired ? (
              <div className="flex items-center gap-1 md:gap-2 min-w-0">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span className="text-xs whitespace-nowrap hidden sm:inline">Restam:</span>
                <div className="flex items-center gap-0.5 md:gap-1 text-xs font-mono">
                  {timeLeft.days > 0 && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-[10px] md:text-xs px-0.5 md:px-1 py-0 flex-shrink-0">
                      {timeLeft.days}d
                    </Badge>
                  )}
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-[10px] md:text-xs px-0.5 md:px-1 py-0 flex-shrink-0">
                    {timeLeft.hours.toString().padStart(2, '0')}h
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-[10px] md:text-xs px-0.5 md:px-1 py-0 flex-shrink-0">
                    {timeLeft.minutes.toString().padStart(2, '0')}m
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-[10px] md:text-xs px-0.5 md:px-1 py-0 flex-shrink-0">
                    {timeLeft.seconds.toString().padStart(2, '0')}s
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Trial expirado!</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <Button
              onClick={handleUpgrade}
              size="sm"
              className="bg-white text-purple-600 hover:bg-gray-100 font-medium text-[10px] md:text-xs h-6 md:h-7 px-2 md:px-3 whitespace-nowrap"
            >
              {isExpired ? "Assinar" : "Upgrade"}
            </Button>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-6 w-6 md:h-7 md:w-7 p-0 flex-shrink-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}