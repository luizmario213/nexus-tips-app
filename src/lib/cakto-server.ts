// SÓ SERVIDOR — usa a service role key (ignora RLS). Importe apenas em route handlers e
// server components; nunca em arquivo "use client".
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANO_A_VENDA, PLANOS } from "@/lib/types";
import { EVENTO_PARA_STATUS_PUBLICO } from "@/lib/cakto-eventos";

type Admin = ReturnType<typeof createAdminClient>;
export type StatusCakto = "ativa" | "atrasada" | "cancelada";

// Evento da Cakto → estado da assinatura no Nexus. Eventos fora da lista só ficam no log.
export const EVENTO_PARA_STATUS: Record<string, StatusCakto> = EVENTO_PARA_STATUS_PUBLICO;

// Uma assinatura por comprador e produto. Se a pessoa cancelar e assinar de novo, a mesma
// linha volta a ficar "ativa" — sem duplicar.
export function refDaAssinatura(produtoId: string | undefined, email: string) {
  return `${produtoId || "nexus"}:${email}`;
}

/** Espelha o estado da Cakto na tabela `subscriptions`, que é a que o app inteiro lê. */
export async function espelharAssinatura(
  admin: Admin,
  userId: string,
  ref: string,
  status: StatusCakto,
  valor: number | null,
  periodEnd: string | null
) {
  const { data: atual } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "cakto")
    .eq("provider_subscription_id", ref)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const patch = {
    status,
    current_period_end: periodEnd,
    canceled_at: status === "cancelada" ? new Date().toISOString() : null,
    ...(valor ? { valor } : {}),
  };

  if (atual) {
    await admin.from("subscriptions").update(patch).eq("id", atual.id);
  } else if (status !== "cancelada") {
    await admin.from("subscriptions").insert({
      user_id: userId,
      plano: PLANO_A_VENDA,
      valor: valor || PLANOS[PLANO_A_VENDA].valor,
      provider: "cakto",
      provider_subscription_id: ref,
      ...patch,
    });
  }
}

/**
 * Quem comprou na Cakto antes de criar a conta: no primeiro acesso ao painel com o mesmo
 * e-mail, a assinatura é ligada à conta. Silencioso se a service role não estiver configurada.
 */
export async function reivindicarAssinaturas(userId: string, email: string) {
  if (!email) return;
  let admin: Admin;
  try {
    admin = createAdminClient();
  } catch {
    return;
  }
  const { data: pendentes } = await admin
    .from("cakto_assinaturas")
    .select("*")
    .eq("email", email.toLowerCase())
    .is("user_id", null);
  for (const p of pendentes || []) {
    await admin.from("cakto_assinaturas").update({ user_id: userId, updated_at: new Date().toISOString() }).eq("ref", p.ref);
    await espelharAssinatura(admin, userId, p.ref, p.status, p.valor, p.current_period_end);
  }
}

// ---------------------------------------------------------------- API da Cakto ----

let tokenCache: { token: string; expira: number } | null = null;

async function tokenCakto(): Promise<string | null> {
  const id = process.env.CAKTO_CLIENT_ID;
  const secret = process.env.CAKTO_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (tokenCache && tokenCache.expira > Date.now() + 60_000) return tokenCache.token;
  const res = await fetch("https://api.cakto.com.br/public_api/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret }),
  });
  if (!res.ok) return null;
  const j = await res.json();
  tokenCache = { token: j.access_token, expira: Date.now() + (j.expires_in || 36000) * 1000 };
  return tokenCache.token;
}

/** Cancela a assinatura na Cakto (para a cobrança). Retorna false se não deu. */
export async function cancelarNaCakto(caktoSubId: string): Promise<{ ok: boolean; motivo?: string }> {
  const token = await tokenCakto();
  if (!token) return { ok: false, motivo: "sem_credenciais" };
  const res = await fetch(`https://api.cakto.com.br/public_api/subscriptions/${encodeURIComponent(caktoSubId)}/cancel/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) return { ok: true };
  // 400 = já cancelada / estado não permite — tratamos "já cancelada" como sucesso
  const body = await res.json().catch(() => ({}));
  const txt = JSON.stringify(body).toLowerCase();
  if (res.status === 400 && txt.includes("cancel")) return { ok: true };
  return { ok: false, motivo: `http_${res.status}` };
}
