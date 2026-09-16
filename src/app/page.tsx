"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PLANOS } from "@/lib/types";
import { Logo } from "@/components/Logo";

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

// Motor de correlação exibido na demo do hero: um núcleo central ("IA Nexus") e 5 agentes
// satélite, cada um puxando uma fonte de dado diferente. As posições são coordenadas fixas
// num círculo de raio ENGINE_RADIUS ao redor de ENGINE_CENTER — geometria de um pentágono
// regular, calculada uma vez e reaproveitada tanto pros nós quanto pras linhas de conexão.
const ENGINE_CENTER = { x: 150, y: 116 };
const ENGINE_RADIUS = 80;

const AGENTES = [
  { id: "jogos", label: "Jogos do dia", angle: -90 },
  { id: "stats", label: "Estatísticas", angle: -18 },
  { id: "odds", label: "Odds do mercado", angle: 54 },
  { id: "historico", label: "Histórico", angle: 126 },
  { id: "oportunidade", label: "Oportunidades", angle: 198 },
] as const;

function agentPos(angle: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: ENGINE_CENTER.x + ENGINE_RADIUS * Math.cos(rad),
    y: ENGINE_CENTER.y + ENGINE_RADIUS * Math.sin(rad),
  };
}

// Uma legenda por etapa — sincronizada com o índice que acende cada agente (as 5 primeiras)
// mais uma etapa final de correlação no núcleo, antes de revelar a análise.
const CAPTIONS = [
  "Varrendo os jogos do dia…",
  "Cruzando estatísticas das equipes…",
  "Puxando as odds do mercado…",
  "Consultando histórico de confrontos…",
  "Mapeando oportunidades de valor…",
  "Correlacionando tudo — sinal aprovado…",
];

const AGENT_ICONS: Record<(typeof AGENTES)[number]["id"], React.ReactNode> = {
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

// SVG do "cérebro" — um chip/núcleo, não um desenho literal de cérebro, pra ficar
// consistente com a linha visual técnica do resto do produto (sem ilustração fofa).
const ChipIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <path
      d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"
      strokeLinecap="round"
    />
  </svg>
);

// O diagrama de correlação em si: núcleo central pulsando + 5 agentes ao redor, com a
// linha de cada um "se desenhando" até o centro conforme ele entra em `stepIndex`. Cada
// linha usa stroke-dasharray igual ao próprio comprimento e anima o dashoffset até 0 —
// truque clássico de "desenhar" uma linha em CSS sem depender de nenhuma lib externa.
function CorrelationEngine({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="bg-elevated rounded-lg p-4">
      <svg viewBox="0 0 300 232" className="w-full h-auto select-none" aria-hidden>
        {AGENTES.map((agent, i) => {
          const pos = agentPos(agent.angle);
          const length = Math.hypot(ENGINE_CENTER.x - pos.x, ENGINE_CENTER.y - pos.y);
          const state = i < stepIndex ? "done" : i === stepIndex ? "active" : "pending";
          const connected = state !== "pending";
          return (
            <line
              key={`line-${agent.id}`}
              x1={pos.x}
              y1={pos.y}
              x2={ENGINE_CENTER.x}
              y2={ENGINE_CENTER.y}
              stroke={connected ? "#2563EB" : "#1C2940"}
              strokeWidth={connected ? 1.6 : 1.2}
              strokeDasharray={length}
              strokeDashoffset={connected ? 0 : length}
              style={{ transition: "stroke-dashoffset 550ms ease, stroke 300ms ease" }}
            />
          );
        })}

        {/* Núcleo — chip central com anel pulsando enquanto o motor trabalha. */}
        <circle
          cx={ENGINE_CENTER.x}
          cy={ENGINE_CENTER.y}
          r={26}
          fill="#2563EB"
          opacity={0.15}
          className="animate-ping"
          style={{ transformOrigin: `${ENGINE_CENTER.x}px ${ENGINE_CENTER.y}px` }}
        />
        <circle cx={ENGINE_CENTER.x} cy={ENGINE_CENTER.y} r={22} fill="#0D1728" stroke="#2563EB" strokeWidth={1.6} />
        <foreignObject x={ENGINE_CENTER.x - 11} y={ENGINE_CENTER.y - 11} width="22" height="22">
          <div className="w-full h-full flex items-center justify-center text-primary">
            <ChipIcon />
          </div>
        </foreignObject>

        {AGENTES.map((agent, i) => {
          const pos = agentPos(agent.angle);
          const state = i < stepIndex ? "done" : i === stepIndex ? "active" : "pending";
          const ringColor = state === "done" ? "#16C784" : state === "active" ? "#2563EB" : "#1C2940";
          const iconColor = state === "pending" ? "text-muted" : state === "active" ? "text-primary" : "text-success";
          return (
            <g key={`node-${agent.id}`}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={17}
                fill="#0D1728"
                stroke={ringColor}
                strokeWidth={1.6}
                className={state === "active" ? "animate-pulse" : ""}
                style={{ transition: "stroke 300ms ease" }}
              />
              <foreignObject x={pos.x - 9} y={pos.y - 9} width="18" height="18">
                <div className={`w-full h-full flex items-center justify-center ${iconColor}`} style={{ transition: "color 300ms ease" }}>
                  {AGENT_ICONS[agent.id]}
                </div>
              </foreignObject>
              <text
                x={pos.x}
                y={pos.y + 29}
                textAnchor="middle"
                fontSize="9"
                fontWeight={700}
                fill={state === "pending" ? "#66758A" : "#9AA8BC"}
                style={{ transition: "fill 300ms ease" }}
              >
                {agent.label.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center gap-2 mt-1">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-none" />
        <span className="text-[12px] font-semibold text-text2">{CAPTIONS[stepIndex]}</span>
      </div>
      <div className="h-[3px] bg-bg rounded-full mt-2.5 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{
            width: `${((stepIndex + 1) / CAPTIONS.length) * 100}%`,
            transition: "width 400ms ease",
          }}
        />
      </div>
    </div>
  );
}

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

const Check = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    className="flex-none mt-0.5 text-success"
  >
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XMark = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    className="flex-none mt-0.5 text-danger"
  >
    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
  </svg>
);

function AssertividadeGaugeMarketing({ value }: { value: number }) {
  const size = 172;
  const stroke = 13;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1C2940" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#16C784"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[32px] font-bold leading-none">{value.toFixed(1).replace(".", ",")}%</span>
        <span className="text-[9.5px] font-semibold text-text2 tracking-wide mt-1.5">ASSERTIVIDADE · 30D</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [demoStage, setDemoStage] = useState<"idle" | "loading" | "result">("idle");
  const [demoIndex, setDemoIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const demo = DEMO_SIGNALS[demoIndex];

  // O "loading" virou o motor de correlação: os 5 agentes (jogos, estatísticas, odds,
  // histórico, oportunidades) acendem um de cada vez — CAPTIONS.length é 6 porque depois
  // dos 5 agentes ainda tem uma última etapa de "correlacionando no núcleo" antes de
  // revelar a análise.
  useEffect(() => {
    if (demoStage !== "loading") return;
    if (stepIndex >= CAPTIONS.length - 1) {
      const t = setTimeout(() => setDemoStage("result"), 650);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStepIndex((i) => i + 1), 480);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoStage, stepIndex]);

  function startDemo() {
    setStepIndex(0);
    setDemoStage("loading");
  }

  function nextDemo() {
    setDemoIndex((i) => (i + 1) % DEMO_SIGNALS.length);
    setStepIndex(0);
    setDemoStage("loading");
  }

  return (
    <div className="min-h-screen bg-bg text-text overflow-x-hidden">
      {/* NAV */}
      <div className="flex items-center justify-between px-6 md:px-16 py-5 border-b border-border sticky top-0 z-20 bg-bg/90 backdrop-blur">
        <Logo size={30} />
        <div className="hidden md:flex items-center gap-7 text-[13px] font-semibold text-text2">
          <a href="#comparacao" className="hover:text-text transition-colors">Por que a Nexus</a>
          <a href="#resultados" className="hover:text-text transition-colors">Resultados</a>
          <a href="#planos" className="hover:text-text transition-colors">Planos</a>
          <a href="#faq" className="hover:text-text transition-colors">Dúvidas</a>
        </div>
        <div className="flex items-center gap-3.5">
          <Link href="/login" className="text-text2 hover:text-text text-sm font-semibold px-2 sm:px-4 py-2.5">
            Entrar
          </Link>
          <Link href="/cadastro" className="btn-primary text-sm px-5 py-2.5">
            Criar conta
          </Link>
        </div>
      </div>

      {/* URGÊNCIA */}
      <div className="bg-warning/10 border-b border-warning/30">
        <div className="px-6 md:px-16 py-2.5 flex items-center justify-center gap-2 text-center">
          <span className="w-[7px] h-[7px] rounded-full bg-warning animate-pulse flex-none" />
          <span className="text-[12px] font-bold text-warning">
            LANÇAMENTO — 48h pra travar o plano mensal em R$ {PLANOS.mensal.valor.toFixed(2)} (depois vai pra R$ {PLANOS.mensal.valorPadrao.toFixed(2)})
          </span>
        </div>
      </div>

      {/* HERO */}
      <div className="relative">
        <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-primary opacity-[0.10] blur-[120px] rounded-full pointer-events-none" />
        <div className="relative flex flex-col md:flex-row items-center gap-12 md:gap-16 px-6 md:px-16 py-16 md:py-20">
          <div className="flex-1 flex flex-col gap-5">
            <div className="inline-flex items-center gap-2 bg-surface border border-border rounded-md px-3 py-1.5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[11px] font-bold tracking-widest text-info">
                INTELIGÊNCIA ESPORTIVA
              </span>
            </div>
            <h1 className="text-4xl md:text-[54px] font-bold leading-[1.08] tracking-tight">
              Tipster esconde red.<br />
              <span className="text-primary">Nós publicamos todos.</span>
            </h1>
            <p className="text-text2 text-base md:text-[17px] leading-relaxed max-w-lg">
              A Nexus Tips organiza contexto, mostra o porquê de cada sinal e mantém o
              histórico 100% público — greens e reds, sem esconder nada. Você decide,
              gerencia sua própria banca e nunca fica no escuro.
            </p>
            <div className="flex flex-wrap gap-3.5 items-center mt-1.5">
              <Link href="/cadastro" className="btn-primary text-[15px] px-6 py-3.5">
                Quero ver os resultados agora
              </Link>
              <a href="#planos" className="btn-outline text-[15px] px-6 py-3.5 inline-flex items-center">
                Ver planos
              </a>
            </div>
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex items-center gap-2">
                <Check />
                <span className="text-[12.5px] text-text2">
                  Sem gestão do seu dinheiro pela Nexus Tips — a banca é 100% sua, sempre.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Check />
                <span className="text-[12.5px] text-text2">
                  Sem fidelidade — cancela quando quiser, direto pelo painel.
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex justify-center relative w-full">
            <div className="absolute top-5 w-72 h-72 bg-primary opacity-[0.16] blur-[60px] rounded-full pointer-events-none" />
            {/* Esse card usa literalmente a mesma linguagem visual do card de sinal de
                verdade (ver src/app/dashboard/eventos/page.tsx: eyebrow + jogo numa linha só
                + pill de status + chip mono da odd) — de propósito, pra não parecer um
                mockup inventado só pra demo. */}
            <div
              className={`relative card p-5 w-full max-w-[380px] transition-colors ${
                demoStage === "result"
                  ? "border-l-2 border-l-info"
                  : demoStage === "loading"
                  ? "border-l-2 border-l-primary"
                  : ""
              }`}
            >
              {demoStage !== "result" && (
                <span className="absolute top-4 right-4 text-[9px] font-bold text-muted bg-elevated px-1.5 py-0.5 rounded z-10">
                  DEMO
                </span>
              )}

              {demoStage === "idle" && (
                <div className="flex flex-col items-center text-center gap-3.5 py-5">
                  <div className="w-11 h-11 rounded-full bg-elevated border border-border flex items-center justify-center">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text2">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold">Nenhuma oportunidade selecionada</div>
                    <p className="text-xs text-text2 mt-1.5 max-w-[250px] leading-relaxed">
                      Clique e deixe o motor cruzar jogos, estatísticas, odds e histórico até
                      encontrar um sinal com valor.
                    </p>
                  </div>
                  <button
                    onClick={startDemo}
                    className="btn-primary text-sm py-3 px-6 mt-1 inline-flex items-center gap-2"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="flex-none">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
                    </svg>
                    Procurar uma oportunidade
                  </button>
                </div>
              )}

              {demoStage === "loading" && <CorrelationEngine stepIndex={stepIndex} />}

              {demoStage === "result" && (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-bold text-muted bg-elevated px-1.5 py-0.5 rounded flex-none">
                          DEMO
                        </span>
                        <span className="text-[10px] text-muted font-semibold tracking-wide">{demo.comp}</span>
                      </div>
                      <div className="text-sm font-bold mt-1">
                        {demo.timeA} x {demo.timeB}
                      </div>
                      <div className="text-xs text-text2 mt-1">
                        <span className="font-semibold text-text">{demo.mercado}</span>
                      </div>
                    </div>
                    <div className="flex-none flex flex-col items-end gap-1.5">
                      <span className="text-[10px] font-bold tracking-wide rounded-full px-2.5 py-1 border whitespace-nowrap bg-info/10 border-info text-info">
                        NO AR
                      </span>
                      <span className="bg-elevated border border-border rounded-md px-2.5 py-1 font-mono text-base font-semibold">
                        {demo.odd}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3.5 border-t border-border">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="text-[10.5px] font-bold tracking-wide text-primary">
                        POR QUE ESSE SINAL FOI APROVADO
                      </span>
                      <span className="text-[9.5px] font-bold text-muted bg-elevated px-2 py-1 rounded flex-none">
                        {demo.estrategia}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-text2 leading-relaxed">{demo.rationale}</p>
                  </div>

                  <button onClick={nextDemo} className="btn-outline w-full text-[13px] py-2.5 mt-3.5">
                    Ver outro exemplo
                  </button>
                  <div className="text-[10.5px] text-muted text-center mt-2.5">
                    Exemplo ilustrativo do produto — não é recomendação de aposta.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* COMPARAÇÃO — o ângulo mais persuasivo: nomear o inimigo */}
      <div id="comparacao" className="px-6 md:px-16 py-14 md:py-20 border-t border-border">
        <div className="max-w-2xl mb-9">
          <div className="inline-flex items-center gap-2 bg-danger/10 border border-danger/30 rounded-md px-3 py-1.5 w-fit mb-4">
            <span className="text-[11px] font-bold tracking-widest text-danger">O PROBLEMA</span>
          </div>
          <h2 className="text-[28px] md:text-[32px] font-bold leading-tight mb-3">
            A maioria dos grupos de tips vive de sorte e edição de print.
          </h2>
          <p className="text-text2 text-[15px] leading-relaxed">
            Você já viu: green vem com captura de tela enorme, red simplesmente some da
            conversa. Não tem como conferir nada. A Nexus foi construída pra ser o
            oposto disso.
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px] grid grid-cols-[1.2fr_1fr_1fr] gap-px bg-border rounded-xl overflow-hidden border border-border">
            <div className="bg-bg2 p-4">
              <span className="text-[11px] font-bold text-muted tracking-wide">CRITÉRIO</span>
            </div>
            <div className="bg-bg2 p-4">
              <span className="text-[11px] font-bold text-danger tracking-wide">TIPSTER COMUM</span>
            </div>
            <div className="bg-primary/10 p-4">
              <span className="text-[11px] font-bold text-primary tracking-wide">NEXUS TIPS</span>
            </div>
            {COMPARACAO.map((c) => (
              <>
                <div key={`${c.ponto}-l`} className="bg-surface p-4 flex items-center">
                  <span className="text-sm font-semibold">{c.ponto}</span>
                </div>
                <div key={`${c.ponto}-r`} className="bg-surface p-4 flex items-start gap-2">
                  <XMark />
                  <span className="text-[13px] text-text2 leading-snug">{c.ruim}</span>
                </div>
                <div key={`${c.ponto}-n`} className="bg-primary/[0.04] p-4 flex items-start gap-2">
                  <Check />
                  <span className="text-[13px] leading-snug">{c.bom}</span>
                </div>
              </>
            ))}
          </div>
        </div>
      </div>

      {/* PILARES */}
      <div className="px-6 md:px-16 py-14 border-t border-border">
        <h2 className="text-[23px] font-bold mb-1.5">Como a Nexus chega numa entrada</h2>
        <p className="text-text2 text-sm mb-7 max-w-lg">
          Tecnologia, precisão, controle e confiança — não é slogan, é a ordem em que cada
          sinal é montado.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4.5">
          {PILARES.map((p, i) => (
            <div key={p.titulo} className="card p-5.5 relative overflow-hidden">
              <span className="absolute -right-2 -top-3 text-[52px] font-bold text-elevated select-none leading-none">
                {i + 1}
              </span>
              <div className="relative flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="font-bold text-[13px] tracking-wide">{p.titulo}</span>
              </div>
              <p className="relative text-text2 text-[13px] leading-relaxed mt-2.5">{p.texto}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ETAPAS */}
      <div className="px-6 md:px-16 py-14 border-t border-border">
        <h2 className="text-[23px] font-bold mb-1.5">
          O que você acompanha, do primeiro clique em diante
        </h2>
        <p className="text-text2 text-sm mb-7">
          Cada etapa do sinal fica visível — sem caixa-preta.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {ETAPAS.map((e) => (
            <div key={e.t} className="card px-5 py-4.5 flex items-start gap-3.5">
              <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 rounded-md px-1.5 py-0.5 flex-none mt-0.5">
                {e.n}
              </span>
              <div>
                <div className="text-[13.5px] font-bold">{e.t}</div>
                <div className="text-[12px] text-text2 mt-0.5 leading-snug">{e.d}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 border-l-2 border-primary pl-4.5">
          <p className="text-lg font-semibold leading-relaxed">
            &quot;A Nexus Tips entrega inteligência para decisão. Não vende certeza.&quot;
          </p>
        </div>
      </div>

      {/* RESULTADOS (prova pública) */}
      <div id="resultados" className="px-6 md:px-16 py-14 md:py-20 border-t border-border relative overflow-hidden">
        <div className="absolute -bottom-24 left-1/3 w-[480px] h-[480px] bg-success opacity-[0.06] blur-[120px] rounded-full pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-success/10 border border-success/30 rounded-md px-3 py-1.5 w-fit mb-4">
            <span className="text-[11px] font-bold tracking-widest text-success">RESULTADOS, SEM CAIXA-PRETA</span>
          </div>
          <h2 className="text-[26px] md:text-[30px] font-bold mb-2 max-w-xl">
            Números calculados em cima do que foi publicado — não do que sobrou.
          </h2>
          <p className="text-text2 text-sm mb-8 max-w-lg">
            Tudo abaixo é sobre os sinais encerrados na plataforma nos últimos 30 dias.
            Sem projeção, sem promessa — é o histórico verificável, aberto pra qualquer
            pessoa, assinante ou não.
          </p>

          <div className="flex flex-col lg:flex-row items-center gap-10 bg-surface border border-border rounded-2xl p-7 md:p-9">
            <AssertividadeGaugeMarketing value={94.8} />
            <div className="flex-1 grid grid-cols-2 gap-6 w-full">
              <div>
                <div className="text-xs font-semibold text-text2">SINAIS PUBLICADOS · 30 DIAS</div>
                <div className="text-[11px] text-muted mt-1">Volume de análises entregues no período.</div>
                <div className="font-mono text-3xl font-semibold mt-2.5">142</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-text2">GREENS / REDS · 30 DIAS</div>
                <div className="text-[11px] text-muted mt-1">Resultado bruto de tudo que foi encerrado.</div>
                <div className="font-mono text-3xl font-semibold mt-2.5">
                  <span className="text-success">121</span>
                  <span className="text-muted text-lg"> / </span>
                  <span className="text-danger">21</span>
                </div>
              </div>
              <div className="col-span-2 pt-2 border-t border-border">
                <p className="text-[12px] text-text2 leading-relaxed">
                  As 21 operações com red estão contadas aqui — do mesmo jeito que os 121
                  greens. É assim que um histórico público funciona: mostra tudo, não só
                  a parte boa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div id="planos" className="px-6 md:px-16 py-14 md:py-20 border-t border-border pb-20">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1.5">
          <div>
            <h2 className="text-[23px] font-bold mb-1.5">Planos de assinatura</h2>
            <p className="text-text2 text-sm">
              Assine, acompanhe os eventos monitorados e gerencie sua própria banca — sem
              fidelidade, cancele quando quiser.
            </p>
          </div>
          <div className="inline-flex items-center gap-2.5 bg-warning/10 border border-warning rounded-lg px-4 py-2.5">
            <span className="w-[7px] h-[7px] rounded-full bg-warning animate-pulse" />
            <span className="text-[12.5px] font-bold text-warning">
              OFERTA DE LANÇAMENTO — 48H para travar o mensal por R$ {PLANOS.mensal.valor.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 mt-6">
          {/* MENSAL */}
          <div className="card p-7 flex flex-col">
            <div className="text-xs font-bold tracking-wide text-text2">MENSAL</div>
            <div className="flex items-baseline gap-2 mt-3">
              <div className="font-mono text-3xl font-semibold">
                R$ {PLANOS.mensal.valor.toFixed(2)}
                <span className="text-[13px] text-muted font-sans">/mês</span>
              </div>
            </div>
            <div className="text-xs text-muted mt-1">
              de <span className="line-through">R$ {PLANOS.mensal.valorPadrao.toFixed(2)}</span> —
              válido para quem assinar nas primeiras 48h de lançamento
            </div>
            <div className="h-px bg-border my-5" />
            <div className="flex flex-col gap-2.5 flex-1">
              <div className="text-sm text-text2 flex gap-2">
                <Check />
                Eventos ao vivo liberados
              </div>
              <div className="text-sm text-text2 flex gap-2">
                <Check />
                Gestão automática da banca
              </div>
              <div className="text-sm text-text2 flex gap-2">
                <Check />
                Histórico e resultados completos
              </div>
            </div>
            <Link href="/cadastro" className="btn-outline w-full text-sm py-3.5 mt-5 text-center">
              Garantir por R$ {PLANOS.mensal.valor.toFixed(2)}
            </Link>
          </div>

          {/* ANUAL destaque */}
          <div className="card p-7 flex flex-col relative border-primary shadow-[0_12px_40px_rgba(37,99,235,0.18)]">
            <div className="absolute -top-3 left-7 bg-primary text-white text-[10.5px] font-bold px-3 py-1.5 rounded-md">
              MELHOR CUSTO-BENEFÍCIO
            </div>
            <div className="text-xs font-bold tracking-wide text-text2">ANUAL</div>
            <div className="flex items-baseline gap-2 mt-3">
              <div className="font-mono text-3xl font-semibold">
                R$ {PLANOS.anual.valor.toFixed(2)}
                <span className="text-[13px] text-muted font-sans">/ano</span>
              </div>
            </div>
            <div className="text-xs text-muted mt-1">equivalente a R$ 58,16/mês</div>
            <div className="inline-flex w-fit mt-2.5 bg-success/10 border border-success rounded px-2.5 py-1 text-[11.5px] font-bold text-success">
              Economize R$ 476,90 vs. mensal
            </div>
            <div className="h-px bg-border my-5" />
            <div className="flex flex-col gap-2.5 flex-1">
              <div className="text-sm text-text2 flex gap-2">
                <Check />
                Tudo do plano mensal
              </div>
              <div className="text-sm text-text2 flex gap-2">
                <Check />
                Preço travado por 12 meses
              </div>
              <div className="text-sm text-text2 flex gap-2">
                <Check />
                Maior economia entre os planos
              </div>
            </div>
            <Link href="/cadastro" className="btn-primary w-full text-sm py-3.5 mt-5 text-center">
              Assinar plano anual
            </Link>
          </div>

          {/* SEMESTRAL */}
          <div className="card p-7 flex flex-col">
            <div className="text-xs font-bold tracking-wide text-text2">SEMESTRAL</div>
            <div className="flex items-baseline gap-2 mt-3">
              <div className="font-mono text-3xl font-semibold">
                R$ {PLANOS.semestral.valor.toFixed(2)}
                <span className="text-[13px] text-muted font-sans">/6 meses</span>
              </div>
            </div>
            <div className="text-xs text-muted mt-1">equivalente a R$ 66,32/mês</div>
            <div className="inline-flex w-fit mt-2.5 bg-success/10 border border-success rounded px-2.5 py-1 text-[11.5px] font-bold text-success">
              Economize R$ 189,50 vs. mensal
            </div>
            <div className="h-px bg-border my-5" />
            <div className="flex flex-col gap-2.5 flex-1">
              <div className="text-sm text-text2 flex gap-2">
                <Check />
                Tudo do plano mensal
              </div>
              <div className="text-sm text-text2 flex gap-2">
                <Check />
                Preço travado por 6 meses
              </div>
            </div>
            <Link href="/cadastro" className="btn-outline w-full text-sm py-3.5 mt-5 text-center">
              Assinar plano semestral
            </Link>
          </div>
        </div>
        <div className="text-[11.5px] text-muted mt-4">
          Após as primeiras 48h de lançamento, o plano mensal passa a custar R${" "}
          {PLANOS.mensal.valorPadrao.toFixed(2)}/mês — os valores acima do semestral e anual
          usam esse preço cheio como referência de comparação.
        </div>
      </div>

      {/* FAQ RÁPIDO / QUEBRA DE OBJEÇÃO */}
      <div id="faq" className="px-6 md:px-16 py-14 border-t border-border">
        <h2 className="text-[23px] font-bold mb-1.5">Antes de você perguntar</h2>
        <p className="text-text2 text-sm mb-7 max-w-lg">
          As dúvidas que mais aparecem antes de alguém assinar — sem enrolação.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FAQ_RAPIDO.map((f) => (
            <div key={f.p} className="card p-5">
              <div className="text-sm font-bold">{f.p}</div>
              <p className="text-[13px] text-text2 leading-relaxed mt-2">{f.r}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA FINAL */}
      <div className="px-6 md:px-16 py-16 border-t border-border">
        <div className="card relative overflow-hidden p-9 md:p-12 text-center flex flex-col items-center gap-4">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary opacity-[0.14] blur-[100px] rounded-full pointer-events-none" />
          <div className="relative flex flex-col items-center gap-4">
            <h2 className="text-2xl md:text-[32px] font-bold max-w-xl leading-tight">
              Sua banca, suas regras. Nosso histórico, público.
            </h2>
            <p className="text-text2 text-[15px] max-w-md">
              Criar conta é grátis e leva menos de um minuto — você só paga quando decidir
              liberar os eventos completos.
            </p>
            <Link href="/cadastro" className="btn-primary text-[15px] px-8 py-4 mt-1">
              Criar conta grátis agora
            </Link>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="border-t border-border px-6 md:px-16 py-7">
        <div className="text-muted text-sm">Nexus Tips — Inteligência esportiva.</div>
      </div>
    </div>
  );
}
