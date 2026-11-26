"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Signal, SignalLeg, Operation } from "@/lib/types";
import { sugestaoDoSinal } from "@/lib/sugestao";
import { temAcessoLiberado } from "@/lib/access";
import { faseDoJogo, fmtCountdown, fmtOdd, probImplicita, recorte, type SinalEncerrado } from "@/lib/insights";
import { SignalXRay } from "@/components/SignalXRay";
import { checarEntrada, statusHoje, type Regras } from "@/lib/disciplina";
import { formatBRL } from "@/lib/format";

type SignalRow = Signal & { signal_legs: SignalLeg[] };
type Filtro = "todos" | "vivo" | "proximos";

// =====================================================================================
// SALA AO VIVO — antiga tela de Eventos. Mesma lógica de dados (sinais "no_ar" em tempo
// real + marcar operação), com outra cara: destaque do próximo sinal com contagem
// regressiva, cards "vivos" com progresso do jogo e o Raio-X de cada sinal.
// =====================================================================================

const SkeletonCard = () => (
  <div className="card p-5 animate-pulse">
    <div className="h-2.5 w-24 bg-elevated rounded mb-4" />
    <div className="h-5 w-48 bg-elevated rounded mb-2" />
    <div className="h-3 w-28 bg-elevated rounded" />
    <div className="h-9 w-full bg-elevated rounded-xl mt-5" />
  </div>
);

const IconXRay = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-none">
    <circle cx="12" cy="12" r="3" />
    <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" strokeLinejoin="round" />
  </svg>
);

export default function EventosPage() {
  const supabase = createClient();
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [encerrados, setEncerrados] = useState<SinalEncerrado[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [bancaAtual, setBancaAtual] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [competicao, setCompeticao] = useState<string | null>(null);
  const [xrayId, setXrayId] = useState<string | null>(null);
  const [regras, setRegras] = useState<Regras | null>(null);
  const [favoritas, setFavoritas] = useState<string[]>([]);
  const [erroEntrada, setErroEntrada] = useState<string | null>(null);

  // Formulário de marcar operação: qual sinal está aberto, valor e odd que a pessoa
  // realmente conseguiu na casa dela (pode ser diferente da odd do sinal).
  const [openFormId, setOpenFormId] = useState<string | null>(null);
  const [formValor, setFormValor] = useState("");
  const [formOdd, setFormOdd] = useState("");
  const [confirming, setConfirming] = useState(false);

  // Relógio de 1s: alimenta as contagens regressivas e o "ao vivo automático" (assim que
  // o horário do jogo chega, o sinal vira ao vivo sem depender de evento do realtime).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  function estaAoVivo(signal: Signal) {
    if (signal.live) return true;
    if (!signal.horario_jogo) return false;
    return signal.status === "no_ar" && new Date(signal.horario_jogo).getTime() <= now;
  }

  useEffect(() => {
    let signalsChannel: ReturnType<typeof supabase.channel> | null = null;
    let operationsChannel: ReturnType<typeof supabase.channel> | null = null;

    async function reloadSignals() {
      // Só "no_ar": assim que o admin marca green/red/cancelado, o sinal sai daqui sozinho.
      const { data } = await supabase
        .from("signals")
        .select("*, signal_legs(*)")
        .eq("status", "no_ar")
        .order("created_at", { ascending: false });
      setSignals((data as SignalRow[]) || []);
    }

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: activeSub }, { data: profile }, { data: closed }] = await Promise.all([
        supabase.from("subscriptions").select("*").eq("user_id", user.id).eq("status", "ativa").limit(1).maybeSingle(),
        supabase
          .from("profiles")
          .select("banca_inicial, role, limite_diario, stop_diario, pausa_ate, pausas_usadas, regras_desde, perfil_risco, ligas_favoritas")
          .eq("id", user.id)
          .single(),
        // Histórico público (encerrados) — base do "Nexus neste mercado" e do Raio-X.
        supabase.from("signals").select("id, status, odd, mercado, competicao, created_at").in("status", ["green", "red"]),
      ]);
      setSubscribed(temAcessoLiberado(profile?.role, !!activeSub));
      setBancaAtual(profile?.banca_inicial ?? null);
      setRegras((profile as Regras) || null);
      setFavoritas(((profile as { ligas_favoritas?: string[] } | null)?.ligas_favoritas) || []);
      setEncerrados((closed as SinalEncerrado[]) || []);

      await reloadSignals();

      const { data: opsData } = await supabase.from("operations").select("*").eq("user_id", user.id);
      setOperations(opsData || []);
      setLoading(false);

      signalsChannel = supabase
        .channel("eventos-signals")
        .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, () => {
          reloadSignals();
        })
        .subscribe();

      operationsChannel = supabase
        .channel("eventos-operations")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "operations", filter: `user_id=eq.${user.id}` },
          (payload) => {
            setOperations((prev) => {
              if (payload.eventType === "INSERT") return [...prev, payload.new as Operation];
              if (payload.eventType === "UPDATE")
                return prev.map((o) => (o.id === (payload.new as Operation).id ? (payload.new as Operation) : o));
              return prev;
            });
          }
        )
        .subscribe();
    }

    init();

    return () => {
      if (signalsChannel) supabase.removeChannel(signalsChannel);
      if (operationsChannel) supabase.removeChannel(operationsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirFormulario(signal: Signal) {
    const sugestao = sugestaoDoSinal(signal, bancaAtual);
    setFormValor(sugestao?.valorReais ? sugestao.valorReais.toFixed(2) : "100");
    setFormOdd(String(signal.odd));
    setOpenFormId(signal.id);
    setErroEntrada(null);
    setTimeout(() => document.getElementById(`sig-${signal.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  async function confirmarOperacao(signal: Signal) {
    if (!userId || !subscribed) return;
    const valor = parseFloat(formValor.replace(",", "."));
    const odd = parseFloat(formOdd.replace(",", "."));
    if (isNaN(valor) || valor <= 0 || isNaN(odd) || odd <= 1) return;
    // Regras de disciplina (limite diário, stop, pausa) — ver /dashboard/disciplina.
    if (regras && hoje) {
      const chk = checarEntrada(valor, hoje, regras);
      if (!chk.ok) {
        setErroEntrada(chk.motivo || "Entrada fora das suas regras.");
        return;
      }
    }

    setConfirming(true);
    const { data, error } = await supabase
      .from("operations")
      .insert({ user_id: userId, signal_id: signal.id, valor, odd_obtida: odd })
      .select()
      .single();
    setConfirming(false);
    if (!error && data) {
      setOperations((prev) => [...prev, data as Operation]);
      setOpenFormId(null);
    }
  }

  // Ordem da sala: ao vivo primeiro, depois os próximos pelo horário, depois sem horário.
  const ordenados = useMemo(() => {
    const peso = (s: Signal) => {
      if (estaAoVivo(s)) return 0;
      if (s.horario_jogo) return 1;
      return 2;
    };
    return signals.slice().sort((a, b) => {
      const pa = peso(a);
      const pb = peso(b);
      if (pa !== pb) return pa - pb;
      const fa = favoritas.includes(a.competicao) ? 0 : 1;
      const fb = favoritas.includes(b.competicao) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return (a.horario_jogo || a.created_at).localeCompare(b.horario_jogo || b.created_at);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals, favoritas, Math.floor(now / 30000)]);
  const hoje = regras ? statusHoje(operations, regras, now) : null;
  const travado = !!hoje && (hoje.nivel === "pausa" || hoje.nivel === "bloqueado");

  const competicoes = Array.from(new Set(signals.map((s) => s.competicao))).sort(
    (a, b) => (favoritas.includes(a) ? 0 : 1) - (favoritas.includes(b) ? 0 : 1)
  );
  const vivoCount = signals.filter(estaAoVivo).length;
  const proximosCount = signals.filter((s) => !estaAoVivo(s) && s.horario_jogo).length;
  const destaque = ordenados[0] || null;

  const filtrados = ordenados.filter((s) => {
    if (competicao && s.competicao !== competicao) return false;
    if (filtro === "vivo") return estaAoVivo(s);
    if (filtro === "proximos") return !estaAoVivo(s);
    return true;
  });
  // O destaque já aparece no topo — não repete na grade (a menos que um filtro o esconda).
  const grade = filtro === "todos" && !competicao ? filtrados.filter((s) => s.id !== destaque?.id) : filtrados;

  const oddMedia = signals.length ? (signals.reduce((acc, s) => acc + s.odd, 0) / signals.length).toFixed(2) : "—";
  const geral = recorte(encerrados, () => true);
  const xraySignal = xrayId ? signals.find((s) => s.id === xrayId) || null : null;

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <span className="eyebrow !text-danger !border-danger/30 !bg-danger/10">
          <span className="eyebrow-dot !bg-danger !shadow-[0_0_12px_#FF4D6D] animate-pulse" />
          Sala ao vivo
        </span>
        <h1 className="font-display text-[30px] md:text-[40px] font-semibold tracking-[-0.035em] leading-tight mt-4">
          O jogo acontecendo, <span className="text-gradient">em tempo real</span>
        </h1>
        <p className="text-text2 text-sm mt-1.5">Cada sinal no ar, com contagem regressiva, progresso do jogo e o Raio-X completo da análise.</p>
      </div>
    </div>
  );

  if (!loading && !subscribed) {
    return (
      <div className="flex flex-col gap-6 max-w-6xl">
        {header}
        <div className="relative">
          <div className="grid md:grid-cols-2 gap-4 blur-[6px] opacity-40 pointer-events-none" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-6">
                <div className="text-[10px] text-muted font-semibold tracking-wide">COMPETIÇÃO · HOJE</div>
                <div className="font-display text-xl font-semibold mt-2">Time A x Time B</div>
                <div className="text-xs text-text2 mt-1">Mercado monitorado</div>
                <div className="h-10 rounded-xl bg-white/[0.04] mt-5" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shadow-[0_0_40px_-6px_rgba(79,123,255,.8)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A4B0D0" strokeWidth="2">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="font-display text-xl font-semibold">A sala está fechada pra você</div>
              <p className="text-text2 text-sm mt-1.5 max-w-sm">
                {signals.length > 0 ? `${signals.length} sinais no ar agora. ` : ""}Assine pra entrar na sala, ver o Raio-X de cada sinal e marcar suas operações.
              </p>
            </div>
            <Link href="/dashboard/planos" className="btn-primary text-sm px-6 py-3">
              Liberar a Sala ao Vivo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function renderForm(signal: Signal) {
    return (
      <div className="mt-4 pt-4 border-t border-white/[0.07] flex flex-col gap-3 animate-fade-up">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-semibold text-text2">Valor que você entrou</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">R$</span>
              <input
                className="input-field pl-8 text-sm font-mono py-2.5"
                value={formValor}
                onChange={(e) => setFormValor(e.target.value.replace(/[^0-9.,]/g, ""))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-semibold text-text2">Odd que você pegou</label>
            <input className="input-field text-sm font-mono py-2.5" value={formOdd} onChange={(e) => setFormOdd(e.target.value.replace(/[^0-9.,]/g, ""))} />
          </div>
        </div>
        {regras?.limite_diario && hoje && (
          <div className="text-[11px] text-muted">
            Hoje: {formatBRL(hoje.apostadoHoje)} de {formatBRL(regras.limite_diario)} do seu limite diário
          </div>
        )}
        {erroEntrada && (
          <div className="flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2.5 text-[12px] text-text animate-fade-up">
            <span>🛡</span>
            <span>
              {erroEntrada}{" "}
              <Link href="/dashboard/disciplina" className="text-accent font-semibold">
                Ver minhas regras
              </Link>
            </span>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={() => setOpenFormId(null)} className="text-xs font-semibold text-text2 hover:text-text px-3 py-2">
            Cancelar
          </button>
          <button onClick={() => confirmarOperacao(signal)} disabled={confirming} className="btn-primary text-xs px-5 py-2.5">
            {confirming ? "Confirmando…" : "Confirmar operação"}
          </button>
        </div>
      </div>
    );
  }

  function Acoes({ signal, big = false }: { signal: SignalRow; big?: boolean }) {
    const alreadyMarked = operations.some((o) => o.signal_id === signal.id);
    const formAberto = openFormId === signal.id;
    const isBilhete = signal.tipo === "bilhete";
    const sz = big ? "text-sm px-5 py-3" : "text-xs px-4 py-2.5";
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setXrayId(signal.id)}
          className={`group inline-flex items-center gap-2 rounded-xl font-semibold border border-info/40 bg-info/10 text-info hover:bg-info/20 hover:border-info/70 transition-all shadow-[0_0_24px_-10px_rgba(51,214,245,.9)] ${sz}`}
        >
          {IconXRay}
          Raio-X
        </button>
        {!formAberto &&
          (alreadyMarked ? (
            <span className={`inline-flex items-center gap-1.5 font-semibold text-success bg-success/10 border border-success/30 rounded-xl ${sz}`}>✓ Marcada</span>
          ) : travado ? (
            <Link href="/dashboard/disciplina" className={`inline-flex items-center gap-1.5 font-semibold rounded-xl border border-accent/30 bg-accent/10 text-accent ${sz}`}>
              {hoje?.nivel === "pausa" ? "⏸ Em pausa" : "🛡 Encerrado hoje"}
            </Link>
          ) : (
            <button onClick={() => abrirFormulario(signal)} className={`btn-primary ${sz}`}>
              {isBilhete ? "Marcar bilhete" : "Marcar operação"}
            </button>
          ))}
        {signal.casa_link && (
          <Link href={signal.casa_link} target="_blank" rel="noopener noreferrer" className={`btn-ghost ${sz} ml-auto`}>
            {signal.casa_nome || "Casa"} ↗
          </Link>
        )}
      </div>
    );
  }

  function PhaseChip({ signal, big = false }: { signal: SignalRow; big?: boolean }) {
    const vivo = estaAoVivo(signal);
    const f = faseDoJogo(signal, now);
    if (vivo) {
      const min = f.tipo === "vivo" ? f.minutos : 0;
      return (
        <span className={`inline-flex items-center gap-2 rounded-full border border-danger/50 bg-danger/15 text-danger font-bold tracking-wider ${big ? "px-3.5 py-1.5 text-[11px]" : "px-2.5 py-1 text-[10px]"}`}>
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-danger animate-ping" />
            <span className="relative w-2 h-2 rounded-full bg-danger" />
          </span>
          AO VIVO{min > 0 ? ` · ${min > 105 ? "fim?" : `${min}'`}` : ""}
        </span>
      );
    }
    if (f.tipo === "futuro") {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-info/40 bg-info/10 text-info font-semibold ${big ? "px-3.5 py-1.5 text-[11px]" : "px-2.5 py-1 text-[10px]"}`}>
          <span className="opacity-70">começa em</span>
          <span className="font-mono tabular-nums">{fmtCountdown(f.ms)}</span>
        </span>
      );
    }
    return <span className="text-[10px] font-bold tracking-wider text-info bg-info/10 border border-info/30 rounded-full px-2.5 py-1">NO AR</span>;
  }

  function Progresso({ signal }: { signal: SignalRow }) {
    const f = faseDoJogo(signal, now);
    if (!estaAoVivo(signal) || f.tipo !== "vivo") return null;
    return (
      <div className="mt-4">
        <div className="flex justify-between text-[9.5px] text-muted font-semibold tracking-wider mb-1.5">
          <span>0&apos;</span>
          <span>INTERVALO</span>
          <span>90&apos;+</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
          <div
            className="h-full rounded-full bg-gradient-to-r from-danger/70 to-danger shadow-[0_0_12px_rgba(255,77,109,.8)] transition-all duration-1000"
            style={{ width: `${Math.max(3, f.progresso * 100)}%` }}
          />
        </div>
      </div>
    );
  }

  function Teams({ signal, big = false }: { signal: SignalRow; big?: boolean }) {
    const legs = (signal.signal_legs || []).slice().sort((a, b) => a.ordem - b.ordem);
    if (signal.tipo === "bilhete") {
      return (
        <>
          <div className={`font-display font-semibold tracking-[-0.02em] ${big ? "text-[30px] md:text-[40px] leading-[1.05]" : "text-[19px]"}`}>{legs.length} jogos combinados</div>
          <div className="flex flex-col gap-0.5 mt-2">
            {legs.map((l) => (
              <div key={l.id} className="text-[12px] text-text2 truncate">
                <span className="text-text font-semibold">
                  {l.time_a} x {l.time_b}
                </span>{" "}
                <span className="text-muted">· {l.mercado} · {fmtOdd(l.odd)}</span>
              </div>
            ))}
          </div>
        </>
      );
    }
    return (
      <>
        <div className={`font-display font-semibold tracking-[-0.025em] ${big ? "text-[30px] md:text-[44px] leading-[1.02]" : "text-[19px] leading-tight"}`}>
          {signal.time_a} <span className="text-muted font-normal">x</span> {signal.time_b}
        </div>
        <div className={`text-text2 mt-1.5 ${big ? "text-base" : "text-[13px]"}`}>{signal.mercado}</div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {header}

      {/* barra de disciplina do dia */}
      {hoje && regras && (regras.limite_diario || regras.stop_diario || hoje.pausado) && (
        <Link
          href="/dashboard/disciplina"
          className={`card flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5 transition-all hover:-translate-y-0.5 ${
            hoje.nivel === "livre" ? "" : hoje.nivel === "atencao" ? "!border-warning/40" : "!border-accent/50"
          }`}
        >
          <span
            className={`inline-flex items-center gap-2 text-[10.5px] font-bold tracking-[0.14em] ${
              hoje.nivel === "livre" ? "text-success" : hoje.nivel === "atencao" ? "text-warning" : "text-accent"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {hoje.nivel === "livre" ? "DENTRO DAS SUAS REGRAS" : hoje.nivel === "atencao" ? "PERTO DO LIMITE" : hoje.nivel === "pausa" ? "PAUSA ATIVA" : "ENCERRADO POR HOJE"}
          </span>
          {regras.limite_diario && (
            <span className="flex items-center gap-2 text-[12px] text-text2">
              Apostado hoje
              <span className="w-24 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                <span
                  className={`block h-full rounded-full ${hoje.nivel === "livre" ? "bg-success" : hoje.nivel === "atencao" ? "bg-warning" : "bg-accent"}`}
                  style={{ width: `${Math.min(100, (hoje.usoLimite || 0) * 100)}%` }}
                />
              </span>
              <span className="font-mono text-text">
                {formatBRL(hoje.apostadoHoje)} / {formatBRL(regras.limite_diario)}
              </span>
            </span>
          )}
          {regras.stop_diario && (
            <span className="text-[12px] text-text2">
              Resultado hoje <span className={`font-mono ${hoje.resultadoHoje < 0 ? "text-danger" : "text-success"}`}>{formatBRL(hoje.resultadoHoje)}</span>
              <span className="text-muted"> · stop -{formatBRL(regras.stop_diario)}</span>
            </span>
          )}
          <span className="ml-auto text-[11.5px] text-muted">Disciplina →</span>
        </Link>
      )}

      {/* tira de status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "SINAIS NO AR", v: signals.length, c: "" },
          { l: "AO VIVO AGORA", v: vivoCount, c: vivoCount ? "text-danger" : "" },
          { l: "ODD MÉDIA", v: oddMedia, c: "" },
          { l: "HISTÓRICO NEXUS", v: geral.pct === null ? "—" : `${geral.pct}%`, c: "text-success" },
        ].map((k) => (
          <div key={k.l} className="card px-4 py-3.5">
            <div className="text-[9.5px] font-bold text-muted tracking-[0.16em]">{k.l}</div>
            <div className={`font-display text-[24px] font-semibold mt-1 ${k.c}`}>{loading ? "—" : k.v}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : signals.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="font-display text-lg font-semibold">Sala em silêncio — por enquanto</div>
          <p className="text-sm text-text2 mt-1.5">Assim que o time publicar um sinal, ele aparece aqui na hora, sem atualizar a página.</p>
        </div>
      ) : (
        <>
          {/* DESTAQUE — próximo sinal (ou o que está ao vivo) */}
          {destaque && (
            <div id={`sig-${destaque.id}`} className="card glow-border relative overflow-hidden p-6 md:p-8 !bg-[rgba(12,18,44,.75)] shadow-[0_40px_100px_-40px_rgba(79,123,255,.6)]">
              <div className="absolute -top-28 -right-20 w-96 h-96 rounded-full bg-primary/25 blur-[100px] pointer-events-none" />
              <div className="absolute -bottom-32 left-1/4 w-80 h-80 rounded-full bg-accent/15 blur-[100px] pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-text2">{estaAoVivo(destaque) ? "ROLANDO AGORA" : "PRÓXIMO SINAL"}</span>
                    <span className="text-[10px] text-muted">·</span>
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">{destaque.competicao}</span>
                  </div>
                  {PhaseChip({ signal: destaque, big: true })}
                </div>

                <div className="grid md:grid-cols-[1fr_auto] gap-6 items-end mt-5">
                  <div className="min-w-0">
                    {Teams({ signal: destaque, big: true })}
                  </div>
                  <div className="flex md:flex-col items-end gap-4 md:gap-1">
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-info tracking-[0.2em]">ODD</div>
                      <div className="font-mono text-[44px] md:text-[56px] font-semibold leading-none text-gradient">{fmtOdd(destaque.odd)}</div>
                    </div>
                    <div className="text-[11px] text-muted text-right">prob. implícita {probImplicita(destaque.odd).toFixed(0)}%</div>
                  </div>
                </div>

                {/* contagem regressiva gigante quando ainda não começou */}
                {(() => {
                  const f = faseDoJogo(destaque, now);
                  if (f.tipo !== "futuro" || estaAoVivo(destaque)) return null;
                  const s = Math.floor(f.ms / 1000);
                  const parts = [
                    { v: Math.floor(s / 3600), l: "horas" },
                    { v: Math.floor((s % 3600) / 60), l: "min" },
                    { v: s % 60, l: "seg" },
                  ];
                  return (
                    <div className="flex gap-2.5 mt-6">
                      {parts.map((p) => (
                        <div key={p.l} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 min-w-[74px] text-center">
                          <div className="font-mono text-[28px] font-semibold tabular-nums leading-none">{String(p.v).padStart(2, "0")}</div>
                          <div className="text-[9.5px] text-muted font-bold tracking-[0.16em] uppercase mt-1.5">{p.l}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {Progresso({ signal: destaque })}

                {sugestaoDoSinal(destaque, bancaAtual) && (
                  <div className="mt-5 text-[12px] text-info">
                    <span className="font-bold">Sugestão de entrada:</span> {sugestaoDoSinal(destaque, bancaAtual)!.texto}
                  </div>
                )}

                <div className="mt-6">
                  {Acoes({ signal: destaque, big: true })}
                </div>
                {openFormId === destaque.id && !operations.some((o) => o.signal_id === destaque.id) && renderForm(destaque)}
              </div>
            </div>
          )}

          {/* filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex bg-white/[0.03] border border-white/[0.08] rounded-xl p-1">
              {(
                [
                  { id: "todos", label: "Todos", n: signals.length },
                  { id: "vivo", label: "Ao vivo", n: vivoCount },
                  { id: "proximos", label: "Próximos", n: proximosCount },
                ] as { id: Filtro; label: string; n: number }[]
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltro(f.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-all ${
                    filtro === f.id ? "bg-gradient-to-r from-primary to-accent text-white shadow-[0_6px_20px_-6px_rgba(79,123,255,.8)]" : "text-text2 hover:text-text"
                  }`}
                >
                  {f.id === "vivo" && f.n > 0 && <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />}
                  {f.label}
                  <span className="text-[10px] opacity-70">{f.n}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              {competicoes.map((c) => (
                <button
                  key={c}
                  onClick={() => setCompeticao(competicao === c ? null : c)}
                  className={`whitespace-nowrap text-[11.5px] font-semibold rounded-full px-3 py-1.5 border transition-all ${
                    competicao === c ? "border-info/60 bg-info/15 text-info" : "border-white/[0.08] text-text2 hover:border-white/20 hover:text-text"
                  }`}
                >
                  {favoritas.includes(c) ? "★ " : ""}
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* grade de cards vivos */}
          {grade.length === 0 ? (
            <div className="card p-7 text-center text-sm text-text2">Nenhum sinal nesse filtro agora.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {grade.map((signal, idx) => {
                const vivo = estaAoVivo(signal);
                const mercado = recorte(encerrados, (s) => s.mercado === signal.mercado);
                const prob = probImplicita(signal.odd);
                const sugestao = sugestaoDoSinal(signal, bancaAtual);
                return (
                  <div
                    id={`sig-${signal.id}`}
                    key={signal.id}
                    className={`card p-5 flex flex-col animate-fade-up ${vivo ? "!border-danger/30 shadow-[0_0_50px_-20px_rgba(255,77,109,.6)]" : ""}`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {signal.tipo === "bilhete" && <span className="text-[9px] font-bold text-accent bg-accent/10 border border-accent/30 px-1.5 py-0.5 rounded flex-none">BILHETE</span>}
                        <span className="text-[10.5px] text-muted font-semibold tracking-wider uppercase truncate">{signal.competicao}</span>
                      </div>
                      {PhaseChip({ signal: signal })}
                    </div>

                    <div className="flex items-start justify-between gap-4 mt-3.5">
                      <div className="min-w-0">
                        {Teams({ signal: signal })}
                      </div>
                      <div className="flex-none text-right">
                        <div className="font-mono text-[28px] font-semibold leading-none">{fmtOdd(signal.odd)}</div>
                        <div className="text-[9.5px] text-muted font-bold tracking-[0.14em] mt-1">ODD</div>
                      </div>
                    </div>

                    {Progresso({ signal: signal })}

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                        <div className="text-[9px] font-bold text-muted tracking-[0.14em]">PROB. IMPLÍCITA</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[13px] font-semibold">{prob.toFixed(0)}%</span>
                          <div className="flex-1 h-1 rounded-full bg-white/[0.07] overflow-hidden">
                            <div className="h-full bg-info" style={{ width: `${prob}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                        <div className="text-[9px] font-bold text-muted tracking-[0.14em]">NEXUS NO MERCADO</div>
                        <div className="font-mono text-[13px] font-semibold mt-1">
                          {mercado.pct === null ? <span className="text-muted">sem histórico</span> : <span className="text-success">{mercado.pct}% <span className="text-muted text-[11px]">({mercado.total})</span></span>}
                        </div>
                      </div>
                    </div>

                    {sugestao && (
                      <div className="mt-3 text-[11.5px] text-info leading-snug">
                        <span className="font-bold">Sugestão:</span> {sugestao.texto}
                      </div>
                    )}

                    <div className="mt-auto pt-4">
                      <div className="pt-4 border-t border-white/[0.06]">
                        {Acoes({ signal: signal })}
                      </div>
                      {openFormId === signal.id && !operations.some((o) => o.signal_id === signal.id) && renderForm(signal)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {xraySignal && (
        <SignalXRay
          signal={xraySignal}
          encerrados={encerrados}
          noArMesmaCompeticao={signals.filter((s) => s.competicao === xraySignal.competicao).length}
          sugestaoTexto={sugestaoDoSinal(xraySignal, bancaAtual)?.texto}
          alreadyMarked={operations.some((o) => o.signal_id === xraySignal.id)}
          canMark={subscribed}
          onMarcar={() => abrirFormulario(xraySignal)}
          onClose={() => setXrayId(null)}
        />
      )}
    </div>
  );
}
