import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Mic, RotateCcw, Send, Square } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { usePacienteSelecionado } from "@/hooks/usePaciente";
import { conversarComAssistente, type Sugestao } from "@/lib/assistente.functions";
import type { Patient } from "@/lib/capsula";

export const Route = createFileRoute("/_authenticated/conversar")({
  head: () => ({
    meta: [
      { title: "Conversar com a assistente — AICare" },
      {
        name: "description",
        content: "Descreva o remédio em suas palavras e a assistente monta a ficha com horários.",
      },
      { property: "og:title", content: "Conversar com a assistente — AICare" },
      {
        property: "og:description",
        content: "Descreva o remédio em suas palavras e a assistente monta a ficha com horários.",
      },
    ],
  }),
  component: Conversar,
});

type Mensagem = { role: "user" | "assistant"; content: string };

function Conversar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const conversar = useServerFn(conversarComAssistente);

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
  const paciente = pacientes.find((p) => p.id === pacienteId);

  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      role: "assistant",
      content:
        "Olá! Me conte o remédio: o nome, a dosagem e de quantas em quantas horas precisa tomar.",
    },
  ]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [sugestao, setSugestao] = useState<Sugestao | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || pensando) return;
    const novas: Mensagem[] = [...mensagens, { role: "user", content: conteudo }];
    setMensagens(novas);
    setTexto("");
    setPensando(true);
    try {
      const resposta = await conversar({
        data: { mensagens: novas, pacienteNome: paciente?.nome ?? "" },
      });
      setMensagens([...novas, { role: "assistant", content: resposta.resposta }]);
      if (resposta.sugestao) setSugestao(resposta.sugestao);
    } catch {
      toast.error("A assistente não respondeu. Tente novamente.");
    } finally {
      setPensando(false);
    }
  }

  async function confirmar() {
    if (!sugestao || !pacienteId) return;
    setSalvando(true);
    try {
      const { data: sessao } = await supabase.auth.getUser();
      const { error } = await supabase.from("medications").insert({
        owner_id: sessao.user!.id,
        patient_id: pacienteId,
        nome: sugestao.nome,
        dosagem: sugestao.dosagem,
        intervalo_horas: sugestao.intervalo_horas,
        primeiro_horario: sugestao.primeiro_horario,
        continuo: sugestao.continuo,
        data_fim: sugestao.data_fim,
        instrucoes: sugestao.instrucoes,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["medicamentos"] });
      toast.success(`${sugestao.nome} adicionado aos lembretes.`);
      setSugestao(null);
      navigate({ to: "/hoje" });
    } catch {
      toast.error("Não conseguimos salvar o remédio.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AppShell pacientes={pacientes} pacienteId={pacienteId} onTrocarPaciente={selecionar}>
      <section className="rounded-3xl bg-card p-5 ring-1 ring-border shadow-soft">
        <div className="mb-4 flex items-center gap-3">
          <span className="chrome grid size-11 shrink-0 place-items-center rounded-full ring-1 ring-on-chrome/60">
            <span className="font-display text-lg font-bold text-on-chrome">IA</span>
          </span>
          <p className="font-display text-lg font-semibold">
            Assistente de doses{paciente ? ` · ${paciente.nome.split(" ")[0]}` : ""}
          </p>
        </div>

        <div className="space-y-3">
          {mensagens.map((m, i) =>
            m.role === "assistant" ? (
              <div
                key={i}
                className="chrome ml-auto max-w-[88%] rounded-2xl rounded-br-md px-4 py-3 text-on-chrome shadow-sm"
              >
                <p className="font-semibold text-pretty">{m.content}</p>
              </div>
            ) : (
              <div key={i} className="max-w-[88%] rounded-2xl rounded-tl-md bg-chrome-tint px-4 py-3">
                <p className="font-semibold text-pretty">{m.content}</p>
              </div>
            ),
          )}
          {pensando ? (
            <p className="text-base font-bold text-inksoft">A assistente está escrevendo…</p>
          ) : null}
        </div>

        {sugestao ? (
          <div className="mt-4 rounded-2xl bg-mint p-4 ring-1 ring-mintink/20">
            <p className="mb-3 text-xs font-bold tracking-[0.14em] text-mintink uppercase">
              Cartão de confirmação
            </p>
            <dl className="space-y-2">
              <Linha rotulo="Medicamento" valor={sugestao.nome} destaque />
              <Linha rotulo="Dosagem" valor={sugestao.dosagem} />
              <Linha
                rotulo="Intervalo"
                valor={
                  sugestao.intervalo_horas === 24
                    ? "1 vez por dia"
                    : `a cada ${sugestao.intervalo_horas} horas`
                }
              />
              <Linha rotulo="Primeira dose" valor={sugestao.primeiro_horario} />
              <Linha
                rotulo="Duração"
                valor={
                  sugestao.continuo
                    ? "uso contínuo"
                    : sugestao.data_fim
                      ? `até ${new Date(`${sugestao.data_fim}T12:00`).toLocaleDateString("pt-BR")}`
                      : "tempo determinado"
                }
              />
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={confirmar}
                disabled={salvando || !pacienteId}
                className="rounded-xl bg-mintink py-3 font-display text-lg font-bold text-on-chrome ring-1 ring-mintink/30 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-70"
              >
                Confirmar
              </button>
              <button
                onClick={() => setSugestao(null)}
                className="rounded-xl bg-card py-3 font-display text-lg font-bold text-inksoft ring-1 ring-border transition-transform hover:scale-[1.02] active:scale-95"
              >
                Ajustar
              </button>
            </div>
          </div>
        ) : null}

        <form onSubmit={enviar} className="mt-4 flex items-end gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            placeholder="Ex.: Losartana 50 mg, de 12 em 12 horas, uso contínuo"
            className="flex-1 resize-none rounded-2xl bg-chrome-tint px-4 py-3 text-lg font-semibold text-ink ring-1 ring-input outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            aria-label="Enviar mensagem"
            className="chrome grid size-14 shrink-0 place-items-center rounded-2xl text-on-chrome ring-1 ring-on-chrome/50 active:scale-95"
          >
            <Send className="size-6" />
          </button>
        </form>
      </section>
    </AppShell>
  );
}

function Linha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-medium text-inksoft">{rotulo}</dt>
      <dd
        className={
          destaque
            ? "text-right font-display text-lg font-semibold"
            : "text-right font-semibold"
        }
      >
        {valor}
      </dd>
    </div>
  );
}
