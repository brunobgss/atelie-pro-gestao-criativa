import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Crown, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

interface TrialBannerProps {
  onClose?: () => void;
}

export function TrialBanner({ onClose }: TrialBannerProps) {
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
    if (!empresa?.trial_end_date) {
      // Se não há data de fim do trial, usar 7 dias a partir de agora
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);
      
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
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              <span className="font-semibold">Teste Grátis</span>
            </div>
            
            {!isExpired ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Restam:</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-mono">
                  {timeLeft.days > 0 && (
                    <>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        {timeLeft.days}d
                      </Badge>
                    </>
                  )}
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {timeLeft.hours.toString().padStart(2, '0')}h
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {timeLeft.minutes.toString().padStart(2, '0')}m
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {timeLeft.seconds.toString().padStart(2, '0')}s
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Trial expirado!</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleUpgrade}
              size="sm"
              className="bg-white text-purple-600 hover:bg-gray-100 font-medium"
            >
              {isExpired ? "Assinar Agora" : "Fazer Upgrade"}
            </Button>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}