import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bell, Clock, Pill, User } from "lucide-react";
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
            <span className="chrome grid size-12 place-items-center rounded-2xl shadow-soft ring-1 ring-on-chrome/60">
              <Bell className="size-6 text-on-chrome" strokeWidth={2.5} />
            </span>
            <span>
              <span className="block text-xs font-bold tracking-[0.18em] text-inksoft uppercase">
                Lembretes
              </span>
              <span className="block font-display text-2xl leading-none font-semibold">
                AICare
              </span>
            </span>
          </Link>

          {paciente ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="chrome-deep flex items-center gap-2 rounded-full py-1 pr-1 pl-4 shadow-sm ring-1 ring-on-chrome/50">
                <span className="text-base font-bold text-on-chrome">
                  {paciente.nome.split(" ")[0]}
                </span>
                <span className="grid size-9 place-items-center rounded-full bg-chrome-tint">
                  <span className="text-sm font-bold text-chrome-deep">
                    {iniciais(paciente.nome)}
                  </span>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52 rounded-2xl p-2">
                {pacientes.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => onTrocarPaciente?.(p.id)}
                    className="rounded-xl py-3 text-lg font-semibold"
                  >
                    {p.nome}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem asChild className="rounded-xl py-3 text-lg font-semibold">
                  <Link to="/perfil">Gerenciar pessoas</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </header>

        {children}

        <nav className="chrome grid grid-cols-3 gap-1 rounded-3xl p-2 shadow-soft ring-1 ring-on-chrome/50">
          <NavItem to="/hoje" label="Agora" icon={<Clock className="size-7" />} />
          <NavItem to="/remedios" label="Remédios" icon={<Pill className="size-7" />} />
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
      className="flex flex-col items-center gap-1 rounded-2xl py-3 text-on-chrome/90 transition-transform hover:scale-[1.02]"
      activeProps={{
        className:
          "flex flex-col items-center gap-1 rounded-2xl py-3 bg-white/25 text-on-chrome shadow-sm transition-transform",
      }}
    >
      {icon}
      <span className="text-sm font-bold">{label}</span>
    </Link>
  );
}
