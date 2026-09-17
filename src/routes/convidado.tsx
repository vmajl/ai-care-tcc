import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, KeyRound, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/convidado")({
  head: () => ({
    meta: [
      { title: "Entrar como convidado — AICare" },
      {
        name: "description",
        content: "Entre no AICare usando o código de convite compartilhado pelo cuidador.",
      },
    ],
  }),
  component: ConvidadoPage,
});

function ConvidadoPage() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [carregando, setCarregando] = useState(false);

  function entrar() {
    const codigoNormalizado = codigo.trim().toUpperCase();

    if (!codigoNormalizado) {
      toast.error("Digite o código de convite.");
      return;
    }

    setCarregando(true);

    // Nesta primeira etapa, apenas montamos a tela e o fluxo visual.
    // A validação real do código será conectada ao backend depois.
    setTimeout(() => {
      setCarregando(false);
      toast.info("O código será validado pelo sistema quando o backend estiver conectado.");
    }, 500);
  }

  return (
    <div className="min-h-screen bg-canvas font-body text-lg text-ink">
      <main className="mx-auto max-w-[460px] space-y-6 px-5 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-base font-bold text-inksoft"
        >
          <ArrowLeft className="size-5" />
          Voltar
        </Link>

        <div className="flex items-center gap-3">
          <span className="chrome grid size-14 place-items-center rounded-2xl shadow-soft ring-1 ring-on-chrome/60">
            <Users className="size-7 text-on-chrome" strokeWidth={2.5} />
          </span>
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-inksoft uppercase">AICare</p>
            <h1 className="font-display text-3xl leading-none font-semibold">Entrar como convidado</h1>
          </div>
        </div>

        <section className="rounded-3xl bg-card p-6 shadow-soft ring-1 ring-border">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-chrome-tint text-chrome-deep">
            <KeyRound className="size-8" />
          </div>

          <h2 className="mt-5 text-center font-display text-3xl font-semibold">
            Digite o código de convite
          </h2>
          <p className="mt-2 text-center text-base text-inksoft">
            O cuidador do idoso deve compartilhar um código para você ter acesso aos registros.
          </p>

          <label className="mt-6 block">
            <span className="mb-2 block text-base font-bold text-inksoft">Código de convite</span>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") entrar();
              }}
              placeholder="Ex.: ABC123"
              maxLength={12}
              autoCapitalize="characters"
              autoComplete="off"
              className="w-full rounded-2xl bg-chrome-tint px-4 py-5 text-center text-2xl font-bold tracking-[0.18em] text-ink uppercase ring-1 ring-input outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <button
            type="button"
            onClick={entrar}
            disabled={carregando}
            className="chrome mt-4 w-full rounded-2xl py-5 font-display text-2xl font-bold text-on-chrome shadow-soft ring-1 ring-on-chrome/50 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-70"
          >
            {carregando ? "Verificando…" : "Entrar"}
          </button>
        </section>

        <section className="rounded-2xl bg-chrome-tint p-4 ring-1 ring-border">
          <p className="text-base font-semibold text-ink">
            Você recebeu um código do cuidador?
          </p>
          <p className="mt-1 text-sm text-inksoft">
            Use esse código para acompanhar atualizações, registros de medicamentos e fotos do idoso.
          </p>
        </section>
      </main>
    </div>
  );
}
