import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Dose } from "@/lib/capsula";

const KEY = "capsula:avisados";

function jaAvisou(id: string) {
  const lista = JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as string[];
  return lista.includes(id);
}

function registrarAviso(id: string) {
  const lista = JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as string[];
  sessionStorage.setItem(KEY, JSON.stringify([...lista, id]));
}

/** Avisa na hora de cada dose enquanto o aplicativo estiver aberto. */
export function useLembretes(doses: Dose[], pacienteNome: string) {
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];

    const avisar = (dose: Dose) => {
      const id = `${dose.medication.id}-${dose.when.toISOString()}`;
      if (jaAvisou(id)) return;
      registrarAviso(id);
      const titulo = `Hora do remédio: ${dose.medication.nome}`;
      const corpo = `${dose.medication.dosagem}${pacienteNome ? ` · ${pacienteNome}` : ""} · ${dose.hora}`;
      toast(titulo, { description: corpo, duration: 30000 });
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(titulo, { body: corpo });
      }
    };

    for (const dose of doses) {
      if (dose.status !== "aguardando") continue;
      const espera = dose.when.getTime() - Date.now();
      if (espera < 0 || espera > 6 * 3_600_000) continue;
      timers.current.push(window.setTimeout(() => avisar(dose), espera));
    }

    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [doses.map((d) => `${d.medication.id}${d.when.toISOString()}${d.status}`).join("|"), pacienteNome]);
}

export async function pedirPermissaoNotificacoes() {
  if (!("Notification" in window)) return "sem-suporte" as const;
  if (window.top !== window.self) return "abrir-em-nova-aba" as const;
  if (Notification.permission === "granted") return "ativo" as const;
  const resultado = await Notification.requestPermission();
  return resultado === "granted" ? ("ativo" as const) : ("negado" as const);
}
