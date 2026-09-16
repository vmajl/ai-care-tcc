import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, LogOut, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { usePacienteSelecionado } from "@/hooks/usePaciente";
import { pedirPermissaoNotificacoes } from "@/hooks/useLembretes";
import { iniciais, type Patient } from "@/lib/capsula";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Pessoas e lembretes — AICare" },
      {
        name: "description",
        content: "Cadastre as pessoas cuidadas e ative os avisos dos horários dos remédios.",
      },
      { property: "og:title", content: "Pessoas e lembretes — AICare" },
      {
        property: "og:description",
        content: "Cadastre as pessoas cuidadas e ative os avisos dos horários dos remédios.",
      },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");

  const { data: pacientes = [] } = useQuery({
    queryKey: ["pacientes"],
    queryFn: async (): Promise<Patient[]> => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
  const { pacienteId, selecionar } = usePacienteSelecionado(pacientes.map((p) => p.id));

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
                  <span className="font-display text-lg font-bold text-chrome-deep">
                    {iniciais(p.nome)}
                  </span>
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const limpo = nome.trim();
            if (limpo) adicionar.mutate(limpo);
          }}
          className="rounded-3xl bg-card p-5 ring-1 ring-border shadow-soft"
        >
          <label
            htmlFor="nova-pessoa"
            className="flex items-center gap-2 font-display text-lg font-semibold"
          >
            <UserRound className="size-5" />
            Adicionar pessoa
          </label>
          <input
            id="nova-pessoa"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Dona Maria"
            className="mt-3 w-full rounded-2xl bg-chrome-tint px-4 py-3 text-lg font-semibold text-ink ring-1 ring-input outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={adicionar.isPending}
            className="chrome mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-display text-xl font-bold text-on-chrome ring-1 ring-on-chrome/50 active:scale-95 disabled:opacity-70"
          >
            <Plus className="size-6" />
            Salvar
          </button>
        </form>

        <button
          onClick={ativarAvisos}
          className="flex w-full items-center gap-3 rounded-3xl bg-mint p-5 text-left ring-1 ring-mintink/20 active:scale-95"
        >
          <Bell className="size-7 shrink-0 text-mintink" />
          <span>
            <span className="block font-display text-xl font-semibold text-mintink">
              Ativar avisos dos horários
            </span>
            <span className="block text-base font-semibold text-mintink/80">
              O aparelho avisa na hora de cada remédio.
            </span>
          </span>
        </button>

        <button
          onClick={sair}
          className="flex w-full items-center justify-center gap-2 rounded-3xl bg-card py-4 font-display text-lg font-bold text-inksoft ring-1 ring-border active:scale-95"
        >
          <LogOut className="size-5" />
          Sair da conta
        </button>
      </section>
    </AppShell>
  );
}
