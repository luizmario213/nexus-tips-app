"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PLANOS } from "@/lib/types";
import type { Plano, Subscription } from "@/lib/types";

const BENEFICIOS_ATIVOS = [
  "Eventos ao vivo liberados",
  "Gestão automática da banca",
  "Histórico e resultados completos",
];

const PLANO_FEATURES: Record<Plano, string[]> = {
  mensal: ["Eventos ao vivo liberados", "Gestão automática da banca", "Histórico e resultados completos"],
  semestral: ["Tudo do plano mensal", "Preço travado por 6 meses"],
  anual: ["Tudo do plano mensal", "Preço travado por 12 meses", "Maior economia entre os planos"],
};

const PLANO_DESTAQUE: Partial<Record<Plano, string>> = {
  anual: "MELHOR CUSTO-BENEFÍCIO",
};

const PLANO_SUBTEXT: Partial<Record<Plano, { equivalente: string; economize: string }>> = {
  anual: { equivalente: "equivalente a R$ 58,16/mês", economize: "Economize R$ 476,90 vs. mensal" },
  semestral: { equivalente: "equivalente a R$ 66,32/mês", economize: "Economize R$ 189,50 vs. mensal" },
};

const PLANO_CTA: Record<Plano, string> = {
  mensal: "Garantir por R$ 47,90",
  semestral: "Assinar plano semestral",
  anual: "Assinar plano anual",
};

export default function PlanosPage() {
  const supabase = createClient();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "ativa")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveSub(data);
      setLoading(false);
    }
    init();
  }, [supabase]);

  async function assinar(plano: Plano) {
    if (!userId) return;
    setBusy(plano);
    // MVP: assinatura é registrada diretamente (sem cobrança real ainda).
    // Fase 2: aqui entra a chamada à Asaas/Pagar.me para criar a cobrança recorrente
    // e o webhook em /api/webhooks/asaas passa a ser quem grava/atualiza essa linha.
    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plano,
        valor: PLANOS[plano].valor,
        status: "ativa",
        provider: "manual",
      })
      .select()
      .single();
    setBusy(null);
    if (!error && data) {
      setActiveSub(data as Subscription);
      router.refresh();
    }
  }

  async function cancelar() {
    if (!activeSub) return;
    setBusy("cancelar");
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelada", canceled_at: new Date().toISOString() })
      .eq("id", activeSub.id);
    setBusy(null);
    if (!error) {
      setActiveSub(null);
      router.refresh();
    }
  }

  if (loading) {
    return <div className="card p-7 text-center text-sm text-text2 max-w-3xl">Carregando…</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4F7BFF" strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="2.5" />
          </svg>
          <span className="text-[11px] font-bold tracking-[0.18em] text-info">
            {activeSub ? "ASSINATURA" : "PLANOS"}
          </span>
        </div>
        <h1 className="font-display text-[28px] md:text-[34px] font-semibold tracking-[-0.03em] leading-tight mb-1">{activeSub ? "Plano ativo" : "Assine e libere tudo"}</h1>
        <p className="text-text2 text-sm">
          {activeSub
            ? "Gerencie sua assinatura Nexus Tips."
            : "Sem fidelidade — cancela quando quiser, direto por aqui, sem ligação."}
        </p>
      </div>

      {activeSub ? (
        <div className="card relative overflow-hidden p-8 max-w-md border-success/35">
          <div className="absolute -top-16 -right-12 w-44 h-44 bg-success opacity-[0.10] blur-[70px] rounded-full pointer-events-none" />
          <div className="relative flex justify-between items-start">
            <div>
              <div className="text-xs font-bold tracking-wide text-success">PLANO ATIVO</div>
              <div className="text-lg font-bold mt-2">{PLANOS[activeSub.plano].label}</div>
            </div>
            <span className="flex items-center gap-1.5 bg-success/15 text-success text-[11px] font-bold px-3 py-1.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              ATIVA
            </span>
          </div>
          <div className="relative font-mono text-[28px] font-semibold mt-4">
            R$ {activeSub.valor.toFixed(2)}
            <span className="text-[13px] text-muted font-sans">
              /{activeSub.plano === "mensal" ? "mês" : activeSub.plano === "semestral" ? "6 meses" : "ano"}
            </span>
          </div>
          <div className="relative text-xs text-text2 mt-2.5">
            Ativa desde {new Date(activeSub.created_at).toLocaleDateString("pt-BR")}
          </div>

          <div className="relative flex flex-col gap-2 mt-5 pt-5 border-t border-border">
            {BENEFICIOS_ATIVOS.map((b) => (
              <div key={b} className="flex items-center gap-2 text-xs text-text2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14E3A0" strokeWidth="2.5" className="flex-none">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {b}
              </div>
            ))}
          </div>

          {activeSub.plano === "mensal" && (
            <div className="relative text-[11px] text-muted mt-4 bg-elevated border border-border rounded-lg px-3 py-2.5">
              Quer pagar menos? O plano anual sai por R$ 58,16/mês — economize R$ 476,90 no ano.
            </div>
          )}

          <button
            onClick={cancelar}
            disabled={busy === "cancelar"}
            className="relative w-full mt-6 text-[12.5px] font-semibold text-muted hover:text-danger transition-colors disabled:opacity-40"
          >
            {busy === "cancelar" ? "Cancelando…" : "Cancelar assinatura"}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(PLANOS) as Plano[]).map((key) => {
              const p = PLANOS[key];
              const destaque = PLANO_DESTAQUE[key];
              const subtext = PLANO_SUBTEXT[key];
              return (
                <div
                  key={key}
                  className={`card relative p-6 flex flex-col gap-4 ${
                    destaque ? "border-primary/50 shadow-[0_0_0_1px_rgba(79,123,255,0.35)]" : ""
                  }`}
                >
                  {destaque && (
                    <span className="absolute -top-3 left-6 bg-primary text-white text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-full">
                      {destaque}
                    </span>
                  )}
                  <div>
                    <div className="text-xs font-bold tracking-wide text-text2">{p.label.toUpperCase()}</div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-bold font-mono">R$ {p.valor.toFixed(2)}</span>
                      {"valorPadrao" in p && p.valorPadrao && (
                        <span className="text-xs text-muted line-through">R$ {p.valorPadrao.toFixed(2)}</span>
                      )}
                    </div>
                    {subtext ? (
                      <div className="text-xs text-muted mt-1">{subtext.equivalente}</div>
                    ) : (
                      "valorPadrao" in p &&
                      p.valorPadrao && (
                        <div className="text-xs text-muted mt-1">válido nas primeiras 48h de lançamento</div>
                      )
                    )}
                    {subtext && (
                      <div className="inline-flex items-center gap-1.5 bg-success/10 border border-success/30 rounded-md px-2 py-1 mt-2">
                        <span className="text-[10.5px] font-semibold text-success">{subtext.economize}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-3 border-t border-border">
                    {PLANO_FEATURES[key].map((f) => (
                      <div key={f} className="flex items-center gap-2 text-xs text-text2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#14E3A0" strokeWidth="2.5" className="flex-none">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {f}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => assinar(key)}
                    disabled={busy === key}
                    className={`text-xs py-2.5 disabled:opacity-40 ${
                      destaque ? "btn-primary" : "btn-outline"
                    }`}
                  >
                    {busy === key ? "Processando…" : PLANO_CTA[key]}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-elevated border border-border flex-none flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A4B0D0" strokeWidth="1.8">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-xs text-text2">
                A Nexus Tips não movimenta sua banca — você decide o valor e a casa, sempre.
              </span>
            </div>
            <div className="hidden sm:block w-px h-8 bg-border" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-elevated border border-border flex-none flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A4B0D0" strokeWidth="1.8">
                  <path d="M5 12h14M5 12l4-4M5 12l4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-xs text-text2">Sem fidelidade — cancela quando quiser, direto por aqui.</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
