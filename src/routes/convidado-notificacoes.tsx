import { createFileRoute } from "@tanstack/react-router";
import { Bell, Camera, MessageCircle, Pill } from "lucide-react";
import { GuestShell } from "@/components/GuestShell";

export const Route = createFileRoute("/convidado-notificacoes")({ component: NotificacoesConvidado });

const avisos = [
  { titulo: "Nova atualização", texto: "O cuidador registrou que José acordou bem e tomou café normalmente.", quando: "Hoje, 09:32", icon: MessageCircle },
  { titulo: "Novo registro diário", texto: "Uma nova foto foi adicionada ao diário do idoso.", quando: "Hoje, 09:20", icon: Camera },
  { titulo: "Estoque baixo", texto: "A Metformina 850 mg está próxima de acabar.", quando: "Ontem, 18:10", icon: Pill },
];

function NotificacoesConvidado() {
  return <GuestShell><section><p className="text-base font-bold text-inksoft">Acompanhamento AICare</p><h1 className="font-display text-4xl font-semibold">Notificações</h1><div className="mt-5 space-y-3">{avisos.map(({ titulo, texto, quando, icon: Icon }) => <article key={titulo} className="rounded-xl bg-card p-5 ring-1 ring-border"><div className="flex items-start gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-chrome-tint text-chrome-deep"><Icon className="size-6" /></span><div><h2 className="font-display text-xl font-semibold">{titulo}</h2><p className="mt-1 text-base text-inksoft">{texto}</p><p className="mt-2 text-xs font-bold text-inksoft">{quando}</p></div></div></article>)}</div><div className="mt-5 flex items-center gap-2 rounded-2xl bg-chrome-tint p-4 text-sm font-semibold text-inksoft"><Bell className="size-5 text-chrome-deep" />Novas atualizações aparecerão aqui.</div></section></GuestShell>;
}
