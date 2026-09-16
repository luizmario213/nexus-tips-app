import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { temAcessoLiberado } from "@/lib/access";

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

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
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

      {/* HERO: status da assinatura + mini stats, num card só */}
      <div className="card relative overflow-hidden p-6">
        <div className="absolute -top-20 -right-16 w-56 h-56 bg-primary opacity-[0.10] blur-[70px] rounded-full pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-full flex-none flex items-center justify-center border ${
                subscribed ? "bg-success/10 border-success/30" : "bg-elevated border-border"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${subscribed ? "bg-success animate-pulse" : "bg-muted"}`} />
            </div>
            <div>
              <div className="text-sm font-bold">
                {activeSub
                  ? `Assinatura ativa — ${activeSub.plano}`
                  : subscribed
                  ? "Acesso liberado — conta admin"
                  : "Assinatura inativa"}
              </div>
              <div className="text-xs text-text2 mt-0.5">
                {subscribed
                  ? "Eventos e marcação de operações liberados."
                  : "Assine um plano para liberar os eventos monitorados."}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-none">
            <Link
              href="/dashboard/eventos"
              className="btn-outline flex items-center gap-1.5 text-xs px-4 py-2.5 whitespace-nowrap"
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
                  ? "btn-outline text-xs px-4 py-2.5 whitespace-nowrap"
                  : "btn-primary text-xs px-4 py-2.5 whitespace-nowrap"
              }
            >
              {activeSub ? "Gerenciar assinatura" : "Ver planos"}
            </Link>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-border">
          <div>
            <div className="text-[10px] font-semibold text-muted tracking-wide">RESULTADO NEXUS · 30D</div>
            <div className="font-mono text-lg font-semibold text-success mt-1">
              {assertividadePlataforma === null ? "—" : `${assertividadePlataforma}%`}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-muted tracking-wide">SUA ASSERTIVIDADE</div>
            <div className="font-mono text-lg font-semibold mt-1">
              {minhaAssertividade === null ? "—" : `${minhaAssertividade}%`}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-muted tracking-wide">GREENS / REDS</div>
            <div className="font-mono text-lg font-semibold mt-1">
              <span className="text-success">{greens}</span>
              <span className="text-muted text-sm"> / </span>
              <span className="text-danger">{reds}</span>
            </div>
          </div>
        </div>
      </div>

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
          <div className="flex flex-col gap-2.5">
            {operations.map((op: any) => (
              <div
                key={op.id}
                className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-l-2 border-l-info"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-1.5">
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
                <div className="flex items-center justify-between sm:justify-end gap-4 flex-none">
                  <div className="text-right">
                    <div className="text-[10px] text-muted">
                      ODD {op.odd_obtida ?? op.signals.odd} · R$ {op.valor}
                    </div>
                    <div className="font-mono text-sm font-semibold text-info mt-0.5">
                      R$ {((op.odd_obtida ?? op.signals.odd) * op.valor).toFixed(2)}
                    </div>
                  </div>
                  <span className="bg-info/15 text-info text-[10px] font-bold px-3 py-1.5 rounded-md whitespace-nowrap flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" />
                    EM ANDAMENTO
                  </span>
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
        <Link
          href="/dashboard/gestao"
          className="card p-5 flex items-center justify-between hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-elevated border border-border flex-none flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                <path d="M4 19V10M10 19V5M16 19V13M22 19V8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold">Suas conquistas</div>
              <div className="text-xs text-text2 mt-0.5">
                Sequência de greens, banca e resultado — tudo em Gestão.
              </div>
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
    </div>
  );
}
