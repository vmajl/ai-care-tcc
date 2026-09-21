import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3, Pill, Camera, Bell } from "lucide-react";
import { GuestShell } from "@/components/GuestShell";

const FOTO_JOSE_17_09 = "/fotos/jose-17-09.png";

export const Route = createFileRoute("/convidado")({
  head: () => ({ meta: [
    { title: "Acompanhamento de José — AICare" },
    { name: "description", content: "Resumo diário compartilhado com a família." },
    { property: "og:title", content: "Acompanhamento familiar — AICare" },
    { property: "og:description", content: "Resumo diário compartilhado com a família." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ConvidadoHome,
});

function ConvidadoHome() {
  return <GuestShell><section className="space-y-5">
    <div><p className="text-sm font-bold text-inksoft">Acompanhamento AICare</p><h1 className="page-heading">José</h1><p className="mt-1 text-base text-inksoft">Atualizado hoje, 09:32</p></div>
    <section className="surface"><div className="flex items-start gap-3"><Bell className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="text-sm font-bold text-inksoft">Última atualização</p><p className="font-semibold">Hoje acordou bem e tomou café normalmente.</p></div></div></section>
    <section className="surface"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-inksoft">Registro de hoje</p><h2 className="section-heading">17 de setembro</h2></div><Camera className="size-6 text-primary" /></div><div className="mt-4 overflow-hidden rounded-lg bg-chrome-tint"><img src={FOTO_JOSE_17_09} alt="Registro diário de José em 17 de setembro" className="h-52 w-full object-cover" /></div><Link to="/convidado-diario" className="mt-4 inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4">Ver diário completo</Link></section>
    <section className="surface"><div className="flex items-center justify-between"><h2 className="section-heading">Medicamentos de hoje</h2><Pill className="size-5 text-primary" /></div><div className="mt-4 divide-y divide-border"><Status horario="08:00" nome="Losartana 50 mg" /><Status horario="12:00" nome="Metformina 850 mg" /><Status horario="20:00" nome="Losartana 50 mg" /></div><p className="mt-4 text-sm font-bold text-success">3 de 3 administrados</p></section>
  </section></GuestShell>;
}

function Status({ horario, nome }: { horario: string; nome: string }) { return <div className="flex min-h-16 items-center gap-3 py-3"><Clock3 className="size-5 shrink-0 text-primary" /><div className="flex-1"><p className="text-sm font-bold text-inksoft">{horario}</p><p className="font-semibold">{nome}</p></div><span className="flex items-center gap-1 text-sm font-bold text-success"><CheckCircle2 className="size-5" />Administrado</span></div>; }
