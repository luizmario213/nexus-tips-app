// =====================================================================================
// MODO DEMONSTRAÇÃO — Supabase falso, em memória, com dados fictícios.
// Liga só quando NEXT_PUBLIC_DEMO_MODE=1 (ex.: no .env.local). Serve pra navegar por
// todo o dashboard e o admin sem um projeto Supabase de verdade — útil pra revisar o
// design. Em produção (variável ausente) nada disto é usado.
// Os dados são gerados com semente fixa, então servidor e navegador enxergam o mesmo
// conjunto. Escritas (insert/update/delete) valem só na memória daquele lado.
// =====================================================================================

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

type Row = Record<string, any>;
type DB = Record<string, Row[]>;

const DEMO_USER_ID = "00000000-demo-4000-8000-000000000001";
const DEMO_EMAIL = "demo@nexustips.app";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

let _db: DB | null = null;

function buildDB(): DB {
  const r = rng(42);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const now = Date.now();
  const H = 3600_000;
  const D = 24 * H;
  const iso = (t: number) => new Date(t).toISOString();
  let n = 0;
  const id = (p: string) => `${p}-${String(++n).padStart(6, "0")}-demo`;

  const NOMES = [
    "Rafael Souza", "Camila Ribeiro", "Bruno Carvalho", "Juliana Martins", "Thiago Lima", "Fernanda Rocha",
    "Gustavo Pereira", "Larissa Gomes", "Diego Barbosa", "Patrícia Alves", "Rodrigo Nunes", "Aline Teixeira",
    "Marcelo Duarte", "Bianca Freitas", "Leonardo Castro", "Natália Moreira", "Felipe Araújo", "Renata Cardoso",
    "André Mendes", "Vanessa Dias", "Eduardo Pinto", "Tatiane Lopes", "Vinícius Ramos", "Carolina Farias",
    "Matheus Correia", "Priscila Batista", "Henrique Vieira", "Jéssica Monteiro",
  ];
  const TIMES = ["Flamengo", "Palmeiras", "Corinthians", "São Paulo", "Grêmio", "Internacional", "Atlético-MG", "Fluminense", "Botafogo", "Cruzeiro", "Bahia", "Fortaleza"];

  const profiles: Row[] = [
    {
      id: DEMO_USER_ID, name: "Visitante Demo", email: DEMO_EMAIL, phone: "(11) 90000-0000", role: "admin",
      time_coracao: "Palmeiras", banca_inicial: 2000, tutorial_completo: true, ativo: true, created_at: iso(now - 60 * D),
      ultimo_acesso: iso(now), perfil_risco: "moderado", ligas_favoritas: ["Premier League", "Brasileirão"],
      limite_diario: 600, stop_diario: 300, pausa_ate: null, pausas_usadas: 0, regras_desde: iso(now - 12 * D),
    },
  ];
  NOMES.forEach((nome, i) => {
    profiles.push({
      id: id("usr"), name: nome,
      email: nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(" ", ".") + "@email.com",
      phone: `(11) 9${Math.floor(1000 + r() * 8999)}-${Math.floor(1000 + r() * 8999)}`,
      role: "user", time_coracao: pick(TIMES), banca_inicial: Math.round(300 + r() * 4700),
      tutorial_completo: r() > 0.12, ativo: r() > 0.06,
      ultimo_acesso: iso(now - (i % 5 === 0 ? 12 + r() * 20 : r() * 4) * D),
      created_at: iso(now - (i < 3 ? r() * 0.8 * D : r() * 50 * D)),
    });
  });

  const PRECO = { mensal: 47.9, semestral: 397.9, anual: 697.9 } as const;
  const subscriptions: Row[] = [];
  profiles.slice(1).forEach((p, i) => {
    if (r() < 0.72) {
      const plano = pick(["mensal", "mensal", "mensal", "semestral", "anual"] as const);
      const created = new Date(p.created_at).getTime() + r() * 3 * D;
      const status = i % 9 === 4 ? "cancelada" : i % 11 === 7 ? "atrasada" : "ativa";
      subscriptions.push({
        id: id("sub"), user_id: p.id, plano, valor: PRECO[plano], status, provider: "manual",
        provider_subscription_id: null, current_period_end: iso(created + 30 * D),
        created_at: iso(Math.min(created, now - H)), canceled_at: status === "cancelada" ? iso(now - r() * 5 * D) : null,
      });
    }
  });

  const JOGOS: [string, string, string][] = [
    ["Premier League", "Arsenal", "Chelsea"], ["Premier League", "Liverpool", "Man. City"], ["Premier League", "Tottenham", "Newcastle"],
    ["La Liga", "Barcelona", "Atlético"], ["La Liga", "Real Madrid", "Sevilla"], ["La Liga", "Villarreal", "Betis"],
    ["Serie A", "Inter", "Milan"], ["Serie A", "Napoli", "Roma"], ["Serie A", "Juventus", "Lazio"],
    ["Bundesliga", "Bayern", "Dortmund"], ["Bundesliga", "Leverkusen", "Leipzig"],
    ["Brasileirão", "Corinthians", "São Paulo"], ["Brasileirão", "Flamengo", "Palmeiras"], ["Brasileirão", "Grêmio", "Internacional"],
    ["Brasileirão", "Botafogo", "Fluminense"], ["Champions League", "PSG", "Benfica"], ["Libertadores", "River Plate", "Boca Juniors"],
  ];
  const MERCADOS = ["Mais de 1.5 gols", "Ambas marcam", "Dupla chance 1X", "Mais de 2.5 gols", "Menos de 3.5 gols", "Vitória mandante", "Escanteios +8.5", "Handicap asiático -0.5"];
  const ESTRATEGIAS = ["Momentum ofensivo", "Vantagem de mando", "Consistência defensiva instável", "Valor no mercado", "Tendência de gols"];
  const RATIONALES = [
    "O mandante marcou ao menos 2 gols em 4 dos últimos 5 jogos em casa, e o visitante sofreu gols em 6 dos últimos 7 fora. O padrão ofensivo recente sustenta um jogo aberto.",
    "A odd subiu nas últimas horas sem notícia relevante de escalação — o mercado está pagando acima do que o histórico do confronto justifica.",
    "Os dois times têm média combinada de 3,1 gols nos últimos 10 jogos, com defesas cedendo chances claras em transição.",
    "Confronto direto com 7 dos últimos 9 jogos terminando com gols dos dois lados; ambos chegam sem desfalques no ataque.",
  ];

  const signals: Row[] = [];
  const signal_legs: Row[] = [];
  const total = 46;
  for (let i = 0; i < total; i++) {
    const [comp, a, b] = pick(JOGOS);
    const ageH = i < 6 ? -(i * 3 + 1) : (i - 5) * 15 + r() * 10; // primeiros 6 = jogos futuros/ao vivo
    const created = now - Math.max(ageH, 0.5) * H - (ageH < 0 ? 2 * H : 0);
    const encerrado = i >= 6;
    const status = !encerrado ? "no_ar" : i % 8 === 3 ? "red" : i === 20 ? "cancelado" : "green";
    const bilhete = i === 2 || i === 14 || i === 27;
    const sid = id("sig");
    const odd = +(1.45 + r() * 0.9).toFixed(2);
    signals.push({
      id: sid, competicao: bilhete ? "Bilhete do dia" : comp, time_a: bilhete ? "Múltipla" : a,
      time_b: bilhete ? "Bilhete 3 jogos" : b, mercado: bilhete ? "Combinada" : pick(MERCADOS),
      odd: bilhete ? +(odd * 2.4).toFixed(2) : odd, estrategia: pick(ESTRATEGIAS), rationale: pick(RATIONALES),
      status, live: i === 0, horario_jogo: iso(i === 0 ? now - 35 * 60_000 : !encerrado ? now + (i * 2.5 + 1) * H : created + 3 * H),
      tipo: bilhete ? "bilhete" : "simples", casa_nome: "Casa Parceira", casa_link: "#",
      sugestao_tipo: pick(["percentual", "unidades"] as const), sugestao_valor: pick([1, 2, 3]),
      published_by: DEMO_USER_ID, created_at: iso(created),
      // Raio-X: os 4 primeiros sinais no ar vêm com tudo preenchido pelo "admin"; o resto
      // fica vazio pra mostrar o fallback honesto (só dado real).
      ...(i < 4
        ? {
            confianca: 68 + Math.floor(r() * 22),
            odd_abertura: +(odd - 0.04 - r() * 0.1).toFixed(2),
            riscos: pick([
              "Mandante pode poupar titulares pensando na Copa no meio de semana; chuva prevista pode travar o jogo no segundo tempo.",
              "Visitante costuma fechar a casinha fora contra times do topo; um gol cedo dele muda totalmente a dinâmica.",
              "Árbitro com média alta de cartões — expulsão cedo derruba a expectativa de gols.",
            ]),
            analise_agentes: {
              jogos: `${4 + Math.floor(r() * 8)} jogos de ${comp} cruzados hoje`,
              stats: `${a} marcou 2+ gols em ${3 + Math.floor(r() * 3)} dos últimos 5 em casa`,
              odds: "Odd subiu nas últimas 3h sem notícia de escalação",
              historico: `${b} sofreu gols em ${5 + Math.floor(r() * 3)} dos últimos 8 fora`,
              oportunidade: `Valor esperado +${(4 + r() * 7).toFixed(1).replace(".", ",")}% sobre a odd de mercado`,
            },
          }
        : {}),
    });
    if (bilhete) {
      for (let k = 0; k < 3; k++) {
        const [c2, a2, b2] = pick(JOGOS);
        signal_legs.push({ id: id("leg"), signal_id: sid, competicao: c2, time_a: a2, time_b: b2, mercado: pick(MERCADOS), odd: +(1.3 + r() * 0.4).toFixed(2), ordem: k, created_at: iso(created) });
      }
    }
  }

  const operations: Row[] = [];
  signals.forEach((s, i) => {
    if (s.status === "cancelado" || (i > 6 && r() < 0.35) || i > 34) return;
    const valor = pick([20, 40, 50, 60, 80, 100]);
    const st = s.status === "no_ar" ? "andamento" : s.status;
    operations.push({
      id: id("op"), user_id: DEMO_USER_ID, signal_id: s.id, valor, odd_obtida: s.odd, status: st,
      finalizada_em: st === "andamento" ? null : iso(new Date(s.created_at).getTime() + 4 * H),
      created_at: iso(new Date(s.created_at).getTime() + 10 * 60_000),
    });
  });

  // Operações dos outros usuários (alimentam o "risco de cancelamento" do admin).
  const fechados = signals.filter((s) => s.status === "green" || s.status === "red");
  profiles.slice(1).forEach((p, i) => {
    const n = i % 4 === 0 ? 0 : Math.floor(r() * 7);
    for (let k = 0; k < n; k++) {
      const s = pick(fechados);
      operations.push({
        id: id("op"), user_id: p.id, signal_id: s.id, valor: pick([20, 30, 50]), odd_obtida: s.odd, status: s.status,
        finalizada_em: iso(new Date(s.created_at).getTime() + 4 * H), created_at: iso(new Date(s.created_at).getTime() + 15 * 60_000),
      });
    }
  });

  const banca_movimentos: Row[] = [
    { id: id("mov"), user_id: DEMO_USER_ID, tipo: "aporte", valor: 500, nota: "Aporte do mês", created_at: iso(now - 20 * D) },
    { id: id("mov"), user_id: DEMO_USER_ID, tipo: "saque", valor: -300, nota: "Retirada de lucro", created_at: iso(now - 6 * D) },
  ];

  const ASSUNTOS = ["Dúvida sobre gestão de banca", "Não recebi notificação do sinal", "Como cancelar o plano?", "Erro ao marcar operação", "Sugestão de mercado"];
  const support_tickets: Row[] = [];
  const support_messages: Row[] = [];
  [DEMO_USER_ID, ...profiles.slice(1, 7).map((p) => p.id)].forEach((uid, i) => {
    const tid = id("tkt");
    const created = now - (i + 1) * 9 * H;
    const status = i === 0 ? "respondido" : i % 3 === 0 ? "fechado" : i % 2 ? "aberto" : "respondido";
    support_tickets.push({ id: tid, user_id: uid, assunto: ASSUNTOS[i % ASSUNTOS.length], status, prioridade: pick(["alta", "media", "baixa"] as const), created_at: iso(created) });
    support_messages.push({ id: id("msg"), ticket_id: tid, sender: "user", text: "Oi, equipe! " + ASSUNTOS[i % ASSUNTOS.length] + " — podem me ajudar?", created_at: iso(created) });
    if (status !== "aberto")
      support_messages.push({ id: id("msg"), ticket_id: tid, sender: "admin", text: "Claro! Já verificamos aqui e está tudo certo com a sua conta. Qualquer coisa, é só chamar.", created_at: iso(created + 40 * 60_000) });
  });

  return {
    profiles, subscriptions, signals, signal_legs, operations, banca_movimentos, support_tickets, support_messages,
    app_settings: [{ id: 1, casa_nome: "Casa Parceira", casa_link: "#", whatsapp_link: "#", updated_at: iso(now) }],
  };
}

function db(): DB {
  if (!_db) _db = buildDB();
  return _db;
}

// ----------------------------------------------------------------- query builder ----

type Filter = (row: Row) => boolean;

class Query implements PromiseLike<{ data: any; error: any; count?: number | null }> {
  private filters: Filter[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private lim: number | null = null;
  private rng: [number, number] | null = null;
  private mode: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: any = null;
  private cols = "*";
  private one: "single" | "maybe" | null = null;
  private countOpt: { count?: string; head?: boolean } | null = null;

  constructor(private table: string) {}

  select(cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.mode === "select") this.cols = cols || "*";
    if (opts) this.countOpt = opts;
    return this;
  }
  insert(v: any) { this.mode = "insert"; this.payload = v; return this; }
  upsert(v: any) { this.mode = "upsert"; this.payload = v; return this; }
  update(v: any) { this.mode = "update"; this.payload = v; return this; }
  delete() { this.mode = "delete"; return this; }

  eq(c: string, v: any) { this.filters.push((r) => r[c] === v); return this; }
  neq(c: string, v: any) { this.filters.push((r) => r[c] !== v); return this; }
  gt(c: string, v: any) { this.filters.push((r) => r[c] > v); return this; }
  gte(c: string, v: any) { this.filters.push((r) => r[c] >= v); return this; }
  lt(c: string, v: any) { this.filters.push((r) => r[c] < v); return this; }
  lte(c: string, v: any) { this.filters.push((r) => r[c] <= v); return this; }
  in(c: string, vs: any[]) { this.filters.push((r) => vs.includes(r[c])); return this; }
  is(c: string, v: any) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
  not(c: string, op: string, v: any) { if (op === "is") this.filters.push((r) => (r[c] ?? null) !== v); return this; }
  ilike(c: string, p: string) { const rx = new RegExp("^" + p.replace(/%/g, ".*") + "$", "i"); this.filters.push((r) => rx.test(String(r[c] ?? ""))); return this; }
  like(c: string, p: string) { return this.ilike(c, p); }
  or() { return this; }
  match(o: Row) { Object.entries(o).forEach(([k, v]) => this.eq(k, v)); return this; }
  filter(c: string, op: string, v: any) {
    const m: Record<string, (a: any) => boolean> = { eq: (a) => a === v, neq: (a) => a !== v, gt: (a) => a > v, gte: (a) => a >= v, lt: (a) => a < v, lte: (a) => a <= v };
    if (m[op]) this.filters.push((r) => m[op](r[c]));
    return this;
  }
  order(col: string, o?: { ascending?: boolean }) { this.orders.push({ col, asc: o?.ascending !== false }); return this; }
  limit(n: number) { this.lim = n; return this; }
  range(a: number, b: number) { this.rng = [a, b]; return this; }
  single() { this.one = "single"; return this; }
  maybeSingle() { this.one = "maybe"; return this; }

  private expand(rows: Row[]): Row[] {
    const d = db();
    const wantSignals = /signals\(/.test(this.cols);
    const wantLegs = /signal_legs\(/.test(this.cols);
    const wantProfiles = /profiles\(/.test(this.cols);
    if (!wantSignals && !wantLegs && !wantProfiles) return rows.map((x) => ({ ...x }));
    return rows.map((row) => {
      const out: Row = { ...row };
      if (wantSignals) out.signals = d.signals.find((s) => s.id === row.signal_id) ?? null;
      if (wantLegs) out.signal_legs = d.signal_legs.filter((l) => l.signal_id === row.id).sort((a, b) => a.ordem - b.ordem);
      if (wantProfiles) out.profiles = d.profiles.find((p) => p.id === row.user_id) ?? null;
      return out;
    });
  }

  private run() {
    const d = db();
    const table = (d[this.table] ||= []);
    const match = (r: Row) => this.filters.every((f) => f(r));
    let rows: Row[] = [];

    if (this.mode === "insert" || this.mode === "upsert") {
      const items = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((v: Row) => ({
        id: v.id ?? `${this.table}-${Math.random().toString(36).slice(2, 10)}`,
        created_at: new Date().toISOString(),
        ...v,
      }));
      items.forEach((it: Row) => {
        const ix = table.findIndex((x) => x.id === it.id);
        if (ix >= 0) table[ix] = { ...table[ix], ...it };
        else table.push(it);
      });
      rows = items;
    } else if (this.mode === "update") {
      table.forEach((r, i) => {
        if (match(r)) table[i] = { ...r, ...this.payload };
      });
      rows = table.filter(match);
    } else if (this.mode === "delete") {
      rows = table.filter(match);
      d[this.table] = table.filter((r) => !match(r));
    } else {
      rows = table.filter(match);
      for (const o of [...this.orders].reverse()) {
        rows = [...rows].sort((a, b) => (a[o.col] > b[o.col] ? 1 : a[o.col] < b[o.col] ? -1 : 0) * (o.asc ? 1 : -1));
      }
      if (this.rng) rows = rows.slice(this.rng[0], this.rng[1] + 1);
      if (this.lim != null) rows = rows.slice(0, this.lim);
    }

    const count = rows.length;
    let data: any = this.expand(rows);
    if (this.countOpt?.head) data = null;
    if (this.one) {
      if (data.length === 0) {
        return this.one === "single"
          ? { data: null, error: { code: "PGRST116", message: "No rows (demo)" }, count }
          : { data: null, error: null, count };
      }
      data = data[0];
    }
    return { data, error: null, count };
  }

  then<A = any, B = never>(ok?: ((v: any) => A | PromiseLike<A>) | null, bad?: ((e: any) => B | PromiseLike<B>) | null): Promise<A | B> {
    return Promise.resolve(this.run()).then(ok, bad);
  }
}

// ------------------------------------------------------------------------- client ----

const demoUser = {
  id: DEMO_USER_ID,
  email: DEMO_EMAIL,
  user_metadata: { name: "Visitante Demo" },
  app_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

function channel() {
  const ch: any = { on: () => ch, subscribe: (cb?: (s: string) => void) => { cb?.("SUBSCRIBED"); return ch; }, unsubscribe: async () => "ok" };
  return ch;
}

export function createDemoClient(): any {
  const session = { user: demoUser, access_token: "demo", refresh_token: "demo", expires_in: 3600, token_type: "bearer" };
  return {
    from: (t: string) => new Query(t),
    channel,
    removeChannel: async () => "ok",
    removeAllChannels: async () => [],
    rpc: async () => ({ data: null, error: null }),
    auth: {
      getUser: async () => ({ data: { user: demoUser }, error: null }),
      getSession: async () => ({ data: { session }, error: null }),
      onAuthStateChange: (cb?: (e: string, s: any) => void) => {
        setTimeout(() => cb?.("SIGNED_IN", session), 0);
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signInWithPassword: async () => ({ data: { user: demoUser, session }, error: null }),
      signUp: async () => ({ data: { user: demoUser, session }, error: null }),
      signOut: async () => ({ error: null }),
      updateUser: async () => ({ data: { user: demoUser }, error: null }),
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
      exchangeCodeForSession: async () => ({ data: { session }, error: null }),
    },
  };
}
