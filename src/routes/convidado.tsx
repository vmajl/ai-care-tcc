import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [nomePaciente, setNomePaciente] = useState<string | null>(null);

  useEffect(() => {
    setNomePaciente(localStorage.getItem("aicare_nome_paciente_convidado"));
  }, []);

  return <GuestShell><section className="space-y-6">
    <div>
      <p className="text-sm font-bold text-inksoft">Acompanhamento AICare</p>
      <h1 className="page-heading">Área da família</h1>
      <p className="mt-1 text-base text-inksoft">Visualize as informações compartilhadas pelo cuidador.</p>
    </div>

    <section className="surface border-l-4 border-primary">
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-primary">
            {nomePaciente ? "Paciente vinculado" : "Aguardando compartilhamento"}
          </p>
          <h2 className="mt-1 section-heading">
            {nomePaciente ? nomePaciente : "Nenhum paciente vinculado"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-inksoft">
            {nomePaciente
              ? "Este acesso está vinculado aos registros compartilhados pelo cuidador."
              : "Quando o cuidador compartilhar um paciente, os registros aparecerão automaticamente nesta área."}
          </p>
        </div>
      </div>
    </section>

    <section>
      <h2 className="section-heading mb-3">O que você poderá acompanhar</h2>
      <div className="divide-y divide-border rounded-lg bg-card px-4 ring-1 ring-border">
        <div className="flex items-start gap-3 py-4"><Camera className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="font-display text-lg font-semibold">Diário</p><p className="text-sm text-inksoft">Fotos e registros compartilhados pelo cuidador.</p></div></div>
        <div className="flex items-start gap-3 py-4"><Pill className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="font-display text-lg font-semibold">Medicamentos</p><p className="text-sm text-inksoft">Horários e tratamento do paciente.</p></div></div>
      </div>
    </section>
  </section></GuestShell>;
}
