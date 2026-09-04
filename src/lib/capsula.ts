import type { Tables } from "@/integrations/supabase/types";

export type Patient = Tables<"patients">;
export type Medication = Tables<"medications">;
export type DoseLog = Tables<"dose_logs">;

export type Dose = {
  medication: Medication;
  /** Horário previsto (data de hoje) */
  when: Date;
  hora: string;
  status: "tomado" | "atrasado" | "aguardando";
  log?: DoseLog;
};

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).slice(0, 2);
  return partes.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function formatarHora(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function medicamentoAtivoHoje(med: Medication, hoje: Date) {
  if (!med.ativo) return false;
  if (med.continuo || !med.data_fim) return true;
  const fim = new Date(`${med.data_fim}T23:59:59`);
  return hoje <= fim;
}

/** Gera todos os horários de hoje a partir do primeiro horário e do intervalo. */
export function dosesDoDia(meds: Medication[], logs: DoseLog[], agora = new Date()): Dose[] {
  const doses: Dose[] = [];
  for (const med of meds) {
    if (!medicamentoAtivoHoje(med, agora)) continue;
    const [h, m] = (med.primeiro_horario || "08:00").split(":").map(Number);
    const intervalo = Math.max(1, med.intervalo_horas || 24);
    let cursor = new Date(agora);
    cursor.setHours(h ?? 8, m ?? 0, 0, 0);
    const fimDoDia = new Date(agora);
    fimDoDia.setHours(23, 59, 59, 999);
    while (cursor <= fimDoDia) {
      const when = new Date(cursor);
      const log = logs.find(
        (l) =>
          l.medication_id === med.id &&
          Math.abs(new Date(l.horario_previsto).getTime() - when.getTime()) < 60_000,
      );
      const atrasoMin = (agora.getTime() - when.getTime()) / 60_000;
      doses.push({
        medication: med,
        when,
        hora: formatarHora(when),
        status: log ? "tomado" : atrasoMin > 15 ? "atrasado" : "aguardando",
        ...(log ? { log } : {}),
      });
      cursor = new Date(cursor.getTime() + intervalo * 3_600_000);
    }
  }
  return doses.sort((a, b) => a.when.getTime() - b.when.getTime());
}

export function proximaDose(doses: Dose[], agora = new Date()) {
  return (
    doses.find((d) => d.status === "atrasado") ??
    doses.find((d) => d.status === "aguardando" && d.when.getTime() >= agora.getTime() - 60_000) ??
    doses.find((d) => d.status === "aguardando")
  );
}

export function descricaoFrequencia(med: Medication) {
  const intervalo =
    med.intervalo_horas >= 24
      ? med.intervalo_horas === 24
        ? "1 vez por dia"
        : `a cada ${med.intervalo_horas} horas`
      : `a cada ${med.intervalo_horas} horas`;
  const duracao = med.continuo
    ? "uso contínuo"
    : med.data_fim
      ? `até ${new Date(`${med.data_fim}T12:00`).toLocaleDateString("pt-BR")}`
      : "por tempo determinado";
  return `${intervalo} · ${duracao}`;
}
