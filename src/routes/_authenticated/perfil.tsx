import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, Copy, KeyRound, LogOut, Plus, Share2, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
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
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [codigoDigitado, setCodigoDigitado] = useState("");

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

  const { data: convidados = [] } = useQuery({
    queryKey: ["convidados", pacienteId],
    enabled: !!pacienteId && souDono,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_members")
        .select("id, user_id, criado_em")
        .eq("patient_id", pacienteId!);
      if (error) throw error;
      return data;
    },
  });

  const { data: codigo } = useQuery({
    queryKey: ["convite", pacienteId],
    enabled: !!pacienteId && souDono,
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc("gerar_codigo_convite", {
        _patient_id: pacienteId!,
      });
      if (error) throw error;
      return data as string;
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
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: texto });
        return;
      } catch {
        /* usuário cancelou */
      }
    }
    await copiar(texto);
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Copiado!");
    } catch {
      toast("Copie o código manualmente.");
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

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <AppShell pacientes={pacientes} pacienteId={pacienteId} onTrocarPaciente={selecionar}>
      <section className="space-y-4">
        <h1 className="font-display text-3xl font-semibold">Pessoas</h1>

        <ul className="space-y-3">
          {pacientes.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => selecionar(p.id)}
                className={
                  p.id === pacienteId
                    ? "chrome flex w-full items-center gap-4 rounded-3xl p-4 text-on-chrome shadow-soft ring-1 ring-on-chrome/50"
                    : "flex w-full items-center gap-4 rounded-3xl bg-card p-4 ring-1 ring-border shadow-soft"
                }
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-chrome-tint">
                  <span className="font-display text-lg font-bold text-chrome-deep">{iniciais(p.nome)}</span>
                </span>
                <span className="text-left">
                  <span className="block font-display text-xl font-semibold">{p.nome}</span>
                  <span className="block text-base font-semibold opacity-80">
                    {p.id === pacienteId ? "Em uso agora" : "Toque para usar"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {paciente && souDono ? (
          <section className="rounded-3xl bg-card p-5 ring-1 ring-border shadow-soft">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Users className="size-5" />
              Convidar a família
            </h2>
            <p className="mt-2 text-base text-inksoft">
              Compartilhe este código com quem também quiser acompanhar os remédios de {paciente.nome}.
            </p>
            <p className="chrome mt-4 rounded-2xl py-4 text-center font-display text-4xl font-bold tracking-[0.3em] text-on-chrome ring-1 ring-on-chrome/50">
              {codigo ?? "······"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button onClick={() => codigo && copiar(codigo)} className="flex items-center justify-center gap-2 rounded-2xl bg-chrome-tint py-4 font-display text-lg font-bold text-chrome-deep ring-1 ring-border active:scale-95">
                <Copy className="size-5" />Copiar
              </button>
              <button onClick={compartilhar} className="flex items-center justify-center gap-2 rounded-2xl bg-mint py-4 font-display text-lg font-bold text-mintink ring-1 ring-mintink/20 active:scale-95">
                <Share2 className="size-5" />Enviar
              </button>
            </div>
            <p className="mt-3 text-base font-semibold text-inksoft">
              {convidados.length === 0 ? "Ninguém entrou com este código ainda." : `${convidados.length} ${convidados.length === 1 ? "pessoa acompanha" : "pessoas acompanham"} ${paciente.nome}.`}
            </p>
          </section>
        ) : null}

        <form onSubmit={(e) => { e.preventDefault(); const limpo = codigoDigitado.trim(); if (limpo) toast.info("O acesso por convite é feito pela opção Entrar como convidado na tela inicial."); }} className="rounded-3xl bg-card p-5 ring-1 ring-border shadow-soft">
          <label htmlFor="codigo-convite" className="flex items-center gap-2 font-display text-lg font-semibold"><KeyRound className="size-5" />Recebi um código de convite</label>
          <input id="codigo-convite" value={codigoDigitado} onChange={(e) => setCodigoDigitado(e.target.value.toUpperCase())} placeholder="Ex.: ABC123" autoCapitalize="characters" className="mt-3 w-full rounded-2xl bg-chrome-tint px-4 py-3 text-center font-display text-2xl font-bold tracking-[0.25em] text-ink ring-1 ring-input outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" className="chrome mt-3 w-full rounded-2xl py-4 font-display text-xl font-bold text-on-chrome ring-1 ring-on-chrome/50 active:scale-95">Entrar como convidado</button>
        </form>

        <form onSubmit={(e) => { e.preventDefault(); const limpo = nome.trim(); if (limpo) adicionar.mutate(limpo); }} className="rounded-3xl bg-card p-5 ring-1 ring-border shadow-soft">
          <label htmlFor="nova-pessoa" className="flex items-center gap-2 font-display text-lg font-semibold"><UserRound className="size-5" />Adicionar pessoa</label>
          <input id="nova-pessoa" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Dona Maria" className="mt-3 w-full rounded-2xl bg-chrome-tint px-4 py-3 text-lg font-semibold text-ink ring-1 ring-input outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" disabled={adicionar.isPending} className="chrome mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-display text-xl font-bold text-on-chrome ring-1 ring-on-chrome/50 active:scale-95 disabled:opacity-70"><Plus className="size-6" />Salvar</button>
        </form>

        <button onClick={ativarAvisos} className="flex w-full items-center gap-3 rounded-3xl bg-mint p-5 text-left ring-1 ring-mintink/20 active:scale-95">
          <Bell className="size-7 shrink-0 text-mintink" />
          <span><span className="block font-display text-xl font-semibold text-mintink">Ativar avisos dos horários</span><span className="block text-base font-semibold text-mintink/80">O aparelho avisa na hora de cada remédio.</span></span>
        </button>

        <button onClick={sair} className="flex w-full items-center justify-center gap-2 rounded-3xl bg-card py-4 font-display text-lg font-bold text-inksoft ring-1 ring-border active:scale-95"><LogOut className="size-5" />Sair da conta</button>
      </section>
    </AppShell>
  );
}
