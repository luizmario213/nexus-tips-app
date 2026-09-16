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

  // O "loading" não é mais um spinner genérico — é uma esteira de etapas que aparece uma
  // de cada vez, simulando o motor de verdade: procura o jogo, acha a oportunidade,
  // cruza dados das equipes, filtra e só then entrega a análise. Reforça na demo o que a
  // Nexus faz de fato antes de publicar um sinal.
  const pipeline = [
    { label: "Buscando jogos do dia" },
    { label: "Oportunidade encontrada", detail: `${demo.timeA} x ${demo.timeB}` },
    { label: "Analisando dados das equipes" },
    { label: "Cruzando contexto e histórico" },
    { label: "Filtrando por valor esperado" },
    { label: "Sinal aprovado", detail: demo.estrategia },
  ];

  useEffect(() => {
    if (demoStage !== "loading") return;
    if (stepIndex >= pipeline.length - 1) {
      const t = setTimeout(() => setDemoStage("result"), 550);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStepIndex((i) => i + 1), 380);
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
            <div className="relative card p-7 w-full max-w-[360px] shadow-2xl">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[11px] font-bold tracking-wide text-info">{demo.comp}</div>
                <span className="text-[9px] font-bold text-muted bg-elevated px-2 py-0.5 rounded">DEMO</span>
              </div>
              <div className="mt-3 text-xl font-bold">{demo.timeA}</div>
              <div className="text-muted text-sm my-0.5">x</div>
              <div className="text-xl font-bold">{demo.timeB}</div>
              <div className="h-px bg-border my-5" />
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[11px] text-muted uppercase tracking-wide">Mercado</div>
                  <div className="text-[15px] font-semibold mt-1.5">{demo.mercado}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-muted uppercase tracking-wide">Odd</div>
                  <div className="font-mono text-2xl font-semibold mt-0.5">{demo.odd}</div>
                </div>
              </div>

              {demoStage === "idle" && (
                <button onClick={startDemo} className="btn-primary w-full text-sm py-3.5 mt-5">
                  Ver a análise por trás do sinal
                </button>
              )}

              {demoStage === "loading" && (
                <div className="mt-5 bg-elevated rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-bold tracking-widest text-primary">
                      MOTOR NEXUS ANALISANDO
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {pipeline.map((step, i) => {
                      const state = i < stepIndex ? "done" : i === stepIndex ? "active" : "pending";
                      return (
                        <div
                          key={step.label}
                          className={`flex items-center gap-2.5 transition-opacity duration-300 ${
                            state === "pending" ? "opacity-30" : "opacity-100"
                          }`}
                        >
                          <span className="w-4 h-4 flex-none flex items-center justify-center">
                            {state === "done" && (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success">
                                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                            {state === "active" && (
                              <span className="w-[13px] h-[13px] rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
                            )}
                            {state === "pending" && <span className="w-1.5 h-1.5 rounded-full bg-muted" />}
                          </span>
                          <span
                            className={`text-[12.5px] ${
                              state === "active"
                                ? "font-semibold text-text"
                                : state === "done"
                                ? "text-text2"
                                : "text-muted"
                            }`}
                          >
                            {step.label}
                            {step.detail && state !== "pending" && (
                              <span className="text-muted"> — {step.detail}</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {demoStage === "result" && (
                <>
                  <div className="mt-4.5 bg-primary/[0.08] border border-primary/30 rounded-[10px] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold tracking-wide text-primary">
                        POR QUE ESSE SINAL FOI APROVADO
                      </span>
                      <span className="text-[9.5px] font-bold text-muted bg-elevated px-2 py-1 rounded">
                        {demo.estrategia}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-text2 leading-relaxed mt-2.5">{demo.rationale}</p>
                  </div>
                  <button onClick={nextDemo} className="btn-outline w-full text-[13px] py-3 mt-3">
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
