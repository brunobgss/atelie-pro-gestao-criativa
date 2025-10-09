import { LayoutDashboard, Package, Calendar, FileText, Users, Archive } from "lucide-react";
import { NavLink } from "react-router-dom";
import logoAteliePro from "@/assets/logo-atelie-pro.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Pedidos", url: "/pedidos", icon: Package },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Orçamentos", url: "/orcamentos", icon: FileText },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Estoque", url: "/estoque", icon: Archive },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="none" className="bg-card border-r border-border">
      <div className="p-6 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center justify-center">
            <img 
              src={logoAteliePro} 
              alt="Ateliê Pro" 
              className="h-10 w-auto object-contain"
            />
          </div>
        )}
        {isCollapsed && (
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
          </div>
        )}
      </div>

      <SidebarContent className="bg-card">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-3 py-4">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <NavLink
                    to={item.url}
                    end={item.url === "/"}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-secondary text-secondary-foreground font-medium shadow-sm"
                          : "text-foreground hover:bg-muted"
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.title}</span>
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
