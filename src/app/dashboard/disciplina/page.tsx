"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Operation, PerfilRisco, Signal } from "@/lib/types";
import { SUGESTAO_PERFIL, conquistas, diasDisciplinados, statusHoje, type Regras } from "@/lib/disciplina";
import { formatBRL } from "@/lib/format";

type Op = Operation & { signals: Pick<Signal, "odd"> | null };

const PAUSAS = [
  { h: 24, label: "24 horas" },
  { h: 24 * 7, label: "7 dias" },
  { h: 24 * 30, label: "30 dias" },
];

export default function DisciplinaPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [regras, setRegras] = useState<Regras | null>(null);
  const [ops, setOps] = useState<Op[]>([]);
  const [loading, setLoading] = useState(true);
  const [limite, setLimite] = useState("");
  const [stop, setStop] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [confirmPausa, setConfirmPausa] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const [{ data: prof }, { data: opsData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("limite_diario, stop_diario, pausa_ate, pausas_usadas, regras_desde, perfil_risco, banca_inicial")
          .eq("id", user.id)
          .single(),
        supabase.from("operations").select("*, signals(odd)").eq("user_id", user.id),
      ]);
      const r = (prof || {}) as Regras;
      setRegras(r);
      setLimite(r.limite_diario ? String(r.limite_diario) : "");
      setStop(r.stop_diario ? String(r.stop_diario) : "");
      setOps((opsData as Op[]) || []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const st = useMemo(() => (regras ? statusHoje(ops, regras, now) : null), [ops, regras, now]);
  const lista = useMemo(() => (regras ? conquistas(ops, regras, now) : []), [ops, regras, now]);
  const streak = useMemo(() => (regras ? diasDisciplinados(ops, regras, now) : 0), [ops, regras, now]);
  const banca = regras?.banca_inicial || 0;
  const perfil = (regras?.perfil_risco || "moderado") as PerfilRisco;

  async function salvarRegras(l = limite, s = stop) {
    if (!userId || !regras) return;
    const ln = parseFloat(l.replace(",", "."));
    const sn = parseFloat(s.replace(",", "."));
    const patch = {
      limite_diario: ln > 0 ? ln : null,
      stop_diario: sn > 0 ? sn : null,
      regras_desde: regras.regras_desde || new Date().toISOString(),
    };
    setSalvando(true);
    await supabase.from("profiles").update(patch).eq("id", userId);
    setRegras({ ...regras, ...patch });
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2200);
  }

  function aplicarPerfil(p: PerfilRisco) {
    if (!banca) return;
    const sug = SUGESTAO_PERFIL[p];
    const l = String(Math.round((banca * sug.limitePct) / 100));
    const s = String(Math.round((banca * sug.stopPct) / 100));
    setLimite(l);
    setStop(s);
  }

  async function pausar(horas: number) {
    if (!userId || !regras) return;
    const ate = new Date(Date.now() + horas * 3600_000).toISOString();
    const patch = { pausa_ate: ate, pausas_usadas: (regras.pausas_usadas || 0) + 1 };
    await supabase.from("profiles").update(patch).eq("id", userId);
    setRegras({ ...regras, ...patch });
    setConfirmPausa(null);
  }

  if (loading || !regras || !st) {
    return (
      <div className="max-w-6xl flex flex-col gap-4">
        <div className="h-10 w-72 bg-elevated rounded-xl animate-pulse" />
        <div className="h-64 card animate-pulse" />
      </div>
    );
  }

  const nivelInfo = {
    livre: { txt: "Liberado", desc: "Você está dentro das suas regras hoje.", cor: "#14E3A0" },
    atencao: { txt: "Atenção", desc: "Você já usou mais de 80% do limite de hoje.", cor: "#FFB547" },
    bloqueado: {
      txt: "Encerrado por hoje",
      desc: st.stopAtingido ? "O stop de perda foi atingido. Amanhã a sala abre de novo pra você." : "O limite diário foi usado. Amanhã ele zera.",
      cor: "#FF4D6D",
    },
    pausa: { txt: "Em pausa", desc: "Você escolheu dar um tempo. A sala volta quando a pausa acabar.", cor: "#9B6BFF" },
  }[st.nivel];

  const uso = Math.min(1, st.usoLimite ?? 0);
  const R = 82;
  const C = 2 * Math.PI * R;
  const conquistadas = lista.filter((c) => c.conquistada).length;

  return (
    <div className="flex flex-col gap-5 max-w-6xl">
      <div>
        <span className="eyebrow !text-accent !border-accent/30 !bg-accent/10">
          <span className="eyebrow-dot !bg-accent !shadow-[0_0_12px_#9B6BFF]" />
          Disciplina
        </span>
        <h1 className="font-display text-[30px] md:text-[40px] font-semibold tracking-[-0.035em] leading-tight mt-4">
          Quem dura no jogo é <span className="text-gradient">quem tem regra</span>
        </h1>
        <p className="text-text2 text-sm mt-1.5 max-w-2xl">
          Defina seus limites, pare quando precisar e acompanhe sua sequência de dias no controle. Aqui nada premia apostar mais.
        </p>
      </div>

      {/* ESCUDO DO DIA */}
      <div className="card relative overflow-hidden p-6 md:p-8 grid lg:grid-cols-[auto_1fr] gap-8 items-center">
        <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full blur-[110px] pointer-events-none opacity-40" style={{ background: nivelInfo.cor }} />
        <div className="relative mx-auto" style={{ width: 200, height: 200 }}>
          <svg width="200" height="200" className="-rotate-90">
            <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(120,145,220,.12)" strokeWidth="14" />
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={nivelInfo.cor}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={st.pausado ? 0 : C - uso * C}
              style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 10px ${nivelInfo.cor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {st.pausado ? (
              <>
                <span className="text-[30px]">⏸️</span>
                <span className="font-mono text-[15px] font-semibold mt-1 tabular-nums">
                  {(() => {
                    const ms = st.pausaAte!.getTime() - now;
                    const h = Math.floor(ms / 3600000);
                    const m = Math.floor((ms % 3600000) / 60000);
                    const s = Math.floor((ms % 60000) / 1000);
                    return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
                  })()}
                </span>
                <span className="text-[9.5px] text-muted font-bold tracking-[0.16em] mt-1">RESTANTE</span>
              </>
            ) : (
              <>
                <span className="font-display text-[30px] font-semibold leading-none">{regras.limite_diario ? `${Math.round((st.usoLimite || 0) * 100)}%` : "—"}</span>
                <span className="text-[9.5px] text-muted font-bold tracking-[0.16em] mt-1.5">DO LIMITE HOJE</span>
              </>
            )}
          </div>
        </div>

        <div className="relative flex flex-col gap-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wider" style={{ color: nivelInfo.cor, borderColor: `${nivelInfo.cor}66`, background: `${nivelInfo.cor}1a` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: nivelInfo.cor }} />
              {nivelInfo.txt.toUpperCase()}
            </span>
            <p className="text-text2 text-sm mt-2.5">{nivelInfo.desc}</p>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
            {[
              { l: "APOSTADO HOJE", v: formatBRL(st.apostadoHoje), s: regras.limite_diario ? `de ${formatBRL(regras.limite_diario)}` : "sem limite definido" },
              { l: "RESULTADO HOJE", v: <span className={st.resultadoHoje > 0 ? "text-success" : st.resultadoHoje < 0 ? "text-danger" : ""}>{formatBRL(st.resultadoHoje)}</span>, s: regras.stop_diario ? `stop em -${formatBRL(regras.stop_diario)}` : "sem stop definido" },
              { l: "DIAS NO CONTROLE", v: <span className="text-success">{streak}</span>, s: streak === 1 ? "dia seguido" : "dias seguidos" },
              { l: "CONQUISTAS", v: `${conquistadas}/${lista.length}`, s: "de disciplina" },
            ].map((k) => (
              <div key={k.l} className="rounded-2xl bg-white/[0.03] border border-white/[0.07] px-4 py-3">
                <div className="text-[9.5px] font-bold text-muted tracking-[0.14em]">{k.l}</div>
                <div className="font-display text-[20px] font-semibold mt-1 whitespace-nowrap">{k.v}</div>
                <div className="text-[10.5px] text-muted">{k.s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.25fr_1fr] gap-5">
        {/* REGRAS */}
        <div className="card p-6 flex flex-col gap-5">
          <div>
            <div className="text-[10.5px] font-bold tracking-[0.16em] text-primary">SUAS REGRAS</div>
            <p className="text-sm text-text2 mt-1">Quando uma regra é atingida, a Sala ao Vivo não deixa marcar novas operações até o dia seguinte.</p>
          </div>

          {banca > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-text2 mb-2">Sugestão pelo seu perfil (banca de {formatBRL(banca)})</div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(SUGESTAO_PERFIL) as PerfilRisco[]).map((p) => {
                  const s = SUGESTAO_PERFIL[p];
                  return (
                    <button
                      key={p}
                      onClick={() => aplicarPerfil(p)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 ${
                        p === perfil ? "border-primary/50 bg-primary/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
                      }`}
                    >
                      <div className="text-[12.5px] font-semibold">{s.label}</div>
                      <div className="text-[10.5px] text-muted mt-0.5">
                        {s.limitePct}%/dia · stop {s.stopPct}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-text2">Limite apostado por dia</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">R$</span>
                <input className="input-field pl-8 font-mono" inputMode="decimal" placeholder="ex: 100" value={limite} onChange={(e) => setLimite(e.target.value.replace(/[^0-9.,]/g, ""))} />
              </div>
              {banca > 0 && parseFloat(limite) > 0 && <div className="text-[10.5px] text-muted mt-1">{((parseFloat(limite) / banca) * 100).toFixed(1).replace(".", ",")}% da banca</div>}
            </div>
            <div>
              <label className="text-[11px] font-semibold text-text2">Stop de perda diária</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">R$</span>
                <input className="input-field pl-8 font-mono" inputMode="decimal" placeholder="ex: 80" value={stop} onChange={(e) => setStop(e.target.value.replace(/[^0-9.,]/g, ""))} />
              </div>
              {banca > 0 && parseFloat(stop) > 0 && <div className="text-[10.5px] text-muted mt-1">{((parseFloat(stop) / banca) * 100).toFixed(1).replace(".", ",")}% da banca</div>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => salvarRegras()} disabled={salvando} className="btn-primary text-sm px-6 py-3">
              {salvando ? "Salvando…" : "Salvar regras"}
            </button>
            {salvo && <span className="text-[12px] text-success font-semibold animate-fade-up">✓ Regras ativas</span>}
          </div>
        </div>

        {/* PAUSA */}
        <div className="card p-6 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute -bottom-20 -right-16 w-72 h-72 rounded-full bg-accent/15 blur-[90px] pointer-events-none" />
          <div className="relative">
            <div className="text-[10.5px] font-bold tracking-[0.16em] text-accent">PAUSA VOLUNTÁRIA</div>
            <p className="text-sm text-text2 mt-1">
              Sentiu que é hora de parar? Trave a marcação de operações por um tempo. <span className="text-text">A pausa não pode ser cancelada antes do fim</span> — é isso que faz ela funcionar.
            </p>
          </div>
          {st.pausado ? (
            <div className="relative rounded-2xl border border-accent/30 bg-accent/10 px-4 py-4">
              <div className="text-sm font-semibold">Pausa ativa</div>
              <div className="text-[12.5px] text-text2 mt-1">
                Termina em {st.pausaAte!.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}. Os sinais e o histórico continuam abertos pra você acompanhar.
              </div>
            </div>
          ) : confirmPausa ? (
            <div className="relative rounded-2xl border border-warning/30 bg-warning/[0.07] px-4 py-4 flex flex-col gap-3 animate-fade-up">
              <div className="text-sm">
                Pausar por <span className="font-semibold">{PAUSAS.find((p) => p.h === confirmPausa)?.label}</span>? Você não vai conseguir marcar operações até o fim.
              </div>
              <div className="flex gap-2">
                <button onClick={() => pausar(confirmPausa)} className="btn-primary text-xs px-4 py-2.5">
                  Confirmar pausa
                </button>
                <button onClick={() => setConfirmPausa(null)} className="btn-ghost text-xs px-4 py-2.5">
                  Voltar
                </button>
              </div>
            </div>
          ) : (
            <div className="relative grid grid-cols-3 gap-2">
              {PAUSAS.map((p) => (
                <button key={p.h} onClick={() => setConfirmPausa(p.h)} className="rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-accent/50 hover:bg-accent/10 px-3 py-3.5 text-center transition-all">
                  <div className="text-[18px]">⏸️</div>
                  <div className="text-[12.5px] font-semibold mt-1">{p.label}</div>
                </button>
              ))}
            </div>
          )}
          <p className="relative text-[11px] text-muted mt-auto">
            Se o jogo estiver deixando de ser diversão, procure ajuda. No Brasil, o CVV atende 24h pelo 188.
          </p>
        </div>
      </div>

      {/* CONQUISTAS */}
      <div>
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <div className="text-[10.5px] font-bold tracking-[0.16em] text-primary">CONQUISTAS DE DISCIPLINA</div>
            <p className="text-[12.5px] text-text2 mt-0.5">Medalhas por controle — nunca por volume de apostas.</p>
          </div>
          <span className="text-[12px] text-muted">
            {conquistadas} de {lista.length}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {lista.map((c, i) => (
            <div
              key={c.id}
              className={`card p-5 flex flex-col items-center text-center gap-3 animate-fade-up ${c.conquistada ? "" : "opacity-70"}`}
              style={{ animationDelay: `${i * 60}ms`, ...(c.conquistada ? { borderColor: `${c.cor}55`, boxShadow: `0 20px 60px -30px ${c.cor}` } : {}) }}
            >
              <div className="relative w-[76px] h-[76px]" style={{ perspective: 400 }}>
                <div
                  className={`absolute inset-0 rounded-full flex items-center justify-center text-[30px] ${c.conquistada ? "animate-float" : "grayscale"}`}
                  style={{
                    background: c.conquistada
                      ? `radial-gradient(circle at 35% 30%, #ffffff55, transparent 45%), conic-gradient(from 210deg, ${c.cor}, #ffffff22, ${c.cor})`
                      : "conic-gradient(from 210deg, #1B2547, #2a3766, #1B2547)",
                    boxShadow: c.conquistada ? `0 0 30px ${c.cor}88, inset 0 -6px 12px #00000055` : "inset 0 -6px 12px #00000055",
                    transform: "rotateX(12deg)",
                  }}
                >
                  <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,.5)]">{c.icone}</span>
                </div>
              </div>
              <div>
                <div className="text-[14px] font-semibold">{c.titulo}</div>
                <div className="text-[11.5px] text-text2 mt-1 leading-snug">{c.desc}</div>
              </div>
              <div className="w-full mt-auto">
                <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${c.progresso * 100}%`, background: c.cor }} />
                </div>
                <div className="text-[10.5px] mt-1.5 font-semibold" style={{ color: c.conquistada ? c.cor : "#69759A" }}>
                  {c.conquistada ? "✓ Conquistada" : c.progressoTxt}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
