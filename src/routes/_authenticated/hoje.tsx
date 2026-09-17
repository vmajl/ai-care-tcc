import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, MessageCircleHeart, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { usePacienteSelecionado } from "@/hooks/usePaciente";
import { useLembretes } from "@/hooks/useLembretes";
import {
  descricaoFrequencia,
  dosesDoDia,
  proximaDose,
  type Dose,
  type DoseLog,
  type Medication,
  type Patient,
} from "@/lib/capsula";

export const Route = createFileRoute("/_authenticated/hoje")({
  head: () => ({
    meta: [
      { title: "Agora — AICare" },
      { name: "description", content: "Veja o próximo remédio e a agenda de hoje." },
      { property: "og:title", content: "Agora — AICare" },
      { property: "og:description", content: "Veja o próximo remédio e a agenda de hoje." },
    ],
  }),
  component: Hoje,
});

function Hoje() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fotoHoje, setFotoHoje] = useState<string | null>(null);

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

  useEffect(() => {
    const foto = localStorage.getItem("aicare_foto_hoje");
    if (foto) setFotoHoje(foto);
  }, []);

  const { data: meds = [] } = useQuery({
    queryKey: ["medicamentos", pacienteId],
    enabled: !!pacienteId,
    queryFn: async (): Promise<Medication[]> => {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("patient_id", pacienteId!)
        .eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);

  const { data: logs = [] } = useQuery({
    queryKey: ["doses", pacienteId, inicioDoDia.toDateString()],
    enabled: !!pacienteId,
    queryFn: async (): Promise<DoseLog[]> => {
      const { data, error } = await supabase
        .from("dose_logs")
        .select("*")
        .eq("patient_id", pacienteId!)
        .gte("horario_previsto", inicioDoDia.toISOString());
      if (error) throw error;
      return data;
    },
  });

  const doses = dosesDoDia(meds, logs);
  const proxima = proximaDose(doses);
  useLembretes(doses, paciente?.nome ?? "");

  const marcar = useMutation({
    mutationFn: async (dose: Dose) => {
      const { data: sessao } = await supabase.auth.getUser();
      const { error } = await supabase.from("dose_logs").insert({
        owner_id: sessao.user!.id,
        medication_id: dose.medication.id,
        patient_id: dose.medication.patient_id,
        horario_previsto: dose.when.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anotado! Dose registrada.");
      queryClient.invalidateQueries({ queryKey: ["doses"] });
    },
    onError: () => toast.error("Não conseguimos registrar. Tente de novo."),
  });

  const desmarcar = useMutation({
    mutationFn: async (dose: Dose) => {
      const { error } = await supabase.from("dose_logs").delete().eq("id", dose.log!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doses"] }),
  });

  function selecionarFoto(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      toast.error("Selecione uma imagem.");
      return;
    }

    const leitor = new FileReader();
    leitor.onload = () => {
      const resultado = String(leitor.result);
      localStorage.setItem("aicare_foto_hoje", resultado);
      setFotoHoje(resultado);
      toast.success("Foto de hoje registrada.");
    };
    leitor.readAsDataURL(arquivo);
  }

  if (pacientes.length === 0) {
    return (
      <AppShell>
        <section className="chrome rounded-3xl p-6 text-on-chrome shadow-soft ring-1 ring-on-chrome/50">
          <h1 className="font-display text-3xl leading-tight font-semibold">Quem vamos cuidar primeiro?</h1>
          <p className="mt-2 font-medium text-on-chrome/90">
            Cadastre você mesmo ou a pessoa que você cuida. Depois é possível adicionar outras.
          </p>
          <button
            onClick={() => navigate({ to: "/perfil" })}
            className="mt-5 w-full rounded-2xl bg-card py-5 font-display text-2xl font-bold text-chrome-deep shadow-soft ring-1 ring-on-chrome/60 active:scale-95"
          >
            Cadastrar pessoa
          </button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell pacientes={pacientes} pacienteId={pacienteId} onTrocarPaciente={selecionar}>
      {proxima ? (
        <section className="chrome rounded-3xl p-6 text-on-chrome shadow-soft ring-1 ring-on-chrome/50">
          <div className="flex items-center justify-between">
            <span className="chrome-deep rounded-full px-3 py-1 text-xs font-bold tracking-wide text-on-chrome uppercase">
              {proxima.status === "atrasado" ? "Está atrasado" : "Próximo agora"}
            </span>
            <span className="font-display text-2xl font-semibold">{proxima.hora}</span>
          </div>
          <p className="mt-4 max-w-[24ch] font-display text-4xl leading-tight font-semibold text-balance">{proxima.medication.nome}</p>
          <p className="mt-1 text-lg font-medium text-on-chrome/90">
            {proxima.medication.dosagem}{proxima.medication.instrucoes ? ` · ${proxima.medication.instrucoes}` : ""}
          </p>
          <button
            onClick={() => marcar.mutate(proxima)}
            disabled={marcar.isPending}
            className="mt-5 w-full rounded-2xl bg-card py-5 font-display text-2xl font-bold text-chrome-deep shadow-soft ring-1 ring-on-chrome/60 transition-transform hover:scale-[1.02] active:scale-95"
          >
            Já tomei
          </button>
        </section>
      ) : (
        <section className="chrome rounded-3xl p-6 text-on-chrome shadow-soft ring-1 ring-on-chrome/50">
          <p className="font-display text-3xl leading-tight font-semibold">
            {meds.length === 0 ? "Nenhum remédio cadastrado" : "Tudo em ordem por hoje"}
          </p>
          <p className="mt-2 font-medium text-on-chrome/90">
            {meds.length === 0 ? "Converse com a assistente para cadastrar o primeiro." : "Todas as doses de hoje já foram tomadas."}
          </p>
        </section>
      )}

      <section className="rounded-3xl bg-card p-5 shadow-soft ring-1 ring-border">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-chrome-tint text-chrome-deep ring-1 ring-border">
            <Camera className="size-6" />
          </span>
          <div>
            <p className="font-display text-xl font-semibold">Foto de hoje</p>
            <p className="text-sm font-semibold text-inksoft">Registre uma foto de {paciente?.nome ?? "quem você cuida"} para a família acompanhar.</p>
          </div>
        </div>

        {fotoHoje ? (
          <img src={fotoHoje} alt="Registro fotográfico de hoje" className="mt-4 h-56 w-full rounded-2xl object-cover" />
        ) : null}

        <label className="chrome mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl py-4 font-display text-xl font-bold text-on-chrome ring-1 ring-on-chrome/50 transition-transform hover:scale-[1.01] active:scale-95">
          <Camera className="size-6" />
          {fotoHoje ? "Trocar foto de hoje" : "Tirar foto de hoje"}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={selecionarFoto} />
        </label>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold text-ink">Agenda de hoje</h2>
        <div className="space-y-2">
          {doses.length === 0 ? (
            <p className="rounded-2xl bg-card p-4 text-inksoft ring-1 ring-border">Ainda não há horários para hoje.</p>
          ) : (
            doses.map((dose) => (
              <button
                key={`${dose.medication.id}-${dose.when.toISOString()}`}
                onClick={() => (dose.log ? desmarcar.mutate(dose) : marcar.mutate(dose))}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left ring-1 ring-border"
              >
                <span className={dose.status === "tomado" ? "grid size-11 shrink-0 place-items-center rounded-xl bg-mint text-mintink" : dose.status === "atrasado" ? "grid size-11 shrink-0 place-items-center rounded-xl bg-amber font-display text-xl font-bold text-amberink" : "grid size-11 shrink-0 place-items-center rounded-xl bg-chrome-tint font-display text-xl font-bold text-chrome-deep"}>
                  {dose.status === "tomado" ? <Check className="anim-check size-6" strokeWidth={3} /> : dose.status === "atrasado" ? "!" : "·"}
                </span>
                <span className="flex-1">
                  <span className="block font-display text-xl leading-none font-semibold">{dose.medication.nome}</span>
                  <span className="block text-base text-inksoft">{dose.medication.dosagem} · {dose.hora}</span>
                </span>
                <span className={dose.status === "tomado" ? "shrink-0 text-base font-bold text-mintink" : dose.status === "atrasado" ? "shrink-0 text-base font-bold text-coralink" : "shrink-0 text-base font-bold text-inksoft"}>
                  {dose.status === "tomado" ? "Tomado" : dose.status === "atrasado" ? "Atrasado" : "Aguardando"}
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-card p-5 ring-1 ring-border shadow-soft">
        <div className="flex items-center gap-3">
          <span className="chrome grid size-11 shrink-0 place-items-center rounded-full ring-1 ring-on-chrome/60">
            <MessageCircleHeart className="size-6 text-on-chrome" />
          </span>
          <p className="font-display text-lg font-semibold">Assistente de doses</p>
        </div>
        <p className="mt-3 text-inksoft">Diga o nome do remédio, a dosagem e de quantas em quantas horas. A assistente monta a ficha para você confirmar.</p>
        <Link to="/conversar" className="chrome mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-display text-xl font-bold text-on-chrome ring-1 ring-on-chrome/50 transition-transform hover:scale-[1.02] active:scale-95">
          <Plus className="size-6" strokeWidth={3} />
          Adicionar remédio
        </Link>
      </section>

      {meds.length > 0 ? (
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">Tratamentos ativos</h2>
          <div className="space-y-2">
            {meds.map((med) => (
              <div key={med.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                <p className="font-display text-xl leading-none font-semibold">{med.nome}</p>
                <p className="text-base text-inksoft">{med.dosagem} · {descricaoFrequencia(med)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
