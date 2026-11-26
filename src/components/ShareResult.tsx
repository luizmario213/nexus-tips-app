"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Card de resultado pra story (1080×1920), desenhado em <canvas> no próprio navegador —
// sem servidor, sem biblioteca. Green E red: o red também vira card, porque o histórico
// público é exatamente o que diferencia a Nexus. Cada usuário que compartilha vira
// divulgação da marca.

export interface ShareData {
  competicao: string;
  timeA: string;
  timeB: string;
  mercado: string;
  odd: number;
  status: "green" | "red";
  data: string; // ISO
  bilhete?: boolean;
  /** opcional: resultado pessoal (valor/lucro) — só se a pessoa quiser mostrar */
  lucro?: number | null;
}

const W = 1080;
const H = 1920;

function loadImg(src: string) {
  return new Promise<HTMLImageElement | null>((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  words.forEach((w) => {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  });
  if (cur) lines.push(cur);
  return lines;
}

export async function desenharCard(d: ShareData, mostrarLucro: boolean): Promise<string> {
  try {
    await Promise.all([
      document.fonts.load('600 120px "Space Grotesk"'),
      document.fonts.load('500 40px "Geist"'),
      document.fonts.load('600 80px "Geist Mono"'),
      document.fonts.load('italic 80px "Instrument Serif"'),
    ]);
  } catch {
    /* segue com fonte padrão */
  }
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const green = d.status === "green";
  const tone = green ? "#14E3A0" : "#FF4D6D";

  // fundo
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#050816");
  bg.addColorStop(1, "#03050C");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(180, 180, 900, "rgba(79,123,255,0.35)");
  glow(980, 700, 700, "rgba(155,107,255,0.22)");
  glow(540, 1500, 900, green ? "rgba(20,227,160,0.28)" : "rgba(255,77,109,0.26)");

  // grid em perspectiva
  ctx.save();
  ctx.strokeStyle = "rgba(120,145,220,0.08)";
  ctx.lineWidth = 2;
  for (let i = -10; i <= 20; i++) {
    ctx.beginPath();
    ctx.moveTo(540 + i * 60, 1350);
    ctx.lineTo(540 + i * 220, H);
    ctx.stroke();
  }
  for (let j = 0; j < 9; j++) {
    const y = 1350 + Math.pow(j / 8, 1.8) * 570;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  // marca
  const logo = await loadImg("/brand/nexus-logo.png");
  if (logo) {
    const lh = 96;
    ctx.drawImage(logo, 80, 96, (logo.width / logo.height) * lh, lh);
  }

  // selo histórico público
  ctx.font = '600 26px "Geist", sans-serif';
  const selo = "HISTÓRICO 100% PÚBLICO";
  const sw = ctx.measureText(selo).width + 64;
  ctx.fillStyle = "rgba(51,214,245,0.12)";
  ctx.strokeStyle = "rgba(51,214,245,0.5)";
  ctx.lineWidth = 2;
  roundRect(ctx, W - 90 - sw, 112, sw, 64, 32);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#33D6F5";
  ctx.fillText(selo, W - 90 - sw + 32, 154);

  // status gigante
  ctx.save();
  ctx.shadowColor = tone;
  ctx.shadowBlur = 80;
  ctx.fillStyle = tone;
  ctx.font = '700 260px "Space Grotesk", sans-serif';
  ctx.fillText(green ? "GREEN" : "RED", 80, 560);
  ctx.restore();
  ctx.fillStyle = "#F4F7FF";
  ctx.font = 'italic 76px "Instrument Serif", serif';
  ctx.fillText(green ? "batido." : "registrado.", 90, 660);

  // cartão do jogo (vidro)
  const cy = 780;
  ctx.fillStyle = "rgba(14,20,44,0.72)";
  ctx.strokeStyle = "rgba(120,145,220,0.25)";
  ctx.lineWidth = 2;
  roundRect(ctx, 80, cy, W - 160, 560, 48);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = tone;
  roundRect(ctx, 80, cy, 10, 560, 5);
  ctx.fill();

  ctx.fillStyle = "#69759A";
  ctx.font = '600 30px "Geist", sans-serif';
  ctx.fillText(d.competicao.toUpperCase(), 140, cy + 90);

  ctx.fillStyle = "#F4F7FF";
  ctx.font = '600 76px "Space Grotesk", sans-serif';
  const jogo = d.bilhete ? d.timeB : `${d.timeA} x ${d.timeB}`;
  const linhas = wrap(ctx, jogo, W - 300).slice(0, 2);
  linhas.forEach((l, i) => ctx.fillText(l, 140, cy + 190 + i * 88));
  const afterTeams = cy + 190 + (linhas.length - 1) * 88;

  ctx.fillStyle = "#A4B0D0";
  ctx.font = '500 40px "Geist", sans-serif';
  ctx.fillText(d.mercado, 140, afterTeams + 76);

  // odd
  ctx.fillStyle = "#69759A";
  ctx.font = '700 26px "Geist", sans-serif';
  ctx.fillText("ODD", 140, cy + 410);
  const oddGrad = ctx.createLinearGradient(140, 0, 520, 0);
  oddGrad.addColorStop(0, "#FFFFFF");
  oddGrad.addColorStop(0.5, "#33D6F5");
  oddGrad.addColorStop(1, "#9B6BFF");
  ctx.fillStyle = oddGrad;
  ctx.font = '600 96px "Geist Mono", monospace';
  ctx.fillText(d.odd.toFixed(2), 140, cy + 510);

  if (mostrarLucro && d.lucro != null) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#69759A";
    ctx.font = '700 26px "Geist", sans-serif';
    ctx.fillText("RESULTADO", W - 140, cy + 410);
    ctx.fillStyle = tone;
    ctx.font = '600 72px "Geist Mono", monospace';
    ctx.fillText(`${d.lucro >= 0 ? "+" : "-"}R$ ${Math.abs(d.lucro).toFixed(2).replace(".", ",")}`, W - 140, cy + 505);
    ctx.textAlign = "left";
  }

  // mensagem
  ctx.fillStyle = "#F4F7FF";
  ctx.font = '500 44px "Geist", sans-serif';
  const msg = green
    ? "Publicado antes do jogo. Registrado no histórico público."
    : "Red também fica no histórico. É assim que se constrói confiança.";
  wrap(ctx, msg, W - 180).forEach((l, i) => ctx.fillText(l, 90, 1480 + i * 60));

  ctx.fillStyle = "#69759A";
  ctx.font = '500 30px "Geist", sans-serif';
  ctx.fillText(new Date(d.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }), 90, 1700);
  ctx.fillStyle = "#A4B0D0";
  ctx.fillText("Inteligência esportiva. Sem promessas vazias.", 90, 1760);

  return c.toDataURL("image/png");
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function ShareResultButton({ data, compact = false }: { data: ShareData; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Gerar card pra compartilhar"
        className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.09] hover:border-info/40 text-text2 hover:text-text transition-all font-semibold whitespace-nowrap ${
          compact ? "px-2 py-1.5 text-[11px]" : "px-3 py-2 text-[12px]"
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" />
        </svg>
        {!compact && "Compartilhar"}
      </button>
      {open && <ShareModal data={data} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareModal({ data, onClose }: { data: ShareData; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [mostrarLucro, setMostrarLucro] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setUrl(null);
    desenharCard(data, mostrarLucro).then((u) => vivo && setUrl(u));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), mostrarLucro]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const nome = `nexus-${data.status}-${(data.bilhete ? data.timeB : `${data.timeA}-${data.timeB}`).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;

  async function compartilhar() {
    if (!url) return;
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], nome, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: "Histórico público da Nexus Tips — greens e reds, sem esconder nada." });
        return;
      }
    } catch {
      /* usuário cancelou ou sem suporte */
    }
    baixar();
    setMsg("Seu navegador não abre o compartilhamento direto — baixamos a imagem pra você postar.");
  }

  function baixar() {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
  }

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-[rgba(2,4,10,.8)] backdrop-blur-md" onClick={onClose} />
      <div className="relative card !bg-[rgba(8,12,28,.95)] p-5 sm:p-6 w-full max-w-[760px] grid sm:grid-cols-[260px_1fr] gap-6 animate-fade-up">
        <div className="relative mx-auto w-[220px] sm:w-[260px] aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 bg-bg shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)]">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Prévia do card" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="w-8 h-8 rounded-full border-2 border-info/30 border-t-info animate-spin" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-[10.5px] font-bold tracking-[0.16em] text-info">CARD PRA STORY</div>
            <h3 className="font-display text-[24px] font-semibold tracking-tight mt-1.5">Mostra o histórico — {data.status === "green" ? "o green" : "inclusive o red"}.</h3>
            <p className="text-[13px] text-text2 mt-1.5">Imagem 1080×1920 pronta pro Instagram, WhatsApp ou onde quiser.</p>
          </div>
          {data.lucro != null && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <span className={`relative w-10 h-6 rounded-full transition-colors ${mostrarLucro ? "bg-primary" : "bg-white/10"}`}>
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${mostrarLucro ? "left-5" : "left-1"}`} />
              </span>
              <input type="checkbox" className="sr-only" checked={mostrarLucro} onChange={(e) => setMostrarLucro(e.target.checked)} />
              <span className="text-[13px] text-text2">Mostrar meu resultado em R$</span>
            </label>
          )}
          <div className="flex flex-wrap gap-2 mt-auto">
            <button onClick={compartilhar} disabled={!url} className="btn-primary text-sm px-5 py-3">
              Compartilhar
            </button>
            <button onClick={baixar} disabled={!url} className="btn-ghost text-sm px-5 py-3">
              Baixar imagem
            </button>
            <button onClick={onClose} className="text-sm text-text2 hover:text-text px-3 py-3">
              Fechar
            </button>
          </div>
          {msg && <p className="text-[11.5px] text-muted">{msg}</p>}
        </div>
      </div>
    </div>,
    document.body
  );
}
