import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Pill, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { usePacienteSelecionado } from "@/hooks/usePaciente";
import { descricaoFrequencia, type Medication, type Patient } from "@/lib/capsula";

export const Route = createFileRoute("/_authenticated/remedios")({
  head: () => ({
    meta: [
      { title: "Remédios cadastrados — Cápsula" },
      {
        name: "description",
        content: "Veja e organize todos os remédios de cada pessoa, com horários e duração.",
      },
      { property: "og:title", content: "Remédios cadastrados — Cápsula" },
      {
        property: "og:description",
        content: "Veja e organize todos os remédios de cada pessoa, com horários e duração.",
      },
    ],
  }),
  component: Remedios,
});

function Remedios() {
  const queryClient = useQueryClient();

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

  const { data: medicamentos = [], isLoading } = useQuery({
    queryKey: ["medicamentos", pacienteId],
    enabled: !!pacienteId,
    queryFn: async (): Promise<Medication[]> => {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("patient_id", pacienteId!)
        .order("primeiro_horario", { ascending: true });
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
      toast.success("Remédio arquivado.");
    },
    onError: () => toast.error("Não conseguimos arquivar o remédio."),
  });

  const ativos = medicamentos.filter((m) => m.ativo);
  const arquivados = medicamentos.filter((m) => !m.ativo);

  return (
    <AppShell pacientes={pacientes} pacienteId={pacienteId} onTrocarPaciente={selecionar}>
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold">Remédios</h1>
          <span className="text-base font-bold text-inksoft">{ativos.length} em uso</span>
        </div>

        <Link
          to="/conversar"
          className="chrome flex items-center gap-3 rounded-3xl px-5 py-4 text-on-chrome shadow-soft ring-1 ring-on-chrome/50 transition-transform hover:scale-[1.01] active:scale-95"
        >
          <MessageCircle className="size-7 shrink-0" />
          <span className="font-display text-xl font-semibold">Adicionar conversando</span>
        </Link>

        {isLoading ? (
          <p className="text-lg font-bold text-inksoft">Carregando…</p>
        ) : ativos.length === 0 ? (
          <div className="rounded-3xl bg-card p-6 text-center ring-1 ring-border shadow-soft">
            <Pill className="mx-auto size-10 text-inksoft" />
            <p className="mt-3 font-display text-xl font-semibold">Nenhum remédio ainda</p>
            <p className="mt-1 text-base font-semibold text-inksoft">
              Toque em “Adicionar conversando” e conte o nome do remédio.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {ativos.map((med) => (
              <li
                key={med.id}
                className="rounded-3xl bg-card p-5 ring-1 ring-border shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl leading-tight font-semibold">{med.nome}</p>
                    <p className="mt-1 text-lg font-bold text-chrome-deep">{med.dosagem}</p>
                    <p className="mt-1 text-base font-semibold text-inksoft">
                      {descricaoFrequencia(med)}
                    </p>
                    <p className="mt-1 text-base font-semibold text-inksoft">
                      1ª dose às {med.primeiro_horario?.slice(0, 5)}
                    </p>
                    {med.instrucoes ? (
                      <p className="mt-2 rounded-xl bg-chrome-tint px-3 py-2 text-base font-semibold">
                        {med.instrucoes}
                      </p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => remover.mutate(med.id)}
                    aria-label={`Arquivar ${med.nome}`}
                    className="grid size-12 shrink-0 place-items-center rounded-2xl bg-coral text-coralink ring-1 ring-coralink/20 active:scale-95"
                  >
                    <Trash2 className="size-6" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {arquivados.length > 0 ? (
          <details className="rounded-3xl bg-card p-5 ring-1 ring-border">
            <summary className="cursor-pointer font-display text-lg font-semibold">
              Arquivados ({arquivados.length})
            </summary>
            <ul className="mt-3 space-y-2">
              {arquivados.map((med) => (
                <li key={med.id} className="text-base font-semibold text-inksoft">
                  {med.nome} · {med.dosagem}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>
    </AppShell>
  );
}
