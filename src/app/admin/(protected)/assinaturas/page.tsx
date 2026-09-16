"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLANOS } from "@/lib/types";
import type { Subscription, Profile, Plano } from "@/lib/types";
import { formatBRL, formatDateBR, diasAte } from "@/lib/format";

type Filtro = "todas" | "ativa" | "cancelada" | "atrasada";

const FATOR_MENSAL: Record<Plano, number> = { mensal: 1, semestral: 1 / 6, anual: 1 / 12 };

export default function AdminAssinaturasPage() {
  const supabase = createClient();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [users, setUsers] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const [subsRes, usersRes] = await Promise.all([
        supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*"),
      ]);
      setSubs(subsRes.data || []);
      const map: Record<string, Profile> = {};
      (usersRes.data || []).forEach((u: Profile) => (map[u.id] = u));
      setUsers(map);
      setLoading(false);

      channel = supabase
        .channel("admin-assinaturas")
        .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, (payload) => {
          setSubs((prev) => {
            if (payload.eventType === "INSERT") return [payload.new as Subscription, ...prev];
            if (payload.eventType === "UPDATE")
              return prev.map((s) => (s.id === (payload.new as Subscription).id ? (payload.new as Subscription) : s));
            if (payload.eventType === "DELETE") return prev.filter((s) => s.id !== (payload.old as Subscription).id);
            return prev;
          });
        })
        .subscribe();
    }
    init();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cancelar(sub: Subscription) {
    setBusy(sub.id);
    await supabase.from("subscriptions").update({ status: "cancelada", canceled_at: new Date().toISOString() }).eq("id", sub.id);
    setBusy(null);
  }

  const naoAdmin = (s: Subscription) => users[s.user_id]?.role !== "admin";
  const ativas = useMemo(() => subs.filter((s) => s.status === "ativa" && naoAdmin(s)), [subs, users]);

  const mrr = useMemo(() => ativas.reduce((acc, s) => acc + s.valor * FATOR_MENSAL[s.plano], 0), [ativas]);
  const receitaBruta = useMemo(() => ativas.reduce((acc, s) => acc + s.valor, 0), [ativas]);

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const canceladasEsteMes = useMemo(
    () => subs.filter((s) => s.status === "cancelada" && s.canceled_at && new Date(s.canceled_at) >= inicioMes && naoAdmin(s)).length,
    [subs, users]
  );
  const churn = ativas.length + canceladasEsteMes > 0 ? (canceladasEsteMes / (ativas.length + canceladasEsteMes)) * 100 : 0;

  const proximasRenovacoes = useMemo(
    () =>
      ativas
        .filter((s) => s.current_period_end)
        .map((s) => ({ sub: s, dias: diasAte(s.current_period_end)! }))
        .filter((r) => r.dias !== null && r.dias <= 7)
        .sort((a, b) => a.dias - b.dias),
    [ativas]
  );

  const porPlano = useMemo(() => {
    const map: Record<Plano, { count: number; valor: number }> = {
      mensal: { count: 0, valor: 0 },
      semestral: { count: 0, valor: 0 },
      anual: { count: 0, valor: 0 },
    };
    ativas.forEach((s) => {
      map[s.plano].count++;
      map[s.plano].valor += s.valor;
    });
    return map;
  }, [ativas]);

  const visiveis = (filtro === "todas" ? subs : subs.filter((s) => s.status === filtro)).sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );

  const statusColor: Record<string, string> = {
    ativa: "text-success",
    cancelada: "text-muted",
    atrasada: "text-warning",
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      <div>
        <span className="text-xs font-bold tracking-wide text-primary">ADMIN</span>
        <h1 className="text-2xl font-bold mt-2 mb-1">Financeiro</h1>
        <p className="text-text2 text-sm">Assinatura, ativação, renovação e cancelamento — de cada real que entra.</p>
      </div>

      {/* HERO FINANCEIRO */}
      <div className="card p-6">
        <span className="font-mono text-[10.5px] text-muted tracking-wider">MRR · RECEITA RECORRENTE MENSAL</span>
        <div className="flex flex-wrap items-end gap-x-0 gap-y-4 mt-3">
          <div className="pr-6">
            <div className="font-mono text-[48px] leading-none font-bold tracking-tight">{loading ? "—" : formatBRL(mrr)}</div>
          </div>
          <div className="border-l border-border pl-6 pr-6">
            <div className="font-mono text-xl font-semibold">{loading ? "—" : ativas.length}</div>
            <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">ASSINANTES ATIVOS</div>
          </div>
          <div className="border-l border-border pl-6 pr-6">
            <div className="font-mono text-xl font-semibold">{loading ? "—" : formatBRL(receitaBruta)}</div>
            <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">SOMA BRUTA DAS ATIVAS</div>
          </div>
          <div className="border-l border-border pl-6">
            <div className={`font-mono text-xl font-semibold ${churn > 10 ? "text-danger" : "text-text"}`}>
              {loading ? "—" : `${churn.toFixed(1)}%`}
            </div>
            <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">CHURN DO MÊS</div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 pt-5 mt-5 border-t border-border">
          <span className="text-[10px] font-semibold text-muted tracking-wide">MIX DE PLANOS (ATIVAS)</span>
          <div className="flex flex-col gap-2 mt-1">
            {(Object.keys(PLANOS) as Plano[]).map((p) => {
              const info = porPlano[p];
              const pct = ativas.length ? (info.count / ativas.length) * 100 : 0;
              return (
                <div key={p} className="flex items-center gap-3">
                  <span className="text-xs text-text2 w-20 flex-none">{PLANOS[p].label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-elevated overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-mono text-muted w-28 flex-none text-right">
                    {info.count} · {formatBRL(info.valor)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PRÓXIMAS RENOVAÇÕES */}
      {proximasRenovacoes.length > 0 && (
        <div>
          <div className="text-sm font-bold text-text2 mb-3">PRÓXIMAS RENOVAÇÕES (7 DIAS)</div>
          <div className="card divide-y divide-border overflow-hidden">
            {proximasRenovacoes.map(({ sub, dias }) => (
              <div key={sub.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{users[sub.user_id]?.name || users[sub.user_id]?.email}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {PLANOS[sub.plano].label} · {formatBRL(sub.valor)}
                  </div>
                </div>
                <span className={`text-[10px] font-bold tracking-wide flex-none ${dias <= 1 ? "text-danger" : dias <= 3 ? "text-warning" : "text-text2"}`}>
                  {dias === 0 ? "HOJE" : dias === 1 ? "AMANHÃ" : `EM ${dias}D`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LISTA COMPLETA */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-text2">TODAS AS ASSINATURAS</div>
          <div className="inline-flex bg-surface border border-border rounded-[10px] p-1 w-fit">
            {(["todas", "ativa", "cancelada", "atrasada"] as Filtro[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3.5 py-2 rounded-[7px] text-[12px] font-semibold whitespace-nowrap ${
                  filtro === f ? "bg-primary text-white" : "text-text2"
                }`}
              >
                {f === "todas" ? "Todas" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="card p-7 text-center text-sm text-text2">Carregando…</div>
        ) : (
          <div className="card divide-y divide-border overflow-hidden">
            {visiveis.map((s) => (
              <div key={s.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3.5">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{users[s.user_id]?.name || users[s.user_id]?.email || s.user_id}</div>
                  <div className="text-xs text-text2 mt-0.5">
                    {PLANOS[s.plano].label} · {formatBRL(s.valor)} · {s.provider}
                  </div>
                  <div className="text-[11px] text-muted mt-0.5 font-mono">
                    ativação {formatDateBR(s.created_at)}
                    {s.current_period_end && ` · renovação ${formatDateBR(s.current_period_end)}`}
                    {s.canceled_at && ` · cancelada ${formatDateBR(s.canceled_at)}`}
                  </div>
                </div>
                <div className="flex-none flex items-center gap-3 flex-wrap">
                  <span className={`text-[10px] font-bold tracking-wide ${statusColor[s.status]}`}>{s.status.toUpperCase()}</span>
                  {s.status === "ativa" && (
                    <button onClick={() => cancelar(s)} disabled={busy === s.id} className="text-xs text-danger font-semibold disabled:opacity-40">
                      {busy === s.id ? "Cancelando…" : "Cancelar"}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {visiveis.length === 0 && <div className="p-7 text-center text-sm text-text2">Nenhuma assinatura nesse filtro.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
