"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { NexusCore, AmbientBackground } from "@/components/fx";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.user) {
      setLoading(false);
      setError("E-mail ou senha inválidos.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", signInData.user.id)
      .single();

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Essa conta não tem acesso administrativo.");
      return;
    }

    setLoading(false);
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg relative overflow-hidden p-5">
      <AmbientBackground variant="admin" />
      <NexusCore className="absolute inset-0 opacity-70" scale={1.15} particles={1800} />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(3,5,12,.55),rgba(3,5,12,.9)_70%)]" />
      <form onSubmit={handleSubmit} className="card relative z-10 w-full max-w-[400px] flex flex-col gap-5 p-8 sm:p-10 animate-fade-up !bg-[rgba(8,12,30,.72)]">
        <div>
          <div className="flex items-center justify-between">
            <Logo size={28} />
            <span className="text-[10px] font-bold tracking-[0.2em] text-accent border border-accent/40 bg-accent/10 rounded-full px-2.5 py-1">ADMIN</span>
          </div>
          <h1 className="font-display text-[26px] font-semibold tracking-tight mt-6">Acesso administrativo</h1>
          <p className="text-text2 text-sm mt-1">Restrito à equipe Nexus Tips.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text2">E-mail</label>
          <input
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text2">Senha</label>
          <input
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-danger text-xs">{error}</p>}

        <button type="submit" className="btn-primary w-full py-3 text-sm" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
