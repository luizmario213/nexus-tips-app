import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { EVENTO_PARA_STATUS, espelharAssinatura, refDaAssinatura } from "@/lib/cakto-server";

// =====================================================================================
// WEBHOOK DA CAKTO — único lugar que libera/corta o acesso pago.
// Configure na Cakto (Integrações → Webhooks) apontando pra https://SEU-DOMINIO/api/webhooks/cakto
// e cole o "secret" gerado lá na variável CAKTO_WEBHOOK_SECRET (Vercel → Environment Variables).
// Precisa também de SUPABASE_SERVICE_ROLE_KEY, porque grava em nome de qualquer usuário.
// =====================================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIA = 86400000;

function iguais(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function POST(request: NextRequest) {
  // trim(): protege contra espaço/quebra de linha colados junto na Vercel.
  const secret = (process.env.CAKTO_WEBHOOK_SECRET || "").trim();
  if (!secret) return NextResponse.json({ error: "CAKTO_WEBHOOK_SECRET não configurado" }, { status: 500 });

  // Lê o corpo cru ANTES de qualquer parse — a assinatura é calculada sobre esses bytes.
  const raw = await request.text();
  let body: { secret?: string; event?: string; data?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "json inválido" }, { status: 400 });
  }

  // Autenticação — aceita qualquer um dos dois métodos da Cakto:
  // (a) o "secret" que vem no corpo de todo aviso;
  // (b) a assinatura HMAC-SHA256 nos cabeçalhos X-Cakto-Signature / X-Cakto-Timestamp.
  //     Testamos as variações (timestamp em s ou ms, com ou sem "{ts}.", hex ou base64)
  //     porque a documentação não é 100% explícita sobre o formato.
  const secretCorpo = typeof body.secret === "string" ? body.secret.trim() : "";
  let autenticado = !!secretCorpo && iguais(secretCorpo, secret);

  const sig = (request.headers.get("x-cakto-signature") || "").trim();
  const ts = (request.headers.get("x-cakto-timestamp") || "").trim();
  if (!autenticado && sig) {
    const recebida = sig.replace(/^v1=/, "");
    const tsNum = Number(ts);
    const tsSeg = tsNum > 1e12 ? tsNum / 1000 : tsNum;
    const recente = !ts || (isFinite(tsSeg) && Math.abs(Date.now() / 1000 - tsSeg) <= 600);
    const bases = ts ? [`${ts}.${raw}`, raw] : [raw];
    for (const base of bases) {
      const h = createHmac("sha256", secret).update(base);
      const d = h.digest();
      if (iguais(recebida, d.toString("hex")) || iguais(recebida, d.toString("base64"))) {
        autenticado = recente;
        break;
      }
    }
  }

  if (!autenticado) {
    // O motivo aparece no histórico de envios do webhook na Cakto (sem expor a chave).
    const motivo = secretCorpo
      ? `secret do aviso não confere com CAKTO_WEBHOOK_SECRET (recebido ${secretCorpo.length} caracteres, esperado ${secret.length})`
      : sig
      ? "assinatura do cabeçalho não confere"
      : "aviso sem secret e sem assinatura";
    console.warn("[cakto] 401:", motivo);
    return NextResponse.json({ error: motivo }, { status: 401 });
  }

  const evento = String(body.event || "");
  const itens = (Array.isArray(body.data) ? body.data : [body.data]).filter(Boolean) as Record<string, any>[];

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  for (const data of itens) {
    const email = String(data.customer?.email || "").trim().toLowerCase();
    const pedidoId = String(data.id || data.refId || `${evento}-${Date.now()}`);
    const ref = email ? refDaAssinatura(data.product?.id, email) : null;

    // Log + deduplicação: o mesmo aviso (pedido + evento) só é processado uma vez.
    const { data: novo } = await admin
      .from("cakto_eventos")
      .upsert({ pedido_id: pedidoId, evento, email: email || null, ref, payload: data }, { onConflict: "pedido_id,evento", ignoreDuplicates: true })
      .select("id");
    if (!novo || novo.length === 0) continue;

    const status = EVENTO_PARA_STATUS[evento];
    if (!status || !email || !ref) continue;

    // De quem é a compra: 1º pelo `callback` (id da conta, mandado pelo botão Assinar),
    // 2º pelo e-mail usado no checkout.
    let userId: string | null = null;
    const cb = String(data.callback || "");
    if (UUID.test(cb)) {
      const { data: p } = await admin.from("profiles").select("id").eq("id", cb).maybeSingle();
      if (p) userId = p.id;
    }
    if (!userId) {
      const { data: p } = await admin.from("profiles").select("id").ilike("email", email).limit(1).maybeSingle();
      if (p) userId = p.id;
    }

    const caktoSubId =
      data.subscription && typeof data.subscription === "object" ? data.subscription.id : typeof data.subscription === "string" ? data.subscription : null;
    const { data: existente } = await admin.from("cakto_assinaturas").select("*").eq("ref", ref).maybeSingle();
    // Período: cada pagamento aprovado/renovado garante ~1 mês + 3 dias de folga.
    const periodEnd = status === "ativa" ? new Date(Date.now() + 33 * DIA).toISOString() : existente?.current_period_end ?? null;
    const valor = typeof data.amount === "number" ? data.amount : existente?.valor ?? null;

    await admin.from("cakto_assinaturas").upsert({
      ref,
      email,
      user_id: userId ?? existente?.user_id ?? null,
      cakto_sub_id: caktoSubId ?? existente?.cakto_sub_id ?? null,
      status,
      valor,
      ultimo_evento: evento,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    });

    const dono = userId ?? existente?.user_id ?? null;
    if (dono) await espelharAssinatura(admin, dono, ref, status, valor, periodEnd);
  }

  return NextResponse.json({ ok: true });
}

// Algumas plataformas checam se a URL responde antes de salvar o webhook. Um GET aqui só
// confirma que o endereço existe — não processa nada.
export async function GET() {
  return NextResponse.json({ ok: true, servico: "webhook Cakto · Nexus Tips" });
}
