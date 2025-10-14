import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export function MobileSidebarTrigger() {
  const { open, setOpen } = useSidebar();
  const isMobile = useIsMobile();

  // Só mostrar em mobile
  if (!isMobile) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setOpen(!open)}
      className="text-gray-700 hover:bg-gray-100 transition-all duration-200 p-2"
    >
      {open ? (
        <X className="h-5 w-5" />
      ) : (
        <Menu className="h-5 w-5" />
      )}
      <span className="sr-only">
        {open ? "Fechar menu" : "Abrir menu"}
      </span>
    </Button>
  );
}
