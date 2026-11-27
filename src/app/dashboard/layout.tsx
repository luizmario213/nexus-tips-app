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

  // Tudo que não depende de outra resposta roda AO MESMO TEMPO (antes era em fila: cada
  // consulta esperava a anterior, e com o banco longe do servidor isso somava segundos).
  const [{ data: profile }, { data: activeSub }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "ativa")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("app_settings").select("casa_nome, casa_link").eq("id", 1).maybeSingle(),
  ]);

  const tarefas: PromiseLike<unknown>[] = [];
  // Último acesso (migration 0004) — no máximo 1 gravação a cada 30 min.
  const ultimo = profile?.ultimo_acesso ? new Date(profile.ultimo_acesso).getTime() : 0;
  if (profile && Date.now() - ultimo > 30 * 60 * 1000) {
    tarefas.push(supabase.from("profiles").update({ ultimo_acesso: new Date().toISOString() }).eq("id", user.id));
  }
  // Comprou na Cakto antes de ter conta? Liga a assinatura a esta conta pelo e-mail.
  let assinaturaLiberadaAgora = false;
  if (!DEMO_MODE && !activeSub) {
    tarefas.push(
      reivindicarAssinaturas(user.id, profile?.email || user.email || "").then((n) => {
        assinaturaLiberadaAgora = !!n;
      })
    );
  }
  await Promise.all(tarefas);

  return (
    <>
      <OnboardingTutorial />
      <DashboardShell
        name={profile?.name || user.email || "Você"}
        email={profile?.email || user.email || ""}
        subscribed={temAcessoLiberado(profile?.role, !!activeSub || assinaturaLiberadaAgora)}
        casaNome={settings?.casa_nome || null}
        casaLink={settings?.casa_link || null}
      >
        {children}
      </DashboardShell>
    </>
  );
}
