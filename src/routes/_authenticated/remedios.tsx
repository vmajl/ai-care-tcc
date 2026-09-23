import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Pill, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { usePacienteSelecionado } from "@/hooks/usePaciente";
import { descricaoFrequencia, type Medication, type Patient } from "@/lib/capsula";

export const Route = createFileRoute("/_authenticated/remedios")({
  head: () => ({
    meta: [
      { title: "Remédios cadastrados — AICare" },
      { name: "description", content: "Veja e organize todos os remédios de cada pessoa, com horários e duração." },
      { property: "og:title", content: "Medicamentos — AICare" },
      { property: "og:description", content: "Veja e organize medicamentos, horários e duração do tratamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Remedios,
});

function Remedios() {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<Medication | null>(null);
  const [nome, setNome] = useState("");
  const [dosagem, setDosagem] = useState("");
  const [horario, setHorario] = useState("08:00");
  const [intervalo, setIntervalo] = useState("24");
  const [instrucoes, setInstrucoes] = useState("");
  const [quantidadeEstoque, setQuantidadeEstoque] = useState("0");
  const [unidadeEstoque, setUnidadeEstoque] = useState("unidade");

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

  const { data: medicamentos = [], isLoading } = useQuery({
    queryKey: ["medicamentos", pacienteId],
    enabled: !!pacienteId,
    queryFn: async (): Promise<Medication[]> => {
      const { data, error } = await supabase.from("medications").select("*").eq("patient_id", pacienteId!).order("primeiro_horario", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("medications").update({ ativo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicamentos"] });
      queryClient.invalidateQueries({ queryKey: ["doses"] });
      toast.success("Medicamento excluído.");
    },
    onError: () => toast.error("Não conseguimos excluir o remédio."),
  });

  const atualizar = useMutation({
    mutationFn: async () => {
      if (!editando) return;
      const { data: sessao } = await supabase.auth.getUser();
      if (!sessao.user) throw new Error("Sessão não encontrada.");

      const quantidade = Number(quantidadeEstoque.replace(",", "."));
      if (!Number.isFinite(quantidade) || quantidade < 0) {
        throw new Error("ESTOQUE_INVALIDO");
      }

      const { error } = await supabase
        .from("medications")
        .update({
          nome: nome.trim(),
          dosagem: dosagem.trim(),
          primeiro_horario: horario,
          intervalo_horas: Number(intervalo),
          instrucoes: instrucoes.trim() || null,
          quantidade_estoque: quantidade,
          unidade_estoque: unidadeEstoque.trim() || "unidade",
        })
        .eq("id", editando.id)
        .eq("owner_id", sessao.user.id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicamentos"] });
      queryClient.invalidateQueries({ queryKey: ["doses"] });
      setEditando(null);
      toast.success("Remédio atualizado.");
    },
    onError: (error) => toast.error(
      error.message === "ESTOQUE_INVALIDO"
        ? "Informe uma quantidade de estoque válida."
        : `Não conseguimos atualizar: ${error.message || "erro desconhecido"}`
    ),
  });

  function abrirEdicao(med: Medication) {
    setEditando(med);
    setNome(med.nome);
    setDosagem(med.dosagem);
    setHorario(med.primeiro_horario?.slice(0, 5) || "08:00");
    setIntervalo(String(med.intervalo_horas || 24));
    setInstrucoes(med.instrucoes || "");
    setQuantidadeEstoque(String(med.quantidade_estoque ?? 0));
    setUnidadeEstoque(med.unidade_estoque || "unidade");
  }

  const ativos = medicamentos.filter((m) => m.ativo);
  const excluídos = medicamentos.filter((m) => !m.ativo);

  return (
    <AppShell pacientes={pacientes} pacienteId={pacienteId} onTrocarPaciente={selecionar}>
      <section className="space-y-4">
        <div>
          <p className="text-sm font-bold text-inksoft">Acompanhamento AICare</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h1 className="page-heading">Medicamentos</h1>
            <span className="text-sm font-bold text-inksoft">{ativos.length} em uso</span>
          </div>
          <p className="mt-2 text-sm text-inksoft">Horários e tratamentos de {pacientes.find((p) => p.id === pacienteId)?.nome ?? "quem você cuida"}.</p>
        </div>

        <Button asChild size="lg" className="w-full"><Link to="/conversar"><MessageCircle />Adicionar medicamento</Link></Button>

        {isLoading ? <p className="text-lg font-bold text-inksoft">Carregando…</p> : ativos.length === 0 ? (
          <div className="surface text-center">
            <Pill className="mx-auto size-10 text-inksoft" />
            <p className="mt-3 section-heading">Nenhum medicamento cadastrado</p>
            <p className="mt-1 text-base font-semibold text-inksoft">Use “Registrar medicamento” para adicionar o primeiro.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg bg-card px-5 ring-1 ring-border">
            {ativos.map((med) => (
              <li key={med.id} className="py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="section-heading">{med.nome}</p>
                    <p className="mt-1 text-base font-semibold text-primary">{med.dosagem}</p>
                    <p className="mt-1 text-sm text-inksoft">{descricaoFrequencia(med)}</p>
                    <p className="mt-1 text-sm text-inksoft">Primeira dose às {med.primeiro_horario?.slice(0, 5)}</p>
                    <p className="mt-2 inline-flex items-baseline gap-1 rounded-md bg-chrome-tint px-2.5 py-1 text-sm font-semibold text-primary">
                      <span>Estoque:</span>
                      <span className="font-display text-base">{Number(med.quantidade_estoque ?? 0).toLocaleString("pt-BR")}</span>
                      <span>{med.unidade_estoque || "unidade"}</span>
                    </p>
                    {med.instrucoes ? <p className="mt-2 border-l-2 border-primary pl-3 text-base font-semibold text-inksoft">{med.instrucoes}</p> : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button onClick={() => abrirEdicao(med)} aria-label={`Editar ${med.nome}`} variant="secondary" size="icon">
                      <Pencil className="size-6" />
                    </Button>
                    <Button onClick={() => remover.mutate(med.id)} aria-label={`Excluir ${med.nome}`} variant="destructive" size="icon">
                      <Trash2 className="size-6" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {excluídos.length > 0 ? (
          <details className="surface">
            <summary className="cursor-pointer font-display text-lg font-semibold">Excluídos ({excluídos.length})</summary>
            <ul className="mt-3 space-y-2">{excluídos.map((med) => <li key={med.id} className="text-base font-semibold text-inksoft">{med.nome} · {med.dosagem}</li>)}</ul>
          </details>
        ) : null}

        {editando ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-4 sm:items-center">
            <section role="dialog" aria-modal="true" aria-labelledby="editar-remedio" className="w-full max-w-[460px] rounded-lg bg-card p-5 ring-1 ring-border">
              <div className="flex items-center justify-between">
                <h2 id="editar-remedio" className="section-heading">Editar medicamento</h2>
                <Button onClick={() => setEditando(null)} aria-label="Fechar" variant="ghost" size="icon"><X /></Button>
              </div>
              <div className="mt-4 space-y-3">
                <Campo label="Nome" value={nome} onChange={setNome} />
                <Campo label="Dosagem" value={dosagem} onChange={setDosagem} />
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Primeiro horário" value={horario} onChange={setHorario} type="time" />
                  <Campo label="Intervalo (horas)" value={intervalo} onChange={setIntervalo} type="number" />
                </div>
                <Campo label="Instruções" value={instrucoes} onChange={setInstrucoes} />
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Quantidade em estoque" value={quantidadeEstoque} onChange={setQuantidadeEstoque} type="number" />
                  <SelectUnidade value={unidadeEstoque} onChange={setUnidadeEstoque} />
                </div>
              </div>
              <Button onClick={() => atualizar.mutate()} disabled={atualizar.isPending || !nome.trim() || !dosagem.trim()} className="mt-4 w-full">
                {atualizar.isPending ? "Salvando…" : "Salvar alterações"}
              </Button>
            </section>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

function Campo({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block"><span className="mb-1 block text-sm font-bold text-inksoft">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="field-control text-lg font-semibold" /></label>;
}

function SelectUnidade({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const unidades = ["comprimidos", "cápsulas", "gotas", "ampolas", "sachês", "unidades", "caixas"];
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-inksoft">Unidade</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field-control text-lg font-semibold">
        {!unidades.includes(value) && value ? <option value={value}>{value}</option> : null}
        {unidades.map((unidade) => <option key={unidade} value={unidade}>{unidade}</option>)}
      </select>
    </label>
  );
}
