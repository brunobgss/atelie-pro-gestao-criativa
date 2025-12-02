import type { MouseEvent } from "react";
import { useState, useEffect } from "react";
import { LayoutDashboard, Package, Calendar, FileText, Users, Archive, LogOut, Calculator, BookOpen, BarChart3, Crown, DollarSign, User, Ruler, HelpCircle, Receipt, Building2, CreditCard, TrendingUp, ShoppingCart, AlertTriangle, Gift, Trophy, MessageCircle, ChevronDown, ChevronRight } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "./AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresNF?: boolean;
  isAdmin?: boolean;
  subItems?: MenuItem[];
};

const menuItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Pedidos", url: "/pedidos", icon: Package },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Orçamentos", url: "/orcamentos", icon: FileText },
  { title: "Calculadora", url: "/calculadora", icon: Calculator },
  { title: "Catálogo", url: "/catalogo", icon: BookOpen },
  { title: "Medidas", url: "/medidas", icon: Ruler },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Assinatura", url: "/assinatura", icon: Crown },
  {
    title: "Indicações",
    url: "/indicacoes",
    icon: Gift,
    subItems: [
      { title: "Recompensas", url: "/recompensas", icon: Trophy },
    ],
  },
  {
    title: "Notas Fiscais",
    url: "/notas-fiscais",
    icon: Receipt,
    requiresNF: true,
    subItems: [
      { title: "Config. Notas Fiscais", url: "/configuracao-focusnf", icon: Receipt, requiresNF: true },
    ],
  },
  { title: "Clientes", url: "/clientes", icon: Users },
  {
    title: "Fornecedores",
    url: "/fornecedores",
    icon: Building2,
    subItems: [
      { title: "Pedidos de Compra", url: "/pedidos-compra", icon: ShoppingCart },
    ],
  },
  {
    title: "Estoque",
    url: "/estoque",
    icon: Archive,
    subItems: [
      { title: "Movimentações Estoque", url: "/movimentacoes-estoque", icon: Package },
    ],
  },
  {
    title: "Fluxo de Caixa",
    url: "/fluxo-caixa",
    icon: DollarSign,
    subItems: [
      { title: "Contas a Pagar", url: "/contas-pagar", icon: CreditCard },
      { title: "Contas a Receber", url: "/contas-receber", icon: TrendingUp },
    ],
  },
  { title: "Ajuda", url: "/ajuda", icon: HelpCircle },
  { title: "Config. WhatsApp", url: "/configuracao-whatsapp", icon: MessageCircle },
  { title: "Minha Conta", url: "/minha-conta", icon: User },
  { title: "Monitoramento de Erros", url: "/admin/erros", icon: AlertTriangle, isAdmin: true },
  { title: "Gerenciar Comissões", url: "/admin/comissoes", icon: DollarSign, isAdmin: true },
];

export function AppSidebar() {
  const { state, setOpen, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { empresa, user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const hasNotaFiscal = empresa?.tem_nota_fiscal === true;

  // Verificar se o usuário é admin
  // Por padrão, apenas emails configurados como admin podem ver a página de erros
  // Você pode configurar uma lista de emails admin ou usar variável de ambiente
  const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',') || [];
  const isAdmin = user?.email && adminEmails.includes(user.email);

  // Estado para controlar quais itens estão expandidos
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    // Inicializar com itens expandidos se algum subitem estiver ativo
    const initial = new Set<string>();
    menuItems.forEach((item) => {
      if (item.subItems) {
        const hasActiveSubItem = item.subItems.some(
          (subItem) => location.pathname === subItem.url
        );
        if (hasActiveSubItem) {
          initial.add(item.title);
        }
      }
    });
    return initial;
  });

  // Atualizar estado expandido quando a rota mudar
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.subItems) {
        const hasActiveSubItem = item.subItems.some(
          (subItem) => location.pathname === subItem.url
        );
        if (hasActiveSubItem && !expandedItems.has(item.title)) {
          setExpandedItems((prev) => new Set(prev).add(item.title));
        }
      }
    });
  }, [location.pathname]);

  // Fechar menu no mobile quando clicar em um link
  const handleLinkClick = () => {
    if (isMobile) {
      console.log("🔄 Link clicado no mobile, fechando menu");
      setOpenMobile(false);
    }
  };

  const handleMenuItemClick = (
    event: MouseEvent<HTMLAnchorElement>,
    item: MenuItem
  ) => {
    if (item.requiresNF && !hasNotaFiscal) {
      event.preventDefault();
      toast.info('Funcionalidade disponível no plano Profissional (com NF).', {
        action: {
          label: 'Ver planos',
          onClick: () => navigate('/assinatura')
        }
      });

      if (isMobile) {
        setOpenMobile(false);
      }

      return;
    }

    handleLinkClick();
  };

  const toggleExpanded = (itemTitle: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemTitle)) {
        newSet.delete(itemTitle);
      } else {
        newSet.add(itemTitle);
      }
      return newSet;
    });
  };

  const isItemActive = (item: MenuItem): boolean => {
    if (location.pathname === item.url) return true;
    if (item.subItems) {
      return item.subItems.some((subItem) => location.pathname === subItem.url);
    }
    return false;
  };

  const isSubItemActive = (subItem: MenuItem): boolean => {
    return location.pathname === subItem.url;
  };

  return (
    <Sidebar 
      collapsible="offcanvas" 
      className="bg-card border-r border-border"
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
              {menuItems
                .filter((item) => {
                  // Ocultar itens admin para usuários não admin
                  if (item.isAdmin && !isAdmin) {
                    return false;
                  }
                  return true;
                })
                .map((item) => {
                  const isLockedNF = item.requiresNF && !hasNotaFiscal;
                  const hasSubItems = item.subItems && item.subItems.length > 0;
                  const isExpanded = expandedItems.has(item.title);
                  const isActive = isItemActive(item);

                  if (hasSubItems) {
                    return (
                      <Collapsible
                        key={item.title}
                        open={isExpanded}
                        onOpenChange={() => toggleExpanded(item.title)}
                      >
                        <SidebarMenuItem>
                          <div className="flex items-center w-full">
                            {item.url ? (
                              <NavLink
                                to={item.url}
                                onClick={(event) => {
                                  if (isLockedNF) {
                                    event.preventDefault();
                                    toast.info('Funcionalidade disponível no plano Profissional (com NF).', {
                                      action: {
                                        label: 'Ver planos',
                                        onClick: () => navigate('/assinatura')
                                      }
                                    });
                                    if (isMobile) {
                                      setOpenMobile(false);
                                    }
                                    return;
                                  }
                                  handleLinkClick();
                                }}
                                className={({ isActive: navActive }) =>
                                  cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 flex-1",
                                    navActive || isActive
                                      ? "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 font-semibold shadow-sm border-l-4 border-purple-500"
                                      : "text-gray-700 hover:bg-gray-50 hover:text-purple-600",
                                    isLockedNF && "opacity-70 border border-dashed border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                                  )
                                }
                              >
                                <item.icon className="w-5 h-5" />
                                <span className="text-sm font-medium">{item.title}</span>
                              </NavLink>
                            ) : (
                              <div className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 flex-1 text-gray-700">
                                <item.icon className="w-5 h-5" />
                                <span className="text-sm font-medium">{item.title}</span>
                              </div>
                            )}
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                isActive={isActive}
                                className={cn(
                                  "w-8 h-8 p-0 flex-shrink-0 mr-2",
                                  isLockedNF && "opacity-70"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 transition-transform" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 transition-transform" />
                                )}
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.subItems?.map((subItem) => {
                                const isSubActive = isSubItemActive(subItem);
                                const isSubLockedNF = subItem.requiresNF && !hasNotaFiscal;

                                return (
                                  <SidebarMenuSubItem key={subItem.title}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={isSubActive}
                                    >
                                      <NavLink
                                        to={subItem.url}
                                        onClick={(event) => {
                                          if (isSubLockedNF) {
                                            event.preventDefault();
                                            toast.info('Funcionalidade disponível no plano Profissional (com NF).', {
                                              action: {
                                                label: 'Ver planos',
                                                onClick: () => navigate('/assinatura')
                                              }
                                            });
                                            if (isMobile) {
                                              setOpenMobile(false);
                                            }
                                            return;
                                          }
                                          handleLinkClick();
                                        }}
                                        className={cn(
                                          isSubLockedNF && "opacity-70 border border-dashed border-amber-200"
                                        )}
                                      >
                                        <subItem.icon className="w-4 h-4" />
                                        <span>{subItem.title}</span>
                                      </NavLink>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  // Item sem subitens (comportamento normal)
                  return (
                    <SidebarMenuItem key={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        onClick={(event) => handleMenuItemClick(event, item)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                            isActive
                              ? "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 font-semibold shadow-sm border-l-4 border-purple-500"
                              : "text-gray-700 hover:bg-gray-50 hover:text-purple-600"
                          } ${isLockedNF ? 'opacity-70 border border-dashed border-amber-200 hover:bg-amber-50 hover:text-amber-700 cursor-pointer' : ''}`
                        }
                        aria-disabled={isLockedNF}
                      >
                        <item.icon className={`w-5 h-5 ${item.title === "Dashboard" ? "text-purple-600" : ""}`} />
                        <span className="text-sm font-medium">{item.title}</span>
                      </NavLink>
                    </SidebarMenuItem>
                  );
                })}
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