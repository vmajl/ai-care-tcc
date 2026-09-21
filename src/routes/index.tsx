import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bell, MessageCircleHeart, PackageCheck, Pill, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "AICare — Cuidado e acompanhamento" },
    { name: "description", content: "Organize medicamentos, registros diários e o acompanhamento familiar em um só lugar." },
    { property: "og:title", content: "AICare — Cuidado e acompanhamento" },
    { property: "og:description", content: "Organize medicamentos, registros diários e o acompanhamento familiar em um só lugar." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: data.session.user.user_metadata?.["tipo_usuario"] === "convidado" ? "/convidado" : "/hoje" }); }); }, [navigate]);

  return (
    <div className="min-h-screen bg-canvas font-body text-ink">
      <main className="mx-auto max-w-[460px] space-y-6 px-5 py-8">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-chrome-tint text-chrome-deep ring-1 ring-border">
            <Bell className="size-6" strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-xs font-semibold text-inksoft uppercase">Acompanhamento AICare</p>
            <h1 className="font-display text-2xl leading-none font-semibold">AICare</h1>
          </div>
        </div>

        <section className="rounded-2xl bg-card p-6 ring-1 ring-border">
          <h2 className="font-display text-3xl leading-tight font-semibold text-balance text-ink">Cuidado e acompanhamento em um só lugar</h2>
          <p className="mt-3 text-base text-inksoft">Organize medicamentos, acompanhe os registros do dia e mantenha a família informada sobre a rotina de cuidados.</p>
          <Link to="/auth" className="mt-6 block w-full rounded-xl bg-chrome-deep py-4 text-center font-display text-lg font-bold text-on-chrome ring-1 ring-on-chrome/30">Entrar como cuidador</Link>
          <Link to="/convite" className="mt-2 block w-full rounded-xl bg-card py-3 text-center font-display text-base font-semibold text-chrome-deep ring-1 ring-border">Entrar como convidado</Link>
        </section>

        <section className="space-y-2">
          <Recurso icon={<Pill className="size-5" />} titulo="Medicamentos organizados" texto="Informe os medicamentos e seus horários para manter a rotina de doses organizada." />
          <Recurso icon={<PackageCheck className="size-5" />} titulo="Controle de estoque" texto="Acompanhe a quantidade disponível e receba avisos quando um medicamento estiver próximo de acabar." />
          <Recurso icon={<Users className="size-5" />} titulo="Acompanhamento familiar" texto="Registre informações da rotina e permita que a família acompanhe os cuidados do paciente." />
          <Recurso icon={<MessageCircleHeart className="size-5" />} titulo="Assistente inteligente" texto="Informe o medicamento por texto ou áudio e deixe o AICare organizar as informações." />
        </section>

        <p className="pb-4 text-center text-sm text-inksoft">O AICare organiza informações da rotina de cuidados e não substitui a orientação de profissionais de saúde.</p>
      </main>
    </div>
  );
}

function Recurso({ icon, titulo, texto }: { icon: React.ReactNode; titulo: string; texto: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-card p-4 ring-1 ring-border">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-chrome-tint text-chrome-deep">{icon}</span>
      <span>
        <span className="block font-display text-base leading-tight font-semibold text-ink">{titulo}</span>
        <span className="block text-sm text-inksoft">{texto}</span>
      </span>
    </div>
  );
}
