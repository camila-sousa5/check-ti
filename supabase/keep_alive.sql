-- Executar uma vez no SQL Editor do Supabase.
-- Cria uma tabela de "heartbeat" e uma função que grava nela.
-- A rota /api/keep-alive chama essa função diariamente, gerando uma ESCRITA real
-- no banco (mais confiável que um SELECT para o Supabase registrar atividade).

create table if not exists public.keep_alive (
  id           int primary key default 1,
  ultimo_ping  timestamptz not null default now(),
  total_pings  bigint not null default 0,
  constraint keep_alive_linha_unica check (id = 1)
);

alter table public.keep_alive enable row level security;
-- Sem policies: ninguém acessa a tabela diretamente, apenas via função abaixo.

create or replace function public.ping_keep_alive()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  agora timestamptz;
begin
  insert into public.keep_alive (id, ultimo_ping, total_pings)
  values (1, now(), 1)
  on conflict (id) do update
    set ultimo_ping = excluded.ultimo_ping,
        total_pings = public.keep_alive.total_pings + 1
  returning ultimo_ping into agora;

  return agora;
end;
$$;

revoke all on function public.ping_keep_alive() from public;
grant execute on function public.ping_keep_alive() to anon, authenticated;
