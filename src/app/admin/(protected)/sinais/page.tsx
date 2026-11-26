"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Signal, SignalLeg, SignalTipo, SugestaoTipo } from "@/lib/types";
import { SignalXRay } from "@/components/SignalXRay";
import { fmtOdd, probImplicita, recorte, type SinalEncerrado } from "@/lib/insights";

type SignalRow = Signal & { signal_legs: SignalLeg[] };
type StatusFiltro = "todos" | "no_ar" | "live" | "green" | "red" | "cancelado";

const ESTRATEGIAS = ["Valor esperado", "Overreaction de mercado", "Modelo estatístico", "Live trading"];

const SUGESTAO_LABELS: Record<SugestaoTipo, string> = {
  percentual: "% da banca",
  unidades: "Unidades",
  valor: "Valor fixo (R$)",
};

const STATUS_DOT: Record<string, string> = {
  green: "bg-success",
  red: "bg-danger",
  no_ar: "bg-info",
  cancelado: "bg-muted",
};

const FILTROS: { key: StatusFiltro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "no_ar", label: "No ar" },
  { key: "live", label: "Ao vivo" },
  { key: "green", label: "Green" },
  { key: "red", label: "Red" },
  { key: "cancelado", label: "Cancelado" },
];

interface LegForm {
  competicao: string;
  time_a: string;
  time_b: string;
  mercado: string;
  odd: string;
}

const EMPTY_LEG: LegForm = { competicao: "", time_a: "", time_b: "", mercado: "", odd: "" };

export default function AdminSinaisPage() {
  const supabase = createClient();
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>("todos");

  const [tipo, setTipo] = useState<SignalTipo>("simples");
  const [form, setForm] = useState({
    competicao: "",
    time_a: "",
    time_b: "",
    mercado: "",
    odd: "",
    estrategia: ESTRATEGIAS[0],
    rationale: "",
    live: false,
    horarioJogo: "",
  });
  const [bilheteTitulo, setBilheteTitulo] = useState("");
  const [legs, setLegs] = useState<LegForm[]>([{ ...EMPTY_LEG }, { ...EMPTY_LEG }]);

  // Direcionamento pra casa de apostas e sugestão de entrada — valem tanto pra sinal
  // simples quanto pra bilhete, por isso ficam fora do "form"/"legs" específicos de cada um.
  const [casaNome, setCasaNome] = useState("");
  const [casaLink, setCasaLink] = useState("");
  const [defaultCasa, setDefaultCasa] = useState({ nome: "", link: "" });
  const [sugestaoTipo, setSugestaoTipo] = useState<SugestaoTipo | "nenhuma">("nenhuma");
  // Raio-X (opcional): alimenta a tela de análise detalhada do usuário. Tudo que ficar
  // vazio é substituído por dado real calculado pelo sistema — nunca por número inventado.
  const RAIOX_VAZIO = { aberto: false, confianca: "", odd_abertura: "", riscos: "", jogos: "", stats: "", odds: "", historico: "", oportunidade: "" };
  const [raiox, setRaiox] = useState(RAIOX_VAZIO);
  const [sugestaoValor, setSugestaoValor] = useState("");
  const [previewXray, setPreviewXray] = useState(false);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const [{ data }, { data: settings }] = await Promise.all([
        supabase.from("signals").select("*, signal_legs(*)").order("created_at", { ascending: false }),
        supabase.from("app_settings").select("casa_nome, casa_link").eq("id", 1).maybeSingle(),
      ]);
      setSignals((data as SignalRow[]) || []);
      // Pré-preenche com a casa "base" cadastrada em Configurações — o admin só precisa
      // trocar quando o jogo específico for direcionar pra outro lugar.
      const nomeBase = settings?.casa_nome || "";
      const linkBase = settings?.casa_link || "";
      setDefaultCasa({ nome: nomeBase, link: linkBase });
      setCasaNome(nomeBase);
      setCasaLink(linkBase);
      setLoading(false);

      channel = supabase
        .channel("admin-sinais")
        .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, (payload) => {
          setSignals((prev) => {
            if (payload.eventType === "UPDATE")
              return prev.map((s) =>
                s.id === (payload.new as Signal).id ? { ...s, ...(payload.new as Signal) } : s
              );
            if (payload.eventType === "DELETE") return prev.filter((s) => s.id !== (payload.old as Signal).id);
            // INSERT: recarrega pra já trazer os legs do bilhete junto (payload não traz join).
            return prev;
          });
        })
        .subscribe();
    }
    init();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addLeg() {
    setLegs((prev) => [...prev, { ...EMPTY_LEG }]);
  }
  function removeLeg(i: number) {
    setLegs((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateLeg(i: number, field: keyof LegForm, value: string) {
    setLegs((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  const oddCombinada = legs.reduce((acc, l) => {
    const v = parseFloat(l.odd);
    return isNaN(v) || v <= 0 ? acc : acc * v;
  }, 1);

  function resetForm() {
    setForm({
      competicao: "",
      time_a: "",
      time_b: "",
      mercado: "",
      odd: "",
      estrategia: ESTRATEGIAS[0],
      rationale: "",
      live: false,
      horarioJogo: "",
    });
    setBilheteTitulo("");
    setLegs([{ ...EMPTY_LEG }, { ...EMPTY_LEG }]);
    setCasaNome(defaultCasa.nome);
    setCasaLink(defaultCasa.link);
    setSugestaoTipo("nenhuma");
    setSugestaoValor("");
    setRaiox(RAIOX_VAZIO);
  }

  async function reloadSignals() {
    const { data } = await supabase
      .from("signals")
      .select("*, signal_legs(*)")
      .order("created_at", { ascending: false });
    setSignals((data as SignalRow[]) || []);
  }

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setPublishing(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const sugestaoValorNum = parseFloat(sugestaoValor.replace(",", "."));
    const sugestaoCampos =
      sugestaoTipo !== "nenhuma" && !isNaN(sugestaoValorNum) && sugestaoValorNum > 0
        ? { sugestao_tipo: sugestaoTipo, sugestao_valor: sugestaoValorNum }
        : { sugestao_tipo: null, sugestao_valor: null };

    // datetime-local vem sem timezone (horário local do navegador do admin) — new Date()
    // interpreta como horário local, igual o resto do app já faz com datas.
    const conf = parseInt(raiox.confianca, 10);
    const oddAb = parseFloat(raiox.odd_abertura.replace(",", "."));
    const agentes = Object.fromEntries(
      (["jogos", "stats", "odds", "historico", "oportunidade"] as const).filter((k) => raiox[k].trim()).map((k) => [k, raiox[k].trim()])
    );
    const raioxCampos = {
      confianca: !isNaN(conf) && conf >= 0 && conf <= 100 ? conf : null,
      odd_abertura: !isNaN(oddAb) && oddAb > 1 ? oddAb : null,
      riscos: raiox.riscos.trim() || null,
      analise_agentes: Object.keys(agentes).length ? agentes : null,
    };

    const horarioJogoIso = form.horarioJogo ? new Date(form.horarioJogo).toISOString() : null;

    if (tipo === "simples") {
      // Esse insert é o que faz o sinal aparecer na hora na página Eventos de todo
      // usuário ativo — é a mesma tabela, com Realtime ligado (ver migration).
      const { error } = await supabase.from("signals").insert({
        competicao: form.competicao,
        time_a: form.time_a,
        time_b: form.time_b,
        mercado: form.mercado,
        odd: parseFloat(form.odd),
        estrategia: form.estrategia,
        rationale: form.rationale || null,
        live: form.live,
        horario_jogo: horarioJogoIso,
        tipo: "simples",
        casa_nome: casaNome || null,
        casa_link: casaLink || null,
        ...sugestaoCampos,
        ...raioxCampos,
        published_by: user?.id,
      });
      setPublishing(false);
      if (!error) {
        resetForm();
        reloadSignals();
      }
      return;
    }

    // Bilhete: valida que tem pelo menos 2 jogos com odd válida.
    const legsValidas = legs.filter(
      (l) => l.competicao && l.time_a && l.time_b && l.mercado && parseFloat(l.odd) > 0
    );
    if (legsValidas.length < 2) {
      setPublishing(false);
      alert("Um bilhete precisa de pelo menos 2 jogos preenchidos, com odd.");
      return;
    }

    const { data: novoSinal, error: signalError } = await supabase
      .from("signals")
      .insert({
        competicao: bilheteTitulo || "Bilhete",
        time_a: "Bilhete",
        time_b: `${legsValidas.length} jogos`,
        mercado: "Múltiplos mercados",
        odd: Number(oddCombinada.toFixed(2)),
        estrategia: form.estrategia,
        rationale: form.rationale || null,
        live: form.live,
        horario_jogo: horarioJogoIso,
        tipo: "bilhete",
        casa_nome: casaNome || null,
        casa_link: casaLink || null,
        ...sugestaoCampos,
        ...raioxCampos,
        published_by: user?.id,
      })
      .select()
      .single();

    if (signalError || !novoSinal) {
      setPublishing(false);
      alert("Erro ao publicar o bilhete. Tente novamente.");
      return;
    }

    const { error: legsError } = await supabase.from("signal_legs").insert(
      legsValidas.map((l, i) => ({
        signal_id: novoSinal.id,
        competicao: l.competicao,
        time_a: l.time_a,
        time_b: l.time_b,
        mercado: l.mercado,
        odd: parseFloat(l.odd),
        ordem: i,
      }))
    );

    setPublishing(false);
    if (!legsError) {
      resetForm();
      reloadSignals();
    } else {
      alert("O bilhete foi criado, mas houve erro ao salvar os jogos. Confira e recrie se necessário.");
    }
  }

  async function atualizarStatus(id: string, status: "green" | "red" | "no_ar" | "cancelado") {
    setUpdating(id);
    await supabase.from("signals").update({ status }).eq("id", id);
    setUpdating(null);
  }

  // Remove o sinal de verdade (não é status "cancelado" — some da tabela). Como
  // `operations.signal_id` referencia `signals` com `on delete cascade` (0001_init.sql),
  // qualquer operação que algum usuário já tenha marcado nesse sinal é apagada junto,
  // sem aviso — decisão explícita do Edson, ciente do trade-off. O canal realtime já
  // remove o card da lista de todo mundo sozinho (signals tem Realtime ligado e a página
  // Eventos só recarrega os sinais "no_ar" quando qualquer evento chega).
  async function removerSinal(id: string) {
    setRemoving(id);
    // .select() no delete devolve as linhas que realmente foram apagadas. Sem política de
    // DELETE liberada no Supabase (RLS), o delete "funciona" sem erro mas apaga 0 linhas —
    // já vimos isso acontecer (ver migration 0011_signals_delete_policy.sql). Por isso não
    // confiamos só em "!error": se `data` vier vazio, a remoção não aconteceu de verdade.
    const { data, error } = await supabase.from("signals").delete().eq("id", id).select();
    setRemoving(null);
    if (error || !data || data.length === 0) {
      alert(
        "Não deu pra remover o sinal — o Supabase recusou a operação. Confira se a migration " +
          "0011_signals_delete_policy.sql já foi rodada no SQL Editor."
      );
      return;
    }
    setSignals((prev) => prev.filter((s) => s.id !== id));
  }

  const totalNoAr = signals.filter((s) => s.status === "no_ar").length;
  const totalAoVivo = signals.filter((s) => s.live).length;
  const totalGreens = signals.filter((s) => s.status === "green").length;
  const totalReds = signals.filter((s) => s.status === "red").length;

  const signalsFiltrados = signals.filter((s) => {
    if (filtroStatus === "todos") return true;
    if (filtroStatus === "live") return s.live;
    return s.status === filtroStatus;
  });

  // ---------- PRÉVIA AO VIVO: o sinal exatamente como o usuário vai ver ----------
  const draftLegs: SignalLeg[] = legs
    .filter((l) => l.time_a || l.time_b)
    .map((l, i) => ({
      id: `draft-leg-${i}`,
      signal_id: "draft",
      competicao: l.competicao || "Competição",
      time_a: l.time_a || "Time A",
      time_b: l.time_b || "Time B",
      mercado: l.mercado || "Mercado",
      odd: parseFloat(l.odd) || 1,
      ordem: i,
      created_at: new Date().toISOString(),
    }));
  const draftConf = parseInt(raiox.confianca, 10);
  const draftOddAb = parseFloat(raiox.odd_abertura.replace(",", "."));
  const draft: SignalRow = {
    id: "draft",
    competicao: tipo === "bilhete" ? bilheteTitulo || "Bilhete" : form.competicao || "Competição",
    time_a: tipo === "bilhete" ? "Bilhete" : form.time_a || "Time A",
    time_b: tipo === "bilhete" ? `${draftLegs.length} jogos` : form.time_b || "Time B",
    mercado: tipo === "bilhete" ? "Múltiplos mercados" : form.mercado || "Mercado",
    odd: tipo === "bilhete" ? Number(oddCombinada.toFixed(2)) || 1 : parseFloat(form.odd.replace(",", ".")) || 1,
    estrategia: form.estrategia,
    rationale: form.rationale || null,
    status: "no_ar",
    live: form.live,
    horario_jogo: form.horarioJogo ? new Date(form.horarioJogo).toISOString() : null,
    tipo,
    casa_nome: casaNome || null,
    casa_link: casaLink || null,
    sugestao_tipo: sugestaoTipo === "nenhuma" ? null : sugestaoTipo,
    sugestao_valor: parseFloat(sugestaoValor.replace(",", ".")) || null,
    published_by: null,
    created_at: new Date().toISOString(),
    confianca: !isNaN(draftConf) ? Math.min(100, draftConf) : null,
    odd_abertura: !isNaN(draftOddAb) && draftOddAb > 1 ? draftOddAb : null,
    riscos: raiox.riscos.trim() || null,
    analise_agentes: Object.fromEntries(
      (["jogos", "stats", "odds", "historico", "oportunidade"] as const).filter((k) => raiox[k].trim()).map((k) => [k, raiox[k].trim()])
    ),
    signal_legs: draftLegs,
  };
  const encerrados: SinalEncerrado[] = signals.filter((x) => x.status === "green" || x.status === "red");
  const draftMercado = recorte(encerrados, (x) => x.mercado === draft.mercado);
  const camposRaiox = [draft.confianca != null, !!draft.odd_abertura, !!draft.riscos, Object.keys(draft.analise_agentes || {}).length > 0].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div>
        <span className="eyebrow !text-accent !border-accent/30 !bg-accent/10"><span className="eyebrow-dot !bg-accent !shadow-[0_0_12px_#9B6BFF]" />Admin</span>
        <h1 className="font-display text-[28px] md:text-[34px] font-semibold tracking-[-0.03em] leading-tight mt-2 mb-1">Sinais</h1>
        <p className="text-text2 text-sm">Publicar aqui reflete na hora na Sala ao Vivo de todos os usuários. A prévia ao lado mostra exatamente o que eles vão ver.</p>
      </div>

      <div className="card p-6">
        <span className="font-mono text-[10.5px] text-muted tracking-wider">SINAIS PUBLICADOS</span>
        <div className="flex flex-wrap items-end gap-x-0 gap-y-4 mt-3">
          <div className="pr-6">
            <div className="font-mono text-[48px] leading-none font-bold tracking-tight">{signals.length}</div>
          </div>
          <div className="border-l border-border pl-6 pr-6">
            <div className="font-mono text-xl font-semibold text-info">{totalNoAr}</div>
            <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">NO AR</div>
          </div>
          <div className="border-l border-border pl-6 pr-6">
            <div className="font-mono text-xl font-semibold text-warning">{totalAoVivo}</div>
            <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">AO VIVO</div>
          </div>
          <div className="border-l border-border pl-6 pr-6">
            <div className="font-mono text-xl font-semibold text-success">{totalGreens}</div>
            <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">GREEN</div>
          </div>
          <div className="border-l border-border pl-6">
            <div className="font-mono text-xl font-semibold text-danger">{totalReds}</div>
            <div className="text-[10px] text-muted mt-1.5 tracking-wide font-semibold">RED</div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
      <form onSubmit={publicar} className="card p-6 flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold">Publicar novo sinal</div>
          <div className="inline-flex bg-surface border border-border rounded-[10px] p-1">
            <button
              type="button"
              onClick={() => setTipo("simples")}
              className={`px-3.5 py-1.5 rounded-[7px] text-[12px] font-semibold transition-colors ${
                tipo === "simples" ? "bg-primary text-white" : "text-text2 hover:text-text"
              }`}
            >
              Simples
            </button>
            <button
              type="button"
              onClick={() => setTipo("bilhete")}
              className={`px-3.5 py-1.5 rounded-[7px] text-[12px] font-semibold transition-colors ${
                tipo === "bilhete" ? "bg-primary text-white" : "text-text2 hover:text-text"
              }`}
            >
              Bilhete (vários jogos)
            </button>
          </div>
        </div>

        <div className="border border-border rounded-lg p-3.5 flex flex-col gap-3">
          <div className="text-[10.5px] font-bold text-muted tracking-wider uppercase">
            Direcionamento e sugestão de entrada
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="input-field text-sm"
              placeholder="Nome da casa (ex: Bet365)"
              value={casaNome}
              onChange={(e) => setCasaNome(e.target.value)}
            />
            <input
              className="input-field text-sm"
              placeholder="Link de direcionamento (opcional)"
              value={casaLink}
              onChange={(e) => setCasaLink(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              className="input-field text-sm"
              value={sugestaoTipo}
              onChange={(e) => setSugestaoTipo(e.target.value as SugestaoTipo | "nenhuma")}
            >
              <option value="nenhuma">Sem sugestão de valor</option>
              {(Object.keys(SUGESTAO_LABELS) as SugestaoTipo[]).map((t) => (
                <option key={t} value={t}>
                  {SUGESTAO_LABELS[t]}
                </option>
              ))}
            </select>
            <input
              className="input-field text-sm"
              type="number"
              step="0.01"
              min="0"
              placeholder={
                sugestaoTipo === "percentual"
                  ? "Ex: 2 (= 2% da banca)"
                  : sugestaoTipo === "unidades"
                  ? "Ex: 1.5 unidades"
                  : sugestaoTipo === "valor"
                  ? "Ex: 50 (R$ 50,00)"
                  : "Escolha um tipo ao lado"
              }
              value={sugestaoValor}
              onChange={(e) => setSugestaoValor(e.target.value)}
              disabled={sugestaoTipo === "nenhuma"}
            />
          </div>
          <p className="text-[11px] text-muted">
            O nome/link vêm pré-preenchidos da casa base (Configurações) — troque só se
            este jogo específico for pra outro lugar. A sugestão aparece pro usuário na
            página Eventos, junto do botão de marcar operação.
          </p>
        </div>

        {tipo === "simples" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="input-field"
              placeholder="Competição"
              value={form.competicao}
              onChange={(e) => setForm({ ...form, competicao: e.target.value })}
              required
            />
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-semibold text-text2">
                Horário do jogo (opcional)
              </label>
              <input
                type="datetime-local"
                className="input-field text-sm py-2"
                value={form.horarioJogo}
                onChange={(e) => setForm({ ...form, horarioJogo: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-text2 col-span-1 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.live}
                onChange={(e) => setForm({ ...form, live: e.target.checked })}
              />
              Forçar &quot;ao vivo&quot; agora (sem isso, com o horário preenchido acima o
              sinal já vira ao vivo sozinho assim que a hora chegar)
            </div>
            <input
              className="input-field"
              placeholder="Time A"
              value={form.time_a}
              onChange={(e) => setForm({ ...form, time_a: e.target.value })}
              required
            />
            <input
              className="input-field"
              placeholder="Time B"
              value={form.time_b}
              onChange={(e) => setForm({ ...form, time_b: e.target.value })}
              required
            />
            <input
              className="input-field"
              placeholder="Mercado (ex: Over 2.5 gols)"
              value={form.mercado}
              onChange={(e) => setForm({ ...form, mercado: e.target.value })}
              required
            />
            <input
              className="input-field"
              type="number"
              step="0.01"
              min="1"
              placeholder="Odd"
              value={form.odd}
              onChange={(e) => setForm({ ...form, odd: e.target.value })}
              required
            />
            <select
              className="input-field col-span-2"
              value={form.estrategia}
              onChange={(e) => setForm({ ...form, estrategia: e.target.value })}
            >
              {ESTRATEGIAS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <textarea
              className="input-field col-span-2 min-h-20 resize-none"
              placeholder="Rationale (opcional) — a análise por trás do sinal"
              value={form.rationale}
              onChange={(e) => setForm({ ...form, rationale: e.target.value })}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="input-field"
                placeholder="Título do bilhete (ex: Bilhete Rodada 24)"
                value={bilheteTitulo}
                onChange={(e) => setBilheteTitulo(e.target.value)}
              />
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-semibold text-text2">
                  Horário do 1º jogo (opcional)
                </label>
                <input
                  type="datetime-local"
                  className="input-field text-sm py-2"
                  value={form.horarioJogo}
                  onChange={(e) => setForm({ ...form, horarioJogo: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-text2 col-span-1 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.live}
                  onChange={(e) => setForm({ ...form, live: e.target.checked })}
                />
                Forçar &quot;ao vivo&quot; agora (sem isso, com o horário preenchido acima
                o bilhete já vira ao vivo sozinho assim que a hora chegar)
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {legs.map((leg, i) => (
                <div key={i} className="border border-border rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted tracking-wide">JOGO {i + 1}</span>
                    {legs.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeLeg(i)}
                        className="text-[11px] font-semibold text-danger hover:opacity-80"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      className="input-field text-xs py-2"
                      placeholder="Competição"
                      value={leg.competicao}
                      onChange={(e) => updateLeg(i, "competicao", e.target.value)}
                    />
                    <input
                      className="input-field text-xs py-2"
                      placeholder="Mercado"
                      value={leg.mercado}
                      onChange={(e) => updateLeg(i, "mercado", e.target.value)}
                    />
                    <input
                      className="input-field text-xs py-2"
                      placeholder="Time A"
                      value={leg.time_a}
                      onChange={(e) => updateLeg(i, "time_a", e.target.value)}
                    />
                    <input
                      className="input-field text-xs py-2"
                      placeholder="Time B"
                      value={leg.time_b}
                      onChange={(e) => updateLeg(i, "time_b", e.target.value)}
                    />
                    <input
                      className="input-field text-xs py-2 col-span-2"
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="Odd deste jogo"
                      value={leg.odd}
                      onChange={(e) => updateLeg(i, "odd", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addLeg}
              className="btn-outline text-xs px-4 py-2 self-start"
            >
              + Adicionar jogo
            </button>

            <div className="flex items-center justify-between bg-elevated rounded-lg px-4 py-3">
              <span className="text-xs font-semibold text-text2">ODD COMBINADA DO BILHETE</span>
              <span className="font-mono text-lg font-semibold">{oddCombinada.toFixed(2)}</span>
            </div>

            <select
              className="input-field"
              value={form.estrategia}
              onChange={(e) => setForm({ ...form, estrategia: e.target.value })}
            >
              {ESTRATEGIAS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <textarea
              className="input-field min-h-20 resize-none"
              placeholder="Rationale (opcional) — a análise por trás do bilhete"
              value={form.rationale}
              onChange={(e) => setForm({ ...form, rationale: e.target.value })}
            />
          </div>
        )}

        {/* RAIO-X — campos opcionais da análise detalhada */}
        <div className="rounded-2xl border border-info/25 bg-info/[0.04]">
          <button
            type="button"
            onClick={() => setRaiox({ ...raiox, aberto: !raiox.aberto })}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span>
              <span className="text-[12px] font-bold text-info tracking-wide">RAIO-X DO SINAL</span>
              <span className="text-[11.5px] text-text2 ml-2">opcional — confiança, riscos e o que cada agente encontrou</span>
            </span>
            <span className={`text-info transition-transform ${raiox.aberto ? "rotate-180" : ""}`}>▾</span>
          </button>
          {raiox.aberto && (
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className="input-field" inputMode="numeric" placeholder="Confiança da equipe (0–100)" value={raiox.confianca} onChange={(e) => setRaiox({ ...raiox, confianca: e.target.value.replace(/\D/g, "").slice(0, 3) })} />
              <input className="input-field" placeholder="Odd quando a análise começou (ex: 1,62)" value={raiox.odd_abertura} onChange={(e) => setRaiox({ ...raiox, odd_abertura: e.target.value.replace(/[^0-9.,]/g, "") })} />
              {(
                [
                  ["jogos", "Agente Jogos do dia — ex: 9 jogos da Premier cruzados hoje"],
                  ["stats", "Agente Estatísticas — ex: mandante marcou 2+ em 4 dos últimos 5"],
                  ["odds", "Agente Odds — ex: odd subiu de 1,65 pra 1,72 em 3h"],
                  ["historico", "Agente Histórico — ex: visitante sofreu gol em 6 dos 7 fora"],
                  ["oportunidade", "Agente Oportunidade — ex: valor esperado +9% sobre o mercado"],
                ] as const
              ).map(([k, ph]) => (
                <input key={k} className="input-field sm:col-span-2" placeholder={ph} value={raiox[k]} onChange={(e) => setRaiox({ ...raiox, [k]: e.target.value })} />
              ))}
              <textarea
                className="input-field sm:col-span-2 min-h-20 resize-none"
                placeholder="Por que pode dar errado — riscos conhecidos da entrada (aparece em destaque pro usuário)"
                value={raiox.riscos}
                onChange={(e) => setRaiox({ ...raiox, riscos: e.target.value })}
              />
            </div>
          )}
        </div>

        <button type="submit" className="btn-primary py-2.5 text-sm self-start px-6" disabled={publishing}>
          {publishing ? "Publicando…" : tipo === "bilhete" ? "Publicar bilhete" : "Publicar sinal"}
        </button>
      </form>

      {/* PRÉVIA AO VIVO */}
      <div className="xl:sticky xl:top-24 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-bold tracking-[0.16em] text-info">PRÉVIA · COMO O USUÁRIO VÊ</span>
          <span className="flex items-center gap-1.5 text-[10px] text-success font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> ao vivo
          </span>
        </div>
        <div className={`card p-5 ${draft.live ? "!border-danger/30 shadow-[0_0_50px_-20px_rgba(255,77,109,.6)]" : ""}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10.5px] text-muted font-semibold tracking-wider uppercase truncate">{draft.competicao}</span>
            {draft.live ? (
              <span className="text-[10px] font-bold text-danger border border-danger/50 bg-danger/15 rounded-full px-2.5 py-1">AO VIVO</span>
            ) : draft.horario_jogo ? (
              <span className="text-[10px] font-semibold text-info border border-info/40 bg-info/10 rounded-full px-2.5 py-1">
                {new Date(draft.horario_jogo).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            ) : (
              <span className="text-[10px] font-bold text-info border border-info/30 bg-info/10 rounded-full px-2.5 py-1">NO AR</span>
            )}
          </div>
          <div className="flex items-start justify-between gap-4 mt-3.5">
            <div className="min-w-0">
              {tipo === "bilhete" ? (
                <>
                  <div className="font-display text-[19px] font-semibold">{draftLegs.length} jogos combinados</div>
                  {draftLegs.map((l) => (
                    <div key={l.id} className="text-[11.5px] text-text2 truncate">
                      {l.time_a} x {l.time_b} <span className="text-muted">· {l.mercado}</span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="font-display text-[19px] font-semibold leading-tight">
                    {draft.time_a} <span className="text-muted font-normal">x</span> {draft.time_b}
                  </div>
                  <div className="text-[13px] text-text2 mt-1">{draft.mercado}</div>
                </>
              )}
            </div>
            <div className="text-right flex-none">
              <div className="font-mono text-[26px] font-semibold leading-none">{fmtOdd(draft.odd)}</div>
              <div className="text-[9.5px] text-muted font-bold tracking-[0.14em] mt-1">ODD</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
              <div className="text-[9px] font-bold text-muted tracking-[0.14em]">PROB. IMPLÍCITA</div>
              <div className="font-mono text-[13px] font-semibold mt-1">{draft.odd > 1 ? `${probImplicita(draft.odd).toFixed(0)}%` : "—"}</div>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
              <div className="text-[9px] font-bold text-muted tracking-[0.14em]">NEXUS NO MERCADO</div>
              <div className="font-mono text-[13px] font-semibold mt-1">
                {draftMercado.pct === null ? <span className="text-muted">sem histórico</span> : <span className="text-success">{draftMercado.pct}% ({draftMercado.total})</span>}
              </div>
            </div>
          </div>
          <button type="button" onClick={() => setPreviewXray(true)} className="mt-4 w-full rounded-xl font-semibold text-[12.5px] py-2.5 border border-info/40 bg-info/10 text-info hover:bg-info/20 transition-colors">
            👁 Abrir Raio-X desta prévia
          </button>
        </div>
        <div className="card px-4 py-3 text-[11.5px] text-text2 flex items-center justify-between gap-3">
          <span>Raio-X preenchido</span>
          <span className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`w-5 h-1.5 rounded-full ${i < camposRaiox ? "bg-info" : "bg-white/10"}`} />
            ))}
          </span>
        </div>
        {draftMercado.total >= 3 && draftMercado.pct !== null && draftMercado.pct < 55 && (
          <div className="rounded-xl border border-warning/30 bg-warning/[0.07] px-4 py-3 text-[11.5px] text-text2">
            ⚠ Esse mercado tem só <span className="text-warning font-semibold">{draftMercado.pct}%</span> de green no histórico ({draftMercado.total} sinais). Vale revisar antes de publicar.
          </div>
        )}
      </div>
      </div>

      {previewXray && (
        <SignalXRay
          signal={draft}
          encerrados={encerrados}
          noArMesmaCompeticao={signals.filter((x) => x.status === "no_ar" && x.competicao === draft.competicao).length + 1}
          canMark={false}
          onClose={() => setPreviewXray(false)}
        />
      )}

      <div>
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div className="text-sm font-bold text-text2">
            HISTÓRICO ({signalsFiltrados.length}
            {filtroStatus !== "todos" ? ` de ${signals.length}` : ""})
          </div>
          <div className="inline-flex bg-surface border border-border rounded-[10px] p-1 overflow-x-auto max-w-full">
            {FILTROS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFiltroStatus(f.key)}
                className={`px-3 py-1.5 rounded-[7px] text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  filtroStatus === f.key ? "bg-primary text-white" : "text-text2 hover:text-text"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="card p-7 text-center text-sm text-text2">Carregando…</div>
        ) : (
          <div className="card divide-y divide-border overflow-hidden">
            {signalsFiltrados.map((s) => {
              const expanded = expandedId === s.id;
              return (
                <div key={s.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full flex-none ${STATUS_DOT[s.status] || "bg-muted"}`}
                      title={s.status || "sem status"}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {s.tipo === "bilhete" && (
                          <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-none">
                            BILHETE
                          </span>
                        )}
                        {s.live && (
                          <span className="text-[9px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded flex-none">
                            AO VIVO
                          </span>
                        )}
                        <span className="text-[10px] text-muted font-semibold truncate">{s.competicao}</span>
                      </div>
                      <div className="text-sm font-semibold truncate mt-0.5">
                        {s.tipo === "bilhete"
                          ? `${s.signal_legs?.length || 0} jogos combinados`
                          : `${s.time_a} x ${s.time_b}`}
                        <span className="text-text2 font-normal">
                          {" "}
                          · {s.tipo === "bilhete" ? "" : `${s.mercado} · `}ODD {s.odd}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted mt-0.5 font-mono flex-wrap">
                        {s.horario_jogo && (
                          <span>
                            Jogo às{" "}
                            {new Date(s.horario_jogo).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                        {s.tipo === "bilhete" && (
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : s.id)}
                            className="font-sans font-semibold text-text2 hover:text-text"
                          >
                            {expanded ? "Ocultar jogos" : "Ver jogos"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex-none flex items-center gap-2">
                      <div className="inline-flex bg-surface border border-border rounded-[10px] p-1">
                        <button
                          onClick={() => atualizarStatus(s.id, "no_ar")}
                          disabled={updating === s.id}
                          title="Marcar como no ar"
                          className={`px-2 py-1.5 rounded-[7px] text-[10px] font-bold transition-colors ${
                            s.status === "no_ar" ? "bg-info text-bg" : "text-text2 hover:text-text"
                          }`}
                        >
                          AR
                        </button>
                        <button
                          onClick={() => atualizarStatus(s.id, "green")}
                          disabled={updating === s.id}
                          title="Marcar como green"
                          className={`px-2 py-1.5 rounded-[7px] text-[10px] font-bold transition-colors ${
                            s.status === "green" ? "bg-success text-bg" : "text-text2 hover:text-text"
                          }`}
                        >
                          G
                        </button>
                        <button
                          onClick={() => atualizarStatus(s.id, "red")}
                          disabled={updating === s.id}
                          title="Marcar como red"
                          className={`px-2 py-1.5 rounded-[7px] text-[10px] font-bold transition-colors ${
                            s.status === "red" ? "bg-danger text-bg" : "text-text2 hover:text-text"
                          }`}
                        >
                          R
                        </button>
                        <button
                          onClick={() => atualizarStatus(s.id, "cancelado")}
                          disabled={updating === s.id}
                          title="Marcar como cancelado"
                          className={`px-2 py-1.5 rounded-[7px] text-[10px] font-bold transition-colors ${
                            s.status === "cancelado" ? "bg-muted text-bg" : "text-text2 hover:text-text"
                          }`}
                        >
                          C
                        </button>
                      </div>
                      <button
                        onClick={() => removerSinal(s.id)}
                        disabled={removing === s.id}
                        title="Remove o sinal por completo (não fica no histórico de ninguém)"
                        className="text-muted hover:text-danger text-[10px] font-bold px-2 py-1.5 rounded-lg disabled:opacity-40 flex-none"
                      >
                        {removing === s.id ? "…" : "✕"}
                      </button>
                    </div>
                  </div>

                  {expanded && s.tipo === "bilhete" && (
                    <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2 pl-5">
                      {(s.signal_legs || [])
                        .slice()
                        .sort((a, b) => a.ordem - b.ordem)
                        .map((leg) => (
                          <div key={leg.id} className="flex items-center justify-between text-xs">
                            <span className="text-text2">
                              <span className="text-muted">{leg.competicao} · </span>
                              {leg.time_a} x {leg.time_b}{" "}
                              <span className="text-muted">— {leg.mercado}</span>
                            </span>
                            <span className="font-mono font-semibold">{leg.odd}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
            {signalsFiltrados.length === 0 && (
              <div className="p-7 text-center text-sm text-text2">
                {signals.length === 0 ? "Nenhum sinal publicado ainda." : "Nenhum sinal nesse filtro."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
