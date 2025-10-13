import { LayoutDashboard, Package, Calendar, FileText, Users, Archive, LogOut, Calculator, BookOpen, BarChart3, Crown, DollarSign, User } from "lucide-react";
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
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useAuth } from "./AuthProvider";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Pedidos", url: "/pedidos", icon: Package },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Orçamentos", url: "/orcamentos", icon: FileText },
  { title: "Calculadora", url: "/calculadora", icon: Calculator },
  { title: "Catálogo", url: "/catalogo", icon: BookOpen },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Assinatura", url: "/assinatura", icon: Crown },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Estoque", url: "/estoque", icon: Archive },
  { title: "Minha Conta", url: "/minha-conta", icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { empresa, signOut } = useAuth();

  return (
    <Sidebar collapsible="none" className="bg-card border-r border-border">
      <div className="p-6 border-b border-border/50">
        {!isCollapsed && (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-3">
              <img 
                src={logoAteliePro} 
                alt="Ateliê Pro" 
                className="h-14 w-auto object-contain"
                onError={(e) => {
                  console.log("Erro ao carregar logo, usando fallback");
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="text-left">
                <h1 className="text-lg font-bold text-foreground">Ateliê Pro</h1>
                <p className="text-xs text-muted-foreground">Gestão Criativa</p>
              </div>
            </div>
            {empresa && (
              <div className="text-center bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 w-full">
                <p className="text-sm font-semibold text-purple-700">{empresa.nome}</p>
                <p className="text-xs text-purple-600">Sistema de Gestão</p>
              </div>
            )}
          </div>
        )}
        {isCollapsed && (
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">A</span>
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

        <div className="mt-auto p-3">
          <SidebarMenuButton
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-muted-foreground hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Sair</span>
          </SidebarMenuButton>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}