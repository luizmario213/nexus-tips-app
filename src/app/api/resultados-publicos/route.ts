import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_MODE, createDemoClient } from "@/lib/supabase/demo";

// Histórico público pra landing (visitante não logado não lê `signals` por RLS).
// Devolve só agregados e os últimos sinais ENCERRADOS — nada de dado de cliente.
// Cache de 5 min na Vercel: a landing não bate no banco a cada visita.
export const revalidate = 300;

export async function GET() {
  let db;
  try {
    db = DEMO_MODE ? createDemoClient() : createAdminClient();
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const trinta = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: mes }, { data: todos }, { data: ultimos }] = await Promise.all([
    db.from("signals").select("status, odd").in("status", ["green", "red"]).gte("created_at", trinta),
    db.from("signals").select("status").in("status", ["green", "red"]),
    db
      .from("signals")
      .select("competicao, time_a, time_b, mercado, odd, status, tipo, created_at")
      .in("status", ["green", "red"])
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  const m = (mes as { status: string; odd: number }[]) || [];
  const greens30 = m.filter((s) => s.status === "green").length;
  const lucroUnidades = m.reduce((a, s) => a + (s.status === "green" ? s.odd - 1 : -1), 0);
  const t = (todos as { status: string }[]) || [];
  return NextResponse.json({
    ok: true,
    total30: m.length,
    greens30,
    reds30: m.length - greens30,
    pct30: m.length ? (greens30 / m.length) * 100 : null,
    unidades30: Math.round(lucroUnidades * 10) / 10,
    totalHistorico: t.length,
    ultimos: ultimos || [],
  });
}
