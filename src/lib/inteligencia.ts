import type { Operation, Profile, Signal, Subscription } from "@/lib/types";

// =====================================================================================
// INTELIGÊNCIA DO ADMIN — tudo calculado das tabelas que já existem. Visitas da landing
// não são rastreadas pelo sistema, então o funil começa no cadastro (sem número inventado).
// =====================================================================================

const DIA = 86400000;
const FATOR_MENSAL: Record<string, number> = { mensal: 1, semestral: 1 / 6, anual: 1 / 12 };

export function mrrDe(subs: Subscription[]) {
  return subs.filter((s) => s.status === "ativa").reduce((a, s) => a + s.valor * (FATOR_MENSAL[s.plano] ?? 1), 0);
}

// -------------------------------------------------------------------------- funil ----

export function funil(users: Profile[], subs: Subscription[], diasJanela: number | null) {
  const corte = diasJanela ? Date.now() - diasJanela * DIA : 0;
  const base = users.filter((u) => u.role !== "admin" && new Date(u.created_at).getTime() >= corte);
  const ids = new Set(base.map((u) => u.id));
  const assinaram = new Set(subs.filter((s) => ids.has(s.user_id)).map((s) => s.user_id));
  const ativos = new Set(subs.filter((s) => ids.has(s.user_id) && s.status === "ativa").map((s) => s.user_id));
  const etapas = [
    { label: "Cadastros", n: base.length, desc: "contas criadas" },
    { label: "Personalizaram", n: base.filter((u) => u.tutorial_completo).length, desc: "concluíram o onboarding" },
    { label: "Assinaram", n: assinaram.size, desc: "já tiveram um plano" },
    { label: "Ativos agora", n: ativos.size, desc: "assinatura ativa hoje" },
  ];
  return etapas.map((e, i) => ({
    ...e,
    pctTopo: base.length ? (e.n / base.length) * 100 : 0,
    pctAnterior: i === 0 ? 100 : etapas[i - 1].n ? (e.n / etapas[i - 1].n) * 100 : 0,
  }));
}

// ------------------------------------------------------------------------ receita ----

export function receita(subs: Subscription[]) {
  const ativas = subs.filter((s) => s.status === "ativa");
  const mrr = mrrDe(subs);
  const porPlano = (["mensal", "semestral", "anual"] as const).map((p) => {
    const l = ativas.filter((s) => s.plano === p);
    return { plano: p, n: l.length, mrr: l.reduce((a, s) => a + s.valor * FATOR_MENSAL[p], 0) };
  });
  const agora = Date.now();
  const cancel30 = subs.filter((s) => s.canceled_at && agora - new Date(s.canceled_at).getTime() <= 30 * DIA).length;
  const novas30 = subs.filter((s) => agora - new Date(s.created_at).getTime() <= 30 * DIA).length;
  // churn = cancelamentos nos últimos 30d ÷ assinantes que já existiam (ativos) no início da janela
  const ini30 = agora - 30 * DIA;
  const baseInicio = subs.filter(
    (s) => new Date(s.created_at).getTime() < ini30 && (!s.canceled_at || new Date(s.canceled_at).getTime() >= ini30)
  );
  const cancelDaBase = baseInicio.filter((s) => s.canceled_at).length;
  const churn = baseInicio.length > 0 ? cancelDaBase / baseInicio.length : 0;
  const arpu = ativas.length ? mrr / ativas.length : 0;
  // Projeção simples e explícita: a cada mês o MRR perde o churn atual e ganha o mesmo
  // ritmo de novas assinaturas dos últimos 30 dias (× ticket médio). Não é previsão — é
  // "se nada mudar".
  const projetar = (meses: number) => {
    let m = mrr;
    for (let i = 0; i < meses; i++) m = m * (1 - churn) + novas30 * arpu;
    return m;
  };
  // 8 semanas de novas x canceladas
  const semanas = Array.from({ length: 8 }, (_, i) => {
    const fim = agora - (7 - i) * 7 * DIA;
    const ini = fim - 7 * DIA;
    return {
      label: new Date(fim).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      novas: subs.filter((s) => {
        const t = new Date(s.created_at).getTime();
        return t > ini && t <= fim;
      }).length,
      canceladas: subs.filter((s) => {
        if (!s.canceled_at) return false;
        const t = new Date(s.canceled_at).getTime();
        return t > ini && t <= fim;
      }).length,
    };
  });
  return {
    mrr,
    arr: mrr * 12,
    arpu,
    churn,
    novas30,
    cancel30,
    ativas: ativas.length,
    porPlano,
    projecao: [3, 6, 12].map((m) => ({ meses: m, mrr: projetar(m) })),
    semanas,
  };
}

// ------------------------------------------------------------ desempenho dos sinais ----

export interface LinhaDesempenho {
  chave: string;
  n: number;
  greens: number;
  pct: number;
  roi: number; // em unidades por sinal, stake 1 na odd publicada (%)
  oddMedia: number;
}

function agrupar(signals: Signal[], chave: (s: Signal) => string): LinhaDesempenho[] {
  const fechados = signals.filter((s) => s.status === "green" || s.status === "red");
  const map: Record<string, Signal[]> = {};
  fechados.forEach((s) => (map[chave(s)] ||= []).push(s));
  return Object.entries(map)
    .map(([k, l]) => {
      const greens = l.filter((s) => s.status === "green").length;
      const lucro = l.reduce((a, s) => a + (s.status === "green" ? s.odd - 1 : -1), 0);
      return {
        chave: k,
        n: l.length,
        greens,
        pct: Math.round((greens / l.length) * 100),
        roi: (lucro / l.length) * 100,
        oddMedia: l.reduce((a, s) => a + s.odd, 0) / l.length,
      };
    })
    .sort((a, b) => b.n - a.n);
}

export function desempenho(signals: Signal[]) {
  const faixa = (o: number) => (o < 1.5 ? "1.01 – 1.49" : o < 2 ? "1.50 – 1.99" : o < 3 ? "2.00 – 2.99" : "3.00+");
  return {
    mercado: agrupar(signals, (s) => (s.tipo === "bilhete" ? "Bilhetes" : s.mercado)),
    competicao: agrupar(signals, (s) => (s.tipo === "bilhete" ? "Bilhetes" : s.competicao)),
    estrategia: agrupar(signals, (s) => s.estrategia || "Sem estratégia"),
    faixaOdd: agrupar(signals, (s) => faixa(s.odd)).sort((a, b) => a.chave.localeCompare(b.chave)),
  };
}

// ------------------------------------------------------- risco de cancelamento ----

export interface RiscoUsuario {
  user: Profile;
  sub: Subscription;
  score: number; // 0..100
  nivel: "alto" | "medio" | "baixo";
  motivos: string[];
  diasSemAcesso: number | null;
  diasSemOperar: number | null;
  renovaEm: number | null;
}

export function riscoCancelamento(users: Profile[], subs: Subscription[], ops: Pick<Operation, "user_id" | "created_at">[]): RiscoUsuario[] {
  const agora = Date.now();
  const ultimaOp: Record<string, number> = {};
  ops.forEach((o) => {
    const t = new Date(o.created_at).getTime();
    if (!ultimaOp[o.user_id] || t > ultimaOp[o.user_id]) ultimaOp[o.user_id] = t;
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const out: RiscoUsuario[] = [];

  subs
    .filter((s) => (s.status === "ativa" || s.status === "atrasada") && userMap[s.user_id] && userMap[s.user_id].role !== "admin")
    .forEach((sub) => {
      const user = userMap[sub.user_id];
      const motivos: string[] = [];
      let score = 0;
      const diasSemAcesso = user.ultimo_acesso ? Math.floor((agora - new Date(user.ultimo_acesso).getTime()) / DIA) : null;
      const diasSemOperar = ultimaOp[user.id] ? Math.floor((agora - ultimaOp[user.id]) / DIA) : null;
      const renovaEm = sub.current_period_end ? Math.ceil((new Date(sub.current_period_end).getTime() - agora) / DIA) : null;

      if (sub.status === "atrasada") {
        score += 40;
        motivos.push("Pagamento atrasado");
      }
      if (diasSemAcesso === null) {
        score += 15;
        motivos.push("Sem registro de acesso");
      } else if (diasSemAcesso >= 14) {
        score += 35;
        motivos.push(`Não abre o painel há ${diasSemAcesso} dias`);
      } else if (diasSemAcesso >= 7) {
        score += 20;
        motivos.push(`Não abre o painel há ${diasSemAcesso} dias`);
      }
      if (diasSemOperar === null) {
        score += 20;
        motivos.push("Nunca marcou uma operação");
      } else if (diasSemOperar >= 14) {
        score += 15;
        motivos.push(`Sem marcar operação há ${diasSemOperar} dias`);
      }
      if (renovaEm !== null && renovaEm >= 0 && renovaEm <= 7) {
        score += 10;
        motivos.push(`Renova em ${renovaEm} ${renovaEm === 1 ? "dia" : "dias"}`);
      }
      if (!user.tutorial_completo) {
        score += 10;
        motivos.push("Não concluiu a personalização");
      }
      score = Math.min(100, score);
      out.push({ user, sub, score, nivel: score >= 50 ? "alto" : score >= 25 ? "medio" : "baixo", motivos, diasSemAcesso, diasSemOperar, renovaEm });
    });

  return out.sort((a, b) => b.score - a.score);
}
