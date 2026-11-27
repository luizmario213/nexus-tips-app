import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { temAcessoLiberado } from "@/lib/access";
import type { Signal } from "@/lib/types";
import type { SinalEncerrado } from "@/lib/insights";
import { SimuladorESe } from "@/components/SimuladorESe";
import { Greeting, NextSignalTile, PctRing } from "@/components/HomeWidgets";

const ICON_BOLT = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" strokeLinejoin="round" />
  </svg>
);
const ICON_WALLET = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10h18" />
    <circle cx="16" cy="14.5" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);
const ICON_CLOCK = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ICON_HEADSET = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20l1-5.4A8.5 8.5 0 1 1 21 11.5z" />
  </svg>
);
const ICON_CARD = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="5" width="20" height="14" rx="2.5" />
    <path d="M2 10h20" strokeLinecap="round" />
  </svg>
);
const ICON_LOCK = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#69759A" strokeWidth="2">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
  </svg>
);
const ICON_CHEVRON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted flex-none">
    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default async function VisaoGeralPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

  // Todas as consultas da Visão Geral saem juntas (antes eram 7 idas ao banco em fila).
  const [
    { data: activeSub },
    { data: profile },
    { data: allOperations },
    { data: sinaisRecentes },
    { data: sinaisSemana },
    { data: ticker },
    { data: noAr },
    { data: encerrados },
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "ativa")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("role, name, banca_inicial").eq("id", user.id).single(),
    supabase.from("operations").select("*, signals(*)").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("signals").select("status").in("status", ["green", "red"]).gte("created_at", trintaDiasAtras.toISOString()),
    supabase.from("signals").select("status, created_at").in("status", ["green", "red"]).gte("created_at", seteDiasAtras.toISOString()),
    supabase.from("signals").select("id, time_a, time_b, tipo, status").in("status", ["green", "red"]).order("created_at", { ascending: false }).limit(14),
    supabase.from("signals").select("*").eq("status", "no_ar"),
    supabase.from("signals").select("id, status, odd, mercado, competicao, created_at").in("status", ["green", "red"]),
  ]);
  // Conta admin tem acesso liberado mesmo sem assinatura — ver src/lib/access.ts.
  const subscribed = temAcessoLiberado(profile?.role, !!activeSub);


  const operations = (allOperations || []).filter((op) => op.status === "andamento");
  const settled = (allOperations || []).filter((op) => op.status !== "andamento");
  const greens = settled.filter((op) => op.status === "green").length;
  const reds = settled.filter((op) => op.status === "red").length;
  const minhaAssertividade = settled.length ? Math.round((greens / settled.length) * 100) : null;
  const recentes = settled.slice(0, 4);

  // Assertividade da plataforma nos últimos 30 dias — calculada de verdade a partir dos
  // sinais encerrados, não um número fixo no código.
  const plataformaGreens = (sinaisRecentes || []).filter((s) => s.status === "green").length;
  const plataformaTotal = sinaisRecentes?.length || 0;
  const assertividadePlataforma = plataformaTotal
    ? Math.round((plataformaGreens / plataformaTotal) * 100)
    : null;

  // Trilha dos últimos 7 dias (volume + proporção green/red) — só pra dar um pulso visual
  // de atividade real da plataforma, calculado a partir dos mesmos sinais encerrados acima.

  const hoje = new Date();
  const dias = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const diaKey = (d: Date) => d.toISOString().slice(0, 10);
  const porDia: Record<string, { green: number; total: number }> = {};
  dias.forEach((d) => {
    porDia[diaKey(d)] = { green: 0, total: 0 };
  });
  (sinaisSemana || []).forEach((s) => {
    const key = new Date(s.created_at).toISOString().slice(0, 10);
    if (porDia[key]) {
      porDia[key].total++;
      if (s.status === "green") porDia[key].green++;
    }
  });
  const trend = dias.map((d) => {
    const { green, total } = porDia[diaKey(d)];
    return {
      label: d.toLocaleDateString("pt-BR", { weekday: "narrow" }),
      total,
      green,
      red: total - green,
    };
  });
  const trendMax = Math.max(1, ...trend.map((t) => t.total));

  // Ticker de sinais recentes da plataforma — mesma ideia do histórico público da landing,
  // só que ao vivo dentro do painel. Também serve pra calcular a sequência atual da
  // plataforma (streak), usada como gancho pra quem ainda não assinou.

  let platformStreak = 0;
  for (const s of ticker || []) {
    if (s.status === "green") platformStreak++;
    else break;
  }

  // Mesma definição de sequência usada em Gestão: conta a partir da operação mais
  // recente, para no primeiro não-green.
  let userStreak = 0;
  for (const o of settled) {
    if (o.status === "green") userStreak++;
    else break;
  }

  // Sinais no ar (pro bloco "Próximo sinal") e todo o histórico encerrado (pro simulador).
  const agora = Date.now();
  const proximo =
    ((noAr as Signal[]) || [])
      .slice()
      .sort((a, b) => {
        const ta = a.horario_jogo ? new Date(a.horario_jogo).getTime() : Infinity;
        const tb = b.horario_jogo ? new Date(b.horario_jogo).getTime() : Infinity;
        // ao vivo (já começou) primeiro, depois o mais próximo de começar
        const pa = ta <= agora || a.live ? 0 : 1;
        const pb = tb <= agora || b.live ? 0 : 1;
        return pa - pb || ta - tb;
      })[0] || null;

  const nome = (profile as { name?: string } | null)?.name || user.email || "você";
  const bancaInicial = Number((profile as { banca_inicial?: number } | null)?.banca_inicial) || 1000;

  const acoes = [
    { href: "/dashboard/eventos", icon: ICON_BOLT, label: "Sala ao Vivo", hint: "Sinais no ar agora", locked: !subscribed },
    { href: subscribed ? "/dashboard/gestao" : "/dashboard/planos", icon: ICON_WALLET, label: "Gestão", hint: "Sua banca e resultado", locked: !subscribed },
    { href: "/dashboard/historico", icon: ICON_CLOCK, label: "Histórico", hint: "Suas operações", locked: !subscribed },
    { href: "/dashboard/suporte", icon: ICON_HEADSET, label: "Suporte", hint: "Fale com a equipe", locked: false },
  ];

  const tile = "card p-5 md:p-6";

  return (
    <div className="flex flex-col max-w-6xl gap-4">
      {/* Ticker ao vivo */}
      {ticker && ticker.length > 0 && (
        <div className="border-y border-white/[0.06] bg-white/[0.015] py-3 overflow-hidden mb-2 rounded-xl [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
          <div className="marquee-track flex items-center gap-8 whitespace-nowrap w-max">
            {[...ticker, ...ticker].map((s, i) => (
              <span key={`${s.id}-${i}`} className="flex items-center gap-2 text-[11px] font-mono flex-none">
                <span className={`w-1.5 h-1.5 rounded-full ${s.status === "green" ? "bg-success shadow-[0_0_8px_#14E3A0]" : "bg-danger shadow-[0_0_8px_#FF4D6D]"}`} />
                <span className="text-text2 font-semibold">{s.tipo === "bilhete" ? s.time_b : `${s.time_a} x ${s.time_b}`}</span>
                <span className={`font-bold ${s.status === "green" ? "text-success" : "text-danger"}`}>{s.status === "green" ? "GREEN" : "RED"}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* BENTO */}
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4">
        {/* Saudação + conta */}
        <div className={`${tile} md:col-span-6 lg:col-span-5 relative overflow-hidden flex flex-col justify-between gap-6`}>
          <div className="absolute -top-20 -left-16 w-72 h-72 rounded-full bg-primary/20 blur-[90px] pointer-events-none" />
          <div className="relative">
            <span className="text-[10px] font-bold tracking-[0.2em] text-text2">VISÃO GERAL</span>
            <h1 className="font-display text-[30px] md:text-[38px] font-semibold tracking-[-0.035em] leading-[1.05] mt-3">
              <Greeting name={nome} />
            </h1>
            <p className="text-sm text-text2 mt-2">
              {subscribed
                ? operations.length
                  ? `Você tem ${operations.length} ${operations.length === 1 ? "operação rolando" : "operações rolando"} agora.`
                  : "Nenhuma operação aberta — a sala está te esperando."
                : "Você está na conta gratuita. O placar é público; a análise é pra assinantes."}
            </p>
          </div>
          <div className="relative flex items-center justify-between gap-3 flex-wrap">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10.5px] font-bold tracking-wider ${
                subscribed ? "border-success/40 bg-success/10 text-success" : "border-white/10 bg-white/[0.04] text-text2"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${subscribed ? "bg-success animate-pulse" : "bg-muted"}`} />
              {activeSub ? `PLANO ${String(activeSub.plano).toUpperCase()} ATIVO` : subscribed ? "ACESSO LIBERADO · ADMIN" : "CONTA GRATUITA"}
            </span>
            <Link href="/dashboard/planos" className={`${activeSub || subscribed ? "btn-ghost" : "btn-primary"} text-xs px-4 py-2.5`}>
              {activeSub ? "Gerenciar plano" : subscribed ? "Ver planos" : "Liberar tudo"}
            </Link>
          </div>
        </div>

        {/* Próximo sinal */}
        <div className={`${tile} md:col-span-6 lg:col-span-7 glow-border relative overflow-hidden !bg-[rgba(12,18,44,.72)]`}>
          <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-accent/20 blur-[90px] pointer-events-none" />
          <div className="relative h-full">
            <NextSignalTile signal={proximo} total={(noAr || []).length} subscribed={subscribed} />
          </div>
        </div>

        {/* Assertividade Nexus */}
        <div className={`${tile} md:col-span-3 lg:col-span-4 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center lg:items-start xl:items-center gap-4`}>
          <PctRing value={assertividadePlataforma} label="30 DIAS" />
          <div className="min-w-0">
            <div className="text-[10px] font-bold tracking-[0.18em] text-text2 whitespace-nowrap">ASSERTIVIDADE NEXUS</div>
            <div className="font-mono text-lg font-semibold mt-2 whitespace-nowrap">
              <span className="text-success">{plataformaGreens}</span>
              <span className="text-muted text-sm"> / </span>
              <span className="text-danger">{plataformaTotal - plataformaGreens}</span>
            </div>
            <div className="text-[11px] text-muted">greens / reds públicos</div>
            {platformStreak > 1 && <div className="text-[11px] text-warning font-semibold mt-2">🔥 {platformStreak} greens seguidos</div>}
          </div>
        </div>

        {/* Você */}
        <div className={`${tile} md:col-span-3 lg:col-span-4 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center lg:items-start xl:items-center gap-4`}>
          {subscribed ? (
            <>
              <PctRing value={minhaAssertividade} color="#33D6F5" label="VOCÊ" />
              <div className="min-w-0">
                <div className="text-[10px] font-bold tracking-[0.18em] text-text2 whitespace-nowrap">SUAS OPERAÇÕES</div>
                <div className="font-mono text-lg font-semibold mt-2 whitespace-nowrap">
                  <span className="text-success">{greens}</span>
                  <span className="text-muted text-sm"> / </span>
                  <span className="text-danger">{reds}</span>
                </div>
                <div className="text-[11px] text-muted">greens / reds marcados</div>
                {userStreak > 1 && <div className="text-[11px] text-warning font-semibold mt-2">🔥 sequência de {userStreak}</div>}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="text-[10px] font-bold tracking-[0.18em] text-text2">SEU RESULTADO</div>
              <p className="text-sm text-text2">Assine e marque suas operações pra acompanhar sua própria assertividade aqui.</p>
              <Link href="/dashboard/planos" className="btn-outline text-xs px-4 py-2 w-fit">Ver planos</Link>
            </div>
          )}
        </div>

        {/* Semana */}
        <div className={`${tile} md:col-span-6 lg:col-span-4 flex flex-col gap-3`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.18em] text-text2">SINAIS ENCERRADOS · 7D</span>
            <span className="text-[10px] text-muted">{trend.reduce((a, t) => a + t.total, 0)} no total</span>
          </div>
          <div className="flex items-end gap-2 h-24 mt-auto">
            {trend.map((t, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full">
                <div className="w-full flex-1 flex flex-col justify-end rounded-md overflow-hidden bg-white/[0.04]">
                  {t.total > 0 && (
                    <div style={{ height: `${Math.max(10, (t.total / trendMax) * 100)}%` }} className="w-full flex flex-col justify-end">
                      {t.red > 0 && <div className="w-full bg-danger/70" style={{ height: `${(t.red / t.total) * 100}%` }} />}
                      {t.green > 0 && <div className="w-full bg-gradient-to-t from-success/70 to-success" style={{ height: `${(t.green / t.total) * 100}%` }} />}
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-semibold text-muted uppercase">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Operações em andamento */}
        <div className={`${tile} md:col-span-6 lg:col-span-8 !p-0 overflow-hidden`}>
          <div className="flex items-center justify-between px-5 md:px-6 pt-5 pb-3">
            <span className="text-[10px] font-bold tracking-[0.18em] text-text2">OPERAÇÕES EM ANDAMENTO · {operations.length}</span>
            {operations.length > 0 && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-info">
                <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" /> AO VIVO
              </span>
            )}
          </div>
          {operations.length > 0 ? (
            <div className="divide-y divide-white/[0.05]">
              {operations.slice(0, 5).map((op: any) => (
                <div key={op.id} className="flex items-center gap-3 px-5 md:px-6 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <span className="w-2 h-2 rounded-full bg-info flex-none animate-pulse shadow-[0_0_10px_#33D6F5]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold truncate">
                      {op.signals.tipo === "bilhete" ? op.signals.time_b : `${op.signals.time_a} x ${op.signals.time_b}`}
                    </div>
                    <div className="text-xs text-text2 mt-0.5 truncate">{op.signals.tipo === "bilhete" ? "Combinados" : op.signals.mercado}</div>
                  </div>
                  <div className="text-right flex-none">
                    <div className="text-[10px] text-muted">
                      @{op.odd_obtida ?? op.signals.odd} · R$ {op.valor}
                    </div>
                    <div className="font-mono text-sm font-semibold text-info mt-0.5">R$ {((op.odd_obtida ?? op.signals.odd) * op.valor).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 pb-6 text-sm text-text2">Nenhuma operação em andamento. Marque um sinal na Sala ao Vivo pra começar.</div>
          )}
        </div>

        {/* Atalhos + recentes */}
        <div className={`${tile} md:col-span-6 lg:col-span-4 !p-0 overflow-hidden flex flex-col`}>
          <div className="px-5 pt-5 pb-2 text-[10px] font-bold tracking-[0.18em] text-text2">ATALHOS</div>
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            {acoes.map((a) => (
              <Link
                key={a.label}
                href={a.locked ? "/dashboard/planos" : a.href}
                className="group relative rounded-xl border border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.06] hover:border-primary/30 p-3 transition-all"
              >
                <span className="text-info flex-none">{a.icon}</span>
                <div className="text-[12.5px] font-semibold mt-2">{a.label}</div>
                <div className="text-[10.5px] text-muted leading-tight mt-0.5">{a.hint}</div>
                {a.locked && <span className="absolute top-3 right-3">{ICON_LOCK}</span>}
              </Link>
            ))}
          </div>
          {subscribed && recentes.length > 0 && (
            <div className="border-t border-white/[0.06] px-5 py-3 flex flex-col gap-2 mt-auto">
              <span className="text-[10px] font-bold tracking-[0.18em] text-text2">ÚLTIMOS RESULTADOS</span>
              {recentes.map((op: any) => (
                <div key={op.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full flex-none ${op.status === "green" ? "bg-success" : op.status === "red" ? "bg-danger" : "bg-muted"}`} />
                  <span className="truncate flex-1 text-text2">{op.signals.tipo === "bilhete" ? op.signals.time_b : `${op.signals.time_a} x ${op.signals.time_b}`}</span>
                  <span className={`text-[10px] font-bold ${op.status === "green" ? "text-success" : op.status === "red" ? "text-danger" : "text-muted"}`}>
                    {String(op.status).toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Simulador */}
        <div className="md:col-span-6 lg:col-span-12">
          <SimuladorESe encerrados={(encerrados as SinalEncerrado[]) || []} bancaPadrao={bancaInicial} subscribed={subscribed} />
        </div>
      </div>
    </div>
  );
}
