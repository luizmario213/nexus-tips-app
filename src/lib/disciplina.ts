import type { Operation, PerfilRisco, Profile, Signal } from "@/lib/types";

// =====================================================================================
// DISCIPLINA — regras de jogo responsável e conquistas.
// Princípio: nada aqui premia apostar MAIS. Conquista é por respeitar limite, saber
// parar e não correr atrás de prejuízo. É isso que mantém alguém no jogo por anos.
// =====================================================================================

export type Regras = Pick<Profile, "limite_diario" | "stop_diario" | "pausa_ate" | "pausas_usadas" | "regras_desde" | "perfil_risco" | "banca_inicial">;
type Op = Operation & { signals?: Pick<Signal, "odd"> | null };

/** Limites sugeridos por perfil, em % da banca. */
export const SUGESTAO_PERFIL: Record<PerfilRisco, { limitePct: number; stopPct: number; entradaPct: number; label: string; desc: string }> = {
  conservador: { limitePct: 3, stopPct: 4, entradaPct: 1, label: "Conservador", desc: "Prioriza proteger a banca. Entradas pequenas e poucas por dia." },
  moderado: { limitePct: 5, stopPct: 8, entradaPct: 2, label: "Moderado", desc: "Equilíbrio entre crescer e proteger. O perfil mais comum." },
  arrojado: { limitePct: 8, stopPct: 12, entradaPct: 3, label: "Arrojado", desc: "Aceita mais oscilação — ainda assim, com teto definido." },
};

export const ENTRADA_MAX_PCT = 5; // acima disso, a entrada é considerada fora da gestão

const dia = (iso: string | number | Date) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

function lucro(op: Op) {
  const odd = op.odd_obtida ?? op.signals?.odd ?? 1;
  if (op.status === "green") return op.valor * (odd - 1);
  if (op.status === "red") return -op.valor;
  return 0;
}

export interface StatusHoje {
  apostadoHoje: number;
  resultadoHoje: number; // lucro/prejuízo realizado hoje
  pausado: boolean;
  pausaAte: Date | null;
  stopAtingido: boolean;
  limiteAtingido: boolean;
  usoLimite: number | null; // 0..1+
  nivel: "livre" | "atencao" | "bloqueado" | "pausa";
}

export function statusHoje(ops: Op[], r: Regras, now = Date.now()): StatusHoje {
  const hoje = dia(now);
  const validas = ops.filter((o) => o.status !== "cancelada");
  const apostadoHoje = validas.filter((o) => dia(o.created_at) === hoje).reduce((a, o) => a + o.valor, 0);
  const resultadoHoje = validas
    .filter((o) => o.finalizada_em && dia(o.finalizada_em) === hoje)
    .reduce((a, o) => a + lucro(o), 0);
  const pausaAte = r.pausa_ate ? new Date(r.pausa_ate) : null;
  const pausado = !!pausaAte && pausaAte.getTime() > now;
  const stopAtingido = !!r.stop_diario && resultadoHoje <= -r.stop_diario;
  const limiteAtingido = !!r.limite_diario && apostadoHoje >= r.limite_diario;
  const usoLimite = r.limite_diario ? apostadoHoje / r.limite_diario : null;
  const nivel = pausado ? "pausa" : stopAtingido || limiteAtingido ? "bloqueado" : usoLimite !== null && usoLimite >= 0.8 ? "atencao" : "livre";
  return { apostadoHoje, resultadoHoje, pausado, pausaAte, stopAtingido, limiteAtingido, usoLimite, nivel };
}

/** Pode marcar uma entrada desse valor agora? Retorna o motivo quando não. */
export function checarEntrada(valor: number, st: StatusHoje, r: Regras): { ok: boolean; motivo?: string } {
  if (st.pausado)
    return { ok: false, motivo: `Você está em pausa até ${st.pausaAte!.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}. Pausa é pausa — volta depois.` };
  if (st.stopAtingido) return { ok: false, motivo: "Seu stop de perda de hoje foi atingido. Amanhã é outro dia — sem revanche." };
  if (r.limite_diario && st.apostadoHoje + valor > r.limite_diario) {
    const resta = Math.max(0, r.limite_diario - st.apostadoHoje);
    return {
      ok: false,
      motivo: resta > 0 ? `Essa entrada passa do seu limite diário. Hoje ainda cabem R$ ${resta.toFixed(2)}.` : "Você já usou todo o seu limite de hoje.",
    };
  }
  return { ok: true };
}

// ------------------------------------------------------------------- conquistas ----

export interface Conquista {
  id: string;
  titulo: string;
  desc: string;
  icone: string;
  cor: string;
  conquistada: boolean;
  progresso: number; // 0..1
  progressoTxt: string;
}

/** Dias seguidos (até hoje) sem estourar limite, stop ou entrada acima de 5% da banca. */
export function diasDisciplinados(ops: Op[], r: Regras, now = Date.now()): number {
  if (!r.regras_desde) return 0;
  const inicio = new Date(r.regras_desde);
  inicio.setHours(0, 0, 0, 0);
  const banca = r.banca_inicial || 0;
  const porDia: Record<string, Op[]> = {};
  ops.filter((o) => o.status !== "cancelada").forEach((o) => {
    (porDia[dia(o.created_at)] ||= []).push(o);
  });
  let streak = 0;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  while (d >= inicio && streak < 3650) {
    const lista = porDia[dia(d)] || [];
    const apostado = lista.reduce((a, o) => a + o.valor, 0);
    const resultado = lista.reduce((a, o) => a + lucro(o), 0);
    const furou =
      (r.limite_diario && apostado > r.limite_diario) ||
      (r.stop_diario && resultado < -r.stop_diario * 1.5) || // perdeu bem além do stop = continuou depois do stop
      (banca > 0 && lista.some((o) => o.valor > banca * (ENTRADA_MAX_PCT / 100)));
    if (furou) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Reds depois dos quais a pessoa NÃO entrou de novo em menos de 1h (sem "revanche"). */
function redsSemRevanche(ops: Op[]) {
  const reds = ops.filter((o) => o.status === "red" && o.finalizada_em);
  let ok = 0;
  reds.forEach((red) => {
    const t = new Date(red.finalizada_em!).getTime();
    const revanche = ops.some((o) => {
      const c = new Date(o.created_at).getTime();
      return c > t && c - t < 3600_000;
    });
    if (!revanche) ok++;
  });
  return { ok, total: reds.length };
}

export function conquistas(ops: Op[], r: Regras, now = Date.now()): Conquista[] {
  const banca = r.banca_inicial || 0;
  const streak = diasDisciplinados(ops, r, now);
  const ultimas = ops
    .filter((o) => o.status !== "cancelada")
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 10);
  const conscientes = banca ? ultimas.filter((o) => o.valor <= banca * (ENTRADA_MAX_PCT / 100)).length : 0;
  const rev = redsSemRevanche(ops);
  const temRegras = !!(r.limite_diario && r.stop_diario);
  const pct = (a: number, b: number) => Math.max(0, Math.min(1, b ? a / b : 0));

  return [
    {
      id: "regras",
      titulo: "Regras no lugar",
      desc: "Definiu limite diário e stop de perda.",
      icone: "🛡️",
      cor: "#4F7BFF",
      conquistada: temRegras,
      progresso: (r.limite_diario ? 0.5 : 0) + (r.stop_diario ? 0.5 : 0),
      progressoTxt: temRegras ? "Ativo" : `${(r.limite_diario ? 1 : 0) + (r.stop_diario ? 1 : 0)}/2 regras`,
    },
    {
      id: "consciente",
      titulo: "Entrada consciente",
      desc: `Últimas 10 entradas com até ${ENTRADA_MAX_PCT}% da banca cada.`,
      icone: "🎯",
      cor: "#33D6F5",
      conquistada: ultimas.length >= 10 && conscientes === 10,
      progresso: pct(conscientes, 10),
      progressoTxt: `${conscientes}/10`,
    },
    {
      id: "semana",
      titulo: "Semana no controle",
      desc: "7 dias seguidos dentro das suas regras.",
      icone: "📅",
      cor: "#14E3A0",
      conquistada: streak >= 7,
      progresso: pct(streak, 7),
      progressoTxt: `${Math.min(streak, 7)}/7 dias`,
    },
    {
      id: "mes",
      titulo: "Mês blindado",
      desc: "30 dias seguidos dentro das suas regras.",
      icone: "🏆",
      cor: "#FFB547",
      conquistada: streak >= 30,
      progresso: pct(streak, 30),
      progressoTxt: `${Math.min(streak, 30)}/30 dias`,
    },
    {
      id: "sem_revanche",
      titulo: "Sangue frio",
      desc: "Depois de 5 reds, não entrou de novo na mesma hora pra recuperar.",
      icone: "🧊",
      cor: "#9B6BFF",
      conquistada: rev.ok >= 5,
      progresso: pct(rev.ok, 5),
      progressoTxt: `${Math.min(rev.ok, 5)}/5 reds`,
    },
    {
      id: "pausa",
      titulo: "Saber parar",
      desc: "Usou a pausa voluntária ao menos uma vez.",
      icone: "⏸️",
      cor: "#A4B0D0",
      conquistada: (r.pausas_usadas || 0) > 0,
      progresso: (r.pausas_usadas || 0) > 0 ? 1 : 0,
      progressoTxt: (r.pausas_usadas || 0) > 0 ? `${r.pausas_usadas}x` : "0/1",
    },
  ];
}
