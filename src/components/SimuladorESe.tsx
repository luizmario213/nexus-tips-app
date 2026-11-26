"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { simular, type SinalEncerrado } from "@/lib/insights";
import { formatBRL } from "@/lib/format";

const PERIODOS = [
  { id: 30, label: "30 dias" },
  { id: 90, label: "90 dias" },
  { id: 0, label: "Tudo" },
] as const;

// Simulador "E se…": e se você tivesse seguido TODOS os sinais encerrados da Nexus, com
// um valor fixo por entrada? Usa só o histórico público (odd publicada, green/red) —
// nenhuma projeção de futuro. É o argumento mais honesto que existe pra quem ainda não
// assinou, e um retrato de disciplina pra quem já assina.
export function SimuladorESe({
  encerrados,
  bancaPadrao = 1000,
  subscribed,
}: {
  encerrados: SinalEncerrado[];
  bancaPadrao?: number;
  subscribed: boolean;
}) {
  const [periodo, setPeriodo] = useState<number>(90);
  const [stake, setStake] = useState(Math.max(10, Math.round(bancaPadrao * 0.02)));
  const [banca, setBanca] = useState(bancaPadrao);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const lista = useMemo(() => {
    if (!periodo) return encerrados;
    const corte = Date.now() - periodo * 86400000;
    return encerrados.filter((s) => new Date(s.created_at).getTime() >= corte);
  }, [encerrados, periodo]);

  const sim = useMemo(() => simular(lista, banca, stake), [lista, banca, stake]);

  // ------- gráfico -------
  const W = 640;
  const H = 200;
  const pad = 8;
  const vals = sim.pontos.map((p) => p.banca);
  const min = Math.min(...vals, banca);
  const max = Math.max(...vals, banca);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / Math.max(1, sim.pontos.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);
  const line = sim.pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.banca).toFixed(1)}`).join(" ");
  const area = `${line} L${x(sim.pontos.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  const positivo = sim.lucro >= 0;
  const cor = positivo ? "#14E3A0" : "#FF4D6D";
  const hp = hover !== null ? sim.pontos[hover] : null;

  function onMove(e: React.PointerEvent) {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || sim.pontos.length < 2) return;
    const k = (e.clientX - r.left) / r.width;
    setHover(Math.max(0, Math.min(sim.pontos.length - 1, Math.round(k * (sim.pontos.length - 1)))));
  }

  return (
    <div className="card relative overflow-hidden p-6 md:p-7">
      <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full blur-[100px] pointer-events-none" style={{ background: positivo ? "rgba(20,227,160,.12)" : "rgba(255,77,109,.12)" }} />
      <div className="relative">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <span className="eyebrow !text-success !border-success/30 !bg-success/10">
              <span className="eyebrow-dot !bg-success !shadow-[0_0_12px_#14E3A0]" />
              Simulador “E se…”
            </span>
            <h2 className="font-display text-[24px] md:text-[30px] font-semibold tracking-[-0.03em] leading-tight mt-3">
              E se você tivesse seguido <span className="text-gradient">todos os sinais</span>?
            </h2>
            <p className="text-[13px] text-text2 mt-1.5 max-w-xl">
              Calculado em cima do histórico público — cada green e cada red, na odd publicada. Ajuste o valor por entrada e veja.
            </p>
          </div>
          <div className="inline-flex bg-white/[0.03] border border-white/[0.08] rounded-xl p-1 self-start flex-none">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                  periodo === p.id ? "bg-white/[0.1] text-text shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)]" : "text-text2 hover:text-text"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[250px_1fr] xl:grid-cols-[280px_1fr] gap-6 mt-6">
          {/* controles */}
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-text2">Valor por entrada</label>
                <span className="font-mono text-sm font-semibold">{formatBRL(stake)}</span>
              </div>
              <input
                type="range"
                min={5}
                max={Math.max(200, Math.round(banca * 0.1))}
                step={5}
                value={stake}
                onChange={(e) => setStake(Number(e.target.value))}
                className="nx-range w-full mt-2.5"
              />
              <div className="text-[10.5px] text-muted mt-1">{((stake / banca) * 100).toFixed(1).replace(".", ",")}% da banca por entrada</div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-text2">Banca inicial</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">R$</span>
                <input
                  className="input-field pl-8 font-mono text-sm py-2.5"
                  inputMode="numeric"
                  value={banca}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(/\D/g, ""));
                    setBanca(v > 0 ? v : 1);
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
              <div className="text-[10px] font-bold text-muted tracking-[0.16em]">BANCA FINAL</div>
              <div className="font-display text-[34px] font-semibold tracking-tight leading-none mt-2">{formatBRL(sim.final)}</div>
              <div className="font-mono text-sm font-semibold mt-2" style={{ color: cor }}>
                {positivo ? "+" : ""}
                {formatBRL(sim.lucro)}{" "}
                <span className="text-muted font-normal text-xs">
                  ({positivo ? "+" : ""}
                  {((sim.lucro / banca) * 100).toFixed(1).replace(".", ",")}% da banca)
                </span>
              </div>
            </div>
          </div>

          {/* gráfico + métricas */}
          <div className="min-w-0 flex flex-col gap-4">
            <div className="relative rounded-2xl border border-white/[0.06] bg-[rgba(3,6,16,.5)] p-3">
              {sim.pontos.length < 2 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted">Sem sinais encerrados nesse período.</div>
              ) : (
                <>
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${W} ${H}`}
                    className="w-full h-[200px] touch-none"
                    preserveAspectRatio="none"
                    onPointerMove={onMove}
                    onPointerLeave={() => setHover(null)}
                  >
                    <defs>
                      <linearGradient id="sim-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={cor} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={cor} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1={0} x2={W} y1={y(banca)} y2={y(banca)} stroke="rgba(164,176,208,.25)" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
                    <path d={area} fill="url(#sim-fill)" />
                    <path d={line} fill="none" stroke={cor} strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${cor}88)` }} />
                    {hp && hover !== null && (
                      <>
                        <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="rgba(255,255,255,.2)" vectorEffect="non-scaling-stroke" />
                        <circle cx={x(hover)} cy={y(hp.banca)} r="4" fill={cor} stroke="#fff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                      </>
                    )}
                  </svg>
                  {hp && (
                    <div className="absolute top-3 left-3 rounded-lg bg-[rgba(6,10,24,.9)] border border-white/10 px-2.5 py-1.5 text-[11px] pointer-events-none">
                      <span className="text-muted">{new Date(hp.t).toLocaleDateString("pt-BR")} · </span>
                      <span className="font-mono font-semibold">{formatBRL(hp.banca)}</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 text-[10px] text-muted">linha tracejada = banca inicial</div>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
              {[
                { l: "ENTRADAS", v: `${sim.greens + sim.reds}` },
                { l: "GREENS / REDS", v: <><span className="text-success">{sim.greens}</span><span className="text-muted"> / </span><span className="text-danger">{sim.reds}</span></> },
                { l: "ROI", v: <span style={{ color: cor }}>{sim.roi >= 0 ? "+" : ""}{sim.roi.toFixed(1).replace(".", ",")}%</span> },
                { l: "MAIOR QUEDA", v: <span className="text-warning">-{formatBRL(sim.maxDrawdown)}</span> },
              ].map((k) => (
                <div key={k.l} className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
                  <div className="text-[9px] font-bold text-muted tracking-[0.14em] whitespace-nowrap">{k.l}</div>
                  <div className="font-mono text-[15px] font-semibold mt-1 whitespace-nowrap">{k.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-white/[0.06]">
          <p className="text-[11px] text-muted leading-relaxed max-w-2xl">
            Simulação com valor fixo e a odd publicada em cada sinal; cancelados não entram. Resultado passado não garante
            resultado futuro — inclui a maior queda pra você ver o lado ruim também.
          </p>
          {!subscribed && (
            <Link href="/dashboard/planos" className="btn-primary text-sm px-5 py-2.5 whitespace-nowrap text-center">
              Quero seguir os próximos
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
