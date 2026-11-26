import type { Metadata, Viewport } from "next";
import "./globals.css";
import { InstallPrompt } from "@/components/InstallPrompt";

export const metadata: Metadata = {
  title: "Nexus Tips",
  description: "Inteligência esportiva. Sem promessas vazias.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nexus Tips",
  },
};

export const viewport: Viewport = {
  themeColor: "#03050C",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
        />
      </head>
      <body className="font-sans">
        {children}
        <InstallPrompt />
        {process.env.NEXT_PUBLIC_DEMO_MODE === "1" && (
          <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[70] pointer-events-none rounded-full border border-warning/40 bg-[rgba(20,14,4,.8)] backdrop-blur-md px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-warning">
            MODO DEMO · DADOS FICTÍCIOS
          </div>
        )}
      </body>
    </html>
  );
}
