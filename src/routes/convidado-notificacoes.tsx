import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { GuestShell } from "@/components/GuestShell";

export const Route = createFileRoute("/convidado-notificacoes")({ component: NotificacoesConvidado });

function NotificacoesConvidado() {
  return <GuestShell><section><p className="text-sm font-bold text-inksoft">Acompanhamento AICare</p><h1 className="page-heading">Avisos</h1><div className="mt-5 surface"><div className="flex items-start gap-3"><Bell className="mt-1 size-5 shrink-0 text-primary" /><div><h2 className="section-heading">Nenhum aviso</h2><p className="mt-2 text-base text-inksoft">Novas atualizações do acompanhamento aparecerão aqui quando forem compartilhadas pelo cuidador.</p></div></div></div></section></GuestShell>;
}
