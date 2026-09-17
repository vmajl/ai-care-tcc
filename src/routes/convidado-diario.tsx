import { createFileRoute } from "@tanstack/react-router";
import { Camera, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import { GuestShell } from "@/components/GuestShell";

export const Route = createFileRoute("/convidado-diario")({ component: DiarioConvidado });

const FOTO_JOSE_17_09 = "/fotos/jose-17-09.png";

function DiarioConvidado() {
  const dias = Array.from({ length: 30 }, (_, i) => i + 1);
  const [diaSelecionado, setDiaSelecionado] = useState(17);
  const [fotoDia17, setFotoDia17] = useState(FOTO_JOSE_17_09);

  useEffect(() => {
    const foto = localStorage.getItem("aicare_foto_hoje");
    if (foto) setFotoDia17(foto);
  }, []);

  const temFotoSelecionada = diaSelecionado === 17;

  return (
    <GuestShell>
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-inksoft">Diário</p>
            <h1 className="font-display text-4xl font-semibold">Setembro 2026</h1>
            <p className="mt-1 text-base text-inksoft">Fotos e registros diários do José</p>
          </div>
          <Camera className="size-8 text-chrome-deep" />
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-card p-3 ring-1 ring-border">
          <button type="button" className="rounded-xl p-2" aria-label="Mês anterior">
            <ChevronLeft />
          </button>
          <span className="font-bold">Acompanhamento diário</span>
          <button type="button" className="rounded-xl p-2" aria-label="Próximo mês">
            <ChevronRight />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 rounded-3xl bg-card p-3 shadow-soft ring-1 ring-border">
          {["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."].map((d) => (
            <span key={d} className="py-2 text-center text-xs font-bold text-inksoft">{d}</span>
          ))}

          {Array.from({ length: 2 }).map((_, i) => <span key={`empty-${i}`} />)}

          {dias.map((dia) => {
            const temFoto = dia === 17;
            const selecionado = diaSelecionado === dia;

            return (
              <button
                key={dia}
                type="button"
                onClick={() => setDiaSelecionado(dia)}
                aria-label={temFoto ? `Dia ${dia}, com foto` : `Dia ${dia}, sem foto registrada`}
                aria-pressed={selecionado}
                className={`min-h-20 rounded-xl p-1 text-center transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring ${selecionado ? "bg-chrome-tint ring-2 ring-chrome" : "hover:bg-chrome-tint/60"}`}
              >
                {temFoto ? (
                  <div className="overflow-hidden rounded-xl bg-chrome-tint">
                    <img src={fotoDia17} alt="" className="h-14 w-full object-cover" />
                  </div>
                ) : (
                  <div className="grid h-14 place-items-center text-base font-semibold">{dia}</div>
                )}
                <span className="mt-1 block text-[10px] font-bold text-inksoft">{dia}</span>
              </button>
            );
          })}
        </div>

        <section className="rounded-3xl bg-card p-5 shadow-soft ring-1 ring-border">
          {temFotoSelecionada ? (
            <>
              <div className="overflow-hidden rounded-2xl bg-chrome-tint">
                <img src={fotoDia17} alt="José em seu registro diário de 17 de setembro de 2026" className="max-h-80 w-full object-cover" />
              </div>
              <div className="mt-4">
                <p className="text-sm font-bold text-inksoft">Registro diário</p>
                <h2 className="font-display text-2xl font-semibold">17 de setembro de 2026</h2>
                <div className="mt-2 flex items-center gap-2 text-base font-semibold text-inksoft">
                  <Clock3 className="size-5" />
                  08:24
                </div>
                <p className="mt-4 text-base leading-relaxed text-inksoft">
                  Registro fotográfico diário de José. A família pode acompanhar a rotina e as atualizações compartilhadas pelo cuidador.
                </p>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-chrome-tint text-chrome-deep"><Camera className="size-7" /></div>
              <p className="mt-4 text-sm font-bold text-inksoft">Sem foto registrada</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{diaSelecionado} de setembro de 2026</h2>
              <p className="mt-2 text-base leading-relaxed text-inksoft">Não há uma foto registrada para este dia.</p>
            </div>
          )}
        </section>
      </section>
    </GuestShell>
  );
}
