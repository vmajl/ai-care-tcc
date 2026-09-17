import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function destinoParaUsuario(user: { user_metadata?: Record<string, unknown> }) {
  return user.user_metadata?.tipo_usuario === "convidado" ? "/convidado" : "/hoje";
}

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [modoConvidado, setModoConvidado] = useState(false);
  const [codigoConvite, setCodigoConvite] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const convidado = params.get("modo") === "convidado";
    const codigo = params.get("codigo")?.toUpperCase() ?? "";
    if (convidado) {
      setModo("criar"); setModoConvidado(true); setCodigoConvite(codigo);
      if (codigo) localStorage.setItem("aicare_codigo_convite", codigo);
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: destinoParaUsuario(data.session.user) as "/hoje" | "/convidado" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: destinoParaUsuario(session.user) as "/hoje" | "/convidado" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setCarregando(true);
    try {
      if (modo === "criar") {
        const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin, data: { nome, tipo_usuario: modoConvidado ? "convidado" : "cuidador", codigo_convite: codigoConvite } } });
        if (error) throw error;
        if (!data.session) setConfirmar(true);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        navigate({ to: destinoParaUsuario(data.user) as "/hoje" | "/convidado" });
      }
    } catch (erro) { toast.error(erro instanceof Error ? traduzir(erro.message) : "Não foi possível continuar."); }
    finally { setCarregando(false); }
  }

  async function entrarComGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error("Não foi possível entrar com o Google."); return; }
    if (result.redirected) return; navigate({ to: "/hoje" });
  }

  return <div className="min-h-screen bg-canvas font-body text-lg text-ink"><main className="mx-auto max-w-[460px] space-y-6 px-5 py-8">
    <Link to="/" className="flex items-center gap-3"><span className="chrome grid size-12 place-items-center rounded-2xl shadow-soft ring-1 ring-on-chrome/60"><Bell className="size-6 text-on-chrome" strokeWidth={2.5} /></span><span className="font-display text-2xl font-semibold">AICare</span></Link>
    {confirmar ? <section className="rounded-3xl bg-card p-6 ring-1 ring-border"><h1 className="font-display text-3xl font-semibold">Confira seu e-mail</h1><p className="mt-3 text-inksoft">Enviamos um link de confirmação para <strong>{email}</strong>. Abra o e-mail e toque no link para entrar.</p></section> : <section className="rounded-3xl bg-card p-6 shadow-soft ring-1 ring-border">
      <h1 className="font-display text-3xl leading-tight font-semibold">{modoConvidado ? "Criar conta de convidado" : modo === "entrar" ? "Entrar" : "Criar minha conta"}</h1>
      {modoConvidado ? <div className="mt-3 rounded-2xl bg-chrome-tint p-4 text-base text-inksoft ring-1 ring-border"><div className="flex items-center gap-2 font-bold text-chrome-deep"><UserPlus className="size-5" />Convite: {codigoConvite || "código recebido"}</div><p className="mt-1">Crie sua conta para acompanhar os registros compartilhados pelo cuidador.</p></div> : null}
      <form onSubmit={enviar} className="mt-5 space-y-4">
        {modo === "criar" ? <Campo label="Seu nome" value={nome} onChange={setNome} type="text" autoComplete="name" required /> : null}
        <Campo label="E-mail" value={email} onChange={setEmail} type="email" autoComplete="email" required />
        <Campo label="Senha" value={senha} onChange={setSenha} type="password" autoComplete={modo === "criar" ? "new-password" : "current-password"} required />
        <button type="submit" disabled={carregando} className="chrome w-full rounded-2xl py-5 font-display text-2xl font-bold text-on-chrome shadow-soft ring-1 ring-on-chrome/50 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-70">{carregando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}</button>
      </form>
      {!modoConvidado ? <><button onClick={entrarComGoogle} className="mt-3 w-full rounded-2xl bg-chrome-tint py-4 font-display text-xl font-bold text-chrome-deep ring-1 ring-border">Entrar com o Google</button><Link to="/convite" className="mt-3 block w-full rounded-2xl bg-chrome-tint py-4 text-center font-display text-xl font-bold text-chrome-deep ring-1 ring-border">Entrar como convidado</Link><button onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")} className="mt-5 w-full text-center text-base font-bold text-inksoft underline">{modo === "entrar" ? "Ainda não tenho conta" : "Já tenho uma conta"}</button></> : null}
    </section>}
  </main></div>;
}

function Campo({ label, value, onChange, type, autoComplete, required }: { label: string; value: string; onChange: (v: string) => void; type: string; autoComplete?: string; required?: boolean }) {
  return <label className="block"><span className="mb-1 block text-base font-bold text-inksoft">{label}</span><input type={type} value={value} required={required} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl bg-chrome-tint px-4 py-4 text-xl font-semibold text-ink ring-1 ring-input outline-none focus:ring-2 focus:ring-ring" /></label>;
}

function traduzir(mensagem: string) {
  if (mensagem.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (mensagem.includes("already registered")) return "Esse e-mail já tem conta. Faça login.";
  if (mensagem.includes("Password should be")) return "A senha precisa de pelo menos 6 caracteres.";
  return mensagem;
}
