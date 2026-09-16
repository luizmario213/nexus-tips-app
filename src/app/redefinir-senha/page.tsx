"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

// Destino do link de "redefinir senha" — seja o admin que disparou (painel /admin/usuarios)
// ou, futuramente, um "esqueci minha senha" self-service. O Supabase, ao clicar no link do
// e-mail, já injeta uma sessão de recuperação nesta página sozinho (client com
// detectSessionInUrl); a gente só escuta o evento PASSWORD_RECOVERY e troca a senha.

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

function passwordStrength(pw: string) {
  if (!pw) return { label: "", pct: 0, color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Fraca", pct: 25, color: "#F0445E" };
  if (score <= 3) return { label: "Razoável", pct: 60, color: "#F5A524" };
  return { label: "Forte", pct: 100, color: "#16C784" };
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <RedefinirSenhaForm />
    </Suspense>
  );
}

function RedefinirSenhaForm() {
  const router = useRouter();
  const supabase = createClient();

  // "verificando" → checando se o link trouxe uma sessão de recuperação válida.
  // "pronto" → tem sessão, pode trocar a senha. "invalido" → link expirado/já usado.
  const [status, setStatus] = useState<"verificando" | "pronto" | "invalido">("verificando");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const strength = passwordStrength(password);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) setStatus("pronto");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("pronto");
    });

    // Se depois de um tempo curto nenhuma sessão apareceu, o link era inválido ou expirou.
    const timeout = setTimeout(() => {
      if (mounted) setStatus((s) => (s === "verificando" ? "invalido" : s));
    }, 2500);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("Não deu pra salvar a senha nova. Peça um novo link e tente de novo.");
      return;
    }
    setSucesso(true);
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm flex flex-col gap-5">
        <div>
          <Logo size={28} />
          <h1 className="text-xl font-bold mt-4">Redefinir senha</h1>
          <p className="text-text2 text-sm mt-1">Escolha uma senha nova para sua conta.</p>
        </div>

        {status === "verificando" && (
          <div className="card p-5 text-sm text-text2 text-center">Verificando seu link…</div>
        )}

        {status === "invalido" && (
          <div className="flex items-start gap-2 bg-danger/10 border border-danger/30 rounded-lg px-3 py-3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F0445E" strokeWidth="2" className="flex-none mt-0.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
            </svg>
            <p className="text-danger text-xs leading-relaxed">
              Esse link de redefinição não é mais válido — ele expira depois de um tempo ou já
              foi usado. Peça um novo link e tente de novo.
            </p>
          </div>
        )}

        {status === "pronto" && !sucesso && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text2">Nova senha</label>
              <div className="relative">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#66758A" strokeWidth="1.8" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
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
              {password && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 rounded-full bg-elevated overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${strength.pct}%`, background: strength.color }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text2">Confirmar senha</label>
              <input
                type={showPassword ? "text" : "password"}
                className="input-field"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-danger text-xs">{error}</p>}

            <button type="submit" className="btn-primary w-full py-3 text-sm" disabled={loading}>
              {loading ? "Salvando…" : "Salvar senha nova"}
            </button>
          </form>
        )}

        {sucesso && (
          <div className="flex items-start gap-2 bg-success/10 border border-success/30 rounded-lg px-3 py-3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16C784" strokeWidth="2.5" className="flex-none mt-0.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-success text-xs leading-relaxed">
              Senha atualizada. Levando você para o login…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
