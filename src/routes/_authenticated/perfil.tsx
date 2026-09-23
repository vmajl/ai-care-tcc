import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, Copy, LogOut, Plus, Share2, Trash2, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { usePacienteSelecionado } from "@/hooks/usePaciente";
import { pedirPermissaoNotificacoes } from "@/hooks/useLembretes";
import { iniciais, type Patient } from "@/lib/capsula";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Pessoas e convites — AICare" },
      {
        name: "description",
        content:
          "Cadastre as pessoas cuidadas, compartilhe o código de convite com a família e ative os avisos dos horários.",
      },
      { property: "og:title", content: "Pessoas e convites — AICare" },
      {
        property: "og:description",
        content:
          "Cadastre as pessoas cuidadas, compartilhe o código de convite com a família e ative os avisos dos horários.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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
    queryKey: ["pacientes", "cuidador"],
    queryFn: async (): Promise<Patient[]> => {
      const { data: sessao } = await supabase.auth.getUser();
      if (!sessao.user) return [];
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("owner_id", sessao.user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
  const { pacienteId, selecionar } = usePacienteSelecionado(pacientes.map((p) => p.id));
  const paciente = pacientes.find((p) => p.id === pacienteId);
  const souDono = !!paciente && !!usuarioId && paciente.owner_id === usuarioId;

  const {
    data: codigo,
    error: erroCodigo,
    isPending: carregandoCodigo,
  } = useQuery({
    queryKey: ["codigo-convite", pacienteId],
    enabled: !!pacienteId && souDono,
    retry: false,
    queryFn: async () => {
      // Primeiro procura o código já existente. Isso evita gerar um novo
      // código toda vez que a tela for aberta ou atualizada.
      const { data: existente, error: buscaError } = await supabase
        .from("patient_invites")
        .select("code")
        .eq("patient_id", pacienteId!)
        .eq("owner_id", usuarioId!)
        .eq("ativo", true)
        .order("criado_em", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (buscaError) throw buscaError;
      if (existente?.code) return existente.code;

      // Só gera um código quando este paciente ainda não possui um.
      const { data: novoCodigo, error: gerarError } = await supabase.rpc(
        "gerar_codigo_convite",
        { _patient_id: pacienteId! },
      );

      if (gerarError) throw gerarError;
      if (!novoCodigo) throw new Error("A função não retornou um código.");
      return String(novoCodigo);
    },
  });

  const adicionar = useMutation({
    mutationFn: async (novoNome: string) => {
      const { data: sessao } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("patients")
        .insert({ owner_id: sessao.user!.id, nome: novoNome })
        .select()
        .single();
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

  async function compartilhar() {
    if (!codigo || !paciente) return;
    const texto = `Use o código ${codigo} no aplicativo AICare para acompanhar os remédios de ${paciente.nome}.`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Convite AICare", text: texto });
        return;
      } catch {
        // Se o compartilhamento for cancelado ou indisponível, usa a cópia como fallback.
      }
    }

    await copiar(texto);
  }

  async function copiar(texto: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
        toast.success("Copiado!");
        return;
      }

      const area = document.createElement("textarea");
      area.value = texto;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const copiou = document.execCommand("copy");
      area.remove();

      if (!copiou) throw new Error("COPY_FAILED");
      toast.success("Copiado!");
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione e copie o código manualmente.");
    }
  }

  async function ativarAvisos() {
    const resultado = await pedirPermissaoNotificacoes();
    if (resultado === "ativo") toast.success("Avisos ativados neste aparelho.");
    else if (resultado === "abrir-em-nova-aba")
      toast("Abra o aplicativo em uma aba do navegador para ativar os avisos.");
    else if (resultado === "negado")
      toast("Os avisos estão bloqueados. Libere as notificações nas configurações do navegador.");
    else toast("Este navegador não envia avisos.");
  }

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

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <AppShell pacientes={pacientes} pacienteId={pacienteId} onTrocarPaciente={selecionar}>
      <section className="space-y-4">
        <div><p className="text-sm font-bold text-inksoft">Acompanhamento AICare</p><h1 className="page-heading">Pessoas</h1><p className="mt-1 text-base text-inksoft">Selecione quem está recebendo os cuidados.</p></div>

        <ul className="space-y-3">
          {pacientes.map((p) => (
            <li key={p.id} className="flex items-stretch gap-2">
              <button onClick={() => selecionar(p.id)} className={p.id === pacienteId ? "flex min-h-20 min-w-0 flex-1 items-center gap-4 rounded-lg bg-primary p-4 text-primary-foreground ring-1 ring-primary" : "flex min-h-20 min-w-0 flex-1 items-center gap-4 rounded-lg bg-card p-4 ring-1 ring-border transition-colors hover:bg-chrome-tint"}>
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-chrome-tint"><span className="font-display text-lg font-bold text-chrome-deep">{iniciais(p.nome)}</span></span>
                <span className="min-w-0 text-left"><span className="block truncate font-display text-xl font-semibold">{p.nome}</span><span className="block text-base font-semibold opacity-80">{p.id === pacienteId ? "Em uso agora" : "Toque para usar"}</span></span>
              </button>
              <Button type="button" variant="outline" size="icon" className="self-center shrink-0" aria-label={"Excluir " + p.nome} onClick={() => setConfirmandoExclusao(p)}><Trash2 className="size-5" /></Button>
            </li>
          ))}
        </ul>

        {paciente && souDono ? (
          <section className="surface">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Users className="size-5" />
              Acompanhamento familiar
            </h2>
            <p className="mt-2 text-base text-inksoft">
              Compartilhe o código com familiares autorizados a acompanhar os registros de {paciente.nome}.
            </p>
            <p className="mt-4 rounded-lg bg-chrome-tint py-4 text-center font-display text-3xl font-bold tracking-[0.22em] text-primary ring-1 ring-border sm:text-4xl">
              {carregandoCodigo ? "Gerando…" : codigo ?? "Não foi possível gerar"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button onClick={() => codigo && copiar(codigo)} variant="secondary">
                <Copy className="size-5" />Copiar
              </Button>
              <Button onClick={compartilhar}>
                <Share2 className="size-5" />Enviar
              </Button>
            </div>
            {erroCodigo ? (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
                Não foi possível gerar o código: {erroCodigo.message}
              </p>
            ) : (
              <p className="mt-3 text-base font-semibold text-inksoft">
                O código fica vinculado a {paciente.nome} e pode ser validado pela família na tela de convidado.
              </p>
            )}
          </section>
        ) : null}

        <form onSubmit={(e) => { e.preventDefault(); const limpo = nome.trim(); if (limpo) adicionar.mutate(limpo); }} className="surface">
          <label htmlFor="nova-pessoa" className="flex items-center gap-2 font-display text-lg font-semibold"><UserRound className="size-5" />Adicionar pessoa</label>
          <input id="nova-pessoa" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Dona Maria" className="field-control mt-3 text-lg font-semibold" />
          <Button type="submit" disabled={adicionar.isPending} className="mt-3 w-full"><Plus />Salvar pessoa</Button>
        </form>

        <button onClick={ativarAvisos} className="flex min-h-20 w-full items-center gap-3 rounded-lg bg-success-tint p-5 text-left text-success ring-1 ring-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Bell className="size-7 shrink-0" />
          <span><span className="block section-heading">Ativar avisos dos horários</span><span className="block text-base font-semibold opacity-80">O aparelho avisa no horário de cada medicamento.</span></span>
        </button>

        <Button onClick={sair} variant="outline" className="w-full"><LogOut />Sair da conta</Button>
        {confirmandoExclusao ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-4 sm:items-center"><section role="dialog" aria-modal="true" className="w-full max-w-[460px] rounded-lg bg-card p-5 ring-1 ring-border"><h2 className="section-heading">Excluir pessoa</h2><p className="mt-2 text-sm leading-relaxed text-inksoft">Você está encerrando o acompanhamento de <strong>{confirmandoExclusao.nome}</strong>. Os dados dessa pessoa serão removidos da sua área de cuidador.</p><p className="mt-2 text-sm font-semibold text-inksoft">Essa ação não poderá ser desfeita.</p><div className="mt-5 grid grid-cols-2 gap-3"><Button variant="secondary" onClick={() => setConfirmandoExclusao(null)}>Cancelar</Button><Button variant="destructive" onClick={() => excluir.mutate(confirmandoExclusao)} disabled={excluir.isPending}>{excluir.isPending ? "Excluindo…" : "Excluir pessoa"}</Button></div></section></div> : null}
      </section>
    </AppShell>
  );
}
