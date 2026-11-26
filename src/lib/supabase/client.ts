"use client";

import { createBrowserClient } from "@supabase/ssr";
import { DEMO_MODE, createDemoClient } from "./demo";

// Cliente Supabase para uso em Client Components ("use client").
// Usa a anon key pública — o RLS do banco (ver migration 0001_init.sql) é quem garante
// que cada usuário só lê/escreve o que pode.
export function createClient(): ReturnType<typeof createBrowserClient> {
  // Modo demonstração (NEXT_PUBLIC_DEMO_MODE=1): dados fictícios em memória, sem Supabase.
  if (DEMO_MODE) return createDemoClient();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
