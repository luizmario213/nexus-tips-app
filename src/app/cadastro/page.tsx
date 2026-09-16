"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const VANTAGENS = [
  { t: "Grátis pra começar", d: "Você só paga quando decidir liberar os eventos completos." },
  { t: "Sem cartão agora", d: "Nenhum dado de pagamento é pedido no cadastro." },
  { t: "Sem fidelidade", d: "Cancela quando quiser, direto pelo painel, sem ligação." },
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

export default function CadastroPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = passwordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!acceptTerms) {
      setError("Aceite os termos para continuar.");
      return;
    }
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      setError("Informe um telefone válido, com DDD.");
      return;
    }

    setLoading(true);
    // Isso cria o usuário em auth.users. O trigger `handle_new_user` (veja a migration)
    // cria automaticamente a linha correspondente em `profiles` — é esse insert que o
    // admin vê aparecer em tempo real na aba Usuários, sem nenhum código extra aqui.
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone } },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

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
        <div className="absolute -top-24 -right-20 w-[26rem] h-[26rem] bg-primary opacity-[0.16] blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-success opacity-[0.08] blur-[90px] rounded-full" />

        <div className="relative">
          <Logo size={30} />
        </div>

        <div className="relative max-w-md">
          <div className="inline-flex items-center gap-2 bg-success/10 border border-success/30 rounded-md px-3 py-1.5 w-fit mb-5">
            <span className="text-[11px] font-bold tracking-widest text-success">GRÁTIS PARA COMEÇAR</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight mb-4">
            Pare de operar no escuro.
          </h1>
          <p className="text-text2 text-sm leading-relaxed mb-7">
            Crie sua conta e veja como a Nexus Tips organiza eventos, análises e
            resultado — histórico público, sem letra miúda, sem promessa vazia.
          </p>
          <div className="flex flex-col gap-4">
            {VANTAGENS.map((v) => (
              <div key={v.t} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-elevated border border-border flex-none flex items-center justify-center mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16C784" strokeWidth="2.5">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">{v.t}</p>
                  <p className="text-xs text-text2 mt-0.5">{v.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-muted">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#66758A" strokeWidth="1.8">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
          </svg>
          <span>Seus dados de pagamento nunca ficam com a Nexus Tips.</span>
        </div>
      </div>

      {/* FORM */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-10 relative">
        <div className="md:hidden absolute top-6 left-6">
          <Logo size={26} />
        </div>
        <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4 mt-10 md:mt-0">
          <div>
            <h1 className="text-xl font-bold">Criar sua conta</h1>
            <p className="text-text2 text-sm mt-1">Leva menos de um minuto — sem cartão.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text2">Nome</label>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text2">E-mail</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text2">Telefone</label>
            <input
              type="tel"
              className="input-field"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(11) 91234-5678"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text2">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="input-field pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
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
            {password.length > 0 && (
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1 rounded-full bg-elevated overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${strength.pct}%`, background: strength.color }}
                  />
                </div>
                <span className="text-[10px] font-semibold" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <label className="flex items-start gap-2 text-xs text-text2 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5"
            />
            Li e aceito os termos de uso e a política de privacidade.
          </label>

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
              "Criando conta…"
            ) : (
              <>
                Criar conta grátis
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>

          <p className="text-center text-text2 text-sm">
            Já tem conta?{" "}
            <Link href="/login" className="text-info font-semibold">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
