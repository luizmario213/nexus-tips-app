// Tipos compartilhados, espelhando o schema em supabase/migrations/0001_init.sql.
// Mantenha isto em sincronia manualmente por enquanto (dá pra gerar automático depois
// com `supabase gen types typescript`, quando o projeto Supabase já existir).

export type Role = "user" | "admin";

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  time_coracao: string | null;
  banca_inicial: number | null;
  tutorial_completo: boolean;
  ativo: boolean;
  created_at: string;
  // ---- Fase 2 (migration 0003) ----
  perfil_risco?: PerfilRisco | null;
  ligas_favoritas?: string[] | null;
  limite_diario?: number | null;
  stop_diario?: number | null;
  pausa_ate?: string | null;
  pausas_usadas?: number | null;
  regras_desde?: string | null;
  // ---- Fase 3 (migration 0004) ----
  ultimo_acesso?: string | null;
}

export type PerfilRisco = "conservador" | "moderado" | "arrojado";

export type Plano = "mensal" | "semestral" | "anual";
export type SubscriptionStatus = "ativa" | "cancelada" | "atrasada";

export interface Subscription {
  id: string;
  user_id: string;
  plano: Plano;
  valor: number;
  status: SubscriptionStatus;
  provider: string;
  provider_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  canceled_at: string | null;
}

export type SignalStatus = "no_ar" | "green" | "red" | "cancelado";
export type SignalTipo = "simples" | "bilhete";
export type SugestaoTipo = "percentual" | "unidades" | "valor";

export interface Signal {
  id: string;
  competicao: string;
  time_a: string;
  time_b: string;
  mercado: string;
  odd: number;
  estrategia: string | null;
  rationale: string | null;
  status: SignalStatus;
  live: boolean;
  // Horário marcado do jogo. Usado pra calcular "ao vivo" sozinho (sem precisar do check
  // manual): assim que o horário chega e o sinal ainda está "no_ar", já mostra ao vivo.
  horario_jogo: string | null;
  tipo: SignalTipo;
  casa_nome: string | null;
  casa_link: string | null;
  sugestao_tipo: SugestaoTipo | null;
  sugestao_valor: number | null;
  published_by: string | null;
  created_at: string;
  // ---- Raio-X do sinal (migration 0002, todos opcionais) ----
  // Confiança atribuída pela equipe (0–100). Sem valor, o Raio-X mostra só a
  // probabilidade implícita da odd — nunca inventa um número.
  confianca?: number | null;
  // "Por que pode dar errado": riscos conhecidos da entrada, escritos pelo admin.
  riscos?: string | null;
  // O que cada agente encontrou (chaves: jogos, stats, odds, historico, oportunidade).
  analise_agentes?: Partial<Record<AgenteId, string>> | null;
  // Odd no momento em que a análise começou — mostra o movimento até a publicação.
  odd_abertura?: number | null;
}

export type AgenteId = "jogos" | "stats" | "odds" | "historico" | "oportunidade";

// Um jogo dentro de um bilhete (sinal com tipo "bilhete"). Só existe quando o sinal
// combina múltiplos jogos — um sinal "simples" não tem nenhuma linha aqui.
export interface SignalLeg {
  id: string;
  signal_id: string;
  competicao: string;
  time_a: string;
  time_b: string;
  mercado: string;
  odd: number;
  ordem: number;
  created_at: string;
}

export type OperationStatus = "andamento" | "green" | "red" | "cancelada";

export interface Operation {
  id: string;
  user_id: string;
  signal_id: string;
  valor: number;
  odd_obtida: number | null;
  status: OperationStatus;
  finalizada_em: string | null;
  created_at: string;
}

// Movimento manual de banca (aporte, saque ou ajuste de correção) — ver src/app/dashboard/gestao.
// "valor" é sempre o delta assinado: aporte positivo, saque negativo, ajuste positivo ou
// negativo conforme corrige a banca pra cima ou pra baixo.
export type BancaMovimentoTipo = "aporte" | "saque" | "ajuste";

export interface BancaMovimento {
  id: string;
  user_id: string;
  tipo: BancaMovimentoTipo;
  valor: number;
  nota: string | null;
  created_at: string;
}

export type TicketStatus = "aberto" | "respondido" | "fechado";

export interface SupportTicket {
  id: string;
  user_id: string;
  assunto: string;
  status: TicketStatus;
  prioridade: "alta" | "media" | "baixa";
  created_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender: "user" | "admin";
  text: string;
  created_at: string;
}

// Configuração geral do site — linha única (id sempre 1). Guarda a casa de apostas
// "base" usada no botão de cadastro pequeno do dashboard do usuário.
export interface AppSettings {
  id: number;
  casa_nome: string | null;
  casa_link: string | null;
  whatsapp_link: string | null;
  updated_at: string;
}

// 1 "unidade" = 1% da banca inicial informada no tutorial. É a convenção mais comum em
// gestão de banca esportiva — deixamos isso explícito aqui porque é a única suposição
// numérica que fazemos por conta própria nessa feature (o resto vem direto do admin).
export const VALOR_UNIDADE_PCT = 1;

// Preços vigentes — mesmos valores usados no protótipo. Ajuste aqui quando a promoção
// de lançamento (48h) acabar.
export const PLANOS = {
  mensal: { label: "Mensal", valor: 47.9, valorPadrao: 97.9 },
  semestral: { label: "Semestral", valor: 397.9 },
  anual: { label: "Anual", valor: 697.9 },
} as const;
