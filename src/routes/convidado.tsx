import { createFileRoute } from "@tanstack/react-router";
import { Bell, Camera, Pill } from "lucide-react";
import { GuestShell } from "@/components/GuestShell";

export const Route = createFileRoute("/convidado")({
  head: () => ({ meta: [
    { title: "Acompanhamento familiar — AICare" },
    { name: "description", content: "Acompanhe os registros compartilhados pelo cuidador." },
    { property: "og:title", content: "Acompanhamento familiar — AICare" },
    { property: "og:description", content: "Acompanhe os registros compartilhados pelo cuidador." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ConvidadoHome,
});

function ConvidadoHome() {
  return <GuestShell><section className="space-y-5">
    <div><p className="text-sm font-bold text-inksoft">Acompanhamento AICare</p><h1 className="page-heading">Área da família</h1><p className="mt-1 text-base text-inksoft">Acompanhe os registros compartilhados pelo cuidador.</p></div>
    <section className="surface"><div className="flex items-start gap-3"><Bell className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="text-sm font-bold text-inksoft">Acompanhamento</p><p className="font-semibold">Os registros do paciente aparecerão aqui quando houver um compartilhamento ativo.</p></div></div></section>
    <section className="surface"><div className="flex items-center gap-3"><Camera className="size-5 text-primary" /><div><h2 className="section-heading">Diário</h2><p className="mt-1 text-base text-inksoft">Fotos e registros diários compartilhados pelo cuidador serão exibidos nesta área.</p></div></div></section>
    <section className="surface"><div className="flex items-center gap-3"><Pill className="size-5 text-primary" /><div><h2 className="section-heading">Medicamentos</h2><p className="mt-1 text-base text-inksoft">Os medicamentos do paciente compartilhado aparecerão na área de medicamentos.</p></div></div></section>
  </section></GuestShell>;
}
