"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AmbientBackground } from "@/components/fx";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Logo } from "@/components/Logo";

export function AdminShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-bg text-text relative">
      <AmbientBackground variant="admin" />
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-up"
        />
      )}

      <AdminSidebar name={name} open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Barra mobile — some no desktop (md:hidden). */}
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
          <span className="text-[9.5px] font-bold tracking-[0.2em] text-accent border border-accent/40 bg-accent/10 rounded-full px-2 py-0.5">ADMIN</span>
        </div>

        <div className="sticky top-0 z-30 h-16 flex-none hidden md:flex items-center justify-between px-8 border-b border-white/[0.06] bg-[rgba(4,7,18,.55)] backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[12px] text-text2">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-accent whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_#9B6BFF]" />
              CENTRAL DE COMANDO
            </span>
            <span className="text-muted hidden xl:inline">Dados em tempo real via Supabase Realtime</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/40 to-primary/30 border border-accent/40 flex items-center justify-center text-[11px] font-bold">
              {name.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-[13px] font-semibold whitespace-nowrap">{name}</span>
          </div>
        </div>

        <div key={pathname} className="page-enter flex-1 p-4 md:p-8 min-w-0">{children}</div>
      </div>
    </div>
  );
}
