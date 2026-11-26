"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BancaMovimento, BancaMovimentoTipo, Operation, Signal } from "@/lib/types";

type OperationRow = Operation & { signals: Signal };

function oddEfetiva(op: OperationRow): number {
  return op.odd_obtida ?? op.signals.odd;
}

function profitOf(op: OperationRow): number {
  if (op.status === "green") return op.valor * (oddEfetiva(op) - 1);
  if (op.status === "red") return -op.valor;
  return 0;
}

function formatData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDataCurta(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Formatação monetária pt-BR "de verdade" (R$ 1.234,56) em vez de toFixed(2) cru —
// mais consistente com o resto do produto sendo um software "profissional".
function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtPct(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

const MOVIMENTO_LABEL: Record<BancaMovimentoTipo, string> = {
  aporte: "Aporte",
  saque: "Saque",
  ajuste: "Ajuste",
};

const MOVIMENTO_ICON: Record<BancaMovimentoTipo, JSX.Element> = {
  aporte: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4v13M6 12l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  saque: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20V7M6 12l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ajuste: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h13M21 18h-1" strokeLinecap="round" />
      <circle cx="14.5" cy="6" r="2" />
      <circle cx="8.5" cy="12" r="2" />
      <circle cx="18.5" cy="18" r="2" />
    </svg>
  ),
};

function ArrowConnector({ highlight = false }: { highlight?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`flex-none rotate-90 sm:rotate-0 ${highlight ? "text-primary" : "text-muted"}`}
    >
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chip({
  label,
  value,
  tone,
  emphasis = false,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
  emphasis?: boolean;
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-text";
  return (
    <div
      className={`flex flex-col gap-0.5 rounded-lg px-3 py-2 ${
        emphasis ? "bg-primary/10 border border-primary/30" : ""
      }`}
    >
      <span className="text-[10px] font-semibold text-text2 tracking-wide uppercase whitespace-nowrap">
        {label}
      </span>
      <span className={`font-mono text-sm font-bold whitespace-nowrap ${emphasis ? "text-primary" : toneClass}`}>
        {value}
      </span>
    </div>
  );
}

function LucroAcumuladoChart({ points }: { points: { label: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  if (points.length < 2) {
    return (
      <div className="h-40 sm:h-44 flex items-center justify-center text-xs text-muted text-center px-6">
        Marque e feche mais operações para ver sua curva de lucro aqui.
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const padPct = 10;
  const plotPct = 100 - padPct * 2;

  const xPct = (i: number) => (points.length > 1 ? (i / (points.length - 1)) * 100 : 50);
  const yPct = (v: number) => padPct + plotPct - ((v - min) / range) * plotPct;
  const zeroYPct = yPct(0);
  const last = values[values.length - 1];
  const color = last >= 0 ? "#14E3A0" : "#FF4D6D";

  const lineStr = points.map((p, i) => `${xPct(i)},${yPct(p.value)}`).join(" ");
  const areaStr = `${xPct(0)},${yPct(0)} ${lineStr} ${xPct(points.length - 1)},${yPct(0)}`;

  return (
    <div
      ref={ref}
      className="relative h-40 sm:h-44 select-none"
      onMouseMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const relX = (e.clientX - rect.left) / rect.width;
        const idx = Math.round(relX * (points.length - 1));
        setHover(Math.min(points.length - 1, Math.max(0, idx)));
      }}
      onMouseLeave={() => setHover(null)}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lucroFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1="0"
            y1={g * 100}
            x2="100"
            y2={g * 100}
            stroke="#1B2547"
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <polygon points={areaStr} fill="url(#lucroFill)" />
        {min < 0 && max > 0 && (
          <line
            x1="0"
            y1={zeroYPct}
            x2="100"
            y2={zeroYPct}
            stroke="#69759A"
            strokeWidth="0.7"
            strokeDasharray="1.4 1.2"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <polyline
          points={lineStr}
          fill="none"
          stroke={color}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hover !== null && (
          <line
            x1={xPct(hover)}
            y1="2"
            x2={xPct(hover)}
            y2="98"
            stroke="#4F7BFF"
            strokeWidth="0.7"
            strokeDasharray="1.4 1.2"
            opacity="0.7"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {hover !== null && (
        <>
          <span
            className="absolute w-2.5 h-2.5 rounded-full border-2 pointer-events-none"
            style={{
              left: `${xPct(hover)}%`,
              top: `${yPct(points[hover].value)}%`,
              transform: "translate(-50%, -50%)",
              background: color,
              borderColor: "#0A1022",
            }}
          />
          <div
            className="absolute -translate-x-1/2 pointer-events-none bg-elevated border border-border rounded-lg px-2.5 py-1.5 text-[11px] shadow-lg whitespace-nowrap z-10"
            style={{
              left: `${xPct(hover)}%`,
              top: `${yPct(points[hover].value)}%`,
              transform: "translate(-50%, calc(-100% - 10px))",
            }}
          >
            <div className="font-semibold font-mono">{fmtMoney(points[hover].value)}</div>
            <div className="text-muted">{points[hover].label}</div>
          </div>
        </>
      )}
    </div>
  );
}

export default function GestaoPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [bancaInicial, setBancaInicial] = useState<number | null>(null);
  const [operations, setOperations] = useState<OperationRow[]>([]);
  const [movimentos, setMovimentos] = useState<BancaMovimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Formulário de movimentação de banca (aporte, saque ou ajuste de correção).
  const [tipoMovimento, setTipoMovimento] = useState<BancaMovimentoTipo>("aporte");
  const [valorMovimento, setValorMovimento] = useState("");
  const [notaMovimento, setNotaMovimento] = useState("");
  const [salvandoMovimento, setSalvandoMovimento] = useState(false);
  const [erroMovimento, setErroMovimento] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("banca_inicial")
        .eq("id", user.id)
        .single();
      setBancaInicial(profile?.banca_inicial ?? null);

      const [{ data: opsData }, { data: movData }] = await Promise.all([
        supabase
          .from("operations")
          .select("*, signals(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("banca_movimentos")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      const ops = (opsData || []) as OperationRow[];
      setOperations(ops);
      setValores(Object.fromEntries(ops.map((o) => [o.id, String(o.valor)])));
      setMovimentos((movData as BancaMovimento[]) || []);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const andamento = useMemo(() => operations.filter((o) => o.status === "andamento"), [operations]);
  // "Cancelada" não é green nem red — não entra no cálculo de lucro (profitOf já trata isso
  // devolvendo 0 pra qualquer status que não seja green/red), mas também não fica parada em
  // "andamento" pra sempre: por isso ela sai daqui e cai direto no histórico.
  const settled = useMemo(
    () => operations.filter((o) => o.status === "green" || o.status === "red"),
    [operations]
  );

  const totalProfit = useMemo(() => settled.reduce((acc, o) => acc + profitOf(o), 0), [settled]);
  // Soma de todos os aportes/saques/ajustes que a pessoa registrou manualmente — ver
  // supabase/migrations/0009_banca_horario_cancelado.sql. Nunca guardamos um "saldo atual"
  // solto no banco: ele é sempre recalculado a partir do histórico, pra nunca dessincronizar.
  const totalMovimentos = useMemo(() => movimentos.reduce((acc, m) => acc + m.valor, 0), [movimentos]);
  const saldoAtual = (bancaInicial ?? 0) + totalProfit + totalMovimentos;
  const performancePct = bancaInicial ? (totalProfit / bancaInicial) * 100 : null;
  const greens = settled.filter((o) => o.status === "green").length;
  const reds = settled.length - greens;
  const assertividade = settled.length ? Math.round((greens / settled.length) * 100) : null;

  const profitPoints = useMemo(() => {
    let running = 0;
    return settled.map((o) => {
      running += profitOf(o);
      return { label: formatDataCurta(o.finalizada_em || o.created_at), value: running };
    });
  }, [settled]);

  const currentStreak = useMemo(() => {
    const chronDesc = [...settled].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    let streak = 0;
    for (const o of chronDesc) {
      if (o.status === "green") streak++;
      else break;
    }
    return streak;
  }, [settled]);

  const maiorOdd = useMemo(() => {
    const greenOps = settled.filter((o) => o.status === "green");
    if (greenOps.length === 0) return null;
    return Math.max(...greenOps.map((o) => oddEfetiva(o)));
  }, [settled]);

  // Preview ao vivo do que o "Ajuste" vai fazer — mostra pra onde o saldo vai antes de
  // confirmar, já que é fácil digitar o número errado e ele não descontar/lançar como lucro.
  const ajustePreview = useMemo(() => {
    if (tipoMovimento !== "ajuste") return null;
    const parsed = parseFloat(valorMovimento.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) return null;
    const delta = parsed - saldoAtual;
    if (delta === 0) return null;
    return { parsed, delta };
  }, [tipoMovimento, valorMovimento, saldoAtual]);

  async function salvarValor(op: OperationRow) {
    const raw = valores[op.id];
    const parsed = parseFloat((raw || "").replace(",", "."));
    if (isNaN(parsed) || parsed <= 0 || parsed === op.valor) return;
    setSavingId(op.id);
    const { error } = await supabase.from("operations").update({ valor: parsed }).eq("id", op.id);
    setSavingId(null);
    if (!error) {
      setOperations((prev) => prev.map((o) => (o.id === op.id ? { ...o, valor: parsed } : o)));
      setSavedId(op.id);
      setTimeout(() => setSavedId((id) => (id === op.id ? null : id)), 1500);
    }
  }

  async function registrarMovimento() {
    if (!userId) return;
    setErroMovimento(null);
    const parsed = parseFloat(valorMovimento.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      setErroMovimento("Informe um valor válido, maior que zero.");
      return;
    }

    // Aporte e saque são sempre um delta na banca; ajuste é diferente: a pessoa informa o
    // saldo CORRETO (o número que ela vê na casa de apostas dela agora), e a gente calcula
    // sozinho a diferença pra registrar como delta — sem isso, ela teria que fazer essa
    // conta na mão toda vez que a banca dessincronizar por algum motivo fora do app.
    let delta: number;
    if (tipoMovimento === "aporte") delta = parsed;
    else if (tipoMovimento === "saque") delta = -parsed;
    else delta = parsed - saldoAtual;

    if (tipoMovimento === "ajuste" && delta === 0) {
      setErroMovimento("Esse já é o saldo atual — nada pra ajustar.");
      return;
    }

    setSalvandoMovimento(true);
    const { data, error } = await supabase
      .from("banca_movimentos")
      .insert({
        user_id: userId,
        tipo: tipoMovimento,
        valor: delta,
        nota: notaMovimento.trim() || null,
      })
      .select()
      .single();
    setSalvandoMovimento(false);

    if (error) {
      setErroMovimento("Não deu pra registrar agora. Tenta de novo em alguns segundos.");
      return;
    }
    setMovimentos((prev) => [data as BancaMovimento, ...prev]);
    setValorMovimento("");
    setNotaMovimento("");
  }

  if (loading) {
    return <div className="card p-7 text-center text-sm text-text2 max-w-3xl">Carregando…</div>;
  }

  const deltaBanca = saldoAtual - (bancaInicial ?? 0);

  // ---------------- COCKPIT: métricas de gestão calculadas das próprias operações ----
  const cockpit = (() => {
    const chron = [...settled].sort((a, b) => (a.finalizada_em || a.created_at).localeCompare(b.finalizada_em || b.created_at));
    const apostado = chron.reduce((a, o) => a + o.valor, 0);
    let run = 0;
    let pico = 0;
    let dd = 0;
    let seq = 0;
    let melhorSeq = 0;
    chron.forEach((o) => {
      run += profitOf(o);
      pico = Math.max(pico, run);
      dd = Math.max(dd, pico - run);
      seq = o.status === "green" ? seq + 1 : 0;
      melhorSeq = Math.max(melhorSeq, seq);
    });
    const porMercado: Record<string, { n: number; g: number; lucro: number }> = {};
    chron.forEach((o) => {
      const k = o.signals?.tipo === "bilhete" ? "Bilhetes" : o.signals?.mercado || "—";
      const m = (porMercado[k] ||= { n: 0, g: 0, lucro: 0 });
      m.n++;
      if (o.status === "green") m.g++;
      m.lucro += profitOf(o);
    });
    const mercados = Object.entries(porMercado)
      .map(([k, v]) => ({ mercado: k, ...v, pct: Math.round((v.g / v.n) * 100) }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
    const entradaMedia = chron.length ? apostado / chron.length : 0;
    return {
      roi: apostado ? (totalProfit / apostado) * 100 : null,
      dd,
      ddPct: bancaInicial ? (dd / bancaInicial) * 100 : null,
      unidade: bancaInicial ? bancaInicial / 100 : null,
      entradaMedia,
      entradaPct: bancaInicial ? (entradaMedia / bancaInicial) * 100 : null,
      melhorSeq,
      mercados,
      maxLucroMercado: Math.max(1, ...mercados.map((m) => Math.abs(m.lucro))),
    };
  })();

  return (
    <div className="flex flex-col gap-5 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="6" width="18" height="13" rx="2" />
              <path d="M3 10h18" />
              <circle cx="16" cy="14.5" r="1.3" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-[0.18em] text-info">GESTÃO</span>
        </div>
        <h1 className="font-display text-[28px] md:text-[34px] font-semibold tracking-[-0.03em] leading-tight mb-1">Cockpit da banca</h1>
        <p className="text-text2 text-sm">
          Calculado a partir da sua banca inicial, das operações que você marcou e dos
          aportes/saques que você registrar abaixo.
        </p>
      </div>

      {/* HERO: saldo em destaque + trilha de composição do saldo + curva de lucro, tudo num
          único painel — em vez de 3 cards soltos + 1 card de gráfico, como era antes. */}
      <div className="card relative overflow-hidden p-6 sm:p-7">
        <div className="absolute -top-16 -right-10 w-64 h-64 bg-primary opacity-[0.10] blur-[80px] rounded-full pointer-events-none" />
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-text2 tracking-wide">SALDO ATUAL</div>
              <div className="flex flex-wrap items-end gap-3 mt-1.5">
                <span className="font-mono text-3xl sm:text-4xl font-bold">
                  {bancaInicial === null ? "—" : fmtMoney(saldoAtual)}
                </span>
                {performancePct !== null && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full mb-1 ${
                      performancePct > 0
                        ? "bg-success/10 text-success"
                        : performancePct < 0
                        ? "bg-danger/10 text-danger"
                        : "bg-elevated text-text2"
                    }`}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className={performancePct < 0 ? "rotate-180" : ""}
                    >
                      <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {fmtPct(performancePct)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted mt-1.5">
                Resultado considera só o lucro das operações — aportes e saques não entram na conta.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text2 bg-surface border border-border rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse flex-none" />
              {greens} green{greens !== 1 ? "s" : ""} · {reds} red{reds !== 1 ? "s" : ""}
              {assertividade !== null ? ` · ${assertividade}% de assertividade` : ""}
            </div>
          </div>

          {/* trilha: como o saldo atual foi composto */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 bg-surface/70 border border-border rounded-xl px-3 sm:px-4 py-3">
            <Chip label="Banca inicial" value={bancaInicial === null ? "—" : fmtMoney(bancaInicial)} />
            <ArrowConnector />
            <Chip
              label="Lucro operações"
              value={`${totalProfit > 0 ? "+" : ""}${fmtMoney(totalProfit)}`}
              tone={totalProfit > 0 ? "success" : totalProfit < 0 ? "danger" : undefined}
            />
            <ArrowConnector />
            <Chip
              label="Aportes/saques"
              value={`${totalMovimentos > 0 ? "+" : ""}${fmtMoney(totalMovimentos)}`}
              tone={totalMovimentos > 0 ? "success" : totalMovimentos < 0 ? "danger" : undefined}
            />
            <ArrowConnector highlight />
            <Chip label="Saldo atual" value={bancaInicial === null ? "—" : fmtMoney(saldoAtual)} emphasis />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-text2 tracking-wide">LUCRO ACUMULADO</span>
              <span
                className={`text-[11px] font-mono font-semibold ${
                  deltaBanca > 0 ? "text-success" : deltaBanca < 0 ? "text-danger" : "text-muted"
                }`}
              >
                {settled.length > 0 ? `${totalProfit >= 0 ? "+" : ""}${fmtMoney(totalProfit)}` : ""}
              </span>
            </div>
            <LucroAcumuladoChart points={profitPoints} />
          </div>
        </div>
      </div>

      {/* COCKPIT — instrumentos de gestão, estilo terminal */}
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">
        {[
          { l: "ROI", v: cockpit.roi === null ? "—" : `${cockpit.roi >= 0 ? "+" : ""}${cockpit.roi.toFixed(1).replace(".", ",")}%`, c: cockpit.roi === null ? "" : cockpit.roi >= 0 ? "text-success" : "text-danger", s: "lucro ÷ total apostado" },
          { l: "MAIOR QUEDA", v: settled.length ? `-${fmtMoney(cockpit.dd)}` : "—", c: "text-warning", s: cockpit.ddPct !== null ? `${cockpit.ddPct.toFixed(1).replace(".", ",")}% da banca` : "pico → vale" },
          { l: "VALOR DA UNIDADE", v: cockpit.unidade === null ? "—" : fmtMoney(cockpit.unidade), c: "", s: "1% da banca inicial" },
          { l: "ENTRADA MÉDIA", v: settled.length ? fmtMoney(cockpit.entradaMedia) : "—", c: cockpit.entradaPct !== null && cockpit.entradaPct > 5 ? "text-warning" : "", s: cockpit.entradaPct !== null ? `${cockpit.entradaPct.toFixed(1).replace(".", ",")}% da banca` : "por operação" },
          { l: "MELHOR SEQUÊNCIA", v: `${cockpit.melhorSeq}`, c: "text-success", s: `atual: ${currentStreak} green${currentStreak === 1 ? "" : "s"}` },
          { l: "ASSERTIVIDADE", v: assertividade === null ? "—" : `${assertividade}%`, c: "", s: `${greens}G · ${reds}R` },
        ].map((k, i) => (
          <div key={k.l} className="card px-4 py-3.5 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="text-[9.5px] font-bold text-muted tracking-[0.14em] whitespace-nowrap">{k.l}</div>
            <div className={`font-display text-[20px] font-semibold mt-1 whitespace-nowrap ${k.c}`}>{k.v}</div>
            <div className="text-[10.5px] text-muted mt-0.5">{k.s}</div>
          </div>
        ))}
      </div>

      {cockpit.mercados.length > 0 && (
        <div className="card p-6">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <div className="text-[10.5px] font-bold tracking-[0.16em] text-primary">ONDE VOCÊ GANHA (E PERDE)</div>
              <p className="text-[12.5px] text-text2 mt-0.5">Seu resultado por mercado — mostra onde sua gestão funciona melhor.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {cockpit.mercados.map((m) => (
              <div key={m.mercado} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_auto] items-center gap-4">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate">{m.mercado}</div>
                  <div className="text-[11px] text-muted">
                    {m.n} operações · {m.pct}% green
                  </div>
                </div>
                <div className="relative h-2.5 rounded-full bg-white/[0.05]">
                  <div className="absolute left-1/2 top-[-3px] bottom-[-3px] w-px bg-white/15" />
                  <div
                    className={`absolute top-0 bottom-0 rounded-full ${m.lucro >= 0 ? "left-1/2 bg-gradient-to-r from-success/60 to-success" : "right-1/2 bg-gradient-to-l from-danger/60 to-danger"}`}
                    style={{ width: `${(Math.abs(m.lucro) / cockpit.maxLucroMercado) * 50}%` }}
                  />
                </div>
                <div className={`font-mono text-[13px] font-semibold text-right whitespace-nowrap ${m.lucro >= 0 ? "text-success" : "text-danger"}`}>
                  {m.lucro >= 0 ? "+" : ""}
                  {fmtMoney(m.lucro)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-none">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-sm font-bold text-text2">MOVIMENTAR BANCA</span>
        </div>

        <div className="inline-flex bg-surface border border-border rounded-[10px] p-1 w-fit mb-3">
          {(["aporte", "saque", "ajuste"] as BancaMovimentoTipo[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTipoMovimento(t);
                setErroMovimento(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-[7px] text-[12.5px] font-semibold transition-colors ${
                tipoMovimento === t ? "bg-primary text-white" : "text-text2 hover:text-text"
              }`}
            >
              {MOVIMENTO_ICON[t]}
              {MOVIMENTO_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-semibold text-text2">
              {tipoMovimento === "ajuste" ? "Qual o saldo correto agora?" : "Valor"}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">
                R$
              </span>
              <input
                className="input-field pl-8 text-sm font-mono py-2 w-full"
                value={valorMovimento}
                onChange={(e) => setValorMovimento(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder="0,00"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-semibold text-text2">Nota (opcional)</label>
            <input
              className="input-field text-sm py-2 w-full"
              value={notaMovimento}
              onChange={(e) => setNotaMovimento(e.target.value)}
              placeholder={
                tipoMovimento === "aporte"
                  ? "Ex: depósito na casa"
                  : tipoMovimento === "saque"
                  ? "Ex: saque de lucro"
                  : "Ex: corrigindo diferença"
              }
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={registrarMovimento}
              disabled={salvandoMovimento}
              className="btn-primary text-xs px-4 py-2.5 disabled:opacity-40 w-full sm:w-auto"
            >
              {salvandoMovimento ? "Salvando…" : "Registrar"}
            </button>
          </div>
        </div>

        {ajustePreview && (
          <div
            className={`mt-2.5 text-[11.5px] rounded-lg px-3 py-2 border flex items-center gap-1.5 ${
              ajustePreview.delta > 0
                ? "bg-success/5 border-success/30 text-success"
                : "bg-danger/5 border-danger/30 text-danger"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-none">
              <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" strokeLinejoin="round" />
            </svg>
            Saldo vai de <strong className="font-mono">{fmtMoney(saldoAtual)}</strong> para{" "}
            <strong className="font-mono">{fmtMoney(ajustePreview.parsed)}</strong> — não conta como
            lucro nem prejuízo.
          </div>
        )}
        {erroMovimento && <p className="text-xs text-danger mt-2">{erroMovimento}</p>}

        {movimentos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border max-h-64 overflow-y-auto pr-1">
            {movimentos.map((m, i) => (
              <div key={m.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-none ${
                      m.valor > 0 ? "bg-success" : m.valor < 0 ? "bg-danger" : "bg-muted"
                    }`}
                  />
                  {i < movimentos.length - 1 && <span className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="flex-1 min-w-0 pb-3 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-semibold">{MOVIMENTO_LABEL[m.tipo]}</span>
                    <span className="text-muted"> · {formatData(m.created_at)}</span>
                    {m.nota && <div className="text-muted truncate">{m.nota}</div>}
                  </div>
                  <span
                    className={`font-mono flex-none ${
                      m.valor > 0 ? "text-success" : m.valor < 0 ? "text-danger" : "text-muted"
                    }`}
                  >
                    {m.valor > 0 ? "+" : ""}
                    {fmtMoney(m.valor)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-none" />
          <span className="text-sm font-bold text-text2">OPERAÇÕES EM ANDAMENTO ({andamento.length})</span>
        </div>
        {andamento.length === 0 ? (
          <div className="card p-7 text-center text-sm text-text2">
            Nenhuma operação em andamento agora. Marque um sinal em Eventos para começar.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {andamento.map((op) => {
              const parsedVal = parseFloat((valores[op.id] || "").replace(",", ".")) || 0;
              const retorno = parsedVal * oddEfetiva(op);
              return (
                <div
                  key={op.id}
                  className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-transform hover:-translate-y-0.5"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                      {op.signals.tipo === "bilhete" && (
                        <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-none">
                          BILHETE
                        </span>
                      )}
                      {op.signals.tipo === "bilhete"
                        ? op.signals.time_b
                        : `${op.signals.time_a} x ${op.signals.time_b}`}
                    </div>
                    <div className="text-xs text-text2 mt-0.5">
                      {op.signals.tipo === "bilhete" ? "Combinados" : op.signals.mercado} · ODD {oddEfetiva(op)}
                    </div>
                  </div>
                  <div className="flex-none flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted font-mono">R$</span>
                      <input
                        className="input-field w-24 text-sm font-mono py-1.5"
                        value={valores[op.id] ?? ""}
                        onChange={(e) =>
                          setValores((prev) => ({ ...prev, [op.id]: e.target.value.replace(/[^0-9.,]/g, "") }))
                        }
                        onBlur={() => salvarValor(op)}
                      />
                      <span className="text-[10px] text-success font-semibold w-14">
                        {savingId === op.id ? "Salvando…" : savedId === op.id ? "Salvo ✓" : ""}
                      </span>
                    </div>
                    {retorno > 0 && (
                      <div className="text-[10px] text-muted">
                        Retorno potencial: <span className="font-mono text-text2">{fmtMoney(retorno)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="text-sm font-bold text-text2 mb-3">CONQUISTAS</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="card p-5">
            <div className="flex items-center gap-2 text-text2">
              <span className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center flex-none">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 2c2 3-1 4-1 6 0 1.5 1.2 2 2 2 1.5 0 2.5-1.3 2.5-3 2 2 3 4.5 3 7a6.5 6.5 0 01-13 0c0-4 2-6 2.5-8 .3 1.5 1.3 2 2 1.5-.5-2 .5-4 2-5.5z" />
                </svg>
              </span>
              <span className="text-xs font-semibold">SEQUÊNCIA ATUAL</span>
            </div>
            <div className="font-mono text-xl font-semibold mt-2.5 text-success">
              {currentStreak > 0
                ? `${currentStreak} green${currentStreak !== 1 ? "s" : ""} seguido${currentStreak !== 1 ? "s" : ""}`
                : "—"}
            </div>
            <p className="text-[11px] text-muted mt-1">Contando a partir da sua operação mais recente.</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 text-text2">
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-none">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0V4z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7 5H4a3 3 0 003 3M17 5h3a3 3 0 01-3 3" strokeLinecap="round" />
                </svg>
              </span>
              <span className="text-xs font-semibold">MAIOR ODD GREENADA</span>
            </div>
            <div className="font-mono text-xl font-semibold mt-2.5">{maiorOdd === null ? "—" : maiorOdd}</div>
            <p className="text-[11px] text-muted mt-1">Sua melhor operação fechada com green.</p>
          </div>
          <div className="card p-5 border-dashed border-2 border-border/70 bg-transparent shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-text2">
                <span className="w-8 h-8 rounded-lg bg-elevated text-muted flex items-center justify-center flex-none">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" />
                  </svg>
                </span>
                <span className="text-xs font-semibold">DISCIPLINA DE RISCO</span>
              </div>
              <span className="text-[9px] font-bold text-muted bg-elevated px-2 py-0.5 rounded">EM BREVE</span>
            </div>
            <div className="font-mono text-xl font-semibold mt-2.5 text-muted">—</div>
            <p className="text-[11px] text-muted mt-1">
              Vamos comparar o valor de cada operação com o recomendado para sua banca.
            </p>
          </div>
          <div className="card p-5 border-dashed border-2 border-border/70 bg-transparent shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-text2">
                <span className="w-8 h-8 rounded-lg bg-elevated text-muted flex items-center justify-center flex-none">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="12" cy="12" r="5" />
                    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </span>
                <span className="text-xs font-semibold">META DE BANCA</span>
              </div>
              <span className="text-[9px] font-bold text-muted bg-elevated px-2 py-0.5 rounded">EM BREVE</span>
            </div>
            <div className="font-mono text-xl font-semibold mt-2.5 text-muted">—</div>
            <p className="text-[11px] text-muted mt-1">
              Em breve você vai poder definir uma meta de crescimento e acompanhar o progresso aqui.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
