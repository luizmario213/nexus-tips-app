import type { AgenteId, Signal } from "@/lib/types";

// Cálculos que alimentam a Sala ao Vivo, o Raio-X e o Simulador. Regra de ouro: tudo
// aqui sai de dado real (odd, histórico de sinais encerrados, horário do jogo) ou de
// campo preenchido pelo admin. Nada de número inventado pra "parecer bonito".

export type SinalEncerrado = Pick<Signal, "id" | "status" | "odd" | "mercado" | "competicao" | "created_at">;

export const AGENTES: { id: AgenteId; label: string }[] = [
  { id: "jogos", label: "Jogos do dia" },
  { id: "stats", label: "Estatísticas" },
  { id: "odds", label: "Odds do mercado" },
  { id: "historico", label: "Histórico" },
  { id: "oportunidade", label: "Oportunidade" },
];

/** Probabilidade implícita da odd decimal (sem margem da casa), em %. */
export function probImplicita(odd: number): number {
  return odd > 1 ? 100 / odd : 0;
}

/** Assertividade da Nexus num recorte (mesmo mercado / mesma competição). */
export function recorte(encerrados: SinalEncerrado[], fn: (s: SinalEncerrado) => boolean) {
  const lista = encerrados.filter((s) => (s.status === "green" || s.status === "red") && fn(s));
  const greens = lista.filter((s) => s.status === "green").length;
  return { total: lista.length, greens, pct: lista.length ? Math.round((greens / lista.length) * 100) : null };
}

/**
 * O que cada agente "encontrou". Se o admin preencheu `analise_agentes`, usa o texto
 * dele. Se não, monta uma linha honesta a partir de dado real do próprio sistema.
 */
export function achadosDosAgentes(
  signal: Signal,
  ctx: { noArMesmaCompeticao: number; encerrados: SinalEncerrado[] }
): Record<AgenteId, string> {
  const a = signal.analise_agentes || {};
  const mercado = recorte(ctx.encerrados, (s) => s.mercado === signal.mercado);
  const movimento =
    signal.odd_abertura && signal.odd_abertura !== signal.odd
      ? `Odd foi de ${fmtOdd(signal.odd_abertura)} para ${fmtOdd(signal.odd)} até a publicação`
      : `Odd ${fmtOdd(signal.odd)} — probabilidade implícita de ${probImplicita(signal.odd).toFixed(1).replace(".", ",")}%`;
  return {
    jogos:
      a.jogos ||
      `${ctx.noArMesmaCompeticao} ${ctx.noArMesmaCompeticao === 1 ? "sinal monitorado" : "sinais monitorados"} em ${signal.competicao} agora`,
    stats: a.stats || primeiraFrase(signal.rationale) || "Estatísticas do confronto cruzadas pela equipe",
    odds: a.odds || movimento,
    historico:
      a.historico ||
      (mercado.total >= 3
        ? `Nexus em "${signal.mercado}": ${mercado.greens}/${mercado.total} greens (${mercado.pct}%)`
        : `Mercado "${signal.mercado}" com poucos sinais encerrados até agora`),
    oportunidade: a.oportunidade || (signal.estrategia ? `Estratégia: ${signal.estrategia}` : "Entrada aprovada pela equipe"),
  };
}

function primeiraFrase(t: string | null | undefined) {
  if (!t) return null;
  const m = t.match(/^.+?[.!?](\s|$)/);
  const f = (m ? m[0] : t).trim();
  return f.length > 120 ? f.slice(0, 117) + "…" : f;
}

export function fmtOdd(o: number) {
  return o.toFixed(2);
}

// ------------------------------------------------------------------- tempo de jogo ----

export type FaseJogo =
  | { tipo: "futuro"; ms: number }
  | { tipo: "vivo"; minutos: number; progresso: number }
  | { tipo: "sem_horario" };

/** Fase do jogo a partir do horário marcado. "Ao vivo" é estimado pelo relógio (~105min com intervalo). */
export function faseDoJogo(signal: Signal, now: number): FaseJogo {
  if (!signal.horario_jogo) return signal.live ? { tipo: "vivo", minutos: 0, progresso: 0 } : { tipo: "sem_horario" };
  const ini = new Date(signal.horario_jogo).getTime();
  if (ini > now && !signal.live) return { tipo: "futuro", ms: ini - now };
  const min = Math.max(0, Math.floor((now - ini) / 60000));
  return { tipo: "vivo", minutos: min, progresso: Math.min(1, min / 105) };
}

export function fmtCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

// ---------------------------------------------------------------------- simulador ----

export interface Simulacao {
  pontos: { t: number; banca: number }[];
  final: number;
  lucro: number;
  roi: number; // lucro / total apostado, em %
  maxDrawdown: number; // maior queda em R$, pico → vale
  greens: number;
  reds: number;
  apostado: number;
}

/** Simula seguir todos os sinais encerrados, em ordem, com stake fixo por entrada. */
export function simular(encerrados: SinalEncerrado[], bancaInicial: number, stake: number): Simulacao {
  const lista = encerrados
    .filter((s) => s.status === "green" || s.status === "red")
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  let banca = bancaInicial;
  let pico = banca;
  let dd = 0;
  let greens = 0;
  let reds = 0;
  const pontos = [{ t: lista[0] ? new Date(lista[0].created_at).getTime() : Date.now(), banca }];
  for (const s of lista) {
    if (s.status === "green") {
      banca += stake * (s.odd - 1);
      greens++;
    } else {
      banca -= stake;
      reds++;
    }
    pico = Math.max(pico, banca);
    dd = Math.max(dd, pico - banca);
    pontos.push({ t: new Date(s.created_at).getTime(), banca });
  }
  const apostado = stake * lista.length;
  const lucro = banca - bancaInicial;
  return { pontos, final: banca, lucro, roi: apostado ? (lucro / apostado) * 100 : 0, maxDrawdown: dd, greens, reds, apostado };
}
