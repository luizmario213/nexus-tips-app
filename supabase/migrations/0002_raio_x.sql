-- Raio-X do sinal: campos opcionais que alimentam a tela de análise detalhada.
-- Todos podem ficar vazios — a interface só mostra o que foi preenchido.
alter table public.signals add column if not exists confianca smallint check (confianca between 0 and 100);
alter table public.signals add column if not exists riscos text;
alter table public.signals add column if not exists analise_agentes jsonb;
alter table public.signals add column if not exists odd_abertura numeric;
