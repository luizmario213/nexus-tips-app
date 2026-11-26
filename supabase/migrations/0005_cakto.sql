-- Integração com a Cakto (checkout + webhooks).
-- cakto_assinaturas: o estado de cada assinatura vendida na Cakto, por e-mail do comprador.
--   Existe mesmo quando a pessoa comprou ANTES de criar a conta Nexus — nesse caso user_id
--   fica nulo e a assinatura é "reivindicada" no primeiro acesso ao painel com o mesmo e-mail.
-- cakto_eventos: registro de todo aviso recebido (auditoria + evita processar o mesmo aviso 2x).
-- Só o servidor (service role) escreve aqui; o admin pode ler.

create table if not exists public.cakto_assinaturas (
  ref text primary key,
  email text not null,
  user_id uuid references public.profiles(id) on delete set null,
  cakto_sub_id text,
  status text not null check (status in ('ativa', 'atrasada', 'cancelada')),
  valor numeric,
  ultimo_evento text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cakto_assinaturas_email_idx on public.cakto_assinaturas (email);

create table if not exists public.cakto_eventos (
  id bigserial primary key,
  pedido_id text not null,
  evento text not null,
  email text,
  ref text,
  payload jsonb not null,
  recebido_em timestamptz not null default now(),
  unique (pedido_id, evento)
);

alter table public.cakto_assinaturas enable row level security;
alter table public.cakto_eventos enable row level security;

create policy "cakto_assinaturas: admin lê" on public.cakto_assinaturas
  for select using (public.is_admin());
create policy "cakto_eventos: admin lê" on public.cakto_eventos
  for select using (public.is_admin());
