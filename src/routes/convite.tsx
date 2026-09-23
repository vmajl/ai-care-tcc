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
    if (!normalizado) { toast.error("Digite o código de convite."); return; }
    localStorage.setItem("aicare_codigo_convite", normalizado);
    navigate({ to: "/auth" });
    window.history.replaceState(null, "", `/auth?modo=convidado&codigo=${encodeURIComponent(normalizado)}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return <div className="min-h-screen bg-canvas font-body text-ink"><main className="mx-auto max-w-[460px] space-y-6 px-5 py-8">
    <Link to="/" className="inline-flex items-center gap-2 text-base font-bold text-inksoft"><ArrowLeft className="size-5" />Voltar</Link>
    <section className="rounded-2xl bg-card p-6 ring-1 ring-border"><div className="flex items-center gap-3 border-b border-border pb-4"><span className="grid size-10 place-items-center rounded-lg bg-chrome-tint text-chrome-deep"><KeyRound className="size-5" /></span><div><p className="text-xs font-semibold uppercase text-inksoft">Acompanhamento AICare</p><h1 className="font-display text-2xl font-semibold">Entrar como convidado</h1></div></div><p className="mt-5 text-base text-inksoft">Digite o código compartilhado pelo cuidador para acompanhar os registros.</p><label className="mt-5 block"><span className="mb-2 block text-sm font-semibold text-inksoft">Código de convite</span><input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && continuar()} placeholder="Digite o código" maxLength={12} autoComplete="off" className="w-full rounded-xl bg-card px-4 py-3 text-base font-medium tracking-[0.08em] text-ink uppercase ring-1 ring-input outline-none focus:ring-2 focus:ring-ring" /></label><button onClick={continuar} className="mt-4 w-full rounded-xl bg-chrome-deep py-4 font-display text-lg font-bold text-on-chrome ring-1 ring-on-chrome/30 transition-opacity hover:opacity-90">Continuar</button></section>
    <section className="flex items-start gap-3 rounded-xl bg-chrome-tint p-4 ring-1 ring-border"><Users className="mt-0.5 size-6 shrink-0 text-chrome-deep" /><p className="text-sm text-inksoft">Depois do código, você criará sua própria conta com nome, e-mail e senha.</p></section>
  </main></div>;
}
