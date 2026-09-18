import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3, Pill, Camera, Bell } from "lucide-react";
import { GuestShell } from "@/components/GuestShell";

const FOTO_JOSE_17_09 = "/fotos/jose-17-09.png";

export const Route = createFileRoute("/convidado")({ component: ConvidadoHome });

function ConvidadoHome() {
  return <GuestShell><section className="space-y-5">
    <div><p className="text-base font-bold text-inksoft">Acompanhamento AICare</p><h1 className="font-display text-4xl font-semibold">José</h1><p className="mt-1 text-base text-inksoft">Atualizado hoje, 09:32</p></div>
    <section className="rounded-xl bg-card p-5 ring-1 ring-border"><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-chrome-tint text-chrome-deep"><Bell className="size-6" /></span><div><p className="text-sm font-bold text-inksoft">Última atualização</p><p className="font-semibold">Hoje acordou bem e tomou café normalmente.</p></div></div></section>
    <section className="rounded-xl bg-card p-5 ring-1 ring-border"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-inksoft">Registro de hoje</p><h2 className="font-display text-2xl font-semibold">17 de setembro</h2></div><Camera className="size-7 text-chrome-deep" /></div><div className="mt-4 overflow-hidden rounded-2xl bg-chrome-tint"><img src={FOTO_JOSE_17_09} alt="Registro diário de José em 17 de setembro" className="h-52 w-full object-cover" /></div><Link to="/convidado-diario" className="mt-3 block text-center text-base font-bold text-chrome-deep underline">Ver diário completo</Link></section>
    <section className="rounded-xl bg-card p-5 ring-1 ring-border"><div className="flex items-center justify-between"><h2 className="font-display text-2xl font-semibold">Medicamentos de hoje</h2><Pill className="size-6 text-chrome-deep" /></div><div className="mt-4 space-y-3"><Status horario="08:00" nome="Losartana 50 mg" /><Status horario="12:00" nome="Metformina 850 mg" /><Status horario="20:00" nome="Losartana 50 mg" /></div><p className="mt-4 text-center text-sm font-bold text-chrome-deep">3 de 3 administrados</p></section>
  </section></GuestShell>;
}

function Status({ horario, nome }: { horario: string; nome: string }) { return <div className="flex items-center gap-3 rounded-lg bg-chrome-tint p-3"><span className="grid size-10 place-items-center rounded-xl bg-card"><Clock3 className="size-5 text-chrome-deep" /></span><div className="flex-1"><p className="text-sm font-bold text-inksoft">{horario}</p><p className="font-semibold">{nome}</p></div><CheckCircle2 className="size-6 text-green-600" /></div>; }
