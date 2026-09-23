import { createFileRoute } from "@tanstack/react-router";
import { Pill } from "lucide-react";
import { GuestShell } from "@/components/GuestShell";

export const Route = createFileRoute("/convidado-medicamentos")({ component: MedicamentosConvidado });

function MedicamentosConvidado() {
  return <GuestShell><section><p className="text-sm font-bold text-inksoft">Acompanhamento AICare</p><h1 className="page-heading">Medicamentos</h1><p className="mt-1 text-base text-inksoft">Visualização do tratamento compartilhado pelo cuidador.</p><div className="mt-5 surface"><div className="flex items-start gap-3"><Pill className="mt-1 size-5 shrink-0 text-primary" /><div><h2 className="section-heading">Nenhum medicamento compartilhado</h2><p className="mt-2 text-base text-inksoft">Quando houver um paciente vinculado a este convite, os medicamentos compartilhados aparecerão aqui.</p></div></div></div></section></GuestShell>;
}
