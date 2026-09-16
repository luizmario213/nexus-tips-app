"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Profile,
  Subscription,
  Operation,
  Signal,
  SupportTicket,
  Plano,
  BancaMovimento,
  BancaMovimentoTipo,
} from "@/lib/types";
import { PLANOS } from "@/lib/types";
import { formatBRL, formatDateBR, formatDateTimeBR, diasAte } from "@/lib/format";

type Tab = "perfil" | "financeiro" | "banca" | "operacoes" | "suporte";
type OperationRow = Operation & { signals: Signal };

const MOVIMENTO_LABEL: Record<BancaMovimentoTipo, string> = {
  aporte: "Aporte",
  saque: "Saque",
  ajuste: "Ajuste",
};

async function chamarAcao(userId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/admin/usuarios/${userId}/acoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Não deu pra completar a ação.");
  return json;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold tracking-wide text-muted">{label}</span>
      <input
        type={type}
        className="input-field text-sm py-2.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10.5px] font-bold tracking-wider text-muted uppercase mb-3">
      {children}
    </div>
  );
}

export function AdminUserModal({ user, onClose }: { user: Profile; onClose: () => void }) {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("perfil");
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [ops, setOps] = useState<OperationRow[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [movimentos, setMovimentos] = useState<BancaMovimento[]>([]);
  const [profile, setProfile] = useState<Profile>(user);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Formulários controlados, inicializados a partir do profile carregado — só habilitam
  // "Salvar" quando o valor realmente difere do que está gravado.
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [timeCoracao, setTimeCoracao] = useState(user.time_coracao || "");
  const [bancaInicialStr, setBancaInicialStr] = useState(user.banca_inicial != null ? String(user.banca_inicial) : "");
  const [email, setEmail] = useState(user.email || "");

  const [novoPlano, setNovoPlano] = useState<Plano>("mensal");
  const [patrocinada, setPatrocinada] = useState(false);
  const [valorCustom, setValorCustom] = useState("");

  const [subEditId, setSubEditId] = useState<string | null>(null);
  const [subEditValor, setSubEditValor] = useState("");
  const [subEditRenova, setSubEditRenova] = useState("");
  const [subEditStatus, setSubEditStatus] = useState<Subscription["status"]>("ativa");

  const [tipoMovimento, setTipoMovimento] = useState<BancaMovimentoTipo>("aporte");
  const [valorMovimento, setValorMovimento] = useState("");
  const [notaMovimento, setNotaMovimento] = useState("");

  const isSelf = currentUserId === user.id;

  async function loadTudo() {
    const [subsRes, opsRes, ticketsRes, authRes, movRes] = await Promise.all([
      supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase
        .from("operations")
        .select("*, signals(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.auth.getUser(),
      fetch(`/api/admin/usuarios/${user.id}/acoes`).then((r) => (r.ok ? r.json() : { movimentos: [] })),
    ]);
    setSubs(subsRes.data || []);
    setOps((opsRes.data as OperationRow[]) || []);
    setTickets(ticketsRes.data || []);
    setCurrentUserId(authRes.data.user?.id ?? null);
    setMovimentos(movRes?.movimentos || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  async function executar(chave: string, body: Record<string, unknown>, onOk?: (r: any) => void) {
    setBusy(chave);
    setMsg(null);
    try {
      const r = await chamarAcao(user.id, body);
      onOk?.(r);
      setMsg({ tipo: "ok", texto: "Feito." });
    } catch (e) {
      setMsg({ tipo: "erro", texto: e instanceof Error ? e.message : "Erro inesperado." });
    } finally {
      setBusy(null);
    }
  }

  const perfilSujo =
    name !== (profile.name || "") ||
    phone !== (profile.phone || "") ||
    timeCoracao !== (profile.time_coracao || "") ||
    bancaInicialStr !== (profile.banca_inicial != null ? String(profile.banca_inicial) : "");

  async function salvarPerfil() {
    const banca = bancaInicialStr.trim() === "" ? null : parseFloat(bancaInicialStr.replace(",", "."));
    await executar(
      "perfil",
      { action: "editar-perfil", name, phone, time_coracao: timeCoracao, banca_inicial: banca },
      (r) => setProfile(r.profile)
    );
  }

  async function salvarEmail() {
    if (email === profile.email) return;
    await executar("email", { action: "editar-email", email }, (r) => setProfile(r.profile));
  }

  async function enviarResetSenha() {
    await executar("senha", { action: "reset-senha" }, (r) =>
      setMsg({ tipo: "ok", texto: `Link de redefinição enviado para ${r.email}.` })
    );
  }

  async function toggleRole() {
    await executar("role", { action: "toggle-role" }, (r) => setProfile(r.profile));
  }

  async function toggleAtivo() {
    await executar("ativo", { action: "toggle-ativo" }, (r) => setProfile(r.profile));
  }

  async function ativarPlano() {
    await executar(
      "plano",
      {
        action: "ativar-plano",
        plano: novoPlano,
        patrocinada,
        valorCustom: valorCustom.trim() ? parseFloat(valorCustom.replace(",", ".")) : null,
      },
      async () => {
        setPatrocinada(false);
        setValorCustom("");
        await loadTudo();
      }
    );
  }

  async function cancelarAssinatura(sub: Subscription) {
    await executar("cancelar-sub-" + sub.id, { action: "cancelar-assinatura", subscriptionId: sub.id }, async () => {
      await loadTudo();
    });
  }

  function abrirEdicaoSub(sub: Subscription) {
    setSubEditId(sub.id);
    setSubEditValor(String(sub.valor));
    setSubEditRenova(sub.current_period_end ? sub.current_period_end.slice(0, 10) : "");
    setSubEditStatus(sub.status);
  }

  async function salvarEdicaoSub() {
    if (!subEditId) return;
    await executar(
      "editar-sub-" + subEditId,
      {
        action: "editar-assinatura",
        subscriptionId: subEditId,
        valor: parseFloat(subEditValor.replace(",", ".")),
        current_period_end: subEditRenova ? new Date(subEditRenova).toISOString() : null,
        status: subEditStatus,
      },
      async () => {
        setSubEditId(null);
        await loadTudo();
      }
    );
  }

  async function registrarMovimento() {
    const parsed = parseFloat(valorMovimento.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      setMsg({ tipo: "erro", texto: "Informe um valor válido, maior que zero." });
      return;
    }
    await executar(
      "movimento",
      { action: "movimentar-banca", tipo: tipoMovimento, valor: parsed, nota: notaMovimento },
      async () => {
        setValorMovimento("");
        setNotaMovimento("");
        await loadTudo();
      }
    );
  }

  const assinaturaAtiva = subs.find((s) => s.status === "ativa");
  const settled = ops.filter((o) => o.status !== "andamento");
  const greens = settled.filter((o) => o.status === "green").length;
  const reds = settled.filter((o) => o.status === "red").length;
  const assertividade = settled.length ? Math.round((greens / settled.length) * 100) : null;

  const totalProfit = useMemo(
    () =>
      settled.reduce((acc, o) => {
        const odd = o.odd_obtida ?? o.signals.odd;
        if (o.status === "green") return acc + o.valor * (odd - 1);
        if (o.status === "red") return acc - o.valor;
        return acc;
      }, 0),
    [settled]
  );
  const totalMovimentos = useMemo(() => movimentos.reduce((acc, m) => acc + m.valor, 0), [movimentos]);
  const saldoAtual = (profile.banca_inicial ?? 0) + totalProfit + totalMovimentos;

  const ultimaAtividade = useMemo(() => {
    if (ops.length === 0) return null;
    return ops.reduce((max, o) => (o.created_at > max ? o.created_at : max), ops[0].created_at);
  }, [ops]);

  const diasRenovacao = assinaturaAtiva ? diasAte(assinaturaAtiva.current_period_end) : null;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "perfil", label: "Perfil" },
    { id: "financeiro", label: "Financeiro", count: subs.length },
    { id: "banca", label: "Banca", count: movimentos.length },
    { id: "operacoes", label: "Operações", count: ops.length },
    { id: "suporte", label: "Suporte", count: tickets.length },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full bg-bg border-l border-border overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-6 border-b border-border flex-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold truncate">{profile.name || "Sem nome"}</h2>
                <span
                  className={`text-[10px] font-bold tracking-wide flex-none ${
                    assinaturaAtiva ? "text-success" : "text-muted"
                  }`}
                >
                  {assinaturaAtiva ? "ASSINANTE" : "GRATUITO"}
                </span>
                {profile.role === "admin" && <span className="text-[10px] font-bold tracking-wide text-primary flex-none">ADMIN</span>}
                {!profile.ativo && <span className="text-[10px] font-bold tracking-wide text-danger flex-none">DESATIVADA</span>}
              </div>
              <div className="text-xs text-text2 mt-1.5 truncate">{profile.email}</div>
              <div className="text-[11px] text-muted mt-1 font-mono">
                Cadastrado em {formatDateBR(profile.created_at)}
                {ultimaAtividade && ` · última operação em ${formatDateBR(ultimaAtividade)}`}
              </div>
            </div>
            <button onClick={onClose} aria-label="Fechar" className="text-muted hover:text-text2 text-xl leading-none px-1 flex-none">
              ×
            </button>
          </div>

          <div className="flex gap-5 mt-5 -mb-6 pt-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`text-[13px] font-semibold pb-3 border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id ? "border-primary text-text" : "border-transparent text-text2 hover:text-text"
                }`}
              >
                {t.label}
                {t.count !== undefined && <span className="ml-1.5 text-[10px] text-muted font-mono">{t.count}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* MENSAGEM DE FEEDBACK */}
        {msg && (
          <div
            className={`mx-6 mt-4 text-xs px-3 py-2.5 rounded-lg border flex-none ${
              msg.tipo === "ok" ? "bg-success/10 border-success/30 text-success" : "bg-danger/10 border-danger/30 text-danger"
            }`}
          >
            {msg.texto}
          </div>
        )}

        {/* CONTENT */}
        <div className="p-6 flex-1">
          {loading ? (
            <div className="text-sm text-text2 text-center py-8">Carregando…</div>
          ) : tab === "perfil" ? (
            <div className="flex flex-col gap-7">
              <div>
                <SectionLabel>Identidade</SectionLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Nome" value={name} onChange={setName} />
                  <Field label="Telefone" value={phone} onChange={setPhone} placeholder="(00) 00000-0000" />
                  <Field label="Time do coração" value={timeCoracao} onChange={setTimeCoracao} />
                  <Field label="Banca inicial (R$)" value={bancaInicialStr} onChange={setBancaInicialStr} type="text" />
                </div>
                <button
                  onClick={salvarPerfil}
                  disabled={!perfilSujo || busy === "perfil"}
                  className="btn-primary text-xs px-4 py-2.5 mt-3 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {busy === "perfil" ? "Salvando…" : "Salvar alterações"}
                </button>
              </div>

              <div className="h-px bg-border" />

              <div>
                <SectionLabel>E-mail de login</SectionLabel>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    className="input-field text-sm py-2.5 flex-1"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button
                    onClick={salvarEmail}
                    disabled={email === profile.email || busy === "email"}
                    className="btn-outline text-xs px-4 py-2.5 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {busy === "email" ? "Salvando…" : "Salvar e-mail"}
                  </button>
                </div>
                <p className="text-[11px] text-muted mt-2">
                  Troca o e-mail de login direto (sem precisar o usuário confirmar) e mantém sincronizado com o cadastro.
                </p>
              </div>

              <div className="h-px bg-border" />

              <div>
                <SectionLabel>Senha</SectionLabel>
                <button
                  onClick={enviarResetSenha}
                  disabled={busy === "senha"}
                  className="btn-outline text-xs px-4 py-2.5 disabled:opacity-40"
                >
                  {busy === "senha" ? "Enviando…" : "Enviar link de redefinição por e-mail"}
                </button>
                <p className="text-[11px] text-muted mt-2">
                  O usuário recebe um link pra criar a própria senha nova. Ninguém aqui vê ou define a senha diretamente.
                </p>
              </div>

              <div className="h-px bg-border" />

              <div>
                <SectionLabel>Acesso</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={toggleRole}
                    disabled={busy === "role" || isSelf}
                    title={isSelf ? "Você não pode alterar seu próprio nível de acesso por aqui" : undefined}
                    className={`text-[11px] font-semibold px-3 py-2 rounded-lg border whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                      profile.role === "admin" ? "border-danger text-danger hover:bg-danger/10" : "border-primary text-primary hover:bg-primary/10"
                    }`}
                  >
                    {busy === "role" ? "Salvando…" : profile.role === "admin" ? "Remover admin" : "Tornar admin"}
                  </button>
                  <button
                    onClick={toggleAtivo}
                    disabled={busy === "ativo" || isSelf}
                    title={isSelf ? "Você não pode desativar a própria conta por aqui" : undefined}
                    className={`text-[11px] font-semibold px-3 py-2 rounded-lg border whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                      profile.ativo ? "border-danger text-danger hover:bg-danger/10" : "border-success text-success hover:bg-success/10"
                    }`}
                  >
                    {busy === "ativo" ? "Salvando…" : profile.ativo ? "Desativar conta" : "Reativar conta"}
                  </button>
                </div>
              </div>
            </div>
          ) : tab === "financeiro" ? (
            <div className="flex flex-col gap-7">
              <div>
                <SectionLabel>Assinatura atual</SectionLabel>
                {assinaturaAtiva ? (
                  <div className="border border-success/30 rounded-lg p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold">{PLANOS[assinaturaAtiva.plano].label}</div>
                      <div className="font-mono text-lg font-bold text-success">{formatBRL(assinaturaAtiva.valor)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                      <div>
                        <div className="text-muted">ATIVAÇÃO</div>
                        <div className="font-semibold mt-0.5">{formatDateBR(assinaturaAtiva.created_at)}</div>
                      </div>
                      <div>
                        <div className="text-muted">RENOVAÇÃO</div>
                        <div className="font-semibold mt-0.5">
                          {formatDateBR(assinaturaAtiva.current_period_end)}
                          {diasRenovacao !== null && (
                            <span className={`ml-1.5 ${diasRenovacao <= 3 ? "text-warning" : "text-muted"}`}>
                              ({diasRenovacao >= 0 ? `${diasRenovacao}d` : `venceu há ${-diasRenovacao}d`})
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted">PROVIDER</div>
                        <div className="font-semibold mt-0.5">{assinaturaAtiva.provider}</div>
                      </div>
                      <div>
                        <div className="text-muted">STATUS</div>
                        <div className="font-semibold mt-0.5 text-success">ATIVA</div>
                      </div>
                    </div>

                    {subEditId === assinaturaAtiva.id ? (
                      <div className="flex flex-col gap-2 pt-3 border-t border-border">
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Valor (R$)" value={subEditValor} onChange={setSubEditValor} />
                          <label className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold tracking-wide text-muted">RENOVA EM</span>
                            <input
                              type="date"
                              className="input-field text-sm py-2.5"
                              value={subEditRenova}
                              onChange={(e) => setSubEditRenova(e.target.value)}
                            />
                          </label>
                        </div>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold tracking-wide text-muted">STATUS</span>
                          <select
                            className="input-field text-sm py-2.5"
                            value={subEditStatus}
                            onChange={(e) => setSubEditStatus(e.target.value as Subscription["status"])}
                          >
                            <option value="ativa">Ativa</option>
                            <option value="atrasada">Atrasada</option>
                            <option value="cancelada">Cancelada</option>
                          </select>
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={salvarEdicaoSub}
                            disabled={busy === "editar-sub-" + assinaturaAtiva.id}
                            className="btn-primary text-xs px-4 py-2 disabled:opacity-40"
                          >
                            {busy === "editar-sub-" + assinaturaAtiva.id ? "Salvando…" : "Salvar"}
                          </button>
                          <button onClick={() => setSubEditId(null)} className="text-xs text-muted px-2">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => abrirEdicaoSub(assinaturaAtiva)} className="text-[11px] font-semibold text-primary hover:opacity-80">
                          Editar assinatura
                        </button>
                        <button
                          onClick={() => cancelarAssinatura(assinaturaAtiva)}
                          disabled={busy === "cancelar-sub-" + assinaturaAtiva.id}
                          className="text-[11px] font-semibold text-danger hover:opacity-80 disabled:opacity-40"
                        >
                          {busy === "cancelar-sub-" + assinaturaAtiva.id ? "Cancelando…" : "Cancelar assinatura"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-border rounded-lg p-4 text-sm text-text2">Sem assinatura ativa.</div>
                )}
              </div>

              <div className="h-px bg-border" />

              <div>
                <SectionLabel>Ativar / trocar plano</SectionLabel>
                <div className="flex flex-col gap-3 border border-border rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select className="input-field text-sm py-2.5 flex-1" value={novoPlano} onChange={(e) => setNovoPlano(e.target.value as Plano)}>
                      {(Object.keys(PLANOS) as Plano[]).map((p) => (
                        <option key={p} value={p}>
                          {PLANOS[p].label} — {formatBRL(PLANOS[p].valor)}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input-field text-sm py-2.5 sm:w-36"
                      placeholder="Valor customizado"
                      value={valorCustom}
                      onChange={(e) => setValorCustom(e.target.value)}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-text2">
                    <input type="checkbox" checked={patrocinada} onChange={(e) => setPatrocinada(e.target.checked)} />
                    Conta patrocinada — libera o acesso com valor R$ 0,00, fora do MRR
                  </label>
                  <button onClick={ativarPlano} disabled={busy === "plano"} className="btn-primary text-xs px-4 py-2.5 self-start disabled:opacity-40">
                    {busy === "plano" ? "Salvando…" : assinaturaAtiva ? "Trocar plano" : "Ativar plano"}
                  </button>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div>
                <SectionLabel>Histórico de assinaturas</SectionLabel>
                {subs.length === 0 ? (
                  <div className="text-sm text-text2 text-center py-6">Nenhuma assinatura registrada.</div>
                ) : (
                  <div className="flex flex-col divide-y divide-border border-y border-border">
                    {subs.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold">
                            {PLANOS[s.plano].label} · {formatBRL(s.valor)}
                          </div>
                          <div className="text-[11px] text-muted mt-0.5">
                            {formatDateBR(s.created_at)}
                            {s.canceled_at && ` → cancelada em ${formatDateBR(s.canceled_at)}`}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold tracking-wide flex-none ${
                            s.status === "ativa" ? "text-success" : s.status === "atrasada" ? "text-warning" : "text-muted"
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
          ) : tab === "banca" ? (
            <div className="flex flex-col gap-7">
              <div className="flex items-end gap-x-8 gap-y-4 flex-wrap">
                <div>
                  <div className="font-mono text-[36px] leading-none font-bold">{formatBRL(saldoAtual)}</div>
                  <div className="text-[10px] text-muted mt-2 tracking-wide font-semibold">SALDO ATUAL CALCULADO</div>
                </div>
                <div className="border-l border-border pl-6">
                  <div className="font-mono text-lg font-semibold">{formatBRL(profile.banca_inicial)}</div>
                  <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">BANCA INICIAL</div>
                </div>
                <div className="border-l border-border pl-6">
                  <div className={`font-mono text-lg font-semibold ${totalProfit >= 0 ? "text-success" : "text-danger"}`}>
                    {formatBRL(totalProfit)}
                  </div>
                  <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">RESULTADO DAS OPERAÇÕES</div>
                </div>
              </div>
              <p className="text-[11px] text-muted -mt-4">
                Saldo = banca inicial + resultado das operações (greens/reds) + aportes/saques/ajustes abaixo. Editar a
                banca inicial fica na aba Perfil.
              </p>

              <div className="h-px bg-border" />

              <div>
                <SectionLabel>Registrar movimento</SectionLabel>
                <div className="flex flex-col gap-3 border border-border rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      className="input-field text-sm py-2.5 sm:w-40"
                      value={tipoMovimento}
                      onChange={(e) => setTipoMovimento(e.target.value as BancaMovimentoTipo)}
                    >
                      <option value="aporte">Aporte</option>
                      <option value="saque">Saque</option>
                      <option value="ajuste">Ajuste (saldo correto)</option>
                    </select>
                    <input
                      className="input-field text-sm py-2.5 flex-1"
                      placeholder={tipoMovimento === "ajuste" ? "Saldo correto (R$)" : "Valor (R$)"}
                      value={valorMovimento}
                      onChange={(e) => setValorMovimento(e.target.value)}
                    />
                  </div>
                  <input
                    className="input-field text-sm py-2.5"
                    placeholder="Nota (opcional)"
                    value={notaMovimento}
                    onChange={(e) => setNotaMovimento(e.target.value)}
                  />
                  <button
                    onClick={registrarMovimento}
                    disabled={busy === "movimento"}
                    className="btn-primary text-xs px-4 py-2.5 self-start disabled:opacity-40"
                  >
                    {busy === "movimento" ? "Salvando…" : "Registrar"}
                  </button>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div>
                <SectionLabel>Histórico de movimentos</SectionLabel>
                {movimentos.length === 0 ? (
                  <div className="text-sm text-text2 text-center py-6">Nenhum movimento registrado ainda.</div>
                ) : (
                  <div className="flex flex-col divide-y divide-border border-y border-border">
                    {movimentos.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold">
                            {MOVIMENTO_LABEL[m.tipo]}
                            {m.nota && <span className="text-text2 font-normal"> · {m.nota}</span>}
                          </div>
                          <div className="text-[11px] text-muted mt-0.5">{formatDateTimeBR(m.created_at)}</div>
                        </div>
                        <span className={`font-mono text-xs font-semibold flex-none ${m.valor >= 0 ? "text-success" : "text-danger"}`}>
                          {m.valor >= 0 ? "+" : ""}
                          {formatBRL(m.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : tab === "operacoes" ? (
            <div className="flex flex-col gap-5">
              <div className="flex items-end gap-x-8 gap-y-4">
                <div>
                  <div className="font-mono text-2xl font-bold">{assertividade === null ? "—" : `${assertividade}%`}</div>
                  <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">ASSERTIVIDADE</div>
                </div>
                <div className="border-l border-border pl-6">
                  <div className="font-mono text-2xl font-bold">
                    <span className="text-success">{greens}</span>
                    <span className="text-muted text-base"> / </span>
                    <span className="text-danger">{reds}</span>
                  </div>
                  <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">GREENS / REDS</div>
                </div>
              </div>

              {ops.length === 0 ? (
                <div className="text-sm text-text2 text-center py-6">Nenhuma operação marcada.</div>
              ) : (
                <div className="flex flex-col divide-y divide-border border-y border-border">
                  {ops.map((o) => (
                    <div key={o.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">
                          {o.signals.time_a} x {o.signals.time_b}
                        </div>
                        <div className="text-[11px] text-text2 mt-0.5">
                          {o.signals.mercado} · ODD {o.odd_obtida ?? o.signals.odd} · {formatBRL(o.valor)}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold tracking-wide flex-none ${
                          o.status === "andamento" ? "text-info" : o.status === "green" ? "text-success" : "text-danger"
                        }`}
                      >
                        {o.status === "andamento" ? "EM ANDAMENTO" : o.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {tickets.length === 0 ? (
                <div className="text-sm text-text2 text-center py-6">Nenhum chamado aberto.</div>
              ) : (
                <div className="flex flex-col divide-y divide-border border-y border-border">
                  {tickets.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <div className="text-xs font-semibold">{t.assunto}</div>
                        <div className="text-[11px] text-muted mt-0.5">{formatDateBR(t.created_at)}</div>
                      </div>
                      <span
                        className={`text-[10px] font-bold tracking-wide flex-none ${
                          t.status === "aberto" ? "text-warning" : t.status === "respondido" ? "text-info" : "text-muted"
                        }`}
                      >
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {tickets.length > 0 && <p className="text-[11px] text-muted mt-1">Para responder, use a aba Suporte no menu do admin.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
