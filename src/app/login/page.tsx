"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  // useSearchParams (usado pra ler ?desativado=1) exige um Suspense boundary em volta
  // pra não quebrar o build estático — sem isso o Next recusa a exportar a página.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

const VANTAGENS = [
  "Todo sinal, com contexto e raciocínio — nunca só um palpite solto.",
  "Sua banca nunca passa pela nossa mão. Você decide o valor e a casa.",
  "Histórico 100% público, greens e reds, sem filtro.",
];

const EyeIcon = ({ off }: { off: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    {off ? (
      <>
        <path d="M3 3l18 18" strokeLinecap="round" />
        <path d="M10.6 10.6a3 3 0 0 0 4.24 4.24M9.36 5.29A10.4 10.4 0 0 1 12 5c5.5 0 9 5 9 7-0.53 1.02-1.5 2.4-2.9 3.57M6.6 6.6C4.4 8.03 3 10.2 3 12c0 2 3.5 7 9 7 1.13 0 2.19-.21 3.15-.58" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <>
        <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("desativado") === "1") {
      setError("Sua conta foi desativada. Fale com o suporte se acha que isso é um engano.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError("E-mail ou senha inválidos.");
      return;
    }

    // Checa aqui além do middleware pra dar feedback na hora, sem depender de um
    // redirect a mais — conta desativada não deve nem piscar o dashboard.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("ativo").eq("id", user.id).single();
      if (profile && profile.ativo === false) {
        await supabase.auth.signOut();
        setLoading(false);
        setError("Sua conta foi desativada. Fale com o suporte se acha que isso é um engano.");
        return;
      }
    }

    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-bg">
      {/* PAINEL DE MARCA */}
      <div className="hidden md:flex flex-1 relative bg-gradient-to-br from-bg2 to-[#050b18] border-r border-border p-12 flex-col justify-between overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(#8FA2BE 1px, transparent 1px), linear-gradient(90deg, #8FA2BE 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
        <div className="absolute -top-24 -left-20 w-[26rem] h-[26rem] bg-primary opacity-[0.16] blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-info opacity-[0.10] blur-[90px] rounded-full" />

        <div className="relative">
          <Logo size={30} />
        </div>

        <div className="relative max-w-md">
          <div className="inline-flex items-center gap-2 bg-info/10 border border-info/30 rounded-md px-3 py-1.5 w-fit mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-info" />
            <span className="text-[11px] font-bold tracking-widest text-info">OPERAÇÃO CONTÍNUA</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight mb-4">
            Sua operação continua exatamente de onde parou.
          </h1>
          <p className="text-text2 text-sm leading-relaxed mb-7">
            Entre para ver os eventos monitorados agora, suas operações em andamento e o
            resultado atualizado da sua banca — tudo no mesmo lugar.
          </p>
          <div className="flex flex-col gap-3">
            {VANTAGENS.map((v) => (
              <div key={v} className="flex items-start gap-2.5 text-sm text-text2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16C784" strokeWidth="2.5" className="flex-none mt-0.5">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-4 text-xs text-muted">
          <span className="font-mono">94,8% de assertividade nos últimos 30 dias</span>
        </div>
      </div>

      {/* FORM */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-10 relative">
        <div className="md:hidden absolute top-6 left-6">
          <Logo size={26} />
        </div>
        <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-5 mt-10 md:mt-0">
          <div>
            <h1 className="text-xl font-bold">Entrar na sua conta</h1>
            <p className="text-text2 text-sm mt-1">Acesse o dashboard da Nexus Tips.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text2">E-mail</label>
            <div className="relative">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#66758A"
                strokeWidth="1.8"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                type="email"
                className="input-field pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text2">Senha</label>
              <Link href="/login" className="text-[11px] text-muted hover:text-text2">
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#66758A"
                strokeWidth="1.8"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              >
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                className="input-field pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-text2"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F0445E" strokeWidth="2" className="flex-none mt-0.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
              </svg>
              <p className="text-danger text-xs leading-relaxed">{error}</p>
            </div>
          )}

          <button type="submit" className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2" disabled={loading}>
            {loading ? (
              "Entrando…"
            ) : (
              <>
                Entrar
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>

          <p className="text-center text-text2 text-sm">
            Não tem conta?{" "}
            <Link href="/cadastro" className="text-info font-semibold">
              Criar conta grátis
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
