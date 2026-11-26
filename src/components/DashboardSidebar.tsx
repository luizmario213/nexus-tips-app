"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

const ICONS = {
  grid: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  bolt: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" strokeLinejoin="round" />
    </svg>
  ),
  wallet: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16" cy="14.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
  clock: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  bars: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19V10M10 19V5M16 19V13M22 19V8" strokeLinecap="round" />
    </svg>
  ),
  shield: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" strokeLinejoin="round" />
      <path d="M8.5 12l2.3 2.3L16 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  card: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2 10h20" strokeLinecap="round" />
    </svg>
  ),
  pulse: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  ),
  headset: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20l1-5.4A8.5 8.5 0 1 1 21 11.5z" />
    </svg>
  ),
};

const Lock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#69759A" strokeWidth="2">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
  </svg>
);

function navGroups(subscribed: boolean) {
  return [
    {
      label: "PRINCIPAL",
      links: [
        { href: "/dashboard", label: "Visão geral", icon: ICONS.grid, locked: false },
        { href: "/dashboard/eventos", label: "Sala ao Vivo", icon: ICONS.bolt, locked: !subscribed, live: true },
      ],
    },
    {
      // Histórico e Resultados ficam de fora do "subscribed ?" porque não dependem de
      // assinatura: Resultados é o track record da PLATAFORMA (todo sinal já publicado),
      // não das operações do usuário — serve inclusive pra convencer quem ainda não
      // assinou. Histórico, por outro lado, é pessoal (as operações que o usuário já
      // marcou), então esse sim é travado — ver a página em si.
      label: "OPERAÇÃO",
      links: subscribed
        ? [
            { href: "/dashboard/gestao", label: "Gestão", icon: ICONS.wallet, locked: false },
            { href: "/dashboard/historico", label: "Histórico", icon: ICONS.clock, locked: false },
            { href: "/dashboard/performance", label: "Resultados", icon: ICONS.shield, locked: false },
            { href: "/dashboard/disciplina", label: "Disciplina", icon: ICONS.pulse, locked: false },
          ]
        : [
            { href: "/dashboard/historico", label: "Histórico", icon: ICONS.clock, locked: true },
            { href: "/dashboard/performance", label: "Resultados", icon: ICONS.shield, locked: false },
            { href: "/dashboard/disciplina", label: "Disciplina", icon: ICONS.pulse, locked: false },
          ],
    },
    {
      label: "CONTA",
      links: [
        { href: "/dashboard/planos", label: "Planos de assinatura", icon: ICONS.card, locked: false },
        { href: "/dashboard/suporte", label: "Suporte", icon: ICONS.headset, locked: false },
      ],
    },
  ];
}

export function DashboardSidebar({
  name,
  subscribed,
  casaNome,
  casaLink,
  open = false,
  onClose,
}: {
  name: string;
  subscribed: boolean;
  casaNome?: string | null;
  casaLink?: string | null;
  // No desktop (md+) o menu sempre fica visível, encaixado no layout — open/onClose não
  // fazem diferença ali. No mobile ele vira uma gaveta: escondido por padrão, controlado
  // pelo DashboardShell (hambúrguer abre, clique fora ou num link fecha).
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const groups = navGroups(subscribed);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div
      className={`w-[272px] flex-none flex flex-col fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] md:sticky md:top-0 md:h-screen md:translate-x-0 md:z-20 bg-[rgba(5,8,20,.82)] md:bg-[rgba(5,8,20,.55)] backdrop-blur-2xl border-r border-white/[0.06] ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="relative px-6 pt-6 pb-4">
        <div className="absolute top-0 left-4 w-24 h-20 bg-primary opacity-[0.25] blur-[30px] rounded-full pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <Logo size={26} />
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="md:hidden w-8 h-8 flex-none flex items-center justify-center rounded-lg text-text2 hover:bg-elevated"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="text-[10px] font-bold tracking-[0.18em] text-muted/80 px-3 pt-5 pb-2">
              {group.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.links.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] transition-all duration-300 ${
                      active
                        ? "text-text font-semibold bg-gradient-to-r from-primary/20 via-primary/[0.08] to-transparent shadow-[inset_0_0_0_1px_rgba(79,123,255,.25)]"
                        : "text-text2 hover:text-text hover:bg-white/[0.04] hover:translate-x-0.5"
                    }`}
                  >
                    {active && (
                      <span className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-info to-primary shadow-[0_0_12px_rgba(51,214,245,.9)]" />
                    )}
                    <span className="flex items-center gap-3">
                      <span className={`transition-colors ${active ? "text-info drop-shadow-[0_0_6px_rgba(51,214,245,.7)]" : "text-muted group-hover:text-text2"}`}>{link.icon}</span>
                      {link.label}
                    </span>
                    {link.locked ? <Lock /> : (link as { live?: boolean }).live ? <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse shadow-[0_0_8px_#FF4D6D]" /> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 flex flex-col gap-2">
        {casaLink && (
          <Link
            href={casaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline text-[11px] font-semibold text-center py-2 rounded-lg"
          >
            Cadastre-se na {casaNome || "casa de apostas"}
          </Link>
        )}
        <div
          className={`card p-3.5 flex items-center gap-2.5 !rounded-2xl ${
            subscribed ? "!border-success/35 shadow-[0_0_30px_-10px_rgba(20,227,160,.5)]" : ""
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full bg-elevated border-[1.5px] flex-none flex items-center justify-center ${
              subscribed ? "border-success" : "border-border"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A4B0D0" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-7 8-7s8 3 8 7" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-xs font-semibold truncate">{name}</span>
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide ${
                subscribed ? "text-success" : "text-text2"
              }`}
            >
              {subscribed && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
              {subscribed ? "NEXUS PRO ATIVO" : "CONTA GRATUITA"}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-muted hover:text-text2 text-left px-1"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}
