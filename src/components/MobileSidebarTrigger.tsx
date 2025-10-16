import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export function MobileSidebarTrigger() {
  const { openMobile, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();

  // Só mostrar em mobile
  if (!isMobile) {
    return null;
  }

  const handleToggle = () => {
    console.log("🔄 Toggle mobile menu:", { openMobile, newState: !openMobile });
    setOpenMobile(!openMobile);
    
    // Forçar re-render se necessário
    setTimeout(() => {
      console.log("🔄 Estado após toggle:", { openMobile: useSidebar().openMobile });
    }, 100);
  };

  // Fechar menu quando clicar em um link
  const handleLinkClick = () => {
    console.log("🔄 Link clicado, fechando menu mobile");
    setOpenMobile(false);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className="text-gray-700 hover:bg-gray-100 transition-all duration-200 p-3 border border-gray-200 rounded-lg shadow-sm bg-white"
    >
      {openMobile ? (
        <X className="h-6 w-6" />
      ) : (
        <Menu className="h-6 w-6" />
      )}
      <span className="ml-2 text-sm font-medium">
        {openMobile ? "Fechar" : "Menu"}
      </span>
      <span className="sr-only">
        {openMobile ? "Fechar menu" : "Abrir menu"}
      </span>
    </Button>
  );
}
