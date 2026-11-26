"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function initials(name: string, email: string) {
  const base = (name || email || "").trim();
  if (!base) return "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

// Substitui o antigo pill "ASSINATURA ATIVA" solto no header: agora essa informação mora
// dentro do dropdown, junto do avatar, nome, e-mail e o link pra gerenciar o plano — o
// mesmo padrão de "clicar no avatar abre um cartão de conta" que apps grandes usam.
// `compact` é usado na barra mobile: sem nome/seta ao lado, só o avatar círculo mesmo,
// que abre o mesmo dropdown (não dá espaço pro resto lá).
export function AccountMenu({
  name,
  email,
  subscribed,
  compact = false,
}: {
  name: string;
  email: string;
  subscribed: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const ini = initials(name, email);

  return (
    <div className="relative flex-none" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Conta"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full transition-colors ${
          compact ? "" : "pl-1.5 pr-3 py-1.5 border border-white/10 bg-white/[0.04] backdrop-blur-md hover:border-primary/50 hover:bg-white/[0.07]"
        }`}
      >
        <span
          className={`rounded-full bg-primary/15 border flex-none flex items-center justify-center font-bold text-primary ${
            subscribed ? "border-success/50" : "border-primary/30"
          } ${compact ? "w-8 h-8 text-[10px]" : "w-[26px] h-[26px] text-[10px]"}`}
        >
          {ini}
        </span>
        {!compact && (
          <>
            <span className="text-xs font-semibold max-w-[110px] truncate">{name}</span>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              className={`text-muted flex-none transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 card !bg-[rgba(10,15,34,.92)] shadow-2xl z-50 overflow-hidden p-0 animate-fade-up">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex-none flex items-center justify-center font-bold text-primary text-sm">
              {ini}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">{name}</div>
              <div className="text-xs text-text2 truncate">{email}</div>
            </div>
          </div>

          <div className="px-4 py-2.5 border-b border-border">
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide ${
                subscribed ? "text-success" : "text-text2"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${subscribed ? "bg-success animate-pulse" : "bg-muted"}`} />
              {subscribed ? "ASSINATURA ATIVA" : "CONTA GRATUITA"}
            </span>
          </div>

          <Link
            href="/dashboard/planos"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text2 hover:bg-elevated hover:text-text transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="flex-none">
              <rect x="2" y="5" width="20" height="14" rx="2.5" />
              <path d="M2 10h20" strokeLinecap="round" />
            </svg>
            Planos de assinatura
          </Link>

          <a
            href="/dashboard?tour=1"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text2 hover:bg-elevated hover:text-text transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="flex-none">
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" strokeLinecap="round" />
            </svg>
            Refazer personalização
          </a>
          <Link
            href="/dashboard/disciplina"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text2 hover:bg-elevated hover:text-text transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="flex-none">
              <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" strokeLinejoin="round" />
            </svg>
            Disciplina e limites
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors text-left border-t border-border"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="flex-none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sair da conta
          </button>
        </div>
      )}
    </div>
  );
}
