import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { TrialProtectedRoute } from "./TrialProtectedRoute";
import { TrialBanner } from "./TrialBanner";
import { useIsMobile } from "@/hooks/use-mobile";

export function Layout() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Atualizar estado do sidebar quando mudar de mobile para desktop
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-600 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider 
      defaultOpen={sidebarOpen}
      onOpenChange={setSidebarOpen}
    >
      <TrialProtectedRoute>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 relative">
          <AppSidebar />
          
          {/* Overlay para mobile quando sidebar estiver aberto */}
          {isMobile && sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          <main className="flex-1 overflow-auto">
            <div className="p-2 sm:p-3 md:p-6">
              <div className="mx-auto max-w-[1400px]">
                <div className="rounded-lg sm:rounded-xl border border-gray-200/50 bg-white/95 backdrop-blur-sm shadow-sm">
                  <div className="rounded-lg sm:rounded-2xl md:rounded-3xl">
                    <Outlet />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </TrialProtectedRoute>
    </SidebarProvider>
  );
}
