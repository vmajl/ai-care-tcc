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
      <main className="mx-auto max-w-[720px] space-y-6 px-4 py-5 pb-28 sm:px-6 sm:py-6 lg:pb-8">
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-border pb-4">
          <Link to="/hoje" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Bell className="size-6 text-on-chrome" strokeWidth={2.5} />
            </span>
            <span>
              <span className="block text-xs font-bold text-inksoft uppercase">Acompanhamento AICare</span>
              <span className="block font-display text-xl leading-tight font-semibold">Área do cuidador</span>
            </span>
          </Link>

          {paciente ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex min-h-11 items-center gap-2 rounded-lg bg-primary py-1 pr-1 pl-3 ring-1 ring-primary">
                <span className="text-base font-bold text-on-chrome">{paciente.nome.split(" ")[0]}</span>
                <span className="grid size-9 place-items-center rounded-full bg-chrome-tint">
                  <span className="text-sm font-bold text-primary">{iniciais(paciente.nome)}</span>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52 rounded-lg p-2">
                {pacientes.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => onTrocarPaciente?.(p.id)} className="rounded-md py-3 text-lg font-semibold">
                    {p.nome}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem asChild className="rounded-md py-3 text-lg font-semibold">
                  <Link to="/perfil">Gerenciar pessoas</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </header>

        {children}

        <nav
          aria-label="Navegação principal"
          className="fixed inset-x-0 bottom-0 z-40 mx-auto grid max-w-[720px] grid-cols-4 border-t border-border bg-card px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:static lg:rounded-lg lg:border lg:p-2"
        >
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
      className="flex min-w-0 flex-col items-center gap-1 rounded-md py-2 text-inksoft transition-colors hover:bg-chrome-tint hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      activeProps={{
        className: "flex min-w-0 flex-col items-center gap-1 rounded-md bg-chrome-tint py-2 text-primary",
      }}
    >
      {icon}
      <span className="max-w-full truncate text-xs font-bold sm:text-sm">{label}</span>
    </Link>
  );
}
