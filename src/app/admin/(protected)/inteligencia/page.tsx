"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Operation, Profile, Signal, Subscription } from "@/lib/types";
import { desempenho, funil, receita, riscoCancelamento, type LinhaDesempenho } from "@/lib/inteligencia";
import { formatBRL } from "@/lib/format";

type Janela = 30 | 90 | 0;
type Dim = "mercado" | "competicao" | "estrategia" | "faixaOdd";

const DIMS: { id: Dim; label: string }[] = [
  { id: "mercado", label: "Mercado" },
  { id: "competicao", label: "Competição" },
  { id: "estrategia", label: "Estratégia" },
  { id: "faixaOdd", label: "Faixa de odd" },
];

const PLANO_COR: Record<string, string> = { mensal: "#4F7BFF", semestral: "#33D6F5", anual: "#9B6BFF" };

export default function InteligenciaPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<Profile[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [ops, setOps] = useState<Pick<Operation, "user_id" | "created_at">[]>([]);
  const [loading, setLoading] = useState(true);
  const [janela, setJanela] = useState<Janela>(90);
  const [dim, setDim] = useState<Dim>("mercado");
  const [filtroRisco, setFiltroRisco] = useState<"todos" | "alto" | "medio">("todos");

  useEffect(() => {
    (async () => {
      const [u, s, sg, o] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("subscriptions").select("*"),
        supabase.from("signals").select("*"),
        supabase.from("operations").select("user_id, created_at"),
      ]);
      setUsers((u.data as Profile[]) || []);
      setSubs((s.data as Subscription[]) || []);
      setSignals((sg.data as Signal[]) || []);
      setOps((o.data as Pick<Operation, "user_id" | "created_at">[]) || []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Assinaturas de contas admin não contam como receita (mesma regra da Visão geral).
  const adminIds = useMemo(() => new Set(users.filter((u) => u.role === "admin").map((u) => u.id)), [users]);
  const subsReais = useMemo(() => subs.filter((s) => !adminIds.has(s.user_id)), [subs, adminIds]);
  const f = useMemo(() => funil(users, subsReais, janela || null), [users, subsReais, janela]);
  const r = useMemo(() => receita(subsReais), [subsReais]);
  const d = useMemo(() => desempenho(signals), [signals]);
  const risco = useMemo(() => riscoCancelamento(users, subsReais, ops), [users, subsReais, ops]);

  const linhas = d[dim];
  const comVolume = linhas.filter((l) => l.n >= 3);
  const melhor = comVolume.slice().sort((a, b) => b.roi - a.roi)[0];
  const pior = comVolume.slice().sort((a, b) => a.roi - b.roi)[0];
  const maxRoi = Math.max(1, ...linhas.map((l) => Math.abs(l.roi)));
  const riscoFiltrado = risco.filter((x) => (filtroRisco === "todos" ? x.nivel !== "baixo" || risco.length <= 8 : x.nivel === filtroRisco));
  const altos = risco.filter((x) => x.nivel === "alto").length;
  const mrrEmRisco = risco.filter((x) => x.nivel === "alto").reduce((a, x) => a + x.sub.valor * ({ mensal: 1, semestral: 1 / 6, anual: 1 / 12 }[x.sub.plano] ?? 1), 0);

  if (loading) {
    return (
      <div className="max-w-6xl flex flex-col gap-4">
        <div className="h-10 w-80 bg-elevated rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // donut de receita por plano
  const totalMrr = r.porPlano.reduce((a, p) => a + p.mrr, 0) || 1;
  let acc = 0;
  const RD = 54;
  const CD = 2 * Math.PI * RD;
  const maxSemana = Math.max(1, ...r.semanas.map((s) => Math.max(s.novas, s.canceladas)));

  return (
    <div className="flex flex-col gap-5 max-w-6xl">
      <div>
        <span className="eyebrow !text-accent !border-accent/30 !bg-accent/10">
          <span className="eyebrow-dot !bg-accent !shadow-[0_0_12px_#9B6BFF]" />
          Inteligência
        </span>
        <h1 className="font-display text-[30px] md:text-[40px] font-semibold tracking-[-0.035em] leading-tight mt-4">
          O que os números <span className="text-gradient">estão dizendo</span>
        </h1>
        <p className="text-text2 text-sm mt-1.5">Funil, receita, onde a Nexus acerta mais e quem está prestes a cancelar — tudo calculado dos dados reais.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { l: "MRR", v: formatBRL(r.mrr), c: "text-gradient", s: `${r.ativas} assinaturas ativas` },
          { l: "ARR", v: formatBRL(r.arr), c: "", s: "MRR × 12" },
          { l: "TICKET MÉDIO", v: formatBRL(r.arpu), c: "", s: "por assinante/mês" },
          { l: "CHURN 30D", v: `${(r.churn * 100).toFixed(1).replace(".", ",")}%`, c: r.churn > 0.08 ? "text-danger" : r.churn > 0.04 ? "text-warning" : "text-success", s: `${r.cancel30} cancelamentos` },
          { l: "NOVAS 30D", v: `${r.novas30}`, c: "text-success", s: "assinaturas" },
          { l: "MRR EM RISCO", v: formatBRL(mrrEmRisco), c: altos ? "text-warning" : "", s: `${altos} em risco alto` },
        ].map((k, i) => (
          <div key={k.l} className="card px-4 py-3.5 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="text-[9.5px] font-bold text-muted tracking-[0.14em] whitespace-nowrap">{k.l}</div>
            <div className={`font-display text-[20px] font-semibold mt-1 whitespace-nowrap ${k.c}`}>{k.v}</div>
            <div className="text-[10.5px] text-muted mt-0.5">{k.s}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-5">
        {/* FUNIL */}
        <div className="card p-6">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="text-[10.5px] font-bold tracking-[0.16em] text-primary">FUNIL DE CONVERSÃO</div>
            <div className="inline-flex bg-white/[0.03] border border-white/[0.08] rounded-lg p-0.5 flex-none">
              {([30, 90, 0] as Janela[]).map((j) => (
                <button key={j} onClick={() => setJanela(j)} className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold ${janela === j ? "bg-white/[0.1] text-text" : "text-text2"}`}>
                  {j ? `${j}d` : "Tudo"}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[12px] text-muted mb-5">Visitas da landing não são rastreadas — o funil começa no cadastro.</p>
          <div className="flex flex-col gap-2">
            {f.map((e, i) => (
              <div key={e.label}>
                {i > 0 && (
                  <div className="flex items-center gap-2 pl-4 py-1 text-[10.5px] text-muted">
                    <span>↓</span>
                    <span className={e.pctAnterior < 30 ? "text-warning font-semibold" : ""}>{e.pctAnterior.toFixed(0)}% passam pra cá</span>
                  </div>
                )}
                <div className="relative h-14 rounded-xl overflow-hidden bg-white/[0.025] border border-white/[0.05]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-xl transition-all duration-1000"
                    style={{
                      width: `${Math.max(4, e.pctTopo)}%`,
                      background: `linear-gradient(90deg, rgba(79,123,255,${0.55 - i * 0.08}), rgba(155,107,255,${0.35 - i * 0.05}))`,
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,.12)",
                    }}
                  />
                  <div className="relative h-full flex items-center justify-between px-4">
                    <div>
                      <div className="text-[13.5px] font-semibold">{e.label}</div>
                      <div className="text-[10.5px] text-text2">{e.desc}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-[20px] font-semibold leading-none">{e.n}</div>
                      <div className="text-[10px] text-muted mt-0.5">{e.pctTopo.toFixed(0)}% do topo</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RECEITA POR PLANO + PROJEÇÃO */}
        <div className="card p-6 flex flex-col gap-5">
          <div className="text-[10.5px] font-bold tracking-[0.16em] text-primary">RECEITA POR PLANO</div>
          <div className="flex items-center gap-5">
            <div className="relative flex-none" style={{ width: 132, height: 132 }}>
              <svg width="132" height="132" className="-rotate-90">
                <circle cx="66" cy="66" r={RD} fill="none" stroke="rgba(120,145,220,.1)" strokeWidth="16" />
                {r.porPlano.map((p) => {
                  const frac = p.mrr / totalMrr;
                  const el = (
                    <circle
                      key={p.plano}
                      cx="66"
                      cy="66"
                      r={RD}
                      fill="none"
                      stroke={PLANO_COR[p.plano]}
                      strokeWidth="16"
                      strokeDasharray={`${frac * CD} ${CD}`}
                      strokeDashoffset={-acc * CD}
                      style={{ filter: `drop-shadow(0 0 6px ${PLANO_COR[p.plano]}88)` }}
                    />
                  );
                  acc += frac;
                  return el;
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[9px] text-muted font-bold tracking-[0.14em]">MRR</span>
                <span className="font-display text-[15px] font-semibold">{formatBRL(r.mrr).replace(",00", "")}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 flex-1 min-w-0">
              {r.porPlano.map((p) => (
                <div key={p.plano} className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-sm flex-none" style={{ background: PLANO_COR[p.plano] }} />
                  <span className="text-[12.5px] capitalize flex-1">
                    {p.plano} <span className="text-muted">· {p.n}</span>
                  </span>
                  <span className="font-mono text-[12px]">{formatBRL(p.mrr)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-white/[0.06]">
            <div className="text-[10.5px] font-bold tracking-[0.16em] text-text2">PROJEÇÃO DE MRR · SE NADA MUDAR</div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {r.projecao.map((p) => (
                <div key={p.meses} className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
                  <div className="text-[10px] text-muted">{p.meses} meses</div>
                  <div className={`font-mono text-[14px] font-semibold mt-0.5 ${p.mrr >= r.mrr ? "text-success" : "text-danger"}`}>{formatBRL(p.mrr).replace(",00", "")}</div>
                </div>
              ))}
            </div>
            <p className="text-[10.5px] text-muted mt-2">Churn de 30d aplicado todo mês + o mesmo ritmo de novas assinaturas.</p>
          </div>
        </div>
      </div>

      {/* NOVAS x CANCELADAS */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10.5px] font-bold tracking-[0.16em] text-primary">NOVAS × CANCELADAS · 8 SEMANAS</div>
          <div className="flex gap-4 text-[11px] text-text2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-success" /> novas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-danger" /> canceladas
            </span>
          </div>
        </div>
        <div className="flex items-end gap-3 h-36">
          {r.semanas.map((s) => (
            <div key={s.label} className="flex-1 flex flex-col items-center gap-1.5 h-full">
              <div className="flex-1 w-full flex items-end justify-center gap-1">
                <div className="w-1/2 max-w-[18px] rounded-t-md bg-gradient-to-t from-success/50 to-success transition-all duration-700" style={{ height: `${(s.novas / maxSemana) * 100}%`, minHeight: s.novas ? 4 : 0 }} title={`${s.novas} novas`} />
                <div className="w-1/2 max-w-[18px] rounded-t-md bg-gradient-to-t from-danger/50 to-danger transition-all duration-700" style={{ height: `${(s.canceladas / maxSemana) * 100}%`, minHeight: s.canceladas ? 4 : 0 }} title={`${s.canceladas} canceladas`} />
              </div>
              <span className="text-[9.5px] text-muted font-mono">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* DESEMPENHO DOS SINAIS */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5">
          <div>
            <div className="text-[10.5px] font-bold tracking-[0.16em] text-primary">ONDE A NEXUS ACERTA MAIS</div>
            <p className="text-[12px] text-muted mt-0.5">ROI por sinal com 1 unidade na odd publicada. Use pra decidir o que publicar mais (e menos).</p>
          </div>
          <div className="inline-flex bg-white/[0.03] border border-white/[0.08] rounded-lg p-0.5 self-start">
            {DIMS.map((x) => (
              <button key={x.id} onClick={() => setDim(x.id)} className={`px-3 py-1.5 rounded-md text-[11.5px] font-semibold whitespace-nowrap ${dim === x.id ? "bg-white/[0.1] text-text" : "text-text2"}`}>
                {x.label}
              </button>
            ))}
          </div>
        </div>

        {(melhor || pior) && (
          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            {melhor && <Insight tom="success" titulo="Mais forte" l={melhor} />}
            {pior && pior.chave !== melhor?.chave && <Insight tom="danger" titulo="Mais fraco" l={pior} />}
          </div>
        )}

        <div className="flex flex-col divide-y divide-white/[0.05]">
          <div className="grid grid-cols-[minmax(0,1.4fr)_60px_70px_minmax(0,1.6fr)_80px] gap-3 pb-2 text-[9.5px] font-bold text-muted tracking-[0.12em]">
            <span>{DIMS.find((x) => x.id === dim)!.label.toUpperCase()}</span>
            <span className="text-right">SINAIS</span>
            <span className="text-right">GREEN</span>
            <span className="text-center">ROI</span>
            <span className="text-right">ODD MÉD.</span>
          </div>
          {linhas.length === 0 && <div className="py-6 text-center text-sm text-muted">Nenhum sinal encerrado ainda.</div>}
          {linhas.map((l) => (
            <div key={l.chave} className="grid grid-cols-[minmax(0,1.4fr)_60px_70px_minmax(0,1.6fr)_80px] gap-3 items-center py-2.5">
              <span className="text-[13px] font-semibold truncate">{l.chave}</span>
              <span className="font-mono text-[12.5px] text-right text-text2">{l.n}</span>
              <span className={`font-mono text-[12.5px] text-right ${l.pct >= 70 ? "text-success" : l.pct < 50 ? "text-danger" : ""}`}>{l.pct}%</span>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 h-2 rounded-full bg-white/[0.05]">
                  <div className="absolute left-1/2 -top-1 -bottom-1 w-px bg-white/15" />
                  <div
                    className={`absolute top-0 bottom-0 rounded-full ${l.roi >= 0 ? "left-1/2 bg-success" : "right-1/2 bg-danger"}`}
                    style={{ width: `${(Math.abs(l.roi) / maxRoi) * 50}%` }}
                  />
                </div>
                <span className={`font-mono text-[11.5px] w-14 text-right ${l.roi >= 0 ? "text-success" : "text-danger"}`}>
                  {l.roi >= 0 ? "+" : ""}
                  {l.roi.toFixed(0)}%
                </span>
              </div>
              <span className="font-mono text-[12.5px] text-right text-text2">{l.oddMedia.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <p className="text-[10.5px] text-muted mt-3">Destaques só consideram grupos com 3+ sinais encerrados — amostra pequena engana.</p>
      </div>

      {/* RISCO DE CANCELAMENTO */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5">
          <div>
            <div className="text-[10.5px] font-bold tracking-[0.16em] text-warning">RISCO DE CANCELAMENTO</div>
            <p className="text-[12px] text-muted mt-0.5">Assinantes que pararam de abrir o painel, não operam, estão com pagamento atrasado ou renovando — aja antes de perder.</p>
          </div>
          <div className="inline-flex bg-white/[0.03] border border-white/[0.08] rounded-lg p-0.5 self-start">
            {(
              [
                ["todos", "Prioridade"],
                ["alto", "Alto"],
                ["medio", "Médio"],
              ] as const
            ).map(([id, l]) => (
              <button key={id} onClick={() => setFiltroRisco(id)} className={`px-3 py-1.5 rounded-md text-[11.5px] font-semibold ${filtroRisco === id ? "bg-white/[0.1] text-text" : "text-text2"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {riscoFiltrado.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted">Nenhum assinante nesse nível de risco. 👌</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {riscoFiltrado.map((x) => {
              const cor = x.nivel === "alto" ? "#FF4D6D" : x.nivel === "medio" ? "#FFB547" : "#14E3A0";
              const tel = (x.user.phone || "").replace(/\D/g, "");
              const primeiro = (x.user.name || "").split(" ")[0] || "tudo bem";
              const msg = encodeURIComponent(`Oi, ${primeiro}! Aqui é da equipe Nexus Tips. Passando pra saber como está sua experiência na plataforma — posso te ajudar em algo?`);
              return (
                <div key={x.sub.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 flex gap-4">
                  <div className="relative flex-none" style={{ width: 52, height: 52 }}>
                    <svg width="52" height="52" className="-rotate-90">
                      <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(120,145,220,.12)" strokeWidth="5" />
                      <circle cx="26" cy="26" r="21" fill="none" stroke={cor} strokeWidth="5" strokeLinecap="round" strokeDasharray={2 * Math.PI * 21} strokeDashoffset={2 * Math.PI * 21 * (1 - x.score / 100)} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center font-mono text-[13px] font-semibold">{x.score}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-semibold truncate">{x.user.name || x.user.email}</span>
                      <span className="text-[9.5px] font-bold tracking-wider rounded-full px-2 py-0.5 flex-none" style={{ color: cor, background: `${cor}1f`, border: `1px solid ${cor}55` }}>
                        {x.nivel === "alto" ? "ALTO" : x.nivel === "medio" ? "MÉDIO" : "BAIXO"}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted truncate">
                      {x.user.email} · plano {x.sub.plano}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {x.motivos.map((m) => (
                        <span key={m} className="text-[10.5px] text-text2 bg-white/[0.04] border border-white/[0.07] rounded-full px-2 py-0.5">
                          {m}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                      {tel.length >= 10 && (
                        <a
                          href={`https://wa.me/${tel.length <= 11 ? "55" + tel : tel}?text=${msg}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11.5px] font-semibold rounded-lg px-3 py-1.5 border border-success/40 bg-success/10 text-success hover:bg-success/20 transition-colors"
                        >
                          Chamar no WhatsApp
                        </a>
                      )}
                      <Link href="/admin/usuarios" className="text-[11.5px] font-semibold rounded-lg px-3 py-1.5 border border-white/10 bg-white/[0.04] text-text2 hover:text-text transition-colors">
                        Ver em Usuários
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Insight({ tom, titulo, l }: { tom: "success" | "danger"; titulo: string; l: LinhaDesempenho }) {
  const c = tom === "success" ? "#14E3A0" : "#FF4D6D";
  return (
    <div className="rounded-2xl px-4 py-3.5 border" style={{ borderColor: `${c}44`, background: `${c}0f` }}>
      <div className="text-[10px] font-bold tracking-[0.14em]" style={{ color: c }}>
        {titulo.toUpperCase()}
      </div>
      <div className="text-[15px] font-semibold mt-1 truncate">{l.chave}</div>
      <div className="text-[11.5px] text-text2 mt-0.5">
        {l.n} sinais · {l.pct}% green · ROI {l.roi >= 0 ? "+" : ""}
        {l.roi.toFixed(1).replace(".", ",")}% por sinal
      </div>
    </div>
  );
}
