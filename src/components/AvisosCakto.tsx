"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EVENTO_PARA_STATUS_PUBLICO } from "@/lib/cakto-eventos";

type Evento = { id: number; pedido_id: string; evento: string; email: string | null; ref: string | null; recebido_em: string };
type Assin = { ref: string; email: string; user_id: string | null; status: string; ultimo_evento: string | null; updated_at: string };

// Painel de diagnóstico: cada aviso que a Cakto mandou e o estado em que ficou a assinatura.
// Lê cakto_eventos / cakto_assinaturas (só admin tem leitura — migration 0005).
export function AvisosCakto() {
  const supabase = createClient();
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [assin, setAssin] = useState<Record<string, Assin>>({});
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [e, a] = await Promise.all([
        supabase.from("cakto_eventos").select("id, pedido_id, evento, email, ref, recebido_em").order("recebido_em", { ascending: false }).limit(40),
        supabase.from("cakto_assinaturas").select("*"),
      ]);
      if (e.error) {
        setErro("Não deu pra ler os avisos — a migration 0005_cakto.sql foi rodada?");
        return;
      }
      setEventos((e.data as Evento[]) || []);
      setAssin(Object.fromEntries(((a.data as Assin[]) || []).map((x) => [x.ref, x])));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card p-6">
      <div className="text-[10.5px] font-bold tracking-[0.16em] text-info">AVISOS DA CAKTO</div>
      <p className="text-[12px] text-muted mt-0.5 mb-4">
        Cada aviso que chegou no webhook e o que aconteceu com a assinatura. Se uma compra aprovada não aparece aqui, o aviso não chegou ao site — confira o webhook na Cakto.
      </p>
      {erro ? (
        <div className="text-sm text-danger">{erro}</div>
      ) : eventos === null ? (
        <div className="text-sm text-muted">Carregando…</div>
      ) : eventos.length === 0 ? (
        <div className="text-sm text-text2">Nenhum aviso recebido ainda.</div>
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.05]">
          {eventos.map((ev) => {
            const a = ev.ref ? assin[ev.ref] : undefined;
            const efeito = EVENTO_PARA_STATUS_PUBLICO[ev.evento];
            const situacao = !efeito
              ? { txt: "só registrado", cor: "text-muted" }
              : !a
              ? { txt: "sem e-mail no aviso", cor: "text-warning" }
              : a.user_id
              ? { txt: `conta ligada · ${a.status}`, cor: a.status === "ativa" ? "text-success" : a.status === "atrasada" ? "text-warning" : "text-danger" }
              : { txt: "esperando conta com esse e-mail", cor: "text-warning" };
            return (
              <div key={ev.id} className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1.3fr)_auto] gap-3 py-2.5 text-[12.5px] items-center">
                <span className="font-mono text-text truncate">{ev.evento}</span>
                <span className="text-text2 truncate">{ev.email || "—"}</span>
                <span className={`font-semibold truncate ${situacao.cor}`}>{situacao.txt}</span>
                <span className="text-muted text-[11px] whitespace-nowrap">{new Date(ev.recebido_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
