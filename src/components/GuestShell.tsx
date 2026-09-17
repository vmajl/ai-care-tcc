import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bell, CalendarDays, Home, Pill } from "lucide-react";

type Props = { children: ReactNode };

export function GuestShell({ children }: Props) {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="min-h-screen bg-canvas font-body text-lg text-ink">
      <main className="mx-auto max-w-[460px] space-y-6 px-5 py-6 pb-8">
        <header className="flex items-center justify-between gap-3">
          <Link to="/convidado" className="flex items-center gap-3">
            <span className="chrome grid size-12 place-items-center rounded-2xl shadow-soft ring-1 ring-on-chrome/60">
              <Bell className="size-6 text-on-chrome" strokeWidth={2.5} />
            </span>
            <span>
              <span className="block text-xs font-bold tracking-[0.18em] text-inksoft uppercase">Acompanhamento</span>
              <span className="block font-display text-2xl leading-none font-semibold">AICare</span>
            </span>
          </Link>
          <span className="rounded-full bg-chrome-tint px-3 py-2 text-sm font-bold text-chrome-deep">Convidado</span>
        </header>

        {children}

        <nav className="chrome grid grid-cols-4 gap-1 rounded-3xl p-2 shadow-soft ring-1 ring-on-chrome/50">
          <GuestNavItem to="/convidado" label="Início" icon={<Home className="size-6" />} active={path === "/convidado"} />
          <GuestNavItem to="/convidado-diario" label="Diário" icon={<CalendarDays className="size-6" />} active={path === "/convidado-diario"} />
          <GuestNavItem to="/convidado-medicamentos" label="Remédios" icon={<Pill className="size-6" />} active={path === "/convidado-medicamentos"} />
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
      className={`flex flex-col items-center gap-1 rounded-2xl py-3 text-on-chrome/90 transition-transform hover:scale-[1.02] ${active ? "bg-white/25 text-on-chrome shadow-sm" : ""}`}
    >
      {icon}
      <span className="text-xs font-bold">{label}</span>
    </Link>
  );
}
