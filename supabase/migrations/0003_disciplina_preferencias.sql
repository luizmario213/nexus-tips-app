-- Fase 2: preferências do onboarding + regras de disciplina (jogo responsável).
alter table public.profiles add column if not exists perfil_risco text check (perfil_risco in ('conservador', 'moderado', 'arrojado'));
alter table public.profiles add column if not exists ligas_favoritas text[] not null default '{}';
-- Limite de valor apostado por dia e stop de perda diária (em R$). Nulos = sem regra.
alter table public.profiles add column if not exists limite_diario numeric check (limite_diario > 0);
alter table public.profiles add column if not exists stop_diario numeric check (stop_diario > 0);
-- Pausa voluntária: enquanto pausa_ate > now(), o painel não deixa marcar operação.
alter table public.profiles add column if not exists pausa_ate timestamptz;
alter table public.profiles add column if not exists pausas_usadas integer not null default 0;
alter table public.profiles add column if not exists regras_desde timestamptz;
