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
    <Sidebar 
      collapsible="none" 
      className="bg-card border-r border-border md:relative fixed md:translate-x-0 z-50"
      side="left"
    >
      <div className="p-6 border-b border-border/50">
        {!isCollapsed && (
          <div className="flex flex-col items-center space-y-4">
            {/* Logo oficial do Ateliê Pro */}
            <div className="flex flex-col items-center space-y-3">
              <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200">
                <img 
                  src={logoAteliePro} 
                  alt="Ateliê Pro" 
                  className="h-12 w-auto object-contain"
                  onError={(e) => {
                    console.log("Erro ao carregar logo SVG, usando fallback");
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 font-medium">Sistema de Gestão</p>
              </div>
            </div>
            {empresa && (
              <div className="text-center bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 w-full border border-purple-200">
                <p className="text-sm font-semibold text-purple-800">{empresa.nome}</p>
                <p className="text-xs text-purple-600">Empresa Ativa</p>
              </div>
            )}
          </div>
        )}
        {isCollapsed && (
          <div className="flex items-center justify-center">
            <img 
              src={logoAteliePro} 
              alt="Ateliê Pro" 
              className="h-10 w-auto object-contain"
              onError={(e) => {
                console.log("Erro ao carregar logo SVG colapsada, usando fallback");
                e.currentTarget.style.display = 'none';
              }}
            />
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
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 font-semibold shadow-sm border-l-4 border-purple-500"
                          : "text-gray-700 hover:bg-gray-50 hover:text-purple-600"
                      }`
                    }
                  >
                    <item.icon className={`w-5 h-5 ${item.title === "Dashboard" ? "text-purple-600" : ""}`} />
                    <span className="text-sm font-medium">{item.title}</span>
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