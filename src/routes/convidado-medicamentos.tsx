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
  return <GuestShell><section><p className="text-sm font-bold text-inksoft">Acompanhamento AICare</p><h1 className="page-heading">Medicamentos</h1><p className="mt-1 text-base text-inksoft">Visualização do tratamento compartilhado pelo cuidador.</p><div className="mt-5 divide-y divide-border rounded-lg bg-card px-5 ring-1 ring-border">{medicamentos.map((m) => <article key={m.nome} className="py-5"><div className="flex items-start gap-3"><Pill className="mt-1 size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><h2 className="section-heading">{m.nome} <span className="text-primary">{m.dose}</span></h2><p className="mt-1 text-base text-inksoft">{m.uso}</p></div><span className={`flex shrink-0 items-center gap-1 text-sm font-bold ${m.alerta ? "text-warning" : "text-success"}`}>{m.alerta ? <AlertTriangle className="size-5" /> : <CheckCircle2 className="size-5" />}{m.alerta ? "Atenção" : "Normal"}</span></div><dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-3 text-sm"><div><dt className="font-bold text-inksoft">Estoque</dt><dd className="mt-1 font-semibold">{m.estoque}</dd></div><div><dt className="font-bold text-inksoft">Previsão de término</dt><dd className="mt-1 font-semibold">{m.previsao}</dd></div></dl>{m.alerta ? <p className="mt-3 rounded-lg bg-warning-tint p-3 text-sm font-bold text-warning">Estoque baixo. O cuidador deve providenciar a reposição.</p> : null}</article>)}</div></section></GuestShell>;
}
