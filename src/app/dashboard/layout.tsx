import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { temAcessoLiberado } from "@/lib/access";
import { reivindicarAssinaturas } from "@/lib/cakto-server";
import { DEMO_MODE } from "@/lib/supabase/demo";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O middleware já redireciona quem não está logado, isso aqui é só um cinto de segurança.
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Último acesso (migration 0004) — alimenta o "risco de cancelamento" do admin.
  // Grava no máximo a cada 30 min pra não escrever no banco a cada navegação.
  const ultimo = profile?.ultimo_acesso ? new Date(profile.ultimo_acesso).getTime() : 0;
  if (profile && Date.now() - ultimo > 30 * 60 * 1000) {
    await supabase.from("profiles").update({ ultimo_acesso: new Date().toISOString() }).eq("id", user.id);
  }

  // Comprou na Cakto antes de ter conta? Liga a assinatura a esta conta pelo e-mail.
  if (!DEMO_MODE) {
    const { count } = await supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "ativa");
    if (!count) await reivindicarAssinaturas(user.id, profile?.email || user.email || "");
  }

  const { data: activeSub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "ativa")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: settings } = await supabase
    .from("app_settings")
    .select("casa_nome, casa_link")
    .eq("id", 1)
    .maybeSingle();

  return (
    <>
      <OnboardingTutorial />
      <DashboardShell
        name={profile?.name || user.email || "Você"}
        email={profile?.email || user.email || ""}
        subscribed={temAcessoLiberado(profile?.role, !!activeSub)}
        casaNome={settings?.casa_nome || null}
        casaLink={settings?.casa_link || null}
      >
        {children}
      </DashboardShell>
    </>
  );
}
