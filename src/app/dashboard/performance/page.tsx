"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShareResultButton } from "@/components/ShareResult";
import type { Signal } from "@/lib/types";

type Periodo = "todo" | "mes" | "ano";
const PAGE_SIZE = 10;

function statsFor(signals: Signal[]) {
  const greens = signals.filter((s) => s.status === "green").length;
  const reds = signals.filter((s) => s.status === "red").length;
  const total = greens + reds;
  const assertividade = total ? (greens / total) * 100 : null;
  return { greens, reds, total, assertividade };
}

function fmtPct1(v: number) {
  return `${v.toFixed(1).replace(".", ",")}%`;
}

function initials(text: string) {
  const letters = text
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return letters.slice(0, 2) || "•";
}

const StatIcon = {
  bars: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19V10M10 19V5M16 19V13M22 19V8" strokeLinecap="round" />
    </svg>
  ),
  check: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  x: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" />
    </svg>
  ),
  shield: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" strokeLinejoin="round" />
      <path d="M8.5 12l2.3 2.3L16 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  calendar: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16M7 6v14M17 6v14M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  ),
};

// Anel de progresso pra assertividade geral — o "hero" visual da página, no lugar dos 4
// cards quadrados iguais que a Oris usa. Escala uniforme (width === height), então não sofre
// distorção de elipse mesmo dentro de um layout flexível.
function AssertividadeGauge({ value }: { value: number | null }) {
  const size = 164;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value ?? 0;
  const offset = c - (pct / 100) * c;
  const color = value === null ? "#69759A" : pct >= 90 ? "#14E3A0" : pct >= 70 ? "#4F7BFF" : "#FFB547";

  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1B2547" strokeWidth={stroke} />
        {value !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[28px] font-bold leading-none">
          {value === null ? "—" : fmtPct1(value)}
        </span>
        <span className="text-[9.5px] font-semibold text-text2 tracking-wide mt-1.5 text-center px-2">
          ASSERTIVIDADE
        </span>
      </div>
    </div>
  );
}

// Barras (volume de eventos) + linha (assertividade) sobrepostas — combo chart, bem diferente
// da lista de barras horizontais empilhadas da Oris. Os pontos da linha são <span> HTML
// posicionados por %, não <circle> de SVG — evita a distorção elíptica que rolaria ao
// esticar um viewBox quadrado dentro de um card bem mais largo que alto.
function TendenciaMensal({
  monthly,
}: {
  monthly: { key: string; label: string; total: number; assertividade: number | null }[];
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (monthly.length === 0) {
    return (
      <div className="text-center text-sm text-text2 py-10">
        Ainda não há sinais encerrados suficientes pra montar uma tendência mensal.
      </div>
    );
  }

  const maxTotal = Math.max(1, ...monthly.map((m) => m.total));
  const linePts = monthly.map((m, i) => ({
    x: monthly.length > 1 ? (i / (monthly.length - 1)) * 100 : 50,
    y: 100 - (m.assertividade ?? 0),
  }));
  const lineStr = linePts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div>
      <div className="relative h-48" onMouseLeave={() => setHover(null)}>
        <div className="absolute inset-0 flex items-end gap-2 sm:gap-3">
          {monthly.map((m, i) => (
            <div
              key={m.key}
              className="flex-1 h-full flex items-end justify-center cursor-default"
              onMouseEnter={() => setHover(i)}
            >
              <div
                className={`w-full max-w-[34px] rounded-t-md transition-colors duration-150 ${
                  hover === i ? "bg-primary/60" : "bg-elevated"
                }`}
                style={{ height: `${Math.max(4, (m.total / maxTotal) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={lineStr}
            fill="none"
            stroke="#4F7BFF"
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        {linePts.map((p, i) => (
          <span
            key={monthly[i].key}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: "translate(-50%, -50%)",
              width: hover === i ? 10 : 7,
              height: hover === i ? 10 : 7,
              background: hover === i ? "#4F7BFF" : "#F4F6FA",
              border: "2px solid #03050C",
              transition: "width 0.12s, height 0.12s",
            }}
          />
        ))}
        {hover !== null && (
          <div
            className="absolute bg-elevated border border-border rounded-lg px-3 py-2 text-[11px] shadow-lg pointer-events-none whitespace-nowrap z-10"
            style={{
              left: `${linePts[hover].x}%`,
              top: `${linePts[hover].y}%`,
              transform: "translate(-50%, calc(-100% - 12px))",
            }}
          >
            <div className="font-semibold capitalize">{monthly[hover].label}</div>
            <div className="text-text2">
              {monthly[hover].total} eventos ·{" "}
              {monthly[hover].assertividade === null ? "—" : fmtPct1(monthly[hover].assertividade)}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 sm:gap-3 mt-2">
        {monthly.map((m, i) => (
          <div key={m.key} className="flex-1 text-center min-w-0">
            <div className={`text-[10px] font-semibold capitalize truncate ${hover === i ? "text-text" : "text-muted"}`}>
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResultadosPage() {
  const supabase = createClient();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>("todo");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from("signals")
        .select("*")
        .in("status", ["green", "red"])
        .order("created_at", { ascending: false });
      setSignals(data || []);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = useMemo(() => new Date(), []);
  const customAtivo = Boolean(dataInicio || dataFim);

  const filtered = useMemo(() => {
    if (customAtivo) {
      const inicio = dataInicio ? new Date(dataInicio + "T00:00:00") : null;
      const fim = dataFim ? new Date(dataFim + "T23:59:59") : null;
      return signals.filter((s) => {
        const d = new Date(s.created_at);
        if (inicio && d < inicio) return false;
        if (fim && d > fim) return false;
        return true;
      });
    }
    if (periodo === "todo") return signals;
    return signals.filter((s) => {
      const d = new Date(s.created_at);
      if (periodo === "ano") return d.getFullYear() === now.getFullYear();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [signals, periodo, now, customAtivo, dataInicio, dataFim]);

  const stats = statsFor(filtered);

  // Últimos 12 meses com pelo menos um sinal encerrado, mais recente primeiro. Sempre a
  // partir de TODOS os sinais (não do filtro de período acima) — é uma visão histórica à
  // parte, igual ao protótipo de referência.
  const monthly = useMemo(() => {
    const buckets = new Map<string, Signal[]>();
    for (const s of signals) {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(s);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 12)
      .map(([key, list]) => {
        const [year, month] = key.split("-");
        const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
          month: "short",
          year: "numeric",
        });
        return { key, label, ...statsFor(list) };
      })
      .reverse();
  }, [signals]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  function mudarPeriodo(p: Periodo) {
    setPeriodo(p);
    setDataInicio("");
    setDataFim("");
    setPage(1);
  }

  const periodos: { id: Periodo; label: string }[] = [
    { id: "todo", label: "Todo histórico" },
    { id: "mes", label: "Mês atual" },
    { id: "ano", label: "Ano atual" },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-none">
            {StatIcon.shield}
          </span>
          <span className="text-[11px] font-bold tracking-[0.18em] text-info">RESULTADOS</span>
        </div>
        <h1 className="font-display text-[28px] md:text-[34px] font-semibold tracking-[-0.03em] leading-tight mb-1">Resultados verificados</h1>
        <p className="text-text2 text-sm">
          Todo sinal encerrado conta — sem esconder red, sem número inflado. Aberto pra todo
          mundo, assinante ou não.
        </p>
      </div>

      {loading ? (
        <div className="card p-7 text-center text-sm text-text2">Carregando…</div>
      ) : (
        <>
          {/* HERO: anel de assertividade + mini-stats + filtro de período, tudo num único
              painel — no lugar dos 4 cards quadrados + card de filtro separado da Oris. */}
          <div className="card relative overflow-hidden p-6 sm:p-7">
            <div className="absolute -top-16 -left-10 w-64 h-64 bg-primary opacity-[0.10] blur-[80px] rounded-full pointer-events-none" />
            <div className="relative flex flex-col lg:flex-row lg:items-center gap-7">
              <div className="flex items-center gap-6 flex-none">
                <AssertividadeGauge value={stats.assertividade} />
                <div className="flex flex-col gap-3.5">
                  {[
                    { label: "Eventos", value: stats.total, icon: StatIcon.bars, color: "" },
                    { label: "Greens", value: stats.greens, icon: StatIcon.check, color: "text-success" },
                    { label: "Reds", value: stats.reds, icon: StatIcon.x, color: "text-danger" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-elevated flex items-center justify-center text-text2 flex-none">
                        {s.icon}
                      </span>
                      <div>
                        <div className={`font-mono text-lg font-bold leading-none ${s.color}`}>{s.value}</div>
                        <div className="text-[10.5px] text-muted mt-0.5">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 lg:border-l lg:border-border lg:pl-7 flex flex-col gap-3 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-text2">
                  {StatIcon.calendar}
                  Período da análise
                </div>
                <div className="inline-flex bg-surface border border-border rounded-[10px] p-1 w-fit">
                  {periodos.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => mudarPeriodo(p.id)}
                      className={`px-4 py-2 rounded-[7px] text-[12.5px] font-semibold transition-colors ${
                        !customAtivo && periodo === p.id ? "bg-primary text-white" : "text-text2 hover:text-text"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-end gap-3 mt-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-text2">Início</label>
                    <input
                      type="date"
                      className="input-field text-sm py-2"
                      value={dataInicio}
                      onChange={(e) => {
                        setDataInicio(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-text2">Fim</label>
                    <input
                      type="date"
                      className="input-field text-sm py-2"
                      value={dataFim}
                      onChange={(e) => {
                        setDataFim(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-none">
                {StatIcon.bars}
              </span>
              <span className="font-bold">Tendência mensal</span>
            </div>
            <p className="text-text2 text-sm mb-5">
              Volume de eventos encerrados (barras) e assertividade (linha) nos últimos meses.
            </p>
            <TendenciaMensal monthly={monthly} />
          </div>

          <div className="card p-6">
            <div className="font-bold mb-1">Eventos detalhados</div>
            <p className="text-text2 text-sm mb-4">
              Lista dos eventos considerados no cálculo dos resultados, no período selecionado.
            </p>

            {pageItems.length === 0 ? (
              <div className="text-center text-sm text-text2 py-6">
                Nenhum evento encerrado nesse período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold tracking-wide text-muted border-b border-border">
                      <th className="pb-2.5 pr-3">Evento</th>
                      <th className="pb-2.5 px-3">Estratégia</th>
                      <th className="pb-2.5 px-3">Resultado</th>
                      <th className="pb-2.5 px-3">Odd</th>
                      <th className="pb-2.5 pl-3">Abertura do evento</th>
                      <th className="pb-2.5 pl-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((s) => {
                      const nome = s.tipo === "bilhete" ? s.time_b : `${s.time_a} ${s.time_b}`;
                      return (
                        <tr
                          key={s.id}
                          className="border-b border-border/70 last:border-0 hover:bg-elevated/40 transition-colors"
                        >
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-full bg-elevated border border-border flex items-center justify-center text-[10px] font-bold text-text2 flex-none">
                                {initials(nome)}
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold truncate">
                                  {s.tipo === "bilhete" ? s.time_b : `${s.time_a} x ${s.time_b}`}
                                </div>
                                <div className="text-[11px] text-muted truncate">{s.mercado}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-text2">{s.estrategia || "—"}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1.5 text-[11px] font-bold rounded-full px-2.5 py-1 ${
                                s.status === "green" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-none ${
                                  s.status === "green" ? "bg-success" : "bg-danger"
                                }`}
                              />
                              {s.status === "green" ? "Green" : "Red"}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono bg-elevated rounded px-1.5 py-0.5 text-[12.5px]">{s.odd}</span>
                          </td>
                          <td className="py-3 pl-3 text-text2 whitespace-nowrap">
                            {new Date(s.created_at).toLocaleDateString("pt-BR")},{" "}
                            {new Date(s.created_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 pl-3">
                            <ShareResultButton
                              compact
                              data={{
                                competicao: s.competicao,
                                timeA: s.time_a,
                                timeB: s.time_b,
                                mercado: s.tipo === "bilhete" ? "Bilhete combinado" : s.mercado,
                                odd: s.odd,
                                status: s.status as "green" | "red",
                                data: s.created_at,
                                bilhete: s.tipo === "bilhete",
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="text-xs text-muted">
                  Página {pageClamped} de {totalPages} · Mostrando{" "}
                  {(pageClamped - 1) * PAGE_SIZE + 1}-{Math.min(pageClamped * PAGE_SIZE, filtered.length)}{" "}
                  de {filtered.length} eventos
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pageClamped <= 1}
                    className="btn-outline text-xs px-3 py-1.5 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={pageClamped >= totalPages}
                    className="btn-outline text-xs px-3 py-1.5 disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
