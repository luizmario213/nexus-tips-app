"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PLANOS } from "@/lib/types";
import { Logo } from "@/components/Logo";
import { NexusCore, Reveal, TiltCard, CountUp, Magnetic } from "@/components/fx";

const DEMO_SIGNALS = [
  {
    comp: "PREMIER LEAGUE · HOJE, 16:00",
    timeA: "Arsenal",
    timeB: "Chelsea",
    mercado: "Mais de 1.5 gols",
    odd: "1.72",
    estrategia: "Momentum ofensivo",
    rationale:
      "Arsenal chega de três jogos seguidos em casa marcando ao menos 2 gols, e o Chelsea sofreu gols em 6 dos últimos 7 confrontos fora. O padrão ofensivo recente dos dois lados sustenta a expectativa de um jogo aberto.",
    agentFindings: {
      jogos: "9 jogos monitorados na Premier League hoje",
      stats: "Arsenal marca 2+ gols há 3 jogos seguidos em casa",
      odds: "Odd subiu de 1,65 para 1,72 nas últimas 3h",
      historico: "Chelsea sofreu gols em 6 dos últimos 7 jogos fora",
      oportunidade: "Valor esperado +9,2% sobre a odd de mercado",
    },
  },
  {
    comp: "LA LIGA · HOJE, 18:30",
    timeA: "Barcelona",
    timeB: "Atlético",
    mercado: "Ambas marcam",
    odd: "1.85",
    estrategia: "Consistência defensiva instável",
    rationale:
      "O Atlético não mantém o gol invicto há 5 rodadas visitando times do G6, enquanto o Barcelona não deixa de balançar a rede há 11 jogos seguidos como mandante. O histórico recente favorece um confronto com gols dos dois lados.",
    agentFindings: {
      jogos: "6 jogos monitorados na La Liga hoje",
      stats: "Barcelona não deixa de marcar há 11 jogos em casa",
      odds: "Mercado \"ambas marcam\" oscilando entre 1,80 e 1,90",
      historico: "Atlético sofreu gols em 5 dos últimos 6 jogos fora do G6",
      oportunidade: "Valor esperado +6,8% sobre a odd de mercado",
    },
  },
  {
    comp: "BRASILEIRÃO · AMANHÃ, 20:00",
    timeA: "Corinthians",
    timeB: "São Paulo",
    mercado: "Dupla chance 1X",
    odd: "1.95",
    estrategia: "Vantagem de mando",
    rationale:
      "O Corinthians não perde como mandante neste clássico há 4 edições, e o São Paulo tem historicamente um retrospecto mais equilibrado fora de casa nesse confronto direto. O contexto de mando pesa a favor de um resultado sem derrota para o time da casa.",
    agentFindings: {
      jogos: "4 jogos monitorados no Brasileirão amanhã",
      stats: "Corinthians invicto como mandante neste clássico há 4 edições",
      odds: "Dupla chance 1X abrindo acima da média histórica do confronto",
      historico: "São Paulo tem retrospecto equilibrado fora nesse confronto direto",
      oportunidade: "Valor esperado +5,4% sobre a odd de mercado",
    },
  },
];

const PILARES = [
  {
    titulo: "TECNOLOGIA",
    texto: "Um motor de dados cruza estatística, contexto e histórico antes de qualquer sinal sair do lugar.",
  },
  {
    titulo: "PRECISÃO",
    texto: "Cada entrada vem com o raciocínio explicado — não é \"confia em mim\", é o porquê por escrito.",
  },
  {
    titulo: "CONTROLE",
    texto: "Sua banca nunca passa pela nossa mão. Você marca, você decide, você gerencia.",
  },
  {
    titulo: "CONFIANÇA",
    texto: "Todo sinal encerrado fica no histórico público — greens e reds, sem exceção.",
  },
];

const COMPARACAO = [
  { ponto: "Histórico de resultados", ruim: "Mostra só as capturas de tela que quer", bom: "100% público — todo green e todo red, sem filtro" },
  { ponto: "Metodologia", ruim: "\"Manda ver, confia\"", bom: "Contexto e raciocínio explicados em cada sinal" },
  { ponto: "Sua banca", ruim: "Grupo pressiona valor e ritmo de entrada", bom: "Você decide o valor, o ritmo e a casa que usa" },
  { ponto: "Quando erra", ruim: "Sinal some do grupo, ninguém fala mais", bom: "Red fica no histórico do mesmo jeito que o green" },
  { ponto: "Cobrança", ruim: "PIX pro perfil pessoal, sem nota, sem contrato", bom: "Assinatura formal, cancele quando quiser, sem fidelidade" },
];

const ETAPAS = [
  { n: "01", t: "Análise disponível", d: "O motor cruza dados do confronto e sinaliza uma oportunidade." },
  { n: "02", t: "Oportunidade identificada", d: "A entrada é organizada com mercado, odd e contexto." },
  { n: "03", t: "Mercado monitorado", d: "O evento fica ativo e visível até o apito final." },
  { n: "04", t: "Resultado confirmado", d: "Green ou red — o status muda na hora, pra todo mundo ver." },
  { n: "05", t: "Dados atualizados", d: "O histórico e os resultados são recalculados automaticamente." },
  { n: "06", t: "Resultado em 30 dias", d: "A assertividade do período fica pública, sempre atualizada." },
];

const AGENT_ICONS: Record<string, React.ReactNode> = {
  jogos: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  ),
  stats: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" />
    </svg>
  ),
  odds: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 5L5 19" strokeLinecap="round" />
      <circle cx="7" cy="7" r="2.3" />
      <circle cx="17" cy="17" r="2.3" />
    </svg>
  ),
  historico: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  oportunidade: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </svg>
  ),
};

const AGENTES = [
  { id: "jogos", label: "Jogos do dia", verbo: "Buscando jogos do dia" },
  { id: "stats", label: "Estatísticas", verbo: "Cruzando estatísticas das equipes" },
  { id: "odds", label: "Odds do mercado", verbo: "Puxando odds do mercado" },
  { id: "historico", label: "Histórico", verbo: "Consultando histórico de confrontos" },
  { id: "oportunidade", label: "Oportunidades", verbo: "Mapeando oportunidades de valor" },
] as const;

type AgentId = (typeof AGENTES)[number]["id"];

// Duração (ms) de cada etapa — uma por agente (0..4) mais a etapa final de correlação no
// núcleo (5). Variada de propósito, pra não parecer um metrônomo.
const STEP_DURATIONS = [950, 800, 1050, 900, 1150, 1000];

const FAQ_RAPIDO = [
  {
    p: "A Nexus Tips promete lucro?",
    r: "Não, e desconfie de quem promete. Entregamos análise, contexto e histórico público — a decisão e o risco são sempre seus.",
  },
  {
    p: "Vocês mexem na minha banca ou no meu dinheiro?",
    r: "Nunca. A Nexus não movimenta nada — você aposta na casa que quiser e só marca a operação aqui pra acompanhar o resultado.",
  },
  {
    p: "Se eu não gostar, como cancelo?",
    r: "Um botão, dentro do próprio painel, sem ligação, sem justificativa. Sem fidelidade em nenhum plano.",
  },
  {
    p: "Por que confiar mais na Nexus do que num grupo de Telegram?",
    r: "Porque não dá pra apagar um red aqui. Todo sinal publicado fica registrado e entra na conta do histórico público — inclusive os que erram.",
  },
];

const PILAR_ICONS = [
  <svg key="0" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" strokeLinecap="round" /></svg>,
  <svg key="1" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></svg>,
  <svg key="2" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><circle cx="16" cy="14.5" r="1.3" fill="currentColor" stroke="none" /></svg>,
  <svg key="3" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" strokeLinejoin="round" /><path d="M8.5 12l2.3 2.3L16 9" strokeLinecap="round" strokeLinejoin="round" /></svg>,
];

const Check = ({ className = "" }: { className?: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={`flex-none mt-0.5 text-success ${className}`}>
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XMark = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="flex-none mt-0.5 text-danger">
    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
  </svg>
);

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="flex-none transition-transform group-hover:translate-x-0.5">
    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function SectionHead({
  eyebrow,
  title,
  sub,
  tone = "blue",
  center = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "blue" | "red" | "green";
  center?: boolean;
}) {
  const toneCls =
    tone === "red"
      ? "!text-danger !border-danger/30 !bg-danger/10"
      : tone === "green"
      ? "!text-success !border-success/30 !bg-success/10"
      : "";
  const dot = tone === "red" ? "!bg-danger !shadow-[0_0_12px_#FF4D6D]" : tone === "green" ? "!bg-success !shadow-[0_0_12px_#14E3A0]" : "";
  return (
    <Reveal className={`max-w-2xl ${center ? "mx-auto text-center flex flex-col items-center" : ""}`}>
      <span className={`eyebrow ${toneCls}`}>
        <span className={`eyebrow-dot ${dot}`} />
        {eyebrow}
      </span>
      <h2 className="font-display text-[34px] md:text-[48px] font-semibold leading-[1.04] tracking-[-0.03em] mt-5">{title}</h2>
      {sub && <p className="text-text2 text-[15px] md:text-base leading-relaxed mt-4 max-w-xl">{sub}</p>}
    </Reveal>
  );
}

// Linha do tempo que se "acende" conforme a seção é rolada.
function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const k = (vh * 0.65 - r.top) / r.height;
        setP(Math.max(0, Math.min(1, k)));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return { ref, p };
}

function Gauge({ value }: { value: number }) {
  const size = 220;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ref = useRef<SVGCircleElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <div className="absolute inset-4 rounded-full bg-success/20 blur-3xl" />
      <div className="absolute inset-0 rounded-full animate-spin-slow" style={{ background: "conic-gradient(from 0deg, transparent, rgba(20,227,160,.25), transparent 30%)" }} />
      <svg width={size} height={size} className="-rotate-90 relative">
        <defs>
          <linearGradient id="gauge-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#33D6F5" />
            <stop offset="100%" stopColor="#14E3A0" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(120,145,220,.12)" strokeWidth={stroke} />
        <circle
          ref={ref}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#gauge-g)"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={on ? c - (value / 100) * c : c}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 2s cubic-bezier(.2,.8,.2,1)", filter: "drop-shadow(0 0 10px rgba(20,227,160,.6))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUp to={value} decimals={1} suffix="%" className="font-display text-[44px] font-semibold leading-none tracking-tight" />
        <span className="text-[10px] font-bold text-text2 tracking-[0.2em] mt-2">ASSERTIVIDADE · 30D</span>
      </div>
    </div>
  );
}

function FaqItem({ p, r, i }: { p: string; r: string; i: number }) {
  const [open, setOpen] = useState(i === 0);
  return (
    <Reveal delay={i * 80}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`card w-full text-left px-6 py-5 group ${open ? "!border-primary/40" : ""}`}
        aria-expanded={open}
      >
        <div className="flex items-center justify-between gap-4">
          <span className="text-[15px] font-semibold">{p}</span>
          <span
            className={`w-8 h-8 flex-none rounded-full border border-border flex items-center justify-center transition-all duration-300 ${
              open ? "rotate-45 bg-primary/15 border-primary/50 text-text" : "text-text2"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </span>
        </div>
        <div className="grid transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
          <div className="overflow-hidden">
            <p className="text-[14px] text-text2 leading-relaxed pt-3 pr-10">{r}</p>
          </div>
        </div>
      </button>
    </Reveal>
  );
}

export default function LandingPage() {
  const [demoStage, setDemoStage] = useState<"idle" | "loading" | "result">("idle");
  const [demoIndex, setDemoIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [pinnedId, setPinnedId] = useState<AgentId | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const demo = DEMO_SIGNALS[demoIndex];
  const heroRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLElement | null)[]>([]);
  const [isDesktop, setIsDesktop] = useState(true);
  const timeline = useScrollProgress<HTMLDivElement>();

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setIsDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      mq.removeEventListener("change", on);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // O "loading" é o motor de correlação: os 5 agentes acendem um de cada vez — no 3D e
  // no painel — e depois tem a etapa final de correlação no núcleo (índice 5).
  useEffect(() => {
    if (demoStage !== "loading") return;
    const dur = STEP_DURATIONS[Math.min(stepIndex, STEP_DURATIONS.length - 1)];
    if (stepIndex >= AGENTES.length) {
      const t = setTimeout(() => setDemoStage("result"), dur);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStepIndex((i) => i + 1), dur);
    return () => clearTimeout(t);
  }, [demoStage, stepIndex]);

  useEffect(() => {
    if (!pinnedId) return;
    const t = setTimeout(() => setPinnedId(null), 3200);
    return () => clearTimeout(t);
  }, [pinnedId]);

  function startDemo() {
    setStepIndex(0);
    setPinnedId(null);
    setDemoStage("loading");
  }

  function nextDemo() {
    setDemoIndex((i) => (i + 1) % DEMO_SIGNALS.length);
    startDemo();
  }

  const step3d = demoStage === "loading" ? stepIndex : demoStage === "result" ? 5 : -1;
  const agentState = (i: number) =>
    demoStage === "result" ? "done" : demoStage !== "loading" ? "pending" : i < stepIndex ? "done" : i === stepIndex ? "active" : "pending";

  return (
    <div className="min-h-screen bg-bg text-text overflow-x-hidden">
      {/* NAV flutuante */}
      <div className="sticky top-0 z-40 px-3 md:px-6 pt-3">
        <nav
          className={`mx-auto max-w-6xl flex items-center justify-between rounded-2xl px-4 md:px-5 transition-all duration-500 ${
            scrolled
              ? "py-2.5 bg-[rgba(8,12,28,0.72)] border border-white/[0.08] backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,.8)]"
              : "py-3.5 bg-transparent border border-transparent"
          }`}
        >
          <Logo size={28} />
          <div className="hidden md:flex items-center gap-1 text-[13px] font-medium text-text2">
            {[
              ["#comparacao", "Por que a Nexus"],
              ["#como-funciona", "Como funciona"],
              ["#resultados", "Resultados"],
              ["#planos", "Planos"],
              ["#faq", "Dúvidas"],
            ].map(([h, l]) => (
              <a key={h} href={h} className="px-3.5 py-2 rounded-lg hover:text-text hover:bg-white/[0.05] transition-colors">
                {l}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-text2 hover:text-text text-sm font-semibold px-3 py-2">
              Entrar
            </Link>
            <Link href="/cadastro" className="btn-primary text-sm px-4 md:px-5 py-2.5">
              Criar conta
            </Link>
          </div>
        </nav>
      </div>

      {/* HERO 3D */}
      <section ref={heroRef} className="relative -mt-[72px] pt-[72px] min-h-[100svh] flex flex-col">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(79,123,255,.18),transparent_60%)]" />
          <div className="nx-grid opacity-60" />
        </div>

        {/* Cena 3D + labels ancorados nos agentes */}
        <div className="absolute inset-0">
          <NexusCore
            className={`absolute inset-0 transition-opacity duration-700 ${isDesktop ? "" : "opacity-60"}`}
            step={step3d}
            complete={demoStage === "result"}
            offsetX={isDesktop ? 2.5 : 0}
            offsetY={isDesktop ? 0.55 : 0.6}
            scale={isDesktop ? 0.92 : 0.72}
            particles={isDesktop ? 2600 : 1400}
            labelRefs={labelRefs}
            eventSource={heroRef}
            onAgentClick={(i) => setPinnedId(AGENTES[i].id)}
          />
          <div className="absolute inset-0 pointer-events-none hidden lg:block">
            {AGENTES.map((a, i) => {
              const st = agentState(i);
              const pinned = pinnedId === a.id;
              return (
                <div
                  key={a.id}
                  ref={(el) => {
                    labelRefs.current[i] = el;
                  }}
                  className="absolute left-0 top-0 transition-opacity duration-300"
                  style={{ willChange: "transform" }}
                >
                  <div
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10.5px] font-semibold backdrop-blur-md transition-all duration-300 ${
                      pinned
                        ? "border-info/60 bg-info/15 text-info"
                        : st === "active"
                        ? "border-info/50 bg-info/10 text-info scale-110"
                        : st === "done"
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-white/10 bg-white/[0.04] text-text2"
                    }`}
                  >
                    <span className="opacity-90">{AGENT_ICONS[a.id]}</span>
                    {a.label}
                  </div>
                  {(pinned || st === "active") && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-56 text-center text-[10.5px] leading-snug text-text2 bg-[rgba(6,10,24,.85)] border border-white/10 rounded-lg px-2.5 py-1.5 backdrop-blur-md animate-fade-up">
                      {demoStage === "idle" && !pinned ? a.verbo : demo.agentFindings[a.id]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center max-w-7xl w-full mx-auto px-5 md:px-10 pt-16 md:pt-24 pb-10 gap-10 pointer-events-none">
          <div className="flex-1 max-w-2xl flex flex-col gap-6 pointer-events-auto">
            <div className="animate-fade-up">
              <span className="eyebrow">
                <span className="eyebrow-dot" />
                Inteligência esportiva
              </span>
            </div>
            <h1
              className="font-display text-[44px] sm:text-[60px] lg:text-[76px] font-semibold leading-[0.98] tracking-[-0.045em] animate-fade-up"
              style={{ animationDelay: "80ms" }}
            >
              Tipster esconde red.
              <br />
              <span className="text-gradient">Nós publicamos</span>{" "}
              <span className="font-serif italic font-normal tracking-[-0.02em] text-text">todos.</span>
            </h1>
            <p className="text-text2 text-base md:text-[18px] leading-relaxed max-w-xl animate-fade-up" style={{ animationDelay: "160ms" }}>
              A Nexus Tips organiza contexto, mostra o porquê de cada sinal e mantém o histórico 100% público — greens e
              reds, sem esconder nada. Você decide, gerencia sua própria banca e nunca fica no escuro.
            </p>
            <div className="flex flex-wrap gap-3 items-center animate-fade-up" style={{ animationDelay: "240ms" }}>
              <Magnetic>
                <Link href="/cadastro" className="btn-primary group text-[15px] px-7 py-4 inline-flex items-center gap-2">
                  Quero ver os resultados agora
                  <Arrow />
                </Link>
              </Magnetic>
              <a href="#planos" className="btn-ghost text-[15px] px-6 py-4 inline-flex items-center">
                Ver planos
              </a>
            </div>
            <div className="flex flex-col sm:flex-row gap-x-6 gap-y-2 animate-fade-up" style={{ animationDelay: "320ms" }}>
              <div className="flex items-center gap-2 text-[13px] text-text2">
                <Check /> Banca 100% sua, sempre
              </div>
              <div className="flex items-center gap-2 text-[13px] text-text2">
                <Check /> Sem fidelidade — cancele no painel
              </div>
            </div>
          </div>

          {/* DEMO — painel de vidro que controla o núcleo 3D */}
          <div className="w-full lg:w-[360px] lg:self-end lg:mb-4 pointer-events-auto animate-fade-up" style={{ animationDelay: "400ms" }}>
            <div
              className={`card p-5 transition-all duration-500 ${
                demoStage === "result" ? "glow-border" : demoStage === "loading" ? "!border-info/40" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${demoStage === "loading" ? "bg-info animate-pulse" : demoStage === "result" ? "bg-success" : "bg-muted"}`} />
                  <span className="text-[10.5px] font-bold tracking-[0.18em] text-text2">
                    {demoStage === "idle" ? "MOTOR NEXUS · EM ESPERA" : demoStage === "loading" ? "CORRELACIONANDO DADOS" : "SINAL APROVADO"}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-muted bg-white/[0.05] border border-white/10 px-1.5 py-0.5 rounded">DEMO</span>
              </div>

              {demoStage === "idle" && (
                <div className="flex flex-col gap-4">
                  <p className="text-[13px] text-text2 leading-relaxed">
                    Ative o motor e veja os 5 agentes cruzarem jogos, estatísticas, odds e histórico até encontrar um sinal
                    com valor. <span className="text-text">Clique no núcleo</span> pra sentir a energia.
                  </p>
                  <button onClick={startDemo} className="btn-primary group text-sm py-3.5 px-6 inline-flex items-center justify-center gap-2">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
                    </svg>
                    Procurar uma oportunidade
                  </button>
                </div>
              )}

              {demoStage === "loading" && (
                <div className="flex flex-col gap-2">
                  {AGENTES.map((a, i) => {
                    const st = agentState(i);
                    return (
                      <button
                        key={a.id}
                        onClick={() => setPinnedId(a.id)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-all duration-300 border ${
                          st === "active"
                            ? "bg-info/10 border-info/40"
                            : st === "done"
                            ? "bg-success/[0.06] border-success/20"
                            : "bg-white/[0.02] border-white/[0.05]"
                        }`}
                      >
                        <span className={`flex-none ${st === "active" ? "text-info" : st === "done" ? "text-success" : "text-muted"}`}>
                          {AGENT_ICONS[a.id]}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`block text-[12px] font-semibold ${st === "pending" ? "text-muted" : "text-text"}`}>{a.label}</span>
                          {st !== "pending" && <span className="block text-[10.5px] text-text2 truncate">{demo.agentFindings[a.id]}</span>}
                        </span>
                        {st === "done" && <Check />}
                        {st === "active" && <span className="w-3.5 h-3.5 rounded-full border-2 border-info/30 border-t-info animate-spin flex-none" />}
                      </button>
                    );
                  })}
                  <div className="h-[3px] bg-white/[0.06] rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary via-info to-success"
                      style={{ width: `${((Math.min(stepIndex, AGENTES.length) + 1) / (AGENTES.length + 1)) * 100}%`, transition: "width 500ms ease" }}
                    />
                  </div>
                  {stepIndex >= AGENTES.length && (
                    <div className="text-[11px] text-info text-center mt-1 animate-pulse">Correlacionando no núcleo…</div>
                  )}
                </div>
              )}

              {demoStage === "result" && (
                <div className="animate-fade-up">
                  <div className="text-[10px] text-muted font-semibold tracking-[0.12em]">{demo.comp}</div>
                  <div className="flex items-end justify-between gap-3 mt-1.5">
                    <div className="min-w-0">
                      <div className="font-display text-xl font-semibold leading-tight">
                        {demo.timeA} <span className="text-muted font-normal">x</span> {demo.timeB}
                      </div>
                      <div className="text-[13px] text-text2 mt-1">{demo.mercado}</div>
                    </div>
                    <div className="flex-none text-right">
                      <div className="text-[9px] font-bold text-info tracking-widest">ODD</div>
                      <div className="font-mono text-[28px] font-semibold leading-none text-gradient">{demo.odd}</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/[0.07]">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="text-[10px] font-bold tracking-[0.14em] text-primary">POR QUE FOI APROVADO</span>
                      <span className="text-[9.5px] font-semibold text-text2 bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded-full">
                        {demo.estrategia}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-text2 leading-relaxed">{demo.rationale}</p>
                  </div>
                  <button onClick={nextDemo} className="btn-outline w-full text-[13px] py-2.5 mt-4">
                    Ver outro exemplo
                  </button>
                  <div className="text-[10px] text-muted text-center mt-2.5">Exemplo ilustrativo — não é recomendação de aposta.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* faixa de métricas do hero */}
        <div className="relative z-10 max-w-7xl w-full mx-auto px-5 md:px-10 pb-10">
          <div className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/[0.07] bg-white/[0.05] backdrop-blur-xl max-w-2xl">
            {[
              { v: <CountUp to={94.8} decimals={1} suffix="%" />, l: "assertividade 30d" },
              { v: <CountUp to={142} />, l: "sinais publicados" },
              { v: <CountUp to={100} suffix="%" />, l: "histórico público" },
            ].map((s, i) => (
              <div key={i} className="bg-[rgba(6,10,24,.6)] px-4 md:px-6 py-4">
                <div className="font-display text-xl md:text-[26px] font-semibold tracking-tight">{s.v}</div>
                <div className="text-[10.5px] md:text-[11px] text-muted mt-0.5 uppercase tracking-wider">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="relative border-y border-white/[0.06] bg-white/[0.015] overflow-hidden py-4 [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
        <div className="marquee-track flex w-max gap-10">
          {[...Array(2)].flatMap((_, k) =>
            [...DEMO_SIGNALS, ...DEMO_SIGNALS].map((s, i) => (
              <div key={`${k}-${i}`} className="flex items-center gap-3 text-[13px] whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-info shadow-[0_0_8px_#33D6F5]" />
                <span className="text-muted font-semibold text-[11px] tracking-wider">{s.comp.split("·")[0]}</span>
                <span className="font-semibold">
                  {s.timeA} x {s.timeB}
                </span>
                <span className="text-text2">{s.mercado}</span>
                <span className="font-mono text-info">@{s.odd}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* COMPARAÇÃO */}
      <section id="comparacao" className="relative px-5 md:px-10 py-24 md:py-32 max-w-7xl mx-auto">
        <SectionHead
          eyebrow="O problema"
          tone="red"
          title={
            <>
              A maioria dos grupos de tips vive de <span className="font-serif italic font-normal">sorte</span> e edição de print.
            </>
          }
          sub="Green vem com captura de tela enorme, red simplesmente some da conversa. Não tem como conferir nada. A Nexus foi construída pra ser o oposto disso."
        />

        <div className="grid md:grid-cols-2 gap-5 mt-14" style={{ perspective: "1400px" }}>
          <Reveal>
            <TiltCard className="card p-7 md:p-8 h-full opacity-80 hover:opacity-100 !bg-[rgba(30,10,20,.35)] !border-danger/15">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-danger tracking-[0.2em]">TIPSTER COMUM</span>
                <span className="w-9 h-9 rounded-full bg-danger/10 border border-danger/25 flex items-center justify-center">
                  <XMark />
                </span>
              </div>
              <div className="mt-6 flex flex-col divide-y divide-white/[0.05]">
                {COMPARACAO.map((c) => (
                  <div key={c.ponto} className="py-3.5 flex flex-col gap-1">
                    <span className="text-[10.5px] text-muted font-semibold tracking-wider uppercase">{c.ponto}</span>
                    <span className="flex gap-2 text-[14px] text-text2 line-through decoration-danger/40">
                      <XMark />
                      {c.ruim}
                    </span>
                  </div>
                ))}
              </div>
            </TiltCard>
          </Reveal>
          <Reveal delay={120}>
            <TiltCard className="card glow-border p-7 md:p-8 h-full !bg-[rgba(14,22,52,.7)] shadow-[0_30px_80px_-30px_rgba(79,123,255,.55)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-info tracking-[0.2em]">NEXUS TIPS</span>
                <span className="w-9 h-9 rounded-full bg-success/10 border border-success/30 flex items-center justify-center">
                  <Check className="!mt-0" />
                </span>
              </div>
              <div className="mt-6 flex flex-col divide-y divide-white/[0.06]">
                {COMPARACAO.map((c) => (
                  <div key={c.ponto} className="py-3.5 flex flex-col gap-1">
                    <span className="text-[10.5px] text-muted font-semibold tracking-wider uppercase">{c.ponto}</span>
                    <span className="flex gap-2 text-[14px] text-text">
                      <Check />
                      {c.bom}
                    </span>
                  </div>
                ))}
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </section>

      {/* PILARES */}
      <section className="relative px-5 md:px-10 py-20 max-w-7xl mx-auto">
        <SectionHead
          eyebrow="Metodologia"
          title="Como a Nexus chega numa entrada"
          sub="Tecnologia, precisão, controle e confiança — não é slogan, é a ordem em que cada sinal é montado."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {PILARES.map((p, i) => (
            <Reveal key={p.titulo} delay={i * 90}>
              <TiltCard className="card p-6 h-full group">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-info bg-gradient-to-br from-primary/25 to-accent/10 border border-primary/25 shadow-[0_0_30px_-8px_rgba(79,123,255,.7)] group-hover:scale-110 transition-transform duration-500">
                    {PILAR_ICONS[i]}
                  </div>
                  <span className="font-display text-[54px] font-semibold leading-none text-transparent [-webkit-text-stroke:1px_rgba(120,145,220,.25)] select-none">
                    0{i + 1}
                  </span>
                </div>
                <div className="font-display font-semibold text-[17px] tracking-wide mt-6">{p.titulo}</div>
                <p className="text-text2 text-[13.5px] leading-relaxed mt-2">{p.texto}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ETAPAS — linha do tempo que acende com o scroll */}
      <section id="como-funciona" className="relative px-5 md:px-10 py-24 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-14">
          <div className="lg:sticky lg:top-32 self-start">
            <SectionHead
              eyebrow="Do clique ao resultado"
              title="O que você acompanha, do primeiro clique em diante"
              sub="Cada etapa do sinal fica visível — sem caixa-preta."
            />
            <Reveal delay={150} className="mt-10">
              <div className="border-l-2 border-primary pl-5">
                <p className="font-serif italic text-[26px] leading-snug text-text">
                  “A Nexus Tips entrega inteligência para decisão. Não vende certeza.”
                </p>
              </div>
            </Reveal>
          </div>
          <div ref={timeline.ref} className="relative pl-10">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-white/[0.08]" />
            <div
              className="absolute left-[15px] top-2 w-px bg-gradient-to-b from-primary via-info to-success shadow-[0_0_12px_rgba(51,214,245,.8)]"
              style={{ height: `calc(${timeline.p * 100}% - 16px)` }}
            />
            <div className="flex flex-col gap-4">
              {ETAPAS.map((e, i) => {
                const lit = timeline.p >= (i + 0.3) / ETAPAS.length;
                return (
                  <Reveal key={e.t} delay={i * 60}>
                    <div className="relative">
                      <span
                        className={`absolute -left-10 top-5 w-[31px] h-[31px] rounded-full flex items-center justify-center border font-mono text-[10px] font-bold transition-all duration-500 ${
                          lit
                            ? "bg-primary/20 border-info text-info shadow-[0_0_20px_rgba(51,214,245,.6)]"
                            : "bg-bg border-white/10 text-muted"
                        }`}
                      >
                        {e.n}
                      </span>
                      <div className={`card px-6 py-5 transition-all duration-500 ${lit ? "!border-primary/30 translate-x-1" : ""}`}>
                        <div className="text-[15px] font-semibold">{e.t}</div>
                        <div className="text-[13.5px] text-text2 mt-1 leading-relaxed">{e.d}</div>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* RESULTADOS */}
      <section id="resultados" className="relative px-5 md:px-10 py-24 md:py-32 max-w-7xl mx-auto">
        <div className="absolute -bottom-10 left-1/3 w-[520px] h-[520px] bg-success opacity-[0.07] blur-[130px] rounded-full pointer-events-none" />
        <SectionHead
          eyebrow="Resultados sem caixa-preta"
          tone="green"
          title="Números calculados em cima do que foi publicado — não do que sobrou."
          sub="Tudo abaixo é sobre os sinais encerrados nos últimos 30 dias. Sem projeção, sem promessa — histórico verificável, aberto pra qualquer pessoa, assinante ou não."
        />
        <Reveal delay={100} className="mt-12">
          <TiltCard max={4} className="card p-8 md:p-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            <Gauge value={94.8} />
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
                <div className="text-[10.5px] font-bold text-text2 tracking-[0.16em]">SINAIS PUBLICADOS · 30D</div>
                <div className="font-display text-5xl font-semibold mt-3 tracking-tight">
                  <CountUp to={142} />
                </div>
                <div className="text-[12px] text-muted mt-2">Volume de análises entregues no período.</div>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
                <div className="text-[10.5px] font-bold text-text2 tracking-[0.16em]">GREENS / REDS · 30D</div>
                <div className="font-display text-5xl font-semibold mt-3 tracking-tight">
                  <CountUp to={121} className="text-success" />
                  <span className="text-muted text-2xl"> / </span>
                  <CountUp to={21} className="text-danger" />
                </div>
                <div className="mt-3 h-2 rounded-full bg-danger/30 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-info to-success rounded-full" style={{ width: `${(121 / 142) * 100}%` }} />
                </div>
              </div>
              <p className="sm:col-span-2 text-[13px] text-text2 leading-relaxed">
                As 21 operações com red estão contadas aqui — do mesmo jeito que os 121 greens. É assim que um histórico
                público funciona: mostra tudo, não só a parte boa.
              </p>
            </div>
          </TiltCard>
        </Reveal>
      </section>

      {/* PLANO ÚNICO */}
      <section id="planos" className="relative px-5 md:px-10 py-24 md:py-32 max-w-7xl mx-auto">
        <SectionHead
          center
          eyebrow="Nexus PRO"
          title={
            <>
              Um plano. <span className="text-gradient">Tudo liberado.</span>
            </>
          }
          sub="Sem tabela confusa, sem fidelidade. Assine, acompanhe os sinais com o porquê de cada um e gerencie sua própria banca — cancele quando quiser."
        />
        <Reveal delay={100} className="max-w-xl mx-auto mt-14" >
          <TiltCard max={5} className="card glow-border p-8 md:p-10 !bg-[rgba(16,24,58,.78)] shadow-[0_40px_100px_-30px_rgba(79,123,255,.6)]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold tracking-[0.2em] text-text2">NEXUS PRO · MENSAL</div>
              <span className="text-[10.5px] font-bold tracking-wider text-success bg-success/10 border border-success/30 rounded-full px-3 py-1">SEM FIDELIDADE</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-5">
              <span className="text-text2 text-xl">R$</span>
              <span className="font-display text-[64px] font-semibold tracking-tight leading-none">{PLANOS.mensal.valor.toFixed(2).replace(".", ",")}</span>
              <span className="text-[14px] text-muted">/mês</span>
            </div>
            <div className="text-xs text-muted mt-2">Pix Automático ou cartão · renovação mensal · cancele com um clique</div>
            <div className="hairline my-7" />
            <div className="flex flex-col gap-3.5">
              {[
                "Sala ao Vivo: todos os sinais em tempo real, com contagem regressiva",
                "Raio-X de cada sinal — o que os agentes encontraram e os riscos",
                "Gestão de banca, regras de disciplina e cockpit de resultados",
                "Histórico 100% público: greens e reds, sem filtro",
              ].map((it) => (
                <div key={it} className="text-[14.5px] text-text2 flex gap-2.5">
                  <Check />
                  {it}
                </div>
              ))}
            </div>
            <Link href="/cadastro" className="btn-primary group w-full text-[15px] py-4 mt-8 inline-flex items-center justify-center gap-2">
              Começar agora
              <Arrow />
            </Link>
            <p className="text-[11px] text-muted text-center mt-3">Crie sua conta grátis e assine pelo painel. +18 · Apostas envolvem risco.</p>
          </TiltCard>
        </Reveal>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative px-5 md:px-10 py-20 max-w-4xl mx-auto">
        <SectionHead center eyebrow="Dúvidas" title="Antes de você perguntar" sub="As dúvidas que mais aparecem antes de alguém assinar — sem enrolação." />
        <div className="flex flex-col gap-3 mt-12">
          {FAQ_RAPIDO.map((f, i) => (
            <FaqItem key={f.p} p={f.p} r={f.r} i={i} />
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative px-5 md:px-10 py-24 max-w-7xl mx-auto">
        <Reveal>
          <div className="card glow-border relative overflow-hidden px-7 py-16 md:p-20 text-center flex flex-col items-center !bg-[rgba(10,16,40,.8)]">
            {/* anéis orbitais em CSS 3D */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ perspective: "900px" }}>
              {[340, 520, 720].map((s, i) => (
                <div
                  key={s}
                  className="absolute rounded-full border border-primary/20"
                  style={{
                    width: s,
                    height: s,
                    transform: `rotateX(72deg)`,
                    boxShadow: "0 0 40px rgba(79,123,255,.15) inset",
                    animation: `nx-spin-${i % 2 ? "b" : "a"} ${18 + i * 8}s linear infinite`,
                  }}
                />
              ))}
              <div className="w-[380px] h-[380px] rounded-full bg-primary/20 blur-[100px]" />
            </div>
            <div className="relative flex flex-col items-center gap-5">
              <h2 className="font-display text-[34px] md:text-[56px] font-semibold max-w-3xl leading-[1.02] tracking-[-0.035em]">
                Sua banca, suas regras.
                <br />
                <span className="text-gradient">Nosso histórico, público.</span>
              </h2>
              <p className="text-text2 text-[15px] md:text-base max-w-md">
                Criar conta é grátis e leva menos de um minuto — você só paga quando decidir liberar os eventos completos.
              </p>
              <Magnetic>
                <Link href="/cadastro" className="btn-primary group text-[15px] px-9 py-4 mt-2 inline-flex items-center gap-2">
                  Criar conta grátis agora
                  <Arrow />
                </Link>
              </Magnetic>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] px-5 md:px-10 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size={24} />
          <div className="text-muted text-[13px]">Nexus Tips — Inteligência esportiva. Não vendemos certeza.</div>
          <div className="flex gap-5 text-[13px] text-text2">
            <Link href="/login" className="hover:text-text">Entrar</Link>
            <Link href="/cadastro" className="hover:text-text">Criar conta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
