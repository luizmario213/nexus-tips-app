"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PerfilRisco } from "@/lib/types";
import { SUGESTAO_PERFIL } from "@/lib/disciplina";
import { AmbientBackground, NexusCore } from "@/components/fx";

// =====================================================================================
// ONBOARDING PERSONALIZADO — aparece no primeiro acesso (tutorial_completo = false) ou
// quando a URL tem ?tour=1 (refazer a personalização). Coleta time do coração, ligas
// favoritas, perfil de risco e banca, e já propõe as regras de disciplina do perfil.
// As ligas favoritas sobem pro topo da Sala ao Vivo.
// =====================================================================================

const TIMES = [
  "Flamengo", "Palmeiras", "Corinthians", "São Paulo", "Grêmio", "Internacional", "Atlético-MG", "Vasco", "Fluminense",
  "Botafogo", "Cruzeiro", "Santos", "Bahia", "Sport", "Fortaleza", "Ceará", "Athletico-PR", "Coritiba", "Bragantino",
  "Goiás", "Vitória", "Criciúma", "Cuiabá", "Juventude", "Real Madrid", "Barcelona", "Manchester City", "Liverpool",
  "Manchester United", "Chelsea", "PSG", "Bayern de Munique", "Juventus",
];

const LIGAS = [
  { nome: "Brasileirão", flag: "🇧🇷" },
  { nome: "Premier League", flag: "🏴" },
  { nome: "La Liga", flag: "🇪🇸" },
  { nome: "Serie A", flag: "🇮🇹" },
  { nome: "Bundesliga", flag: "🇩🇪" },
  { nome: "Ligue 1", flag: "🇫🇷" },
  { nome: "Champions League", flag: "⭐" },
  { nome: "Libertadores", flag: "🏆" },
  { nome: "Copa do Brasil", flag: "🇧🇷" },
  { nome: "Sul-Americana", flag: "🌎" },
];

const PASSOS = ["Boas-vindas", "Seu time", "Suas ligas", "Seu perfil", "Sua banca", "Pronto"];

export function OnboardingTutorial() {
  const supabase = createClient();
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [nome, setNome] = useState("");

  const [teamQuery, setTeamQuery] = useState("");
  const [team, setTeam] = useState<string | null>(null);
  const [ligas, setLigas] = useState<string[]>([]);
  const [perfil, setPerfil] = useState<PerfilRisco>("moderado");
  const [banca, setBanca] = useState("500");
  const [ativarRegras, setAtivarRegras] = useState(true);

  useEffect(() => {
    (async () => {
      const forcar = new URLSearchParams(window.location.search).get("tour") === "1";
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("name, tutorial_completo, time_coracao, banca_inicial, perfil_risco, ligas_favoritas")
        .eq("id", user.id)
        .single();
      if (!data) return;
      if (data.tutorial_completo && !forcar) return;
      setNome((data.name || "").split(" ")[0]);
      if (data.time_coracao) setTeam(data.time_coracao);
      if (data.banca_inicial) setBanca(String(data.banca_inicial));
      if (data.perfil_risco) setPerfil(data.perfil_risco);
      if (data.ligas_favoritas?.length) setLigas(data.ligas_favoritas);
      setShow(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  if (!show) return null;

  const bancaNum = parseFloat(banca.replace(",", "."));
  const sug = SUGESTAO_PERFIL[perfil];
  const limite = !isNaN(bancaNum) ? Math.round((bancaNum * sug.limitePct) / 100) : null;
  const stop = !isNaN(bancaNum) ? Math.round((bancaNum * sug.stopPct) / 100) : null;
  const entrada = !isNaN(bancaNum) ? (bancaNum * sug.entradaPct) / 100 : null;
  const isLast = step === PASSOS.length - 1;

  async function finish() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({
          tutorial_completo: true,
          ...(team ? { time_coracao: team } : {}),
          banca_inicial: isNaN(bancaNum) ? null : bancaNum,
          perfil_risco: perfil,
          ligas_favoritas: ligas,
          ...(ativarRegras && limite && stop ? { limite_diario: limite, stop_diario: stop, regras_desde: new Date().toISOString() } : {}),
        })
        .eq("id", user.id);
    }
    setSaving(false);
    setShow(false);
    if (window.location.search.includes("tour=1")) window.history.replaceState(null, "", window.location.pathname);
    router.refresh();
  }

  const next = () => (isLast ? finish() : setStep((s) => s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const filtered = teamQuery ? TIMES.filter((t) => t.toLowerCase().includes(teamQuery.toLowerCase())) : TIMES;
  const custom = teamQuery.trim() && !TIMES.some((t) => t.toLowerCase() === teamQuery.trim().toLowerCase());

  return (
    <div className="fixed inset-0 z-[60] bg-bg flex flex-col overflow-y-auto">
      <AmbientBackground variant="auth" />
      <div className="absolute inset-y-0 right-0 w-1/2 hidden lg:block pointer-events-none">
        <NexusCore className="absolute inset-0" scale={0.95} particles={1600} step={step - 1} complete={isLast} />
      </div>

      {/* topo: progresso */}
      <div className="relative z-10 flex items-center gap-4 px-6 md:px-12 pt-6">
        <div className="flex-1 flex gap-1.5 max-w-md">
          {PASSOS.map((p, i) => (
            <div key={p} className="flex-1 h-1 rounded-full bg-white/[0.08] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-info transition-all duration-500" style={{ width: i <= step ? "100%" : "0%" }} />
            </div>
          ))}
        </div>
        <span className="text-[11px] text-muted font-semibold whitespace-nowrap">
          {step + 1} de {PASSOS.length} · {PASSOS[step]}
        </span>
        {!isLast && (
          <button onClick={() => setStep(PASSOS.length - 1)} className="text-[12px] text-text2 hover:text-text font-semibold ml-auto">
            Pular
          </button>
        )}
      </div>

      <div className="relative z-10 flex-1 flex items-center px-6 md:px-12 py-10">
        <div key={step} className="w-full max-w-xl animate-fade-up">
          {step === 0 && (
            <>
              <span className="eyebrow">
                <span className="eyebrow-dot" />
                Bem-vindo à Nexus
              </span>
              <h1 className="font-display text-[40px] md:text-[56px] font-semibold tracking-[-0.04em] leading-[1.02] mt-5">
                {nome ? `${nome}, vamos` : "Vamos"} montar o <span className="text-gradient">seu painel</span>.
              </h1>
              <p className="text-text2 text-base md:text-lg mt-4 leading-relaxed">
                Quatro perguntas rápidas pra Nexus destacar o que importa pra você e já deixar sua gestão de banca no lugar. Leva menos de um minuto.
              </p>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="font-display text-[34px] md:text-[44px] font-semibold tracking-[-0.035em] leading-tight">Qual é o seu time do coração?</h2>
              <p className="text-text2 mt-2">Os jogos dele ganham destaque no seu painel.</p>
              <input className="input-field mt-6 text-base" placeholder="Buscar time…" value={teamQuery} onChange={(e) => setTeamQuery(e.target.value)} autoFocus />
              <div className="flex flex-wrap gap-2 mt-4 max-h-[260px] overflow-y-auto pr-1">
                {custom && (
                  <Chip on={team === teamQuery.trim()} onClick={() => setTeam(teamQuery.trim())}>
                    + {teamQuery.trim()}
                  </Chip>
                )}
                {filtered.map((t) => (
                  <Chip key={t} on={team === t} onClick={() => setTeam(team === t ? null : t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-display text-[34px] md:text-[44px] font-semibold tracking-[-0.035em] leading-tight">Quais ligas você acompanha?</h2>
              <p className="text-text2 mt-2">Sinais dessas ligas sobem pro topo da Sala ao Vivo. Escolha quantas quiser.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-6">
                {LIGAS.map((l) => {
                  const on = ligas.includes(l.nome);
                  return (
                    <button
                      key={l.nome}
                      onClick={() => setLigas(on ? ligas.filter((x) => x !== l.nome) : [...ligas, l.nome])}
                      className={`relative rounded-2xl border px-4 py-3.5 text-left transition-all duration-300 hover:-translate-y-0.5 ${
                        on ? "border-info/60 bg-info/10 shadow-[0_0_30px_-10px_rgba(51,214,245,.8)]" : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
                      }`}
                    >
                      <span className="text-[22px]">{l.flag}</span>
                      <div className="text-[13.5px] font-semibold mt-1">{l.nome}</div>
                      {on && <span className="absolute top-3 right-3 text-info text-sm">✓</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-display text-[34px] md:text-[44px] font-semibold tracking-[-0.035em] leading-tight">Como você gosta de operar?</h2>
              <p className="text-text2 mt-2">Define as sugestões de limite e stop. Dá pra mudar quando quiser em Disciplina.</p>
              <div className="flex flex-col gap-2.5 mt-6">
                {(Object.keys(SUGESTAO_PERFIL) as PerfilRisco[]).map((p) => {
                  const s = SUGESTAO_PERFIL[p];
                  const on = perfil === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPerfil(p)}
                      className={`flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-300 ${
                        on ? "border-primary/60 bg-primary/10 shadow-[0_0_40px_-14px_rgba(79,123,255,.9)]" : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full border-2 flex-none flex items-center justify-center ${on ? "border-primary" : "border-white/20"}`}>
                        {on && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </span>
                      <span className="flex-1">
                        <span className="block text-[15px] font-semibold">{s.label}</span>
                        <span className="block text-[12.5px] text-text2 mt-0.5">{s.desc}</span>
                      </span>
                      <span className="text-[11px] text-muted text-right whitespace-nowrap">
                        entrada {s.entradaPct}%
                        <br />
                        limite {s.limitePct}%/dia
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="font-display text-[34px] md:text-[44px] font-semibold tracking-[-0.035em] leading-tight">Qual sua banca inicial?</h2>
              <p className="text-text2 mt-2">É o valor que você separou pra operar. A Gestão calcula tudo a partir dele.</p>
              <div className="relative mt-6">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl text-muted font-mono">R$</span>
                <input
                  className="input-field !pl-14 !py-5 !text-[32px] font-display font-semibold"
                  inputMode="decimal"
                  value={banca}
                  onChange={(e) => setBanca(e.target.value.replace(/[^0-9.,]/g, ""))}
                  autoFocus
                />
              </div>
              {limite !== null && stop !== null && entrada !== null && bancaNum > 0 && (
                <div className="card p-5 mt-5 !bg-[rgba(10,16,38,.7)]">
                  <div className="text-[10.5px] font-bold tracking-[0.16em] text-accent">REGRAS SUGERIDAS · {sug.label.toUpperCase()}</div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {[
                      { l: "Entrada", v: entrada },
                      { l: "Limite/dia", v: limite },
                      { l: "Stop/dia", v: stop },
                    ].map((k) => (
                      <div key={k.l}>
                        <div className="text-[10.5px] text-muted">{k.l}</div>
                        <div className="font-mono text-[18px] font-semibold">R$ {k.v.toFixed(0)}</div>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-3 mt-4 cursor-pointer select-none">
                    <span className={`relative w-10 h-6 rounded-full transition-colors flex-none ${ativarRegras ? "bg-primary" : "bg-white/10"}`}>
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${ativarRegras ? "left-5" : "left-1"}`} />
                    </span>
                    <input type="checkbox" className="sr-only" checked={ativarRegras} onChange={(e) => setAtivarRegras(e.target.checked)} />
                    <span className="text-[13px] text-text2">Ativar limite e stop agora (recomendado)</span>
                  </label>
                </div>
              )}
            </>
          )}

          {step === 5 && (
            <>
              <span className="eyebrow !text-success !border-success/30 !bg-success/10">
                <span className="eyebrow-dot !bg-success !shadow-[0_0_12px_#14E3A0]" />
                Tudo pronto
              </span>
              <h2 className="font-display text-[40px] md:text-[52px] font-semibold tracking-[-0.04em] leading-[1.02] mt-5">
                Seu painel está <span className="text-gradient">no ar</span>.
              </h2>
              <div className="flex flex-col gap-2.5 mt-7">
                {[
                  { i: "⚡", t: "Sala ao Vivo", d: ligas.length ? `${ligas.slice(0, 3).join(", ")}${ligas.length > 3 ? "…" : ""} aparecem primeiro.` : "Os sinais no ar, com contagem regressiva." },
                  { i: "👁", t: "Raio-X", d: "Abra qualquer sinal e veja o que cada agente encontrou — e por que pode dar errado." },
                  { i: "🛡", t: "Disciplina", d: ativarRegras && limite ? `Limite de R$ ${limite}/dia e stop de R$ ${stop} já ativos.` : "Defina limite, stop e pausa quando quiser." },
                ].map((x, i) => (
                  <div key={x.t} className="flex items-start gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 animate-fade-up" style={{ animationDelay: `${150 + i * 100}ms` }}>
                    <span className="text-xl">{x.i}</span>
                    <div>
                      <div className="text-[14px] font-semibold">{x.t}</div>
                      <div className="text-[12.5px] text-text2 mt-0.5">{x.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-3 mt-9">
            {step > 0 && (
              <button onClick={back} className="btn-ghost text-sm px-5 py-3.5">
                Voltar
              </button>
            )}
            <button onClick={next} disabled={saving} className="btn-primary text-[15px] px-8 py-3.5">
              {saving ? "Salvando…" : step === 0 ? "Começar" : isLast ? "Entrar no painel" : "Continuar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition-all ${
        on ? "border-info/60 bg-info/15 text-info shadow-[0_0_20px_-8px_rgba(51,214,245,.9)]" : "border-white/[0.08] bg-white/[0.03] text-text2 hover:text-text hover:border-white/20"
      }`}
    >
      {on && "✓ "}
      {children}
    </button>
  );
}
