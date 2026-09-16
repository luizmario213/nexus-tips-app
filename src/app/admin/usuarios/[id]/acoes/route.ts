import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANOS, type Plano, type BancaMovimentoTipo } from "@/lib/types";

// Endpoint único pra toda ação administrativa "em nome de outro usuário" — perfil,
// e-mail, senha, banca, plano/assinatura. Motivo de centralizar aqui em vez de deixar
// cada tela escrever direto no Supabase com a anon key (como o resto do app faz):
//
// 1) Trocar e-mail e disparar redefinição de senha só é possível com a Admin API do
//    Supabase (precisa da service_role key) — não tem outro jeito.
// 2) Editar perfil/banca/assinatura DE OUTRO usuário depende de policy de RLS que nem
//    sempre está garantida (algumas tabelas deste projeto foram alteradas direto no SQL
//    Editor do Supabase, fora do arquivo de migration versionado aqui) — passando pela
//    service role a gente ignora essa incerteza e garante que funciona.
// 3) Um único lugar pra checar "quem está chamando isso é mesmo admin?" em vez de confiar
//    nisso espalhado em N telas client-side.

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };

  const { data: profile } = await supabase.from("profiles").select("role, ativo").eq("id", user.id).single();
  if (profile?.role !== "admin" || profile?.ativo === false) {
    return { error: NextResponse.json({ error: "Sem permissão de admin." }, { status: 403 }) };
  }
  return { adminId: user.id };
}

function serviceKeyErrorResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : "Erro desconhecido.";
  return NextResponse.json({ error: msg }, { status: 500 });
}

// GET — dados que a gaveta do usuário precisa e que preferimos não arriscar ler via RLS
// direto do navegador (banca_movimentos não está no schema versionado neste repo, então
// não dá pra garantir que a policy de SELECT libera o admin ver de outro usuário).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const admin = createAdminClient();
    const { data: movimentos, error } = await admin
      .from("banca_movimentos")
      .select("*")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ movimentos: movimentos || [] });
  } catch (e) {
    return serviceKeyErrorResponse(e);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const userId = params.id;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }
  const action = body?.action as string | undefined;
  if (!action) return NextResponse.json({ error: "Ação não informada." }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return serviceKeyErrorResponse(e);
  }

  try {
    switch (action) {
      // ---------- PERFIL ----------
      case "editar-perfil": {
        const patch: Record<string, unknown> = {};
        if (typeof body.name === "string") patch.name = body.name.trim();
        if (typeof body.phone === "string") patch.phone = body.phone.trim() || null;
        if (typeof body.time_coracao === "string") patch.time_coracao = body.time_coracao.trim() || null;
        if (body.banca_inicial !== undefined) {
          const n = body.banca_inicial === null ? null : Number(body.banca_inicial);
          if (n !== null && (isNaN(n) || n < 0)) {
            return NextResponse.json({ error: "Banca inicial inválida." }, { status: 400 });
          }
          patch.banca_inicial = n;
        }
        if (Object.keys(patch).length === 0) {
          return NextResponse.json({ error: "Nada para salvar." }, { status: 400 });
        }
        const { data, error } = await admin.from("profiles").update(patch).eq("id", userId).select().single();
        if (error) throw error;
        return NextResponse.json({ profile: data });
      }

      // ---------- E-MAIL (auth.users + profiles, em sincronia) ----------
      case "editar-email": {
        const email = String(body.email || "").trim().toLowerCase();
        if (!email || !email.includes("@")) {
          return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
        }
        const { error: authError } = await admin.auth.admin.updateUserById(userId, {
          email,
          email_confirm: true,
        });
        if (authError) throw authError;
        const { data, error } = await admin
          .from("profiles")
          .update({ email })
          .eq("id", userId)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ profile: data });
      }

      // ---------- SENHA (link de redefinição por e-mail — o admin nunca vê a senha) ----------
      case "reset-senha": {
        const { data: profile, error: profileError } = await admin
          .from("profiles")
          .select("email")
          .eq("id", userId)
          .single();
        if (profileError || !profile?.email) {
          return NextResponse.json({ error: "E-mail do usuário não encontrado." }, { status: 404 });
        }
        const origin = new URL(request.url).origin;
        const { error } = await admin.auth.resetPasswordForEmail(profile.email, {
          redirectTo: `${origin}/redefinir-senha`,
        });
        if (error) throw error;
        return NextResponse.json({ ok: true, email: profile.email });
      }

      // ---------- ACESSO (role / conta ativa) ----------
      case "toggle-role": {
        if (userId === auth.adminId) {
          return NextResponse.json(
            { error: "Você não pode alterar seu próprio nível de acesso por aqui." },
            { status: 400 }
          );
        }
        const { data: current } = await admin.from("profiles").select("role").eq("id", userId).single();
        const novoRole = current?.role === "admin" ? "user" : "admin";
        const { data, error } = await admin
          .from("profiles")
          .update({ role: novoRole })
          .eq("id", userId)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ profile: data });
      }

      case "toggle-ativo": {
        if (userId === auth.adminId) {
          return NextResponse.json(
            { error: "Você não pode desativar a própria conta por aqui." },
            { status: 400 }
          );
        }
        const { data: current } = await admin.from("profiles").select("ativo").eq("id", userId).single();
        const { data, error } = await admin
          .from("profiles")
          .update({ ativo: !(current?.ativo ?? true) })
          .eq("id", userId)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ profile: data });
      }

      // ---------- BANCA (mesma regra de dashboard/gestao: ajuste informa o saldo
      // correto e a gente calcula o delta; aporte/saque já são o delta) ----------
      case "movimentar-banca": {
        const tipo = body.tipo as BancaMovimentoTipo;
        const valorInformado = Number(body.valor);
        if (!["aporte", "saque", "ajuste"].includes(tipo) || isNaN(valorInformado) || valorInformado <= 0) {
          return NextResponse.json({ error: "Tipo ou valor inválido." }, { status: 400 });
        }

        let delta = valorInformado;
        if (tipo === "saque") delta = -valorInformado;
        if (tipo === "ajuste") {
          const [{ data: profile }, { data: ops }, { data: movs }] = await Promise.all([
            admin.from("profiles").select("banca_inicial").eq("id", userId).single(),
            admin.from("operations").select("valor, odd_obtida, status, signals(odd)").eq("user_id", userId),
            admin.from("banca_movimentos").select("valor").eq("user_id", userId),
          ]);
          const bancaInicial = profile?.banca_inicial ?? 0;
          const totalProfit = (ops || []).reduce((acc: number, o: any) => {
            if (o.status === "green") return acc + o.valor * ((o.odd_obtida ?? o.signals?.odd ?? 1) - 1);
            if (o.status === "red") return acc - o.valor;
            return acc;
          }, 0);
          const totalMovimentos = (movs || []).reduce((acc: number, m: any) => acc + m.valor, 0);
          const saldoAtual = bancaInicial + totalProfit + totalMovimentos;
          delta = valorInformado - saldoAtual;
          if (delta === 0) {
            return NextResponse.json({ error: "Esse já é o saldo atual — nada para ajustar." }, { status: 400 });
          }
        }

        const nota = typeof body.nota === "string" && body.nota.trim() ? body.nota.trim() : `Ajuste manual pelo admin`;
        const { data, error } = await admin
          .from("banca_movimentos")
          .insert({ user_id: userId, tipo, valor: delta, nota })
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ movimento: data });
      }

      // ---------- ASSINATURA ----------
      case "ativar-plano": {
        const plano = body.plano as Plano;
        if (!PLANOS[plano]) return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
        const patrocinada = !!body.patrocinada;
        const valorCustom = body.valorCustom !== undefined && body.valorCustom !== null ? Number(body.valorCustom) : null;

        const { data: ativaAtual } = await admin
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "ativa")
          .maybeSingle();
        if (ativaAtual) {
          await admin
            .from("subscriptions")
            .update({ status: "cancelada", canceled_at: new Date().toISOString() })
            .eq("id", ativaAtual.id);
        }

        const valor = patrocinada ? 0 : valorCustom !== null && !isNaN(valorCustom) ? valorCustom : PLANOS[plano].valor;
        const { data, error } = await admin
          .from("subscriptions")
          .insert({
            user_id: userId,
            plano,
            valor,
            status: "ativa",
            provider: patrocinada ? "patrocinada" : "manual",
          })
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ subscription: data });
      }

      case "editar-assinatura": {
        const subscriptionId = body.subscriptionId as string;
        if (!subscriptionId) return NextResponse.json({ error: "Assinatura não informada." }, { status: 400 });
        const patch: Record<string, unknown> = {};
        if (body.valor !== undefined) {
          const n = Number(body.valor);
          if (isNaN(n) || n < 0) return NextResponse.json({ error: "Valor inválido." }, { status: 400 });
          patch.valor = n;
        }
        if (body.current_period_end !== undefined) patch.current_period_end = body.current_period_end || null;
        if (body.status !== undefined) {
          if (!["ativa", "cancelada", "atrasada"].includes(body.status)) {
            return NextResponse.json({ error: "Status inválido." }, { status: 400 });
          }
          patch.status = body.status;
          if (body.status === "cancelada") patch.canceled_at = new Date().toISOString();
        }
        if (Object.keys(patch).length === 0) {
          return NextResponse.json({ error: "Nada para salvar." }, { status: 400 });
        }
        const { data, error } = await admin
          .from("subscriptions")
          .update(patch)
          .eq("id", subscriptionId)
          .eq("user_id", userId)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ subscription: data });
      }

      case "cancelar-assinatura": {
        const subscriptionId = body.subscriptionId as string;
        if (!subscriptionId) return NextResponse.json({ error: "Assinatura não informada." }, { status: 400 });
        const { data, error } = await admin
          .from("subscriptions")
          .update({ status: "cancelada", canceled_at: new Date().toISOString() })
          .eq("id", subscriptionId)
          .eq("user_id", userId)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ subscription: data });
      }

      default:
        return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
    }
  } catch (e) {
    return serviceKeyErrorResponse(e);
  }
}
