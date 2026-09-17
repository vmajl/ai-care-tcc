import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, KeyRound, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/convite")({ component: ConvitePage });

function ConvitePage() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");

  function continuar() {
    const normalizado = codigo.trim().toUpperCase();
    if (!normalizado) {
      toast.error("Digite o código de convite.");
      return;
    }
    localStorage.setItem("aicare_codigo_convite", normalizado);
    navigate({ to: "/auth", search: undefined });
    window.history.replaceState(null, "", `/auth?modo=convidado&codigo=${encodeURIComponent(normalizado)}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return (
    <div className="min-h-screen bg-canvas font-body text-lg text-ink">
      <main className="mx-auto max-w-[460px] space-y-6 px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-base font-bold text-inksoft"><ArrowLeft className="size-5" />Voltar</Link>
        <section className="rounded-3xl bg-card p-6 shadow-soft ring-1 ring-border">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-chrome-tint text-chrome-deep"><KeyRound className="size-8" /></div>
          <h1 className="mt-5 text-center font-display text-3xl font-semibold">Entrar como convidado</h1>
          <p className="mt-2 text-center text-base text-inksoft">Digite o código compartilhado pelo cuidador para acompanhar o idoso.</p>
          <label className="mt-6 block">
            <span className="mb-2 block text-base font-bold text-inksoft">Código de convite</span>
            <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && continuar()} placeholder="Ex.: ABC123" maxLength={12} autoComplete="off" className="w-full rounded-2xl bg-chrome-tint px-4 py-5 text-center text-2xl font-bold tracking-[0.18em] text-ink uppercase ring-1 ring-input outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <button onClick={continuar} className="chrome mt-4 w-full rounded-2xl py-5 font-display text-2xl font-bold text-on-chrome shadow-soft ring-1 ring-on-chrome/50 transition-transform hover:scale-[1.02] active:scale-95">Continuar</button>
        </section>
        <section className="flex items-start gap-3 rounded-2xl bg-chrome-tint p-4 ring-1 ring-border"><Users className="mt-0.5 size-6 shrink-0 text-chrome-deep" /><p className="text-sm text-inksoft">Depois do código, você criará sua própria conta com nome, e-mail e senha.</p></section>
      </main>
    </div>
  );
}
