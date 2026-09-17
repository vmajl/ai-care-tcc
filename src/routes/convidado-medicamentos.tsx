import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Pill } from "lucide-react";
import { GuestShell } from "@/components/GuestShell";

export const Route = createFileRoute("/convidado-medicamentos")({ component: MedicamentosConvidado });

const medicamentos = [
  { nome: "Losartana", dose: "50 mg", uso: "1 comprimido por dia", estoque: "32 comprimidos", previsao: "18/10/2026", alerta: false },
  { nome: "Metformina", dose: "850 mg", uso: "1 comprimido por dia", estoque: "8 comprimidos", previsao: "25/09/2026", alerta: true },
  { nome: "Omeprazol", dose: "20 mg", uso: "1 comprimido por dia", estoque: "20 comprimidos", previsao: "07/10/2026", alerta: false },
];

function MedicamentosConvidado() {
  return <GuestShell><section><p className="text-base font-bold text-inksoft">Acompanhamento</p><h1 className="font-display text-4xl font-semibold">Medicamentos</h1><p className="mt-1 text-base text-inksoft">Você pode visualizar o tratamento, mas não alterar os registros.</p><div className="mt-5 space-y-3">{medicamentos.map((m) => <article key={m.nome} className="rounded-3xl bg-card p-5 shadow-soft ring-1 ring-border"><div className="flex items-start gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-chrome-tint text-chrome-deep"><Pill className="size-6" /></span><div className="flex-1"><h2 className="font-display text-2xl font-semibold">{m.nome} {m.dose}</h2><p className="text-sm text-inksoft">{m.uso}</p></div>{m.alerta ? <AlertTriangle className="size-6 text-amber-600" /> : <CheckCircle2 className="size-6 text-green-600" />}</div><div className="mt-4 grid grid-cols-2 gap-2 text-sm"><div className="rounded-xl bg-chrome-tint p-3"><span className="block font-bold text-inksoft">Estoque</span><strong>{m.estoque}</strong></div><div className="rounded-xl bg-chrome-tint p-3"><span className="block font-bold text-inksoft">Previsão de término</span><strong>{m.previsao}</strong></div></div>{m.alerta ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">Estoque próximo do fim. O cuidador deve providenciar a reposição.</p> : null}</article>)}</div></section></GuestShell>;
}
