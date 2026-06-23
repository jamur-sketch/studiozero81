import { useNavigate, useLocation } from "react-router-dom";
import {
  CalendarDays,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Scissors,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { title: "Agenda", url: "/home", icon: CalendarDays },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Assinaturas", url: "/assinaturas", icon: CreditCard },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-5 py-5 border-b border-sidebar-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <Scissors className="h-5 w-5 text-sidebar-foreground" />
            </div>
            <div>
              <span className="text-base font-bold text-sidebar-foreground tracking-tight">
                ZERO81
              </span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40 font-medium">
                Studio
              </span>
            </div>
          </div>
          <SidebarTrigger className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors" />
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/5 transition-all text-sm font-medium"
                      activeClassName="!text-sidebar-foreground !bg-white/10 shadow-sm"
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Separator className="mb-4 bg-sidebar-border/30" />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-sidebar-foreground font-semibold text-sm shrink-0">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold text-sidebar-foreground truncate">
                {user?.email?.split("@")[0] || "Usuário"}
              </span>
              <span className="text-[11px] text-sidebar-foreground/40 truncate">
                {user?.email || ""}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-sidebar-foreground/40 hover:text-red-400 transition-colors p-1.5 rounded-md hover:bg-white/5 shrink-0"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        {children}
      </div>
    </SidebarProvider>
  );
}
