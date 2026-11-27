"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { Signal, SignalLeg } from "@/lib/types";
import { NexusCore } from "@/components/fx";
import { AGENTES, achadosDosAgentes, fmtOdd, probImplicita, recorte, type SinalEncerrado } from "@/lib/insights";

type SignalRow = Signal & { signal_legs?: SignalLeg[] };

const STEP_MS = 750;

// Raio-X do sinal — abre por cima de tudo (portal no <body>, pra escapar de qualquer
// transform/filtro dos containers do dashboard). À esquerda, o motor 3D percorre os 5
// agentes; à direita, o diagnóstico completo, revelado em sincronia.
export function SignalXRay({
  signal,
  encerrados,
  noArMesmaCompeticao,
  sugestaoTexto,
  alreadyMarked,
  canMark,
  onMarcar,
  onClose,
}: {
  signal: SignalRow;
  encerrados: SinalEncerrado[];
  noArMesmaCompeticao: number;
  sugestaoTexto?: string | null;
  alreadyMarked?: boolean;
  canMark?: boolean;
  onMarcar?: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const labelRefs = useRef<(HTMLElement | null)[]>([]);
  const done = step > AGENTES.length;

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 500 : STEP_MS);
    return () => clearTimeout(t);
  }, [step, done]);

  const achados = achadosDosAgentes(signal, { noArMesmaCompeticao, encerrados });
  const prob = probImplicita(signal.odd);
  const mercado = recorte(encerrados, (s) => s.mercado === signal.mercado);
  const competicao = recorte(encerrados, (s) => s.competicao === signal.competicao);
  const isBilhete = signal.tipo === "bilhete";
  const legs = (signal.signal_legs || []).slice().sort((a, b) => a.ordem - b.ordem);
  const movimento = signal.odd_abertura ? signal.odd - signal.odd_abertura : null;
  // step 1..5 = agente 0..4 ativo; 6 = correlação; >6 = concluído
  const step3d = done ? 5 : Math.max(-1, step - 1);
  const agentState = (i: number) => (done || i < step - 1 ? "done" : i === step - 1 ? "active" : "pending");

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-4 md:p-6" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-[rgba(2,4,10,.78)] backdrop-blur-md animate-fade-up" onClick={onClose} />

      <div className="relative w-full max-w-6xl h-full sm:h-[min(92vh,860px)] card !rounded-none sm:!rounded-3xl overflow-hidden !bg-[rgba(6,9,22,.92)] grid lg:grid-cols-[1.05fr_1fr] animate-fade-up">
        {/* ------- ESQUERDA: motor 3D ------- */}
        <div className="relative min-h-[300px] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(79,123,255,.18),transparent_65%)]" />
          <NexusCore
            className="absolute inset-0"
            step={step3d}
            complete={done}
            scale={0.82}
            offsetY={-0.25}
            particles={1500}
            labelRefs={labelRefs}
          />
          <div className="absolute inset-0 pointer-events-none hidden sm:block">
            {AGENTES.map((a, i) => {
              const st = agentState(i);
              return (
                <div
                  key={a.id}
                  ref={(el) => {
                    labelRefs.current[i] = el;
                  }}
                  className="absolute left-0 top-0"
                  style={{ willChange: "transform", opacity: 0 }}
                >
                  <span
                    className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md transition-all duration-300 ${
                      st === "active"
                        ? "border-info/60 bg-info/15 text-info"
                        : st === "done"
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-white/10 bg-white/[0.04] text-muted"
                    }`}
                  >
                    {a.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* cabeçalho do jogo por cima da cena */}
          <div className="absolute top-0 inset-x-0 p-5 sm:p-7 bg-gradient-to-b from-[rgba(6,9,22,.9)] to-transparent">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="eyebrow !py-1 !text-[10px]">
                <span className="eyebrow-dot" />
                Raio-X do sinal
              </span>
              {isBilhete && <span className="text-[10px] font-bold text-accent bg-accent/10 border border-accent/30 px-2 py-1 rounded-full">BILHETE</span>}
            </div>
            <div className="text-[11px] text-muted font-semibold tracking-[0.14em] uppercase mt-4">{signal.competicao}</div>
            <div className="font-display text-[26px] sm:text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] mt-1">
              {isBilhete ? (
                `${legs.length} jogos combinados`
              ) : (
                <>
                  {signal.time_a} <span className="text-muted font-normal">x</span> {signal.time_b}
                </>
              )}
            </div>
            <div className="text-text2 text-sm mt-1">{signal.mercado}</div>
          </div>

          <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7 flex items-end justify-between gap-4 bg-gradient-to-t from-[rgba(6,9,22,.95)] to-transparent">
            <div>
              <div className="text-[10px] font-bold text-text2 tracking-[0.2em]">
                {done ? "ANÁLISE CONCLUÍDA" : step > AGENTES.length - 0 ? "CORRELACIONANDO NO NÚCLEO" : "AGENTES TRABALHANDO"}
              </div>
              <div className="h-1 w-48 rounded-full bg-white/[0.07] mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-info to-success transition-all duration-500"
                  style={{ width: `${Math.min(1, step / (AGENTES.length + 1)) * 100}%` }}
                />
              </div>
            </div>
            {done && (
              <button onClick={() => setStep(0)} className="btn-ghost text-[11px] px-3 py-2 pointer-events-auto">
                ↻ Rodar de novo
              </button>
            )}
          </div>
        </div>

        {/* ------- DIREITA: diagnóstico ------- */}
        <div className="relative overflow-y-auto p-5 sm:p-7 flex flex-col gap-5">
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 w-9 h-9 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] flex items-center justify-center text-text2 z-10"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>

          {/* métricas */}
          <div className="grid grid-cols-3 gap-2.5 pr-10">
            <Metric label="ODD">
              <div className="font-mono text-[26px] font-semibold leading-none text-gradient">{fmtOdd(signal.odd)}</div>
              {movimento !== null && movimento !== 0 && (
                <div className={`text-[10.5px] font-semibold mt-1.5 ${movimento > 0 ? "text-success" : "text-warning"}`}>
                  {movimento > 0 ? "▲" : "▼"} de {fmtOdd(signal.odd_abertura!)}
                </div>
              )}
            </Metric>
            <Metric label="PROB. DA ODD">
              <div className="font-mono text-[22px] font-semibold leading-none">{prob.toFixed(0)}%</div>
              <div className="h-1.5 rounded-full bg-white/[0.07] mt-2 overflow-hidden">
                <div className="h-full bg-info rounded-full" style={{ width: `${prob}%` }} />
              </div>
            </Metric>
            {signal.confianca != null ? (
              <Metric label="CONFIANÇA">
                <Ring value={signal.confianca} />
              </Metric>
            ) : (
              <Metric label="NO MERCADO">
                <div className="font-mono text-[22px] font-semibold leading-none text-success">{mercado.pct === null ? "—" : `${mercado.pct}%`}</div>
                <div className="text-[10px] text-muted mt-1.5">{mercado.total} encerrados</div>
              </Metric>
            )}
          </div>

          {/* agentes */}
          <Section title="O que cada agente encontrou">
            <div className="flex flex-col gap-1.5">
              {AGENTES.map((a, i) => {
                const st = agentState(i);
                return (
                  <div
                    key={a.id}
                    className={`flex items-start gap-3 rounded-xl px-3 py-2.5 border transition-all duration-500 ${
                      st === "active" ? "bg-info/10 border-info/40" : st === "done" ? "bg-white/[0.025] border-white/[0.06]" : "border-transparent opacity-35"
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-5 h-5 rounded-full flex-none flex items-center justify-center text-[9px] font-bold border ${
                        st === "done" ? "border-success/50 text-success bg-success/10" : st === "active" ? "border-info text-info" : "border-white/10 text-muted"
                      }`}
                    >
                      {st === "done" ? "✓" : i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold">{a.label}</div>
                      <div className="text-[12px] text-text2 leading-snug mt-0.5">{st === "pending" ? "aguardando…" : achados[a.id]}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <div className={`flex flex-col gap-5 transition-all duration-700 ${done ? "opacity-100 translate-y-0" : "opacity-30 translate-y-2"}`}>
            {isBilhete && legs.length > 0 && (
              <Section title="Jogos do bilhete">
                <div className="flex flex-col divide-y divide-white/[0.06] rounded-xl border border-white/[0.07] overflow-hidden">
                  {legs.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white/[0.02]">
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold truncate">
                          {l.time_a} x {l.time_b}
                        </div>
                        <div className="text-[11px] text-muted">
                          {l.competicao} · {l.mercado}
                        </div>
                      </div>
                      <span className="font-mono text-[13px] font-semibold">{fmtOdd(l.odd)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {signal.rationale && (
              <Section
                title="Por que foi aprovado"
                aside={signal.estrategia ? <span className="text-[10px] font-semibold text-text2 bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded-full">{signal.estrategia}</span> : null}
              >
                <p className="text-[13.5px] text-text2 leading-relaxed">{signal.rationale}</p>
              </Section>
            )}

            <Section title="Por que pode dar errado" tone="warn">
              <div className="rounded-xl border border-warning/25 bg-warning/[0.06] px-4 py-3 text-[13px] leading-relaxed text-text2">
                {signal.riscos ? (
                  <p>{signal.riscos}</p>
                ) : (
                  <p>
                    Nenhuma entrada é certeza. Na odd {fmtOdd(signal.odd)}, o próprio mercado vê cerca de{" "}
                    <span className="text-text font-semibold">{prob.toFixed(0)}%</span> de chance de acontecer — ou seja, ~
                    {(100 - prob).toFixed(0)}% de não acontecer. Entre só com o valor da sua gestão.
                  </p>
                )}
              </div>
            </Section>

            <Section title="Histórico público da Nexus">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <HistBar label={`Mercado · ${signal.mercado}`} r={mercado} />
                <HistBar label={`Competição · ${signal.competicao}`} r={competicao} />
              </div>
            </Section>

            {sugestaoTexto && (
              <div className="flex items-start gap-2 text-[12px] text-info bg-info/10 border border-info/30 rounded-xl px-3.5 py-2.5">
                <span className="font-bold">Sugestão de entrada:</span> {sugestaoTexto}
              </div>
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row gap-2.5 sm:justify-end">
            {signal.casa_link && (
              <Link href={signal.casa_link} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm px-5 py-3 text-center">
                Apostar na {signal.casa_nome || "casa recomendada"}
              </Link>
            )}
            {canMark &&
              (alreadyMarked ? (
                <span className="text-sm font-semibold text-success bg-success/10 border border-success/30 rounded-xl px-5 py-3 text-center">✓ Operação marcada</span>
              ) : (
                <button
                  onClick={() => {
                    onMarcar?.();
                    onClose();
                  }}
                  className="btn-primary text-sm px-6 py-3"
                >
                  {isBilhete ? "Marcar bilhete" : "Marcar operação"}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] px-3.5 py-3 min-w-0">
      <div className="text-[9px] font-bold text-muted tracking-[0.16em] mb-2 truncate">{label}</div>
      {children}
    </div>
  );
}

function Section({ title, children, aside, tone }: { title: string; children: React.ReactNode; aside?: React.ReactNode; tone?: "warn" }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className={`text-[10.5px] font-bold tracking-[0.16em] uppercase ${tone === "warn" ? "text-warning" : "text-primary"}`}>{title}</span>
        {aside}
      </div>
      {children}
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-2">
      <svg width="42" height="42" className="-rotate-90 flex-none">
        <circle cx="21" cy="21" r={r} fill="none" stroke="rgba(120,145,220,.15)" strokeWidth="4" />
        <circle cx="21" cy="21" r={r} fill="none" stroke="#14E3A0" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} />
      </svg>
      <span className="font-mono text-[18px] font-semibold">{value}</span>
    </div>
  );
}

function HistBar({ label, r }: { label: string; r: { total: number; greens: number; pct: number | null } }) {
  return (
    <div className="rounded-xl bg-white/[0.025] border border-white/[0.06] px-3.5 py-3">
      <div className="text-[11px] text-text2 truncate">{label}</div>
      {r.total === 0 ? (
        <div className="text-[12px] text-muted mt-1.5">Sem sinais encerrados ainda</div>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-[22px] font-semibold text-success">{r.pct}%</span>
            <span className="text-[11px] text-muted">
              {r.greens} de {r.total} green
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-danger/30 mt-1.5 overflow-hidden">
            <div className="h-full bg-success rounded-full" style={{ width: `${r.pct}%` }} />
          </div>
        </>
      )}
    </div>
  );
}
