import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelarNaCakto } from "@/lib/cakto-server";

// Cancelamento pelo botão em /dashboard/planos. Assinatura paga pela Cakto é cancelada LÁ
// (pra parar a cobrança); as manuais/patrocinadas são canceladas só no banco.
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "ativa")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) return NextResponse.json({ error: "Nenhuma assinatura ativa." }, { status: 404 });

  if (sub.provider === "cakto") {
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return NextResponse.json({ error: "Cancelamento indisponível agora. Fale com o suporte." }, { status: 500 });
    }
    const { data: ca } = await admin.from("cakto_assinaturas").select("cakto_sub_id").eq("ref", sub.provider_subscription_id).maybeSingle();
    if (!ca?.cakto_sub_id) {
      return NextResponse.json(
        { error: "Não achamos o ID dessa assinatura na Cakto. Cancele pelo link do e-mail de compra da Cakto ou fale com o suporte." },
        { status: 400 }
      );
    }
    const r = await cancelarNaCakto(ca.cakto_sub_id);
    if (!r.ok) {
      return NextResponse.json(
        { error: "Não conseguimos cancelar na Cakto agora. Tente de novo em instantes ou fale com o suporte." },
        { status: 502 }
      );
    }
    const agora = new Date().toISOString();
    await admin.from("subscriptions").update({ status: "cancelada", canceled_at: agora }).eq("id", sub.id);
    await admin.from("cakto_assinaturas").update({ status: "cancelada", ultimo_evento: "cancelado_pelo_painel", updated_at: agora }).eq("ref", sub.provider_subscription_id);
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("subscriptions").update({ status: "cancelada", canceled_at: new Date().toISOString() }).eq("id", sub.id);
  if (error) return NextResponse.json({ error: "Não foi possível cancelar agora." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
