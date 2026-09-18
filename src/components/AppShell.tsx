import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bell, CalendarDays, Clock, Pill, User } from "lucide-react";
import type { Patient } from "@/lib/capsula";
import { iniciais } from "@/lib/capsula";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  children: ReactNode;
  pacientes?: Patient[];
  pacienteId?: string | null;
  onTrocarPaciente?: (id: string) => void;
};

export function AppShell({ children, pacientes = [], pacienteId, onTrocarPaciente }: Props) {
  const paciente = pacientes.find((p) => p.id === pacienteId);

  return (
    <div className="min-h-screen bg-canvas font-body text-lg text-ink">
      <main className="mx-auto max-w-[460px] space-y-6 px-5 py-6 pb-8">
        <header className="flex items-center justify-between gap-3">
          <Link to="/hoje" className="flex items-center gap-3">
            <span className="chrome grid size-12 place-items-center rounded-xl ring-1 ring-on-chrome/60">
              <Bell className="size-6 text-on-chrome" strokeWidth={2.5} />
            </span>
            <span>
              <span className="block text-xs font-bold tracking-[0.14em] text-inksoft uppercase">Acompanhamento</span>
              <span className="block font-display text-2xl leading-none font-semibold">AICare</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/convidado-notificacoes"
              aria-label="Notificações"
              className="grid size-11 place-items-center rounded-xl bg-card text-chrome-deep ring-1 ring-border transition-transform hover:scale-105 active:scale-95"
            >
              <Bell className="size-5" />
            </Link>

            {paciente ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="chrome-deep flex items-center gap-2 rounded-full py-1 pr-1 pl-4 shadow-sm ring-1 ring-on-chrome/50">
                  <span className="text-base font-bold text-on-chrome">{paciente.nome.split(" ")[0]}</span>
                  <span className="grid size-9 place-items-center rounded-full bg-chrome-tint">
                    <span className="text-sm font-bold text-chrome-deep">{iniciais(paciente.nome)}</span>
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-52 rounded-2xl p-2">
                  {pacientes.map((p) => (
                    <DropdownMenuItem key={p.id} onClick={() => onTrocarPaciente?.(p.id)} className="rounded-xl py-3 text-lg font-semibold">
                      {p.nome}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem asChild className="rounded-xl py-3 text-lg font-semibold">
                    <Link to="/perfil">Gerenciar pessoas</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </header>

        {children}

        <nav className="chrome grid grid-cols-4 gap-1 rounded-xl p-2 ring-1 ring-on-chrome/50">
          <NavItem to="/hoje" label="Início" icon={<Clock className="size-7" />} />
          <NavItem to="/diario" label="Diário" icon={<CalendarDays className="size-7" />} />
          <NavItem to="/remedios" label="Medicamentos" icon={<Pill className="size-7" />} />
          <NavItem to="/perfil" label="Pessoas" icon={<User className="size-7" />} />
        </nav>
      </main>
    </div>
  );
}

function NavItem({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 rounded-lg py-3 text-on-chrome/90"
      activeProps={{
        className: "flex flex-col items-center gap-1 rounded-2xl py-3 bg-white/25 text-on-chrome",
      }}
    >
      {icon}
      <span className="text-sm font-bold">{label}</span>
    </Link>
  );
}
