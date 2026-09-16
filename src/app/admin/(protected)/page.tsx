"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PLANOS } from "@/lib/types";
import type { Subscription, Signal, SupportTicket, Profile } from "@/lib/types";
import { formatBRL, formatDateBR } from "@/lib/format";

function mrrDeAssinaturas(subs: Subscription[], adminIds: Set<string>) {
  const fatorMensal: Record<string, number> = { mensal: 1, semestral: 1 / 6, anual: 1 / 12 };
  return subs
    .filter((s) => !adminIds.has(s.user_id))
    .reduce((acc, s) => acc + s.valor * (fatorMensal[s.plano] ?? 1), 0);
}

function initials(name: string | null, email: string) {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export default function AdminVisaoGeralPage() {
  const supabase = createClient();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = [];

    async function init() {
      const [subsRes, signalsRes, ticketsRes, usersRes] = await Promise.all([
        supabase.from("subscriptions").select("*"),
        supabase.from("signals").select("*"),
        supabase.from("support_tickets").select("*"),
        supabase.from("profiles").select("*"),
      ]);
      setSubs(subsRes.data || []);
      setSignals(signalsRes.data || []);
      setTickets(ticketsRes.data || []);
      setUsers(usersRes.data || []);
      setLoading(false);

      channels.push(
        supabase
          .channel("admin-overview-subs")
          .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, (payload) => {
            setSubs((prev) => {
              if (payload.eventType === "INSERT") return [...prev, payload.new as Subscription];
              if (payload.eventType === "UPDATE")
                return prev.map((s) => (s.id === (payload.new as Subscription).id ? (payload.new as Subscription) : s));
              if (payload.eventType === "DELETE") return prev.filter((s) => s.id !== (payload.old as Subscription).id);
              return prev;
            });
          })
          .subscribe()
      );
      channels.push(
        supabase
          .channel("admin-overview-signals")
          .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, (payload) => {
            setSignals((prev) => {
              if (payload.eventType === "INSERT") return [...prev, payload.new as Signal];
              if (payload.eventType === "UPDATE")
                return prev.map((s) => (s.id === (payload.new as Signal).id ? (payload.new as Signal) : s));
              if (payload.eventType === "DELETE") return prev.filter((s) => s.id !== (payload.old as Signal).id);
              return prev;
            });
          })
          .subscribe()
      );
      channels.push(
        supabase
          .channel("admin-overview-tickets")
          .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, (payload) => {
            setTickets((prev) => {
              if (payload.eventType === "INSERT") return [...prev, payload.new as SupportTicket];
              if (payload.eventType === "UPDATE")
                return prev.map((t) => (t.id === (payload.new as SupportTicket).id ? (payload.new as SupportTicket) : t));
              return prev;
            });
          })
          .subscribe()
      );
      channels.push(
        supabase
          .channel("admin-overview-users")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (payload) => {
            setUsers((prev) => [payload.new as Profile, ...prev]);
          })
          .subscribe()
      );
    }

    init();
    return () => channels.forEach((c) => supabase.removeChannel(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usersMap: Record<string, Profile> = {};
  users.forEach((u) => (usersMap[u.id] = u));

  const assinaturasAtivas = subs.filter((s) => s.status === "ativa");
  const sinaisNoAr = signals.filter((s) => s.status === "no_ar");
  const ticketsAbertos = tickets.filter((t) => t.status === "aberto");
  const adminIds = new Set(users.filter((u) => u.role === "admin").map((u) => u.id));
  const mrr = mrrDeAssinaturas(assinaturasAtivas, adminIds);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const publicadosHoje = signals.filter((s) => new Date(s.created_at) >= hoje).length;
  const cadastrosHoje = users.filter((u) => new Date(u.created_at) >= hoje).length;

  const ultimosUsuarios = [...users].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);
  const ultimasAssinaturas = [...subs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      <div>
        <span className="text-xs font-bold tracking-wide text-primary">ADMIN</span>
        <h1 className="text-2xl font-bold mt-2 mb-1">Visão geral</h1>
        <p className="text-text2 text-sm">Atualiza sozinho conforme os eventos acontecem — sem refresh.</p>
      </div>

      {/* HERO — MRR como foco único, resto em texto corrido separado por traços */}
      <div className="card p-6">
        <span className="font-mono text-[10.5px] text-muted tracking-wider">MRR ESTIMADO</span>
        <div className="flex flex-wrap items-end gap-x-0 gap-y-4 mt-3">
          <div className="pr-6">
            <div className="font-mono text-[48px] leading-none font-bold tracking-tight">{loading ? "—" : formatBRL(mrr)}</div>
          </div>
          <div className="border-l border-border pl-6 pr-6">
            <div className="font-mono text-xl font-semibold">{loading ? "—" : assinaturasAtivas.length}</div>
            <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">ASSINANTES ATIVOS</div>
          </div>
          <div className="border-l border-border pl-6 pr-6">
            <div className="font-mono text-xl font-semibold">{loading ? "—" : users.length}</div>
            <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">USUÁRIOS CADASTRADOS</div>
          </div>
          <div className="border-l border-border pl-6 pr-6">
            <div className="font-mono text-xl font-semibold">{loading ? "—" : sinaisNoAr.length}</div>
            <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">SINAIS NO AR</div>
          </div>
          <div className="border-l border-border pl-6">
            <div className={`font-mono text-xl font-semibold ${ticketsAbertos.length > 0 ? "text-warning" : ""}`}>
              {loading ? "—" : ticketsAbertos.length}
            </div>
            <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">TICKETS ABERTOS</div>
          </div>
        </div>
        <div className="flex items-center gap-4 pt-4 mt-4 border-t border-border text-xs text-text2">
          <span>
            <span className="font-mono font-semibold text-text">{publicadosHoje}</span> sinais publicados hoje
          </span>
          <span className="text-border">·</span>
          <span>
            <span className="font-mono font-semibold text-text">{cadastrosHoje}</span> cadastros novos hoje
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-text2">ÚLTIMOS CADASTROS</div>
            <Link href="/admin/usuarios" className="text-[11px] font-semibold text-primary">
              Ver todos
            </Link>
          </div>
          {ultimosUsuarios.length === 0 && !loading ? (
            <div className="card p-6 text-center text-sm text-text2">Nenhum usuário ainda.</div>
          ) : (
            <div className="card divide-y divide-border overflow-hidden">
              {ultimosUsuarios.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-elevated border border-border flex-none flex items-center justify-center text-[10px] font-bold text-text2">
                    {initials(u.name, u.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">{u.name || "Sem nome"}</div>
                    <div className="text-[11px] text-muted truncate">{u.email}</div>
                  </div>
                  <span className="text-[10px] text-muted font-mono flex-none">{formatDateBR(u.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-text2">ÚLTIMAS ASSINATURAS</div>
            <Link href="/admin/assinaturas" className="text-[11px] font-semibold text-primary">
              Ver Financeiro
            </Link>
          </div>
          {ultimasAssinaturas.length === 0 && !loading ? (
            <div className="card p-6 text-center text-sm text-text2">Nenhuma assinatura ainda.</div>
          ) : (
            <div className="card divide-y divide-border overflow-hidden">
              {ultimasAssinaturas.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{usersMap[s.user_id]?.name || usersMap[s.user_id]?.email || "—"}</div>
                    <div className="text-[11px] text-muted mt-0.5">
                      {PLANOS[s.plano].label} · {formatBRL(s.valor)}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold tracking-wide flex-none ${
                      s.status === "ativa" ? "text-success" : s.status === "cancelada" ? "text-muted" : "text-warning"
                    }`}
                  >
                    {s.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
