"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

// O canvas 3D só existe no navegador — carregado sob demanda, sem SSR, pra não pesar
// o primeiro paint (o texto do hero aparece antes da cena terminar de carregar).
export const NexusCore = dynamic(() => import("./NexusCore"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-40 h-40 rounded-full bg-primary/20 blur-3xl animate-pulse" />
    </div>
  ),
});

/** Revela o conteúdo com blur+fade+slide quando entra na tela. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const T = Tag as "div";
  return (
    <T
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${inView ? "in" : ""} ${className}`}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      {children}
    </T>
  );
}

/**
 * Card com inclinação 3D real (perspective + rotateX/Y seguindo o mouse), brilho
 * especular e holofote. Usa só transform — roda a 60fps sem re-render do React.
 */
export function TiltCard({
  children,
  className = "",
  max = 9,
  glare = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  function onMove(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateZ(0)`;
      el.style.setProperty("--sx", `${px * 100}%`);
      el.style.setProperty("--sy", `${py * 100}%`);
      if (glareRef.current) {
        glareRef.current.style.opacity = "1";
        glareRef.current.style.background = `radial-gradient(600px circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.10), transparent 40%)`;
      }
    });
  }
  function onLeave() {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.style.transform = "perspective(1000px) rotateX(0) rotateY(0)";
    if (glareRef.current) glareRef.current.style.opacity = "0";
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`spotlight ${className}`}
      style={{ transformStyle: "preserve-3d", transition: "transform .45s cubic-bezier(.2,.8,.2,1), border-color .3s, box-shadow .3s", willChange: "transform", ...style }}
    >
      {children}
      {glare && (
        <div
          ref={glareRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{ opacity: 0 }}
        />
      )}
    </div>
  );
}

/** Fundo ambiente animado: aurora de orbes, grid em perspectiva e granulado. */
export function AmbientBackground({ variant = "app", contained = false }: { variant?: "app" | "admin" | "auth"; contained?: boolean }) {
  const tint =
    variant === "admin"
      ? ["rgba(155,107,255,.35)", "rgba(79,123,255,.28)", "rgba(51,214,245,.14)"]
      : ["rgba(79,123,255,.32)", "rgba(155,107,255,.22)", "rgba(51,214,245,.16)"];
  return (
    <div className="nx-ambient" style={contained ? { position: "absolute" } : undefined} aria-hidden>
      <div className="nx-grid" />
      <div
        className="orb"
        style={{ width: "46vw", height: "46vw", left: "-12vw", top: "-18vw", background: tint[0], animation: "nx-drift-a 22s ease-in-out infinite" }}
      />
      <div
        className="orb"
        style={{ width: "38vw", height: "38vw", right: "-10vw", top: "10vh", background: tint[1], animation: "nx-drift-b 26s ease-in-out infinite" }}
      />
      <div
        className="orb"
        style={{ width: "30vw", height: "30vw", left: "30vw", bottom: "-16vw", background: tint[2], animation: "nx-drift-a 30s ease-in-out infinite reverse" }}
      />
      <div className="nx-noise" />
    </div>
  );
}

/** Número que conta até o valor quando entra na tela. */
export function CountUp({
  to,
  decimals = 0,
  duration = 1600,
  prefix = "",
  suffix = "",
  className = "",
}: {
  to: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / duration);
        const eased = 1 - Math.pow(1 - k, 4);
        setVal(to * eased);
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return (
    <span ref={ref} className={className}>
      {prefix}
      {val.toFixed(decimals).replace(".", ",")}
      {suffix}
    </span>
  );
}

/** Botão/elemento magnético: é levemente "puxado" na direção do cursor. */
export function Magnetic({ children, strength = 0.25, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`inline-block ${className}`}
      style={{ transition: "transform .35s cubic-bezier(.2,.8,.2,1)" }}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el || e.pointerType === "touch") return;
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = "translate(0,0)";
      }}
    >
      {children}
    </div>
  );
}
