import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, Copy, LogOut, Plus, Share2, Trash2, UserRound, Users, ShieldCheck, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { usePacienteSelecionado } from "@/hooks/usePaciente";
import { buscarPacientesAcessiveis } from "@/hooks/usePacientesAcessiveis";
import { pedirPermissaoNotificacoes } from "@/hooks/useLembretes";
import { iniciais, type Patient } from "@/lib/capsula";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [
    { title: "Pessoas e acessos — AICare" },
    { name: "description", content: "Gerencie pacientes, administradores, cuidadores e familiares convidados." },
  ] }),
  component: Perfil,
});

function Perfil() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<Patient | null>(null);

  const { data: usuarioId } = useQuery({
    queryKey: ["usuario-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const { data: pacientes = [] } = useQuery({
    queryKey: ["pacientes", "acessiveis"],
    queryFn: buscarPacientesAcessiveis,
  });

  const { pacienteId, selecionar } = usePacienteSelecionado(pacientes.map((p) => p.id));
  const paciente = pacientes.find((p) => p.id === pacienteId);

  const { data: meuAcesso } = useQuery({
    queryKey: ["meu-acesso", pacienteId, usuarioId],
    enabled: !!pacienteId && !!usuarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_members")
        .select("nivel_acesso, relacao")
        .eq("patient_id", pacienteId!)
        .eq("user_id", usuarioId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const souDono = !!paciente && !!usuarioId && paciente.owner_id === usuarioId;
  const souAdmin = souDono || meuAcesso?.nivel_acesso === "administrador_principal" || meuAcesso?.nivel_acesso === "administrador";
  const souPrincipal = souDono || meuAcesso?.nivel_acesso === "administrador_principal";

  const membros = useQuery({
    queryKey: ["membros-paciente", pacienteId],
    enabled: !!pacienteId && !!souAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listar_membros_paciente", { _patient_id: pacienteId! });
      if (error) throw error;
      return data ?? [];
    },
  });

  const codigoFamiliar = useQuery({
    queryKey: ["codigo-convite", pacienteId, "familiar"],
    enabled: !!pacienteId && souAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("gerar_codigo_convite", {
        _patient_id: pacienteId!, _relacao: "familiar", _nivel_acesso: "visualizacao",
      });
      if (error) throw error;
      return String(data);
    },
  });

  const codigoFamiliarAdmin = useQuery({
    queryKey: ["codigo-convite", pacienteId, "familiar-admin"],
    enabled: !!pacienteId && souAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("gerar_codigo_convite", {
        _patient_id: pacienteId!, _relacao: "familiar", _nivel_acesso: "administrador",
      });
      if (error) throw error;
      return String(data);
    },
  });

  const codigoCuidador = useQuery({
    queryKey: ["codigo-convite", pacienteId, "cuidador"],
    enabled: !!pacienteId && souAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("gerar_codigo_convite", {
        _patient_id: pacienteId!, _relacao: "cuidador", _nivel_acesso: "administrador",
      });
      if (error) throw error;
      return String(data);
    },
  });

  const adicionar = useMutation({
    mutationFn: async (novoNome: string) => {
      const { data: sessao } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("patients").insert({ owner_id: sessao.user!.id, nome: novoNome }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (novo) => {
      setNome("");
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      selecionar(novo.id);
      toast.success(`${novo.nome} adicionada.`);
    },
    onError: () => toast.error("Não conseguimos salvar essa pessoa."),
  });

  async function copiar(texto: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
        toast.success("Copiado!");
        return;
      }
      const area = document.createElement("textarea");
      area.value = texto; area.setAttribute("readonly", ""); area.style.position = "fixed"; area.style.opacity = "0";
      document.body.appendChild(area); area.select();
      const copiou = document.execCommand("copy"); area.remove();
      if (!copiou) throw new Error("COPY_FAILED");
      toast.success("Copiado!");
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  }

  async function compartilhar(codigo: string, descricao: string) {
    const texto = `Use o código ${codigo} no AICare para ${descricao} de ${paciente?.nome ?? "este paciente"}.`;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try { await navigator.share({ title: "Convite AICare", text: texto }); return; } catch {}
    }
    await copiar(texto);
  }

  const alterarNivel = useMutation({
    mutationFn: async ({ userId, nivel }: { userId: string; nivel: "administrador" | "visualizacao" }) => {
      const { error } = await supabase.rpc("alterar_nivel_membro", {
        _patient_id: pacienteId!, _user_id: userId, _nivel_acesso: nivel,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membros-paciente", pacienteId] });
      toast.success("Permissão atualizada.");
    },
    onError: (error) => toast.error(error.message),
  });

  const removerMembro = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("remover_membro_paciente", { _patient_id: pacienteId!, _user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membros-paciente", pacienteId] });
      toast.success("Acesso removido.");
    },
    onError: (error) => toast.error(error.message),
  });

  const excluir = useMutation({
    mutationFn: async (pessoa: Patient) => {
      const { data: sessao } = await supabase.auth.getUser();
      if (!sessao.user || pessoa.owner_id !== sessao.user.id) throw new Error("Não autorizado");
      const { error } = await supabase.from("patients").delete().eq("id", pessoa.id).eq("owner_id", sessao.user.id);
      if (error) throw error;
    },
    onSuccess: (_, pessoa) => {
      setConfirmandoExclusao(null);
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      toast.success(pessoa.nome + " foi excluída da sua área.");
    },
    onError: () => toast.error("Não conseguimos excluir essa pessoa."),
  });

  async function ativarAvisos() {
    const resultado = await pedirPermissaoNotificacoes();
    if (resultado === "ativo") toast.success("Avisos ativados neste aparelho.");
    else if (resultado === "abrir-em-nova-aba") toast("Abra o aplicativo em uma aba do navegador para ativar os avisos.");
    else if (resultado === "negado") toast("Os avisos estão bloqueados.");
    else toast("Este navegador não envia avisos.");
  }

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <AppShell pacientes={pacientes} pacienteId={pacienteId} onTrocarPaciente={selecionar}>
      <section className="space-y-4">
        <div>
          <p className="text-sm font-bold text-inksoft">Acompanhamento AICare</p>
          <h1 className="page-heading">Pessoas e acessos</h1>
          <p className="mt-1 text-base text-inksoft">Gerencie quem pode cuidar e quem pode apenas acompanhar.</p>
        </div>

        <ul className="space-y-3">
          {pacientes.map((p) => (
            <li key={p.id} className="flex items-stretch gap-2">
              <button onClick={() => selecionar(p.id)} className={p.id === pacienteId ? "flex min-h-20 min-w-0 flex-1 items-center gap-4 rounded-lg bg-primary p-4 text-primary-foreground ring-1 ring-primary" : "flex min-h-20 min-w-0 flex-1 items-center gap-4 rounded-lg bg-card p-4 ring-1 ring-border hover:bg-chrome-tint"}>
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-chrome-tint"><span className="font-display text-lg font-bold text-chrome-deep">{iniciais(p.nome)}</span></span>
                <span className="min-w-0 text-left"><span className="block truncate font-display text-xl font-semibold">{p.nome}</span><span className="block text-base font-semibold opacity-80">{p.id === pacienteId ? "Em uso agora" : "Toque para usar"}</span></span>
              </button>
              {souDono ? <Button type="button" variant="outline" size="icon" className="self-center shrink-0" aria-label={"Excluir " + p.nome} onClick={() => setConfirmandoExclusao(p)}><Trash2 className="size-5" /></Button> : null}
            </li>
          ))}
        </ul>

        {paciente && souAdmin ? (
          <>
            <section className="surface">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Users className="size-5" />Convidar pessoas</h2>
              <p className="mt-2 text-base text-inksoft">Cada código já define a permissão da pessoa que entrar com ele.</p>
              <Convite titulo="Familiar — somente visualização" codigo={codigoFamiliar.data} carregando={codigoFamiliar.isPending} onCopy={copiar} onShare={() => codigoFamiliar.data && compartilhar(codigoFamiliar.data, "acompanhar somente os registros")} />
              <Convite titulo="Familiar — administrador" codigo={codigoFamiliarAdmin.data} carregando={codigoFamiliarAdmin.isPending} onCopy={copiar} onShare={() => codigoFamiliarAdmin.data && compartilhar(codigoFamiliarAdmin.data, "administrar a rotina de cuidados")} />
              <Convite titulo="Cuidador — administrador" codigo={codigoCuidador.data} carregando={codigoCuidador.isPending} onCopy={copiar} onShare={() => codigoCuidador.data && compartilhar(codigoCuidador.data, "administrar a rotina de cuidados")} />
            </section>

            <section className="surface">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><ShieldCheck className="size-5" />Pessoas com acesso</h2>
              <div className="mt-3 space-y-2">
                {membros.isPending ? <p className="text-base text-inksoft">Carregando…</p> : membros.data?.map((m) => (
                  <div key={m.user_id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-lg font-semibold">{m.nome}</p>
                        <p className="text-sm text-inksoft">{m.relacao === "cuidador" ? "Cuidador" : "Familiar"} · {m.nivel_acesso === "administrador_principal" ? "Administrador principal" : m.nivel_acesso === "administrador" ? "Administrador" : "Somente visualização"}</p>
                      </div>
                      {m.nivel_acesso === "administrador_principal" ? <span className="text-xs font-bold text-primary">PRINCIPAL</span> : null}
                    </div>
                    {souPrincipal && m.user_id !== usuarioId ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.nivel_acesso === "visualizacao" ? <Button size="sm" onClick={() => alterarNivel.mutate({ userId: m.user_id, nivel: "administrador" })}><ShieldCheck className="size-4" />Tornar administrador</Button> : <Button size="sm" variant="secondary" onClick={() => alterarNivel.mutate({ userId: m.user_id, nivel: "visualizacao" })}><Eye className="size-4" />Somente visualização</Button>}
                        <Button size="sm" variant="destructive" onClick={() => removerMembro.mutate(m.user_id)}><Trash2 className="size-4" />Remover</Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {souDono ? (
          <form onSubmit={(e) => { e.preventDefault(); const limpo = nome.trim(); if (limpo) adicionar.mutate(limpo); }} className="surface">
            <label htmlFor="nova-pessoa" className="flex items-center gap-2 font-display text-lg font-semibold"><UserRound className="size-5" />Adicionar pessoa</label>
            <input id="nova-pessoa" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Dona Maria" className="field-control mt-3 text-lg font-semibold" />
            <Button type="submit" disabled={adicionar.isPending} className="mt-3 w-full"><Plus />Salvar pessoa</Button>
          </form>
        ) : null}

        <button onClick={ativarAvisos} className="flex min-h-20 w-full items-center gap-3 rounded-lg bg-success-tint p-5 text-left text-success ring-1 ring-success/20">
          <Bell className="size-7 shrink-0" />
          <span><span className="block section-heading">Ativar avisos dos horários</span><span className="block text-base font-semibold opacity-80">O aparelho avisa no horário de cada medicamento.</span></span>
        </button>

        <Button onClick={sair} variant="outline" className="w-full"><LogOut />Sair da conta</Button>
        {confirmandoExclusao ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-4 sm:items-center"><section role="dialog" aria-modal="true" className="w-full max-w-[460px] rounded-lg bg-card p-5 ring-1 ring-border"><h2 className="section-heading">Excluir pessoa</h2><p className="mt-2 text-sm leading-relaxed text-inksoft">Você está encerrando o acompanhamento de <strong>{confirmandoExclusao.nome}</strong>. Os dados dessa pessoa serão removidos da sua área.</p><div className="mt-5 grid grid-cols-2 gap-3"><Button variant="secondary" onClick={() => setConfirmandoExclusao(null)}>Cancelar</Button><Button variant="destructive" onClick={() => excluir.mutate(confirmandoExclusao)} disabled={excluir.isPending}>{excluir.isPending ? "Excluindo…" : "Excluir pessoa"}</Button></div></section></div> : null}
      </section>
    </AppShell>
  );
}

function Convite({ titulo, codigo, carregando, onCopy, onShare }: { titulo: string; codigo?: string; carregando: boolean; onCopy: (texto: string) => void; onShare: () => void }) {
  return (
    <div className="mt-4 rounded-lg border border-border p-4">
      <p className="font-display text-base font-semibold">{titulo}</p>
      <p className="mt-2 rounded-md bg-chrome-tint py-3 text-center font-display text-2xl font-bold tracking-[0.16em] text-primary">{carregando ? "Gerando…" : codigo ?? "Não foi possível gerar"}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button size="sm" variant="secondary" onClick={() => codigo && onCopy(codigo)}><Copy className="size-4" />Copiar</Button>
        <Button size="sm" onClick={onShare}><Share2 className="size-4" />Enviar</Button>
      </div>
    </div>
  );
}
