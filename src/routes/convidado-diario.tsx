import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Camera, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { GuestShell } from "@/components/GuestShell";
import { Button } from "@/components/ui/button";
import { usePacienteSelecionado } from "@/hooks/usePaciente";
import type { Patient } from "@/lib/capsula";

export const Route = createFileRoute("/convidado-diario")({ component: Diario });

function Diario() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getUser().then(({ data }) => {
      if (ativo) setAutenticado(!!data.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (ativo) setAutenticado(!!session?.user);
    });
    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (autenticado === null) return <div className="min-h-screen bg-canvas" />;
  return autenticado ? <DiarioCuidador /> : <DiarioConvidado />;
}

function DiarioCuidador() {
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

  return <AppShell pacientes={pacientes} pacienteId={pacienteId} onTrocarPaciente={selecionar}><DiarioCalendario pacienteId={pacienteId} nomePaciente={paciente?.nome ?? "quem você cuida"} /></AppShell>;
}

function DiarioCalendario({ pacienteId, nomePaciente }: { pacienteId: string | null; nomePaciente: string }) {
  const dias = Array.from({ length: 30 }, (_, i) => i + 1);
  const [diaSelecionado, setDiaSelecionado] = useState(17);
  const [fotoDia17, setFotoDia17] = useState<string | null>(null);

  useEffect(() => {
    const foto = pacienteId ? localStorage.getItem(`aicare_foto_hoje_${pacienteId}`) : null;
    setFotoDia17(foto);
  }, [pacienteId]);

  const temFotoSelecionada = diaSelecionado === 17 && !!fotoDia17;

  return <section className="space-y-5">
    <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-inksoft">Acompanhamento AICare</p><h1 className="page-heading">Diário · Setembro 2026</h1><p className="mt-1 text-base text-inksoft">Fotos e registros diários de {nomePaciente}</p></div><Camera className="size-6 text-primary" /></div>
    <div className="mt-4 flex items-center justify-between rounded-lg bg-card p-2 ring-1 ring-border"><Button type="button" variant="ghost" size="icon" aria-label="Mês anterior"><ChevronLeft /></Button><span className="font-bold">Acompanhamento diário</span><Button type="button" variant="ghost" size="icon" aria-label="Próximo mês"><ChevronRight /></Button></div>
    <div className="grid grid-cols-7 gap-1 rounded-lg bg-card p-3 ring-1 ring-border">
      {["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."].map((d) => <span key={d} className="py-2 text-center text-xs font-bold text-inksoft">{d}</span>)}
      {Array.from({ length: 2 }).map((_, i) => <span key={`empty-${i}`} />)}
      {dias.map((dia) => {
        const temFoto = dia === 17 && !!fotoDia17;
        const selecionado = diaSelecionado === dia;
        return <button key={dia} type="button" onClick={() => setDiaSelecionado(dia)} aria-label={temFoto ? `Dia ${dia}, com foto` : `Dia ${dia}, sem foto registrada`} aria-pressed={selecionado} className={`min-h-16 rounded-md p-1 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-ring sm:min-h-20 ${selecionado ? "bg-chrome-tint ring-2 ring-primary" : "hover:bg-chrome-tint/60"}`}>{temFoto ? <div className="overflow-hidden rounded-md bg-chrome-tint"><img src={fotoDia17!} alt="" className="h-11 w-full object-cover sm:h-14" /></div> : <div className="grid h-11 place-items-center text-base font-semibold sm:h-14">{dia}</div>}<span className="mt-1 block text-[10px] font-bold text-inksoft">{dia}</span></button>;
      })}
    </div>
    <section className="surface">{temFotoSelecionada ? <><div className="overflow-hidden rounded-lg bg-chrome-tint"><img src={fotoDia17!} alt={`${nomePaciente} em seu registro diário de 17 de setembro de 2026`} className="max-h-80 w-full object-cover" /></div><div className="mt-4"><p className="text-sm font-bold text-inksoft">Registro diário</p><h2 className="section-heading">17 de setembro de 2026</h2><p className="mt-1 text-base text-inksoft">Foto registrada no acompanhamento de hoje.</p></div></> : <><div className="flex items-center gap-3"><Clock3 className="size-5 text-primary" /><div><p className="text-sm font-bold text-inksoft">Registro diário</p><h2 className="section-heading">{diaSelecionado} de setembro de 2026</h2></div></div><p className="mt-3 text-base text-inksoft">Sem foto registrada para este dia.</p></>}</section>
  </section>;
}

function DiarioConvidado() {
  const [diaSelecionado, setDiaSelecionado] = useState(1);
  const dias = Array.from({ length: 30 }, (_, i) => i + 1);

  return <GuestShell><section className="space-y-5">
    <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-inksoft">Acompanhamento AICare</p><h1 className="page-heading">Diário · Setembro 2026</h1><p className="mt-1 text-base text-inksoft">Fotos e registros compartilhados pelo cuidador.</p></div><Camera className="size-6 text-primary" /></div>
    <div className="mt-4 flex items-center justify-between rounded-lg bg-card p-2 ring-1 ring-border"><button type="button" aria-label="Mês anterior" className="grid size-10 place-items-center rounded-md text-inksoft hover:bg-chrome-tint"><ChevronLeft /></button><span className="font-bold">Acompanhamento diário</span><button type="button" aria-label="Próximo mês" className="grid size-10 place-items-center rounded-md text-inksoft hover:bg-chrome-tint"><ChevronRight /></button></div>
    <div className="grid grid-cols-7 gap-1 rounded-lg bg-card p-3 ring-1 ring-border">
      {["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."].map((d) => <span key={d} className="py-2 text-center text-xs font-bold text-inksoft">{d}</span>)}
      {Array.from({ length: 2 }).map((_, i) => <span key={`empty-${i}`} />)}
      {dias.map((dia) => { const selecionado = diaSelecionado === dia; return <button key={dia} type="button" onClick={() => setDiaSelecionado(dia)} aria-label={`Dia ${dia}, sem foto registrada`} aria-pressed={selecionado} className={`min-h-16 rounded-md p-1 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-ring sm:min-h-20 ${selecionado ? "bg-chrome-tint ring-2 ring-primary" : "hover:bg-chrome-tint/60"}`}><div className="grid h-11 place-items-center text-base font-semibold sm:h-14">{dia}</div><span className="mt-1 block text-[10px] font-bold text-inksoft">{dia}</span></button>; })}
    </div>
    <section className="surface"><div className="flex items-center gap-3"><Clock3 className="size-5 text-primary" /><div><p className="text-sm font-bold text-inksoft">Registro diário</p><h2 className="section-heading">{diaSelecionado} de setembro de 2026</h2></div></div><p className="mt-3 text-base text-inksoft">Sem foto registrada para este dia.</p></section>
  </section></GuestShell>;
}
