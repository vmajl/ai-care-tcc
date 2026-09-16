import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bell, MessageCircleHeart, Pill, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AICare — lembretes de remédios para idosos" },
      {
        name: "description",
        content:
          "Converse com a assistente, cadastre os remédios e receba lembretes dos horários. Feito para idosos e cuidadores.",
      },
      { property: "og:title", content: "AICare — lembretes de remédios para idosos" },
      {
        property: "og:description",
        content:
          "Cadastre os remédios conversando e receba lembretes dos horários de cada pessoa cuidada.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/hoje" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-canvas font-body text-lg text-ink">
      <main className="mx-auto max-w-[460px] space-y-6 px-5 py-8">
        <div className="flex items-center gap-3">
          <span className="chrome grid size-14 place-items-center rounded-2xl shadow-soft ring-1 ring-on-chrome/60">
            <Bell className="size-7 text-on-chrome" strokeWidth={2.5} />
          </span>
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-inksoft uppercase">Lembretes</p>
            <h1 className="font-display text-3xl leading-none font-semibold">AICare</h1>
          </div>
        </div>

        <section className="chrome rounded-3xl p-6 text-on-chrome shadow-soft ring-1 ring-on-chrome/50">
          <h2 className="font-display text-4xl leading-tight font-semibold text-balance">
            Nenhum remédio esquecido
          </h2>
          <p className="mt-3 text-lg font-medium text-on-chrome/90">
            Você conta o que o médico passou, a assistente organiza os horários e o aplicativo
            avisa na hora certa.
          </p>
          <Link
            to="/auth"
            className="mt-6 block w-full rounded-2xl bg-card py-5 text-center font-display text-2xl font-bold text-chrome-deep shadow-soft ring-1 ring-on-chrome/60 transition-transform hover:scale-[1.02] active:scale-95"
          >
            Entrar
          </Link>
        </section>

        <section className="space-y-2">
          <Recurso
            icon={<MessageCircleHeart className="size-6" />}
            titulo="Conversando, sem formulário"
            texto="Diga o nome, a dosagem e de quantas em quantas horas. Pronto."
          />
          <Recurso
            icon={<Pill className="size-6" />}
            titulo="Uso contínuo ou por tempo certo"
            texto="O AICare sabe quando o tratamento termina."
          />
          <Recurso
            icon={<Users className="size-6" />}
            titulo="Uma agenda para cada pessoa"
            texto="Cuidadores acompanham vários pacientes separadamente."
          />
        </section>

        <p className="pb-4 text-center text-base font-medium text-inksoft">
          O AICare organiza horários. Ele não substitui a orientação do seu médico.
        </p>
      </main>
    </div>
  );
}

function Recurso({
  icon,
  titulo,
  texto,
}: {
  icon: React.ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-chrome-tint text-chrome-deep">
        {icon}
      </span>
      <span>
        <span className="block font-display text-xl leading-tight font-semibold">{titulo}</span>
        <span className="block text-base text-inksoft">{texto}</span>
      </span>
    </div>
  );
}
