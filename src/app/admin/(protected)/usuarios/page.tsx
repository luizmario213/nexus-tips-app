"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Subscription } from "@/lib/types";
import { AdminUserModal } from "@/components/AdminUserModal";
import { formatDateBR } from "@/lib/format";

function initials(name: string | null, email: string) {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export default function AdminUsuariosPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<Profile[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "assinantes" | "gratuitos" | "admins">("todos");
  const [selected, setSelected] = useState<Profile | null>(null);

  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = [];

    async function init() {
      const [usersRes, subsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*").eq("status", "ativa"),
      ]);
      setUsers(usersRes.data || []);
      setSubs(subsRes.data || []);
      setLoading(false);

      channels.push(
        supabase
          .channel("admin-usuarios")
          .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (payload) => {
            setUsers((prev) => {
              if (payload.eventType === "INSERT") return [payload.new as Profile, ...prev];
              if (payload.eventType === "UPDATE")
                return prev.map((u) => (u.id === (payload.new as Profile).id ? (payload.new as Profile) : u));
              return prev;
            });
          })
          .subscribe()
      );
      channels.push(
        supabase
          .channel("admin-usuarios-subs")
          .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, (payload) => {
            setSubs((prev) => {
              if (payload.eventType === "INSERT" && (payload.new as Subscription).status === "ativa")
                return [...prev, payload.new as Subscription];
              if (payload.eventType === "UPDATE") {
                const updated = payload.new as Subscription;
                const withoutOld = prev.filter((s) => s.id !== updated.id);
                return updated.status === "ativa" ? [...withoutOld, updated] : withoutOld;
              }
              return prev;
            });
          })
          .subscribe()
      );
    }
    init();
    return () => channels.forEach((c) => supabase.removeChannel(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ativoDe = (id: string) => subs.some((s) => s.user_id === id);

  const filtered = users
    .filter((u) => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
    .filter((u) => {
      if (filtro === "assinantes") return ativoDe(u.id);
      if (filtro === "gratuitos") return !ativoDe(u.id);
      if (filtro === "admins") return u.role === "admin";
      return true;
    });

  const totalAssinantes = users.filter((u) => ativoDe(u.id)).length;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <span className="text-xs font-bold tracking-wide text-primary">ADMIN</span>
        <h1 className="text-2xl font-bold mt-2 mb-1">Usuários</h1>
        <p className="text-text2 text-sm">
          {users.length} cadastrados no total · {totalAssinantes} assinantes ativos.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="input-field flex-1"
          placeholder="Buscar por nome ou e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="inline-flex bg-surface border border-border rounded-[10px] p-1 w-fit flex-none">
          {(["todos", "assinantes", "gratuitos", "admins"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3.5 py-2 rounded-[7px] text-[12px] font-semibold whitespace-nowrap ${
                filtro === f ? "bg-primary text-white" : "text-text2"
              }`}
            >
              {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-7 text-center text-sm text-text2">Carregando…</div>
      ) : (
        <div className="card divide-y divide-border overflow-hidden">
          {filtered.map((u) => {
            const ativo = ativoDe(u.id);
            return (
              <button
                key={u.id}
                onClick={() => setSelected(u)}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-elevated/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-elevated border border-border flex-none flex items-center justify-center text-[11px] font-bold text-text2">
                  {initials(u.name, u.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold flex items-center gap-1.5 flex-wrap">
                    {u.name || "Sem nome"}
                    {u.role === "admin" && <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-none">ADMIN</span>}
                    {!u.ativo && <span className="text-[9px] font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded flex-none">INATIVO</span>}
                  </div>
                  <div className="text-xs text-text2 truncate mt-0.5">{u.email}</div>
                </div>
                <div className="flex-none flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-bold tracking-wide ${ativo ? "text-success" : "text-muted"}`}>
                    {ativo ? "ASSINANTE" : "GRATUITO"}
                  </span>
                  <span className="text-[10px] text-muted font-mono">{formatDateBR(u.created_at)}</span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <div className="p-7 text-center text-sm text-text2">Nenhum usuário encontrado.</div>}
        </div>
      )}

      {selected && <AdminUserModal user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
