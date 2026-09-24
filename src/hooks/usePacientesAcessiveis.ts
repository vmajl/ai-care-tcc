import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Patient } from "@/lib/capsula";

export async function buscarPacientesAcessiveis(): Promise<Patient[]> {
  const { data: sessao } = await supabase.auth.getUser();
  if (!sessao.user) return [];

  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export function usePacientesAcessiveis() {
  return useQuery({
    queryKey: ["pacientes", "acessiveis"],
    queryFn: buscarPacientesAcessiveis,
  });
}
