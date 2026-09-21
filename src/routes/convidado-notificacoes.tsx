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
  return <GuestShell><section><p className="text-sm font-bold text-inksoft">Acompanhamento AICare</p><h1 className="page-heading">Avisos</h1><div className="mt-5 divide-y divide-border rounded-lg bg-card px-5 ring-1 ring-border">{avisos.map(({ titulo, texto, quando, icon: Icon }) => <article key={titulo} className="flex items-start gap-3 py-5"><Icon className="mt-1 size-5 shrink-0 text-primary" /><div><h2 className="section-heading">{titulo}</h2><p className="mt-1 text-base text-inksoft">{texto}</p><p className="mt-2 text-sm font-bold text-inksoft">{quando}</p></div></article>)}</div><div className="mt-5 flex items-center gap-2 rounded-lg bg-chrome-tint p-4 text-sm font-semibold text-inksoft ring-1 ring-border"><Bell className="size-5 text-primary" />Novas atualizações aparecerão aqui.</div></section></GuestShell>;
}
