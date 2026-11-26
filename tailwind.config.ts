import type { Config } from "tailwindcss";

// Design system "Nexus 4D": preto-espacial profundo, vidro fosco e luz elétrica
// (azul → ciano → violeta). Os NOMES dos tokens continuam os mesmos de antes (bg,
// surface, elevated, primary…) de propósito — todas as telas já usam esses nomes, então
// trocar os valores aqui remodela o sistema inteiro de uma vez.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#03050C",
        bg2: "#060A17",
        surface: "#0A1022",
        elevated: "#111A33",
        border: "#1B2547",
        text: "#F4F7FF",
        text2: "#A4B0D0",
        muted: "#69759A",
        primary: "#4F7BFF",
        accent: "#9B6BFF",
        success: "#14E3A0",
        danger: "#FF4D6D",
        warning: "#FFB547",
        info: "#33D6F5",
      },
      fontFamily: {
        sans: ["var(--font-geist)", "Inter", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        display: ["var(--font-display)", "var(--font-geist)", "sans-serif"],
        serif: ["var(--font-serif)", "serif"],
      },
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px) scale(.985)", filter: "blur(6px)" },
          to: { opacity: "1", transform: "none", filter: "none" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "fade-up": "fade-up .7s cubic-bezier(.2,.8,.2,1) both",
        shimmer: "shimmer 6s linear infinite",
        float: "float 6s ease-in-out infinite",
        "spin-slow": "spin-slow 24s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
