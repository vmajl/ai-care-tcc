import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({ component: AuthPage });

type AuthUser = {
  id: string;
  user_metadata?: Record<string, unknown>;
};

function AuthPage() {
  const navigate = useNavigate();
  const processandoSessao = useRef(false);
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [modoConvidado, setModoConvidado] = useState(false);
  const [codigoConvite, setCodigoConvite] = useState("");

  async function finalizarEntrada(user: AuthUser) {
    if (processandoSessao.current) return;
    processandoSessao.current = true;

    try {
      const codigo = localStorage.getItem("aicare_codigo_convite");

      if (codigo) {
        const { data: patientId, error: conviteError } = await supabase.rpc("entrar_com_codigo", {
          _code: codigo,
        });

        if (conviteError || !patientId) {
          localStorage.removeItem("aicare_codigo_convite");
          processandoSessao.current = false;
          toast.error(conviteError?.message || "O código de convite é inválido ou expirou.");
          return;
        }

        localStorage.setItem("aicare_paciente_convidado", patientId);
        localStorage.removeItem("aicare_codigo_convite");

        const { data: membro, error: membroError } = await supabase
          .from("patient_members")
          .select("nivel_acesso")
          .eq("patient_id", patientId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (membroError) {
          processandoSessao.current = false;
          toast.error("Não conseguimos confirmar o acesso à paciente.");
          return;
        }

        navigate({ to: membro?.nivel_acesso === "visualizacao" ? "/convidado" : "/hoje" });
        return;
      }

      navigate({
        to: user.user_metadata?.["tipo_usuario"] === "convidado" ? "/convidado" : "/hoje",
      });
    } catch (erro) {
      processandoSessao.current = false;
      toast.error(
        erro instanceof Error ? traduzir(erro.message) : "Não foi possível concluir o login.",
      );
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const convidado = params.get("modo") === "convidado";
    const codigo = params.get("codigo")?.trim().toUpperCase() ?? "";

    if (convidado) {
      setModo("criar");
      setModoConvidado(true);
      setCodigoConvite(codigo);
      if (codigo) localStorage.setItem("aicare_codigo_convite", codigo);
    }

    let cancelado = false;

    async function verificarSessao() {
      const { data } = await supabase.auth.getSession();
      if (!cancelado && data.session) {
        await finalizarEntrada(data.session.user);
      }
    }

    void verificarSessao();

    return () => {
      cancelado = true;
    };
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);

    try {
      if (modo === "criar") {
        const codigoPendente =
          codigoConvite || localStorage.getItem("aicare_codigo_convite") || "";

        if (modoConvidado && !codigoPendente) {
          throw new Error("O código de convite não foi encontrado.");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: modoConvidado
              ? `${window.location.origin}/auth?modo=convidado&codigo=${encodeURIComponent(codigoPendente)}`
              : `${window.location.origin}/auth`,
            data: {
              nome,
              tipo_usuario: modoConvidado ? "convidado" : "cuidador",
              ...(codigoPendente ? { codigo_convite: codigoPendente } : {}),
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          await finalizarEntrada(data.user);
        } else {
          setConfirmar(true);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });

        if (error) throw error;
        await finalizarEntrada(data.user);
      }
    } catch (erro) {
      toast.error(erro instanceof Error ? traduzir(erro.message) : "Não foi possível continuar.");
    } finally {
      setCarregando(false);
    }
  }

  async function entrarComGoogle() {
    setCarregando(true);

    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });

      if (result.error) {
        toast.error("Não foi possível entrar com o Google.");
        return;
      }

      if (result.redirected) return;

      const { data } = await supabase.auth.getSession();
      if (data.session) await finalizarEntrada(data.session.user);
    } catch (erro) {
      toast.error(
        erro instanceof Error ? traduzir(erro.message) : "Não foi possível entrar com o Google.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas font-body text-ink">
      <main className="mx-auto max-w-[460px] space-y-6 px-5 py-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-chrome-tint text-chrome-deep ring-1 ring-border">
            <Bell className="size-6" strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase text-inksoft">Acompanhamento AICare</p>
            <span className="font-display text-2xl font-semibold leading-none">AICare</span>
          </div>
        </Link>

        {confirmar ? (
          <section className="rounded-2xl bg-card p-6 ring-1 ring-border">
            <h1 className="font-display text-2xl font-semibold">Confira seu e-mail</h1>
            <p className="mt-3 text-base text-inksoft">
              Enviamos um link de confirmação para <strong>{email}</strong>. Abra o e-mail e toque no link para entrar.
            </p>
          </section>
        ) : (
          <section className="rounded-2xl bg-card p-6 ring-1 ring-border">
            <h1 className="font-display text-2xl font-semibold">
              {modoConvidado ? "Criar conta de convidado" : modo === "entrar" ? "Entrar" : "Criar minha conta"}
            </h1>

            {modoConvidado ? (
              <div className="mt-4 rounded-xl bg-chrome-tint p-4 text-sm text-inksoft ring-1 ring-border">
                <div className="flex items-center gap-2 font-semibold text-chrome-deep">
                  <UserPlus className="size-5" />
                  Convite: {codigoConvite || "código recebido"}
                </div>
                <p className="mt-1">Crie sua conta para acompanhar os registros compartilhados pelo cuidador.</p>
              </div>
            ) : null}

            <form onSubmit={enviar} className="mt-5 space-y-4">
              {modo === "criar" ? (
                <Campo label="Seu nome" value={nome} onChange={setNome} type="text" autoComplete="name" required />
              ) : null}
              <Campo label="E-mail" value={email} onChange={setEmail} type="email" autoComplete="email" required />
              <Campo
                label="Senha"
                value={senha}
                onChange={setSenha}
                type="password"
                autoComplete={modo === "criar" ? "new-password" : "current-password"}
                required
              />
              <button
                type="submit"
                disabled={carregando}
                className="w-full rounded-xl bg-chrome-deep py-4 font-display text-lg font-bold text-on-chrome ring-1 ring-on-chrome/30 transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {carregando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
              </button>
            </form>

            {!modoConvidado ? (
              <>
                <button
                  type="button"
                  onClick={entrarComGoogle}
                  disabled={carregando}
                  className="mt-3 w-full rounded-xl bg-card py-3 text-base font-semibold text-chrome-deep ring-1 ring-border hover:bg-chrome-tint disabled:opacity-60"
                >
                  Entrar com o Google
                </button>
                <Link
                  to="/convite"
                  className="mt-2 block w-full rounded-xl bg-card py-3 text-center text-base font-semibold text-chrome-deep ring-1 ring-border hover:bg-chrome-tint"
                >
                  Entrar como convidado
                </Link>
                <button
                  type="button"
                  onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
                  className="mt-5 w-full text-center text-sm font-semibold text-inksoft underline"
                >
                  {modo === "entrar" ? "Ainda não tenho conta" : "Já tenho uma conta"}
                </button>
              </>
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  type,
  autoComplete,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-base font-bold text-inksoft">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-card px-4 py-3 text-base font-medium text-ink ring-1 ring-input outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function traduzir(mensagem: string) {
  if (mensagem.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (mensagem.includes("already registered")) return "Esse e-mail já tem conta. Faça login.";
  if (mensagem.includes("Password should be")) return "A senha precisa de pelo menos 6 caracteres.";
  return mensagem;
}
