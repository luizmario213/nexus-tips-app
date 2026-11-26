-- Fase 3: último acesso ao painel — base do "risco de cancelamento" no admin.
-- Atualizado pelo layout do dashboard no máximo a cada 30 min por usuário.
alter table public.profiles add column if not exists ultimo_acesso timestamptz;
create index if not exists profiles_ultimo_acesso_idx on public.profiles (ultimo_acesso);
