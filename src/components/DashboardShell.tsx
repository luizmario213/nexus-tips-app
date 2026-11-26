"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AmbientBackground } from "@/components/fx";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { AccountMenu } from "@/components/AccountMenu";
import { Logo } from "@/components/Logo";

// Casca do dashboard: no desktop (md+) é o layout de sempre, sidebar fixa ao lado do
// conteúdo. No mobile o menu lateral vira uma gaveta escondida por padrão — só o essencial
// (hambúrguer, logo, status da assinatura) fica numa barra compacta no topo, do jeito que
// um app de verdade se comporta, em vez do layout de PC espremido na tela do celular.
export function DashboardShell({
  name,
  email,
  subscribed,
  casaNome,
  casaLink,
  children,
}: {
  name: string;
  email: string;
  subscribed: boolean;
  casaNome?: string | null;
  casaLink?: string | null;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-bg text-text relative">
      <AmbientBackground variant="app" />
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-up"
        />
      )}

      <DashboardSidebar
        name={name}
        subscribed={subscribed}
        casaNome={casaNome}
        casaLink={casaLink}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Barra mobile — some no desktop (md:hidden). Substitui o header de PC de baixo. */}
        <div className="sticky top-0 z-30 h-14 flex-none flex items-center justify-between px-4 border-b border-white/[0.06] bg-[rgba(4,7,18,.7)] backdrop-blur-xl md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="w-9 h-9 flex-none flex items-center justify-center rounded-lg text-text2 hover:bg-elevated"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <Logo size={22} />
          <AccountMenu name={name} email={email} subscribed={subscribed} compact />
        </div>

        {/* Header de desktop — some no mobile (hidden, md:flex). */}
        <div className="sticky top-0 z-30 h-16 flex-none hidden md:flex items-center justify-between px-8 border-b border-white/[0.06] bg-[rgba(4,7,18,.55)] backdrop-blur-xl">
          <LiveClock />
          <AccountMenu name={name} email={email} subscribed={subscribed} />
        </div>

        <div key={pathname} className="page-enter flex-1 p-4 md:p-8 min-w-0">{children}</div>
      </div>
    </div>
  );
}

// Relógio "ao vivo" no header — reforça a sensação de painel em tempo real.
function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-3 text-[12px] text-text2">
      <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-success">
        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_#14E3A0]" />
        AO VIVO
      </span>
      <span className="font-mono tabular-nums text-muted">
        {now
          ? now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }) +
            " · " +
            now.toLocaleTimeString("pt-BR")
          : ""}
      </span>
    </div>
  );
}
