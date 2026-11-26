"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Signal } from "@/lib/types";
import { fmtCountdown, fmtOdd, probImplicita } from "@/lib/insights";

// Peças "vivas" da Visão Geral — precisam do relógio do navegador (fuso do usuário e
// contagem regressiva), por isso ficam fora do Server Component da página.

export function Greeting({ name }: { name: string }) {
  const [txt, setTxt] = useState("Olá");
  useEffect(() => {
    const h = new Date().getHours();
    setTxt(h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite");
  }, []);
  const first = name.split(/[\s@]/)[0] || name;
  return (
    <>
      {txt}, <span className="text-gradient">{first}</span>
    </>
  );
}

export function NextSignalTile({ signal, total, subscribed }: { signal: Signal | null; total: number; subscribed: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!signal) {
    return (
      <div className="h-full flex flex-col justify-between gap-4">
        <span className="text-[10px] font-bold tracking-[0.2em] text-text2">PRÓXIMO SINAL</span>
        <div>
          <div className="font-display text-2xl font-semibold">Sala em silêncio</div>
          <p className="text-sm text-text2 mt-1">Assim que o time publicar, aparece aqui com contagem regressiva.</p>
        </div>
        <Link href="/dashboard/eventos" className="btn-ghost text-xs px-4 py-2.5 w-fit">
          Abrir a Sala ao Vivo →
        </Link>
      </div>
    );
  }

  const ini = signal.horario_jogo ? new Date(signal.horario_jogo).getTime() : null;
  const vivo = signal.live || (ini !== null && now !== null && ini <= now);
  const ms = ini !== null && now !== null ? ini - now : null;

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold tracking-[0.2em] text-text2">
          {vivo ? "ROLANDO AGORA" : "PRÓXIMO SINAL"} <span className="text-muted">· {total} no ar</span>
        </span>
        {vivo ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-danger/50 bg-danger/15 text-danger font-bold tracking-wider px-2.5 py-1 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" /> AO VIVO
          </span>
        ) : (
          ms !== null && (
            <span className="font-mono tabular-nums text-[12px] text-info border border-info/40 bg-info/10 rounded-full px-2.5 py-1">
              {fmtCountdown(ms)}
            </span>
          )
        )}
      </div>

      <div className={`flex items-end justify-between gap-4 ${subscribed ? "" : "blur-[5px] select-none"}`}>
        <div className="min-w-0">
          <div className="text-[11px] text-muted font-semibold uppercase tracking-wider truncate">{signal.competicao}</div>
          <div className="font-display text-[26px] md:text-[32px] font-semibold tracking-[-0.03em] leading-[1.05] mt-1">
            {signal.tipo === "bilhete" ? (
              signal.time_b
            ) : (
              <>
                {signal.time_a} <span className="text-muted font-normal">x</span> {signal.time_b}
              </>
            )}
          </div>
          <div className="text-sm text-text2 mt-1">{signal.mercado}</div>
        </div>
        <div className="text-right flex-none">
          <div className="font-mono text-[40px] font-semibold leading-none text-gradient">{fmtOdd(signal.odd)}</div>
          <div className="text-[10px] text-muted mt-1">prob. {probImplicita(signal.odd).toFixed(0)}%</div>
        </div>
      </div>

      <div className="mt-auto flex gap-2">
        <Link href={subscribed ? "/dashboard/eventos" : "/dashboard/planos"} className="btn-primary text-xs px-5 py-2.5">
          {subscribed ? "Ver Raio-X na Sala ao Vivo" : "Assine pra ver o sinal"}
        </Link>
      </div>
    </div>
  );
}

/** Anel de porcentagem animado (entra preenchendo). */
export function PctRing({ value, color = "#14E3A0", size = 112, label }: { value: number | null; color?: string; size?: number; label?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 150);
    return () => clearTimeout(t);
  }, []);
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = value ?? 0;
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(120,145,220,.13)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={on ? c - (v / 100) * c : c}
          style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 8px ${color}99)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[26px] font-semibold leading-none">{value === null ? "—" : `${value}%`}</span>
        {label && <span className="text-[8.5px] text-muted font-bold tracking-[0.14em] mt-1">{label}</span>}
      </div>
    </div>
  );
}
