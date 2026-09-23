import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bell, CalendarDays, Home, LogOut, Pill } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };

export function GuestShell({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  async function sair() {
    await supabase.auth.signOut();
    localStorage.removeItem("aicare_codigo_convite");
    localStorage.removeItem("aicare_paciente_convidado");
    localStorage.removeItem("aicare_nome_paciente_convidado");
    localStorage.removeItem("aicare_foto_hoje");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-canvas font-body text-lg text-ink">
      <main className="mx-auto max-w-[720px] space-y-6 px-4 py-5 pb-28 sm:px-6 sm:py-6 lg:pb-8">
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-border pb-4">
          <Link to="/convidado" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Bell className="size-6 text-on-chrome" strokeWidth={2.5} />
            </span>
            <span>
              <span className="block text-xs font-bold text-inksoft uppercase">Acompanhamento AICare</span>
              <span className="block font-display text-xl leading-tight font-semibold">Área da família</span>
            </span>
          </Link>
          <Button
            type="button"
            onClick={sair}
            variant="outline"
            size="sm"
            aria-label="Sair do aplicativo"
          >
            <LogOut className="size-4" />
            Sair
          </Button>
        </header>

        {children}

        <nav
          aria-label="Navegação principal"
          className="fixed inset-x-0 bottom-0 z-40 mx-auto grid max-w-[720px] grid-cols-4 border-t border-border bg-card px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:static lg:rounded-lg lg:border lg:p-2"
        >
          <GuestNavItem to="/convidado" label="Início" icon={<Home className="size-6" />} active={path === "/convidado"} />
          <GuestNavItem to="/convidado-diario" label="Diário" icon={<CalendarDays className="size-6" />} active={path === "/convidado-diario"} />
          <GuestNavItem to="/convidado-medicamentos" label="Medicamentos" icon={<Pill className="size-6" />} active={path === "/convidado-medicamentos"} />
          <GuestNavItem to="/convidado-notificacoes" label="Avisos" icon={<Bell className="size-6" />} active={path === "/convidado-notificacoes"} />
        </nav>
      </main>
    </div>
  );
}

function GuestNavItem({ to, label, icon, active }: { to: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-md py-2 text-inksoft transition-colors hover:bg-chrome-tint hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-chrome-tint text-primary" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span className="max-w-full truncate text-xs font-bold sm:text-sm">{label}</span>
    </Link>
  );
}
