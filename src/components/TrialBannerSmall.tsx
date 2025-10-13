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
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              <span className="font-semibold text-sm">Teste Grátis</span>
            </div>
            
            {!isExpired ? (
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                <span className="text-xs">Restam:</span>
                <div className="flex items-center gap-1 text-xs font-mono">
                  {timeLeft.days > 0 && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs px-1 py-0">
                      {timeLeft.days}d
                    </Badge>
                  )}
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs px-1 py-0">
                    {timeLeft.hours.toString().padStart(2, '0')}h
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs px-1 py-0">
                    {timeLeft.minutes.toString().padStart(2, '0')}m
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs px-1 py-0">
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

          <div className="flex items-center gap-2">
            <Button
              onClick={handleUpgrade}
              size="sm"
              className="bg-white text-purple-600 hover:bg-gray-100 font-medium text-xs h-7 px-3"
            >
              {isExpired ? "Assinar" : "Upgrade"}
            </Button>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-7 w-7 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}