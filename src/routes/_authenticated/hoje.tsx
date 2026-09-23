import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, MessageCircleHeart, Pill, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { usePacienteSelecionado } from "@/hooks/usePaciente";
import { useLembretes } from "@/hooks/useLembretes";
import { descricaoFrequencia, dosesDoDia, proximaDose, type Dose, type DoseLog, type Medication, type Patient } from "@/lib/capsula";

export const Route = createFileRoute("/_authenticated/hoje")({
  head: () => ({ meta: [
    { title: "Acompanhamento de hoje — AICare" },
    { name: "description", content: "Consulte as próximas doses e os registros de cuidado do dia." },
    { property: "og:title", content: "Acompanhamento de hoje — AICare" },
    { property: "og:description", content: "Consulte as próximas doses e os registros de cuidado do dia." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
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
      const { data, error } = await supabase.from("patients").select("*").eq("owner_id", sessao.user.id).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { pacienteId, selecionar } = usePacienteSelecionado(pacientes.map((p) => p.id));
  const paciente = pacientes.find((p) => p.id === pacienteId);
  const fotoKey = pacienteId ? `aicare_foto_hoje_${pacienteId}` : null;

  useEffect(() => {
    // Remove the old global key so a photo from another login can never leak into this account.
    localStorage.removeItem("aicare_foto_hoje");
    setFotoHoje(fotoKey ? localStorage.getItem(fotoKey) : null);
  }, [fotoKey]);

  const { data: meds = [] } = useQuery({
    queryKey: ["medicamentos", pacienteId], enabled: !!pacienteId,
    queryFn: async (): Promise<Medication[]> => {
      const { data, error } = await supabase.from("medications").select("*").eq("patient_id", pacienteId!).eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const inicioDoDia = new Date(); inicioDoDia.setHours(0, 0, 0, 0);
  const { data: logs = [] } = useQuery({
    queryKey: ["doses", pacienteId, inicioDoDia.toDateString()], enabled: !!pacienteId,
    queryFn: async (): Promise<DoseLog[]> => {
      const { data, error } = await supabase.from("dose_logs").select("*").eq("patient_id", pacienteId!).gte("horario_previsto", inicioDoDia.toISOString());
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
      if (!sessao.user) throw new Error("Sessão não encontrada.");

      const quantidadePorDose = obterQuantidadePorDose(dose.medication.dosagem);

      // Sempre busca o estoque mais recente no banco. O valor da tela pode estar desatualizado.
      const { data: medicamentoAtual, error: medicamentoError } = await supabase
        .from("medications")
        .select("id, owner_id, quantidade_estoque")
        .eq("id", dose.medication.id)
        .eq("owner_id", sessao.user.id)
        .single();

      if (medicamentoError || !medicamentoAtual) {
        throw medicamentoError ?? new Error("MEDICAMENTO_NAO_ENCONTRADO");
      }

      const estoqueAtual = Number(medicamentoAtual.quantidade_estoque ?? 0);

      if (estoqueAtual < quantidadePorDose) {
        throw new Error("ESTOQUE_INSUFICIENTE");
      }

      const { error: logError } = await supabase.from("dose_logs").insert({
        owner_id: sessao.user.id,
        medication_id: dose.medication.id,
        patient_id: dose.medication.patient_id,
        horario_previsto: dose.when.toISOString(),
      });
      if (logError) throw logError;

      // Só atualiza a linha se o estoque ainda tiver o mesmo valor que acabamos de ler.
      const novoEstoque = estoqueAtual - quantidadePorDose;
      const { data: medicamentoAtualizado, error: estoqueError } = await supabase
        .from("medications")
        .update({ quantidade_estoque: novoEstoque })
        .eq("id", dose.medication.id)
        .eq("owner_id", sessao.user.id)
        .eq("quantidade_estoque", estoqueAtual)
        .select("id, quantidade_estoque")
        .single();

      if (estoqueError || !medicamentoAtualizado) {
        await supabase.from("dose_logs").delete().eq("medication_id", dose.medication.id).eq("horario_previsto", dose.when.toISOString());
        throw estoqueError ?? new Error("ESTOQUE_ALTERADO");
      }
    },
    onSuccess: () => {
      toast.success("Anotado! Dose registrada e estoque atualizado.");
      queryClient.invalidateQueries({ queryKey: ["doses"] });
      queryClient.invalidateQueries({ queryKey: ["medicamentos"] });
    },
    onError: (error) => {
      toast.error(error.message === "ESTOQUE_INSUFICIENTE" ? "O estoque não é suficiente para registrar essa dose." : "Não conseguimos registrar. Tente de novo.");
    },
  });

  const desmarcar = useMutation({
    mutationFn: async (dose: Dose) => {
      const { data: sessao } = await supabase.auth.getUser();
      if (!sessao.user) throw new Error("Sessão não encontrada.");

      const quantidadePorDose = obterQuantidadePorDose(dose.medication.dosagem);

      const { data: medicamentoAtual, error: medicamentoError } = await supabase
        .from("medications")
        .select("id, quantidade_estoque")
        .eq("id", dose.medication.id)
        .eq("owner_id", sessao.user.id)
        .single();
      if (medicamentoError || !medicamentoAtual) throw medicamentoError ?? new Error("MEDICAMENTO_NAO_ENCONTRADO");

      const estoqueAtual = Number(medicamentoAtual.quantidade_estoque ?? 0);

      const { error } = await supabase.from("dose_logs").delete().eq("id", dose.log!.id);
      if (error) throw error;

      const { data: medicamentoAtualizado, error: estoqueError } = await supabase
        .from("medications")
        .update({ quantidade_estoque: estoqueAtual + quantidadePorDose })
        .eq("id", dose.medication.id)
        .eq("owner_id", sessao.user.id)
        .eq("quantidade_estoque", estoqueAtual)
        .select("id, quantidade_estoque")
        .single();

      if (estoqueError || !medicamentoAtualizado) throw estoqueError ?? new Error("ESTOQUE_ALTERADO");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doses"] });
      queryClient.invalidateQueries({ queryKey: ["medicamentos"] });
    },
    onError: () => toast.error("Não conseguimos desfazer o registro."),
  });

  function obterQuantidadePorDose(dosagem: string) {
    const match = dosagem.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(?:comprimidos?|cápsulas?|capsulas?|doses?|gotas?|ampolas?|unidades?)/i);
    if (!match) return 1;
    return Math.max(0.01, Number(match[1].replace(",", ".")));
  }

  function selecionarFoto(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo || !fotoKey) return;
    if (!arquivo.type.startsWith("image/")) { toast.error("Selecione uma imagem."); return; }
    const leitor = new FileReader();
    leitor.onload = () => { const resultado = String(leitor.result); localStorage.setItem(fotoKey, resultado); setFotoHoje(resultado); toast.success("Foto de hoje registrada."); };
    leitor.readAsDataURL(arquivo);
  }

  if (pacientes.length === 0) return <AppShell><section className="surface"><p className="text-sm font-bold text-inksoft">Acompanhamento AICare</p><h1 className="page-heading mt-1">Cadastre a primeira pessoa</h1><p className="mt-2 text-inksoft">Adicione você ou a pessoa que recebe os cuidados. Outras pessoas podem ser incluídas depois.</p><Button onClick={() => navigate({ to: "/perfil" })} size="lg" className="mt-5 w-full">Cadastrar pessoa</Button></section></AppShell>;

  return <AppShell pacientes={pacientes} pacienteId={pacienteId} onTrocarPaciente={selecionar}>
    <div><p className="text-sm font-bold text-inksoft">Acompanhamento AICare</p><h1 className="page-heading">Hoje · {paciente?.nome}</h1></div>
    {proxima ? <section className="surface border-l-4 border-primary"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-wide text-primary">{proxima.status === "atrasado" ? "Dose atrasada" : "Próxima dose"}</p><h2 className="mt-1 font-display text-2xl font-semibold">{proxima.medication.nome}</h2><p className="mt-1 text-base text-inksoft">{proxima.medication.dosagem}{proxima.medication.instrucoes ? ` · ${proxima.medication.instrucoes}` : ""}</p></div><span className="shrink-0 rounded-md bg-chrome-tint px-3 py-1.5 font-display text-lg font-semibold text-primary">{proxima.hora}</span></div><Button onClick={() => marcar.mutate(proxima)} disabled={marcar.isPending} size="lg" className="mt-4 w-full">{marcar.isPending ? "Registrando…" : "Registrar como tomada"}</Button></section> : <section className="surface"><p className="section-heading">{meds.length === 0 ? "Nenhum medicamento cadastrado" : "Doses concluídas hoje"}</p><p className="mt-2 text-inksoft">{meds.length === 0 ? "Use o assistente para cadastrar o primeiro medicamento." : "Todas as doses previstas para hoje foram registradas."}</p></section>}

    {meds.length > 0 ? (
      <section className="surface">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="section-heading">Estoque de medicamentos</h2>
            <p className="mt-1 text-sm font-semibold text-inksoft">Atualizado automaticamente conforme as doses são registradas.</p>
          </div>
          <Pill className="size-5 text-primary" />
        </div>
        <div className="mt-4 divide-y divide-border rounded-lg bg-card ring-1 ring-border">
          {meds.map((med) => (
            <div key={med.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold truncate">{med.nome}</p>
                <p className="text-sm text-inksoft">{med.dosagem}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-xl font-semibold text-primary">{Number(med.quantidade_estoque ?? 0).toLocaleString("pt-BR")}</p>
                <p className="text-xs font-bold uppercase tracking-wide text-inksoft">{med.unidade_estoque || "unidade"}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    ) : null}

    <section className="surface"><div className="flex items-start gap-3"><Camera className="mt-0.5 size-5 shrink-0 text-primary" /><div><h2 className="section-heading">Registro de hoje</h2><p className="text-sm font-semibold text-inksoft">Adicione uma foto de {paciente?.nome ?? "quem você cuida"} ao diário compartilhado.</p></div></div>{fotoHoje ? <img src={fotoHoje} alt="Registro fotográfico de hoje" className="mt-4 h-56 w-full rounded-lg object-cover" /> : null}<label className="mt-4 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 font-display text-base font-bold text-primary-foreground focus-within:ring-2 focus-within:ring-ring"><Camera className="size-5" />{fotoHoje ? "Trocar foto" : "Registrar foto"}<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={selecionarFoto} /></label></section>

    <section><h2 className="section-heading mb-3">Medicamentos de hoje</h2><div className="divide-y divide-border rounded-lg bg-card px-4 ring-1 ring-border">{doses.length === 0 ? <p className="py-5 text-inksoft">Ainda não há horários para hoje.</p> : doses.map((dose) => <button key={`${dose.medication.id}-${dose.when.toISOString()}`} onClick={() => (dose.log ? desmarcar.mutate(dose) : marcar.mutate(dose))} className="flex min-h-20 w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className={`grid size-10 shrink-0 place-items-center rounded-lg ${dose.status === "tomado" ? "bg-success-tint text-success" : dose.status === "atrasado" ? "bg-warning-tint text-warning" : "bg-chrome-tint text-primary"}`}>{dose.status === "tomado" ? <Check className="size-5" /> : dose.status === "atrasado" ? "!" : "·"}</span><span className="min-w-0 flex-1"><span className="block section-heading truncate">{dose.medication.nome}</span><span className="block text-base text-inksoft">{dose.medication.dosagem} · {dose.hora}</span></span><span className={`shrink-0 text-sm font-bold ${dose.status === "tomado" ? "text-success" : dose.status === "atrasado" ? "text-warning" : "text-inksoft"}`}>{dose.status === "tomado" ? "Tomado" : dose.status === "atrasado" ? "Atrasado" : "Aguardando"}</span></button>)}</div></section>

    <section className="surface"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><MessageCircleHeart className="size-5 text-primary" /><h2 className="section-heading">Novo medicamento</h2></div><p className="mt-2 text-sm leading-relaxed text-inksoft">Use o assistente para cadastrar nome, dosagem, horários e duração.</p></div><Button asChild variant="secondary" size="icon" aria-label="Registrar medicamento"><Link to="/conversar"><Plus /></Link></Button></div></section>

    {meds.length > 0 ? <section><div className="mb-3 flex items-center justify-between"><h2 className="section-heading">Tratamentos ativos</h2><Link to="/remedios" className="text-sm font-bold text-primary">Ver todos</Link></div><div className="divide-y divide-border rounded-lg bg-card px-4 ring-1 ring-border">{meds.slice(0, 4).map((med) => <div key={med.id} className="py-3"><p className="font-display text-lg font-semibold">{med.nome}</p><p className="text-sm text-inksoft">{med.dosagem} · {descricaoFrequencia(med)}</p></div>)}</div></section> : null}
  </AppShell>;
}
