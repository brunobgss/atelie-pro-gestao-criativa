// Componente de Controles do Dashboard
// Permite personalizar a visualização: toggle de seções de engajamento e modo compacto

import { useState, useEffect, createContext, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, LayoutGrid, LayoutList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const STORAGE_KEY_ENGAGEMENT = "atelie_dashboard_engagement_visible";
const STORAGE_KEY_COMPACT = "atelie_dashboard_compact_mode";

// Contexto para compartilhar o modo compacto (opcional, para uso futuro)
interface DashboardContextType {
  compactMode: boolean;
  engagementVisible: boolean;
}

export const DashboardContext = createContext<DashboardContextType>({
  compactMode: false,
  engagementVisible: true,
});

export const useDashboardContext = () => useContext(DashboardContext);

interface DashboardControlsProps {
  onEngagementToggle?: (visible: boolean) => void;
  onCompactToggle?: (compact: boolean) => void;
  compactMode?: boolean;
  engagementVisible?: boolean;
  onCompactChange?: (compact: boolean) => void;
  onEngagementChange?: (visible: boolean) => void;
}

export function DashboardControls({ 
  onEngagementToggle, 
  onCompactToggle,
  compactMode: externalCompactMode,
  engagementVisible: externalEngagementVisible,
  onCompactChange,
  onEngagementChange,
}: DashboardControlsProps) {
  const [engagementVisible, setEngagementVisible] = useState(() => {
    if (externalEngagementVisible !== undefined) return externalEngagementVisible;
    const stored = localStorage.getItem(STORAGE_KEY_ENGAGEMENT);
    return stored ? JSON.parse(stored) : true;
  });

  const [compactMode, setCompactMode] = useState(() => {
    if (externalCompactMode !== undefined) return externalCompactMode;
    const stored = localStorage.getItem(STORAGE_KEY_COMPACT);
    return stored ? JSON.parse(stored) : false;
  });

  useEffect(() => {
    if (externalEngagementVisible !== undefined) {
      setEngagementVisible(externalEngagementVisible);
    }
  }, [externalEngagementVisible]);

  useEffect(() => {
    if (externalCompactMode !== undefined) {
      setCompactMode(externalCompactMode);
    }
  }, [externalCompactMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ENGAGEMENT, JSON.stringify(engagementVisible));
    onEngagementToggle?.(engagementVisible);
    onEngagementChange?.(engagementVisible);
  }, [engagementVisible, onEngagementToggle, onEngagementChange]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COMPACT, JSON.stringify(compactMode));
    onCompactToggle?.(compactMode);
    onCompactChange?.(compactMode);
  }, [compactMode, onCompactToggle, onCompactChange]);

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Controles:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEngagementVisible(!engagementVisible)}
              className="h-8 text-xs"
              title={engagementVisible ? "Ocultar seções de engajamento" : "Mostrar seções de engajamento"}
            >
              {engagementVisible ? (
                <>
                  <Eye className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">Engajamento</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">Mostrar</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompactMode(!compactMode)}
              className="h-8 text-xs"
              title={compactMode ? "Modo normal" : "Modo compacto"}
            >
              {compactMode ? (
                <>
                  <LayoutGrid className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">Normal</span>
                </>
              ) : (
                <>
                  <LayoutList className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">Compacto</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook para usar os controles do dashboard
export function useDashboardControls() {
  const [engagementVisible, setEngagementVisible] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_ENGAGEMENT);
    return stored ? JSON.parse(stored) : true;
  });

  const [compactMode, setCompactMode] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_COMPACT);
    return stored ? JSON.parse(stored) : false;
  });

  return {
    engagementVisible,
    compactMode,
    setEngagementVisible,
    setCompactMode,
  };
}

