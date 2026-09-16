import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { temAcessoLiberado } from "@/lib/access";

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
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#66758A" strokeWidth="2">
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

  const [{ data: activeSub }, { data: profile }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "ativa")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
  ]);
  // Conta admin tem acesso liberado mesmo sem assinatura — ver src/lib/access.ts.
  const subscribed = temAcessoLiberado(profile?.role, !!activeSub);

  const { data: allOperations } = await supabase
    .from("operations")
    .select("*, signals(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const operations = (allOperations || []).filter((op) => op.status === "andamento");
  const settled = (allOperations || []).filter((op) => op.status !== "andamento");
  const greens = settled.filter((op) => op.status === "green").length;
  const reds = settled.filter((op) => op.status === "red").length;
  const minhaAssertividade = settled.length ? Math.round((greens / settled.length) * 100) : null;
  const recentes = settled.slice(0, 4);

  // Assertividade da plataforma nos últimos 30 dias — calculada de verdade a partir dos
  // sinais encerrados, não um número fixo no código.
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const { data: sinaisRecentes } = await supabase
    .from("signals")
    .select("status")
    .in("status", ["green", "red"])
    .gte("created_at", trintaDiasAtras.toISOString());
  const plataformaGreens = (sinaisRecentes || []).filter((s) => s.status === "green").length;
  const plataformaTotal = sinaisRecentes?.length || 0;
  const assertividadePlataforma = plataformaTotal
    ? Math.round((plataformaGreens / plataformaTotal) * 100)
    : null;

  // Trilha dos últimos 7 dias (volume + proporção green/red) — só pra dar um pulso visual
  // de atividade real da plataforma, calculado a partir dos mesmos sinais encerrados acima.
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const { data: sinaisSemana } = await supabase
    .from("signals")
    .select("status, created_at")
    .in("status", ["green", "red"])
    .gte("created_at", seteDiasAtras.toISOString());

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
  const { data: ticker } = await supabase
    .from("signals")
    .select("id, time_a, time_b, tipo, status")
    .in("status", ["green", "red"])
    .order("created_at", { ascending: false })
    .limit(14);

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

  const acoes = [
    {
      href: "/dashboard/eventos",
      icon: ICON_BOLT,
      label: "Eventos",
      hint: "Sinais monitorados agora",
      locked: false,
    },
    {
      href: subscribed ? "/dashboard/gestao" : "/dashboard/planos",
      icon: ICON_WALLET,
      label: "Gestão",
      hint: subscribed ? "Sua banca e resultado" : "Assine para liberar",
      locked: !subscribed,
    },
    {
      href: "/dashboard/historico",
      icon: ICON_CLOCK,
      label: "Histórico",
      hint: "Suas operações marcadas",
      locked: !subscribed,
    },
    {
      href: "/dashboard/suporte",
      icon: ICON_HEADSET,
      label: "Suporte",
      hint: "Central de ajuda",
      locked: false,
    },
  ];

  return (
    <div className="flex flex-col max-w-5xl">
      {/* Ticker ao vivo — faixa contínua sem moldura, tipo fita de cotações. */}
      {ticker && ticker.length > 0 && (
        <div className="border-y border-border py-2.5 overflow-hidden mb-6">
          <div className="overflow-hidden">
            <div className="marquee-track flex items-center gap-8 whitespace-nowrap w-max">
              {[...ticker, ...ticker].map((s, i) => (
                <span key={`${s.id}-${i}`} className="flex items-center gap-2 text-[11px] font-mono flex-none">
                  {s.status === "green" ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16C784" strokeWidth="3" className="flex-none">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F0445E" strokeWidth="3" className="flex-none">
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  )}
                  <span className="text-text2 font-semibold">
                    {s.tipo === "bilhete" ? s.time_b : `${s.time_a} x ${s.time_b}`}
                  </span>
                  <span className={`font-bold ${s.status === "green" ? "text-success" : "text-danger"}`}>
                    {s.status === "green" ? "GREEN" : "RED"}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <span className="text-xs font-bold tracking-wide text-primary">VISÃO GERAL</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Sua operação em um lugar só</h1>
        <p className="text-text2 text-sm">Assinatura, operações em andamento e resultado, de relance.</p>
      </div>

      {/* HERO: dois painéis lado a lado, tipo terminal — número grande é o único foco real. */}
      <div className="card relative overflow-hidden rounded-lg p-0 mb-8">
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#8FA2BE 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          {/* PAINEL ESQUERDO — status + ações */}
          <div className="p-6 lg:border-r border-b lg:border-b-0 border-border flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10.5px] text-muted tracking-wider mb-3">
                <span className={`w-1.5 h-1.5 flex-none ${subscribed ? "bg-success animate-pulse" : "bg-muted"}`} />
                STATUS DA CONTA
              </div>
              <div className="text-base font-bold">
                {activeSub
                  ? `Assinatura ativa — ${activeSub.plano}`
                  : subscribed
                  ? "Acesso liberado — conta admin"
                  : "Assinatura inativa"}
              </div>
              <div className="text-xs text-text2 mt-1.5 leading-relaxed max-w-xs">
                {subscribed
                  ? "Eventos e marcação de operações liberados."
                  : "Assine um plano para liberar os eventos monitorados."}
              </div>

              {activeSub ? (
                <div className="flex flex-col gap-1.5 mt-5 pt-4 border-t border-border font-mono text-[11px]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted">ATIVA DESDE</span>
                    <span className="font-semibold">
                      {new Date(activeSub.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {activeSub.current_period_end && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted">RENOVA EM</span>
                      <span className="font-semibold">
                        {new Date(activeSub.current_period_end).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted">VALOR</span>
                    <span className="font-semibold">
                      R$ {activeSub.valor.toFixed(2)}
                      <span className="text-muted">
                        /{activeSub.plano === "mensal" ? "mês" : activeSub.plano === "semestral" ? "6m" : "ano"}
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                !subscribed && (
                  <div className="flex flex-col gap-2 mt-5 pt-4 border-t border-border">
                    {["Eventos ao vivo liberados", "Gestão automática da banca", "Histórico e resultados completos"].map(
                      (b) => (
                        <div key={b} className="flex items-center gap-2 text-xs text-text2">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16C784" strokeWidth="2.5" className="flex-none">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {b}
                        </div>
                      )
                    )}
                  </div>
                )
              )}
            </div>

            <div className="flex flex-col xs:flex-row gap-2">
              <Link
                href="/dashboard/eventos"
                className="btn-outline flex items-center justify-center gap-1.5 text-xs px-4 py-2.5 whitespace-nowrap"
              >
                Ir para Eventos
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/dashboard/planos"
                className={
                  activeSub
                    ? "btn-outline text-xs px-4 py-2.5 whitespace-nowrap text-center"
                    : "btn-primary text-xs px-4 py-2.5 whitespace-nowrap text-center"
                }
              >
                {activeSub ? "Gerenciar assinatura" : "Ver planos"}
              </Link>
            </div>
          </div>

          {/* PAINEL DIREITO — resultado. Um número gigante como foco único, o resto vira
              texto corrido separado por traços verticais finos, sem virar grade de cards. */}
          <div className="p-6 flex flex-col gap-5">
            <span className="font-mono text-[10.5px] text-muted tracking-wider">RESULTADO · JANELA DE 30 DIAS</span>

            <div className="flex flex-wrap items-end gap-x-0 gap-y-4">
              <div className="pr-6">
                <div className="font-mono text-[56px] leading-none font-bold text-success tracking-tight">
                  {assertividadePlataforma === null ? "—" : `${assertividadePlataforma}%`}
                </div>
                <div className="text-[10px] text-muted mt-2 tracking-wide font-semibold">ASSERTIVIDADE NEXUS</div>
              </div>
              {subscribed ? (
                <>
                  <div className="border-l border-border pl-6 pr-6">
                    <div className="font-mono text-xl font-semibold">
                      {minhaAssertividade === null ? "—" : `${minhaAssertividade}%`}
                    </div>
                    <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">SUA ASSERTIVIDADE</div>
                  </div>
                  <div className="border-l border-border pl-6 pr-6">
                    <div className="font-mono text-xl font-semibold">
                      <span className="text-success">{greens}</span>
                      <span className="text-muted text-sm"> / </span>
                      <span className="text-danger">{reds}</span>
                    </div>
                    <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">GREENS / REDS</div>
                  </div>
                  {userStreak > 1 && (
                    <div className="border-l border-border pl-6">
                      <div className="font-mono text-xl font-semibold text-warning flex items-center gap-1.5">
                        {userStreak}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#F5A524" stroke="none">
                          <path d="M12 2c1 3-2 4-2 7a4 4 0 108 0c0-1-1-2-1-2 2 1 3 4 3 6a8 8 0 11-16 0c0-5 4-7 4-9 0-1 .5-1.5 1-2 1-1 2-.5 3 0z" />
                        </svg>
                      </div>
                      <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">SUA SEQUÊNCIA</div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="border-l border-border pl-6 pr-6">
                    <div className="font-mono text-xl font-semibold text-warning flex items-center gap-1.5">
                      {platformStreak}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#F5A524" stroke="none">
                        <path d="M12 2c1 3-2 4-2 7a4 4 0 108 0c0-1-1-2-1-2 2 1 3 4 3 6a8 8 0 11-16 0c0-5 4-7 4-9 0-1 .5-1.5 1-2 1-1 2-.5 3 0z" />
                      </svg>
                    </div>
                    <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">SEQUÊNCIA ATUAL</div>
                  </div>
                  <div className="border-l border-border pl-6">
                    <div className="font-mono text-xl font-semibold">
                      <span className="text-success">{plataformaGreens}</span>
                      <span className="text-muted text-sm"> / </span>
                      <span className="text-danger">{plataformaTotal - plataformaGreens}</span>
                    </div>
                    <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">GREENS / REDS · 30D</div>
                  </div>
                </>
              )}
            </div>

            {!subscribed && (
              <Link
                href="/dashboard/planos"
                className="flex items-center justify-between gap-3 bg-primary/10 border border-primary/30 rounded-lg px-4 py-3 hover:bg-primary/15 transition-colors -mt-1"
              >
                <span className="text-xs font-semibold text-text">
                  Isso é só o placar. Assine pra ver a análise por trás de cada sinal.
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="flex-none text-primary">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}

            {/* Trilha de 7 dias — volume de sinais encerrados na plataforma, green/red empilhado */}
            <div className="flex flex-col gap-1.5 pt-4 mt-1 border-t border-border">
              <span className="text-[10px] font-semibold text-muted tracking-wide">SINAIS ENCERRADOS · 7D</span>
              <div className="flex items-end gap-1.5 h-10">
                {trend.map((t, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 w-5">
                    <div className="w-full flex flex-col justify-end h-8 rounded-sm overflow-hidden bg-elevated">
                      {t.total > 0 && (
                        <div style={{ height: `${Math.max(12, (t.total / trendMax) * 100)}%` }} className="w-full flex flex-col justify-end">
                          {t.red > 0 && (
                            <div
                              className="w-full bg-danger/70"
                              style={{ height: `${(t.red / t.total) * 100}%` }}
                            />
                          )}
                          {t.green > 0 && (
                            <div
                              className="w-full bg-success"
                              style={{ height: `${(t.green / t.total) * 100}%` }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[8.5px] font-semibold text-muted uppercase">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUNA PRINCIPAL */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-text2">OPERAÇÕES EM ANDAMENTO ({operations.length})</div>
              {operations.length > 0 && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-info">
                  <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" />
                  AO VIVO
                </span>
              )}
            </div>
            {operations.length > 0 ? (
              <div className="card divide-y divide-border overflow-hidden">
                {operations.map((op: any) => (
                  <div key={op.id} className="flex items-center gap-3 px-4 py-3.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-info flex-none animate-pulse" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold flex items-center gap-1.5 flex-wrap">
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
                        {op.signals.tipo === "bilhete" ? "Combinados" : op.signals.mercado}
                      </div>
                    </div>
                    <div className="text-right flex-none">
                      <div className="text-[10px] text-muted">
                        ODD {op.odd_obtida ?? op.signals.odd} · R$ {op.valor}
                      </div>
                      <div className="font-mono text-sm font-semibold text-info mt-0.5">
                        R$ {((op.odd_obtida ?? op.signals.odd) * op.valor).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-7 text-center text-sm text-text2">
                Nenhuma operação em andamento agora. Marque um sinal em Eventos para começar.
              </div>
            )}
          </div>

          {subscribed && (
            <div>
              <div className="text-sm font-bold text-text2 mb-3">ATIVIDADE RECENTE</div>
              {recentes.length > 0 ? (
                <div className="card divide-y divide-border overflow-hidden">
                  {recentes.map((op: any) => {
                    const isGreen = op.status === "green";
                    const isCancelada = op.status === "cancelada";
                    const dotColor = isCancelada ? "bg-muted" : isGreen ? "bg-success" : "bg-danger";
                    const textColor = isCancelada ? "text-muted" : isGreen ? "text-success" : "text-danger";
                    return (
                      <div key={op.id} className="flex items-center gap-3 px-4 py-3">
                        <span className={`w-1.5 h-1.5 rounded-full flex-none ${dotColor}`} />
                        <div className="min-w-0 flex-1 text-xs font-semibold truncate">
                          {op.signals.tipo === "bilhete"
                            ? op.signals.time_b
                            : `${op.signals.time_a} x ${op.signals.time_b}`}
                        </div>
                        <span className={`text-[10px] font-bold tracking-wide flex-none ${textColor}`}>
                          {op.status.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card p-6 text-center text-xs text-text2">
                  Suas operações encerradas aparecem aqui assim que forem confirmadas.
                </div>
              )}
            </div>
          )}
        </div>

        {/* COLUNA LATERAL */}
        <div className="flex flex-col gap-8">
          <div>
            <div className="text-sm font-bold text-text2 mb-3">AÇÕES RÁPIDAS</div>
            <div className="card divide-y divide-border overflow-hidden">
              {acoes.map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-elevated/50 transition-colors"
                >
                  <span className="text-primary flex-none">{a.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold">{a.label}</div>
                    <div className="text-[10px] text-text2 mt-0.5 leading-tight">{a.hint}</div>
                  </div>
                  {a.locked ? ICON_LOCK : ICON_CHEVRON}
                </Link>
              ))}
            </div>
          </div>

          {subscribed && (
            <Link
              href="/dashboard/gestao"
              className="flex items-center justify-between gap-3 border border-border rounded-lg px-4 py-3.5 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-primary flex-none">{ICON_CARD}</span>
                <div className="min-w-0">
                  <div className="text-xs font-bold">Suas conquistas</div>
                  <div className="text-[10px] text-text2 mt-0.5 leading-tight">
                    Sequência de greens, banca e resultado
                  </div>
                </div>
              </div>
              {ICON_CHEVRON}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
