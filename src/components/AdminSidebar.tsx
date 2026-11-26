"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

const I = (d: React.ReactNode) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const LINKS = [
  { href: "/admin", label: "Visão geral", icon: I(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>) },
  { href: "/admin/inteligencia", label: "Inteligência", icon: I(<><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /><circle cx="19" cy="8" r="1.4" fill="currentColor" /></>) },
  { href: "/admin/sinais", label: "Sinais", icon: I(<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />) },
  { href: "/admin/usuarios", label: "Usuários", icon: I(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20c0-3-2-5.3-4.5-5.9" /></>) },
  { href: "/admin/assinaturas", label: "Financeiro", icon: I(<><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20M6 15h4" /></>) },
  { href: "/admin/suporte", label: "Suporte", icon: I(<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20l1-5.4A8.5 8.5 0 1 1 21 11.5z" />) },
  { href: "/admin/configuracoes", label: "Configurações", icon: I(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>) },
];

export function AdminSidebar({
  name,
  open,
  onClose,
}: {
  name: string;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div
      className={`w-[272px] flex-none flex flex-col fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] md:sticky md:top-0 md:h-screen md:translate-x-0 md:z-20 bg-[rgba(5,8,20,.82)] md:bg-[rgba(5,8,20,.55)] backdrop-blur-2xl border-r border-white/[0.06] ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="p-6 pb-4 flex items-center justify-between">
        <div>
          <Logo size={26} />
          <div className="inline-flex mt-2.5 text-[9.5px] font-bold tracking-[0.2em] text-accent border border-accent/40 bg-accent/10 rounded-full px-2 py-0.5">ADMIN CONSOLE</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar menu"
          className="md:hidden w-8 h-8 flex-none flex items-center justify-center rounded-lg text-text2 hover:bg-elevated"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 px-3.5 pt-3 flex flex-col gap-1 overflow-y-auto">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] transition-all duration-300 ${
                active
                  ? "text-text font-semibold bg-gradient-to-r from-accent/25 via-accent/[0.08] to-transparent shadow-[inset_0_0_0_1px_rgba(155,107,255,.28)]"
                  : "text-text2 hover:text-text hover:bg-white/[0.04] hover:translate-x-0.5"
              }`}
            >
              {active && (
                <span className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-accent to-primary shadow-[0_0_12px_rgba(155,107,255,.9)]" />
              )}
              <span className={`transition-colors ${active ? "text-accent drop-shadow-[0_0_6px_rgba(155,107,255,.7)]" : "text-muted group-hover:text-text2"}`}>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="p-4 flex flex-col gap-2">
        <div className="card p-3.5">
          <span className="text-xs font-semibold truncate block">{name}</span>
          <span className="text-[10px] text-muted">acesso administrativo</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-muted hover:text-text2 text-left px-1"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
