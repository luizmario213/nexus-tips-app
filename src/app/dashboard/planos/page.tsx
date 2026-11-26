"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/supabase/demo";
import { PLANOS, PLANO_A_VENDA } from "@/lib/types";
import type { Subscription } from "@/lib/types";
import { urlDoCheckout } from "@/lib/checkout";

const BENEFICIOS = [
  "Sala ao Vivo com todos os sinais em tempo real",
  "Raio-X de cada sinal: o porquê e os riscos",
  "Gestão de banca, disciplina e histórico completo",
  "Histórico público — greens e reds, sem filtro",
];

const Check = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#14E3A0" strokeWidth="2.5" className="flex-none mt-0.5">
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function PlanosPage() {
  const supabase = createClient();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"assinar" | "cancelar" | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const plano = PLANOS[PLANO_A_VENDA];

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email || "");
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

  async function assinar() {
    if (!userId) return;
    setBusy("assinar");
    // Modo demonstração: não existe Cakto aqui, então simula a assinatura direto.
    if (DEMO_MODE) {
      const { data } = await supabase
        .from("subscriptions")
        .insert({ user_id: userId, plano: PLANO_A_VENDA, valor: plano.valor, status: "ativa", provider: "demo" })
        .select()
        .single();
      setBusy(null);
      if (data) {
        setActiveSub(data as Subscription);
        router.refresh();
      }
      return;
    }
    // Pagamento real: vai pro checkout da Cakto. O acesso é liberado quando a Cakto avisa
    // o site que o pagamento foi aprovado (ver /api/webhooks/cakto).
    window.location.href = urlDoCheckout(userId);
  }

  async function cancelar() {
    if (!activeSub) return;
    setBusy("cancelar");
    setErro(null);
    const res = await fetch("/api/assinatura/cancelar", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    setConfirmCancel(false);
    if (!res.ok) {
      setErro(body.error || "Não foi possível cancelar agora. Fale com o suporte.");
      return;
    }
    setActiveSub(null);
    router.refresh();
  }

  if (loading) {
    return <div className="card p-7 text-center text-sm text-text2 max-w-3xl">Carregando…</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <span className="eyebrow">
          <span className="eyebrow-dot" />
          {activeSub ? "Assinatura" : "Nexus PRO"}
        </span>
        <h1 className="font-display text-[30px] md:text-[40px] font-semibold tracking-[-0.035em] leading-tight mt-4">
          {activeSub ? (
            "Seu plano está ativo"
          ) : (
            <>
              Libere a Nexus <span className="text-gradient">inteira</span>
            </>
          )}
        </h1>
        <p className="text-text2 text-sm mt-1.5">
          {activeSub ? "Gerencie sua assinatura Nexus Tips." : "Um plano só, tudo liberado. Sem fidelidade — cancela quando quiser, direto por aqui."}
        </p>
      </div>

      {activeSub ? (
        <div className="card relative overflow-hidden p-7 md:p-8 max-w-lg !border-success/35">
          <div className="absolute -top-16 -right-12 w-44 h-44 bg-success opacity-[0.12] blur-[70px] rounded-full pointer-events-none" />
          <div className="relative flex justify-between items-start">
            <div>
              <div className="text-[10.5px] font-bold tracking-[0.18em] text-success">PLANO ATIVO</div>
              <div className="font-display text-xl font-semibold mt-2">Nexus PRO · {PLANOS[activeSub.plano].label}</div>
            </div>
            <span className="flex items-center gap-1.5 bg-success/15 text-success text-[11px] font-bold px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              ATIVA
            </span>
          </div>
          <div className="relative font-display text-[32px] font-semibold mt-4">
            R$ {activeSub.valor.toFixed(2).replace(".", ",")}
            <span className="text-[13px] text-muted font-sans">
              /{activeSub.plano === "mensal" ? "mês" : activeSub.plano === "semestral" ? "6 meses" : "ano"}
            </span>
          </div>
          <div className="relative text-xs text-text2 mt-2">
            Ativa desde {new Date(activeSub.created_at).toLocaleDateString("pt-BR")}
            {activeSub.current_period_end && ` · próxima cobrança por volta de ${new Date(activeSub.current_period_end).toLocaleDateString("pt-BR")}`}
          </div>

          <div className="relative flex flex-col gap-2 mt-5 pt-5 border-t border-white/[0.07]">
            {BENEFICIOS.map((b) => (
              <div key={b} className="flex items-start gap-2 text-[13px] text-text2">
                <Check />
                {b}
              </div>
            ))}
          </div>

          {erro && <div className="relative mt-5 text-[12.5px] text-danger bg-danger/10 border border-danger/30 rounded-xl px-3 py-2.5">{erro}</div>}

          {confirmCancel ? (
            <div className="relative mt-6 rounded-xl border border-warning/30 bg-warning/[0.07] p-4 flex flex-col gap-3">
              <div className="text-[13px]">Cancelar a assinatura? A cobrança para e o acesso PRO é encerrado.</div>
              <div className="flex gap-2">
                <button onClick={cancelar} disabled={busy === "cancelar"} className="btn-ghost text-xs px-4 py-2.5 !text-danger">
                  {busy === "cancelar" ? "Cancelando…" : "Sim, cancelar"}
                </button>
                <button onClick={() => setConfirmCancel(false)} className="btn-primary text-xs px-4 py-2.5">
                  Manter meu plano
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmCancel(true)}
              className="relative w-full mt-6 text-[12.5px] font-semibold text-muted hover:text-danger transition-colors"
            >
              Cancelar assinatura
            </button>
          )}
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_0.9fr] gap-5 items-start">
          <div className="card glow-border relative overflow-hidden p-7 md:p-9 !bg-[rgba(14,20,50,.75)] shadow-[0_40px_100px_-40px_rgba(79,123,255,.6)]">
            <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-primary/25 blur-[100px] pointer-events-none" />
            <div className="relative">
              <div className="text-[11px] font-bold tracking-[0.2em] text-text2">NEXUS PRO · MENSAL</div>
              <div className="flex items-baseline gap-1.5 mt-4">
                <span className="text-text2 text-lg">R$</span>
                <span className="font-display text-[56px] font-semibold tracking-tight leading-none">{plano.valor.toFixed(2).replace(".", ",")}</span>
                <span className="text-sm text-muted">/mês</span>
              </div>
              <div className="text-xs text-muted mt-2">Pix Automático ou cartão · renova todo mês · cancele quando quiser</div>
              <div className="hairline my-6" />
              <div className="flex flex-col gap-3">
                {BENEFICIOS.map((b) => (
                  <div key={b} className="flex items-start gap-2.5 text-[14px] text-text2">
                    <Check />
                    {b}
                  </div>
                ))}
              </div>
              <button onClick={assinar} disabled={busy === "assinar"} className="btn-primary w-full text-[15px] py-4 mt-7">
                {busy === "assinar" ? "Abrindo o checkout…" : `Assinar por R$ ${plano.valor.toFixed(2).replace(".", ",")}/mês`}
              </button>
              <p className="text-[11px] text-muted text-center mt-3">Pagamento seguro processado pela Cakto.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="card p-5 !border-info/30">
              <div className="text-[10.5px] font-bold tracking-[0.16em] text-info">IMPORTANTE</div>
              <p className="text-[13px] text-text2 mt-1.5 leading-relaxed">
                No checkout, use o <span className="text-text font-semibold">mesmo e-mail da sua conta</span>
                {email ? (
                  <>
                    : <span className="font-mono text-text">{email}</span>
                  </>
                ) : (
                  ""
                )}
                . O acesso é liberado sozinho assim que o pagamento é aprovado.
              </p>
            </div>
            <div className="card p-5 flex items-start gap-3">
              <span className="text-lg">🔒</span>
              <p className="text-[13px] text-text2">A Nexus Tips não movimenta sua banca — você decide o valor e a casa, sempre.</p>
            </div>
            <div className="card p-5 flex items-start gap-3">
              <span className="text-lg">↩︎</span>
              <p className="text-[13px] text-text2">Sem fidelidade. O cancelamento é um botão aqui mesmo, sem ligação e sem justificativa.</p>
            </div>
            <div className="card p-5 flex items-start gap-3">
              <span className="text-lg">🔞</span>
              <p className="text-[13px] text-text2">Proibido para menores de 18 anos. Apostas envolvem risco — a Nexus não promete lucro.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
