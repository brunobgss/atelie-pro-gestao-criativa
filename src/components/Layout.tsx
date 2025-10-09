import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";

export function Layout() {
  return (
    <SidebarProvider defaultOpen={true} open={true}>
      <div className="min-h-screen flex w-full bg-[radial-gradient(1200px_600px_at_10%_-10%,hsl(var(--primary)/0.08),transparent),radial-gradient(1000px_500px_at_110%_10%,hsl(var(--secondary)/0.10),transparent)]">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-3 md:p-6">
            <div className="mx-auto max-w-[1400px]">
              <div className="rounded-2xl md:rounded-3xl border border-white/20 bg-white/70 backdrop-blur-xl shadow-[var(--shadow-elegant)] dark:bg-card/70">
                <div className="rounded-2xl md:rounded-3xl">
                  <Outlet />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
