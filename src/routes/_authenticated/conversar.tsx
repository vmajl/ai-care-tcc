import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Mic, RotateCcw, Send, Square } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { usePacienteSelecionado } from "@/hooks/usePaciente";
import {
  conversarComAssistente,
  type Sugestao,
} from "@/lib/assistente.functions";
import type { Patient } from "@/lib/capsula";

export const Route = createFileRoute("/_authenticated/conversar")({
  head: () => ({
    meta: [
      { title: "Conversar com a assistente — AICare" },
      {
        name: "description",
        content:
          "Descreva o remédio em suas palavras e a assistente monta a ficha com horários.",
      },
      { property: "og:title", content: "Conversar com a assistente — AICare" },
      {
        property: "og:description",
        content:
          "Descreva o remédio em suas palavras e a assistente monta a ficha com horários.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Conversar,
});

type Mensagem = {
  role: "user" | "assistant";
  content: string;
};

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

  const { pacienteId, selecionar } = usePacienteSelecionado(
    pacientes.map((p) => p.id),
  );

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

  // Estados da gravação de áudio
  const [gravando, setGravando] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duracao, setDuracao] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();

    const conteudo = texto.trim();

    if (!conteudo || pensando || gravando) return;

    const novas: Mensagem[] = [
      ...mensagens,
      {
        role: "user",
        content: conteudo,
      },
    ];

    setMensagens(novas);
    setTexto("");
    setPensando(true);

    try {
      const resposta = await conversar({
        data: {
          mensagens: novas,
          pacienteNome: paciente?.nome ?? "",
        },
      });

      setMensagens([
        ...novas,
        {
          role: "assistant",
          content: resposta.resposta,
        },
      ]);

      if (resposta.sugestao) {
        setSugestao(resposta.sugestao);
      }
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
        quantidade_estoque: sugestao.quantidade_estoque,
        unidade_estoque: sugestao.unidade_estoque,
      });

      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["medicamentos"],
      });

      toast.success(`${sugestao.nome} adicionado aos lembretes.`);

      setSugestao(null);

      navigate({
        to: "/hoje",
      });
    } catch {
      toast.error("Não conseguimos salvar o remédio.");
    } finally {
      setSalvando(false);
    }
  }

  // Formata a duração da gravação
  function formatarTempo(segundos: number) {
    const minutos = Math.floor(segundos / 60)
      .toString()
      .padStart(2, "0");

    const segundosRestantes = (segundos % 60)
      .toString()
      .padStart(2, "0");

    return `${minutos}:${segundosRestantes}`;
  }

  // Inicia a gravação
  async function iniciarGravacao() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Seu navegador não permite gravação de áudio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      chunksRef.current = [];
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());

        streamRef.current = null;

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }

        setAudioUrl(URL.createObjectURL(blob));
      };

      recorder.start();

      setGravando(true);
      setDuracao(0);

      timerRef.current = window.setInterval(() => {
        setDuracao((tempo) => tempo + 1);
      }, 1000);
    } catch {
      toast.error("Permita o acesso ao microfone para gravar.");
    }
  }

  // Para a gravação
  function pararGravacao() {
    mediaRecorderRef.current?.stop();

    setGravando(false);

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // Apaga o áudio gravado
  function cancelarAudio() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl(null);
    setDuracao(0);
  }

  // Limpa a gravação quando a tela é fechada
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <AppShell
      pacientes={pacientes}
      pacienteId={pacienteId}
      onTrocarPaciente={selecionar}
    >
      <section className="surface">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary">
            <span className="font-display text-lg font-bold text-on-chrome">
              IA
            </span>
          </span>

          <p className="font-display text-lg font-semibold">
            Assistente de medicamentos
            {paciente ? ` · ${paciente.nome.split(" ")[0]}` : ""}
          </p>
        </div>

        <div className="space-y-3">
          {mensagens.map((m, i) =>
            m.role === "user" ? (
              <div
                key={i}
                className="flex justify-end"
              >
                <div className="max-w-[88%] rounded-lg rounded-br-sm bg-primary px-4 py-3 text-primary-foreground">
                  <p className="font-semibold text-pretty">
                    {m.content}
                  </p>
                </div>
              </div>
            ) : (
              <div
                key={i}
                className="flex justify-start"
              >
                <div className="max-w-[88%] rounded-lg rounded-bl-sm bg-chrome-tint px-4 py-3">
                  <p className="font-semibold text-pretty">
                    {m.content}
                  </p>
                </div>
              </div>
            ),
          )}

          {pensando ? (
            <p className="text-base font-bold text-inksoft">
              A assistente está escrevendo…
            </p>
          ) : null}
        </div>

        {sugestao ? (
          <div className="mt-4 rounded-lg bg-success-tint p-4 ring-1 ring-success/20">
            <p className="mb-3 text-xs font-bold tracking-[0.14em] text-mintink uppercase">
              Cartão de confirmação
            </p>

            <dl className="space-y-2">
              <Linha
                rotulo="Medicamento"
                valor={sugestao.nome}
                destaque
              />

              <Linha
                rotulo="Dosagem"
                valor={sugestao.dosagem}
              />

              <Linha
                rotulo="Intervalo"
                valor={
                  sugestao.intervalo_horas === 24
                    ? "1 vez por dia"
                    : `a cada ${sugestao.intervalo_horas} horas`
                }
              />

              <Linha
                rotulo="Primeira dose"
                valor={sugestao.primeiro_horario}
              />

              <Linha
                rotulo="Estoque inicial"
                valor={`${sugestao.quantidade_estoque} ${sugestao.unidade_estoque}`}
              />

              <Linha
                rotulo="Duração"
                valor={
                  sugestao.continuo
                    ? "uso contínuo"
                    : sugestao.data_fim
                      ? `até ${new Date(
                          `${sugestao.data_fim}T12:00`,
                        ).toLocaleDateString("pt-BR")}`
                      : "tempo determinado"
                }
              />
            </dl>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                onClick={confirmar}
                disabled={salvando || !pacienteId}
              >
                Confirmar
              </Button>

              <Button
                onClick={() => setSugestao(null)}
                variant="outline"
              >
                Ajustar
              </Button>
            </div>
          </div>
        ) : null}

        {/* Área de gravação */}
        <div className="mt-4 space-y-3">

          {audioUrl ? (
            <div className="rounded-lg bg-chrome-tint p-4 ring-1 ring-input">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">
                    Áudio gravado
                  </p>

                  <p className="text-sm text-secondary">
                    Duração: {formatarTempo(duracao)}
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={cancelarAudio}
                  variant="outline"
                  size="sm"
                >
                  <RotateCcw className="size-4" />
                  Gravar novamente
                </Button>
              </div>

              <audio
                controls
                src={audioUrl}
                className="w-full"
              />
            </div>
          ) : null}

          <form
            onSubmit={enviar}
            className="flex items-end gap-2"
          >
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={2}
              disabled={gravando}
              placeholder={
                gravando
                  ? "Gravando áudio..."
                  : "Ex.: Losartana 50 mg, de 12 em 12 horas, uso contínuo"
              }
              className="field-control flex-1 resize-none py-3 text-lg font-semibold disabled:opacity-50"
            />

            {!gravando ? (
              <Button
                type="button"
                onClick={iniciarGravacao}
                aria-label="Gravar áudio"
                size="icon"
                className="size-14 shrink-0"
              >
                <Mic className="size-6" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={pararGravacao}
                aria-label="Parar gravação"
                size="icon"
                className="size-14 shrink-0"
              >
                <Square className="size-5" />
              </Button>
            )}

            <Button
              type="submit"
              disabled={pensando || gravando}
              aria-label="Enviar mensagem"
              size="icon"
              className="size-14 shrink-0"
            >
              <Send className="size-6" />
            </Button>
          </form>

          {gravando ? (
            <p className="text-center text-sm font-semibold text-mintink">
              ● Gravando {formatarTempo(duracao)} — toque em parar quando
              terminar.
            </p>
          ) : null}
        </div>
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
      <dt className="font-medium text-inksoft">
        {rotulo}
      </dt>

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
