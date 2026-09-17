import { createFileRoute } from "@tanstack/react-router";
import { GuestShell } from "@/components/GuestShell";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/convidado-diario")({ component: DiarioConvidado });

const diasComFoto: Record<number, string> = { 2: "17/09", 5: "20/09", 8: "23/09", 9: "24/09", 14: "29/09" };

function DiarioConvidado() {
  const dias = Array.from({ length: 30 }, (_, i) => i + 1);
  return <GuestShell><section><div className="flex items-center justify-between"><div><p className="text-base font-bold text-inksoft">Diário</p><h1 className="font-display text-4xl font-semibold">Setembro 2026</h1></div><Camera className="size-8 text-chrome-deep" /></div><div className="mt-5 flex items-center justify-between rounded-2xl bg-card p-3 ring-1 ring-border"><button className="rounded-xl p-2"><ChevronLeft /></button><span className="font-bold">Acompanhamento diário</span><button className="rounded-xl p-2"><ChevronRight /></button></div><div className="mt-4 grid grid-cols-7 gap-1 rounded-3xl bg-card p-3 shadow-soft ring-1 ring-border">{["dom.","seg.","ter.","qua.","qui.","sex.","sáb."].map((d) => <span key={d} className="py-2 text-center text-xs font-bold text-inksoft">{d}</span>)}{Array.from({ length: 2 }).map((_, i) => <span key={`empty-${i}`} />)}{dias.map((dia) => <div key={dia} className="min-h-20 rounded-xl p-1 text-center">{diasComFoto[dia] ? <div className="overflow-hidden rounded-xl bg-chrome-tint"><div className="grid h-14 place-items-center text-[10px] font-bold text-inksoft">📷</div></div> : <div className="grid h-14 place-items-center text-base font-semibold">{dia}</div>}<span className="mt-1 block text-[10px] font-bold text-inksoft">{dia}</span></div>)}</div><p className="mt-4 rounded-2xl bg-chrome-tint p-4 text-sm font-semibold text-inksoft">Os dias com foto representam os registros diários feitos pelo cuidador.</p></section></GuestShell>;
}
