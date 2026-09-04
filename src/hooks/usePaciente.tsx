import { useCallback, useEffect, useState } from "react";

const KEY = "capsula:paciente";

export function usePacienteSelecionado(ids: string[]) {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const salvo = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (salvo && ids.includes(salvo)) setId(salvo);
    else setId(ids[0] ?? null);
  }, [ids.join(",")]);

  const selecionar = useCallback((novo: string) => {
    localStorage.setItem(KEY, novo);
    setId(novo);
  }, []);

  return { pacienteId: id, selecionar };
}
