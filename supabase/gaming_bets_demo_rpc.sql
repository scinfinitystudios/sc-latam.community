-- SC Gaming Bets: RPC segura para registrar pronósticos con puntos virtuales.
-- Ejecutar DESPUÉS de gaming_bets_demo_schema.sql en Supabase SQL Editor.
-- No acepta dinero real ni crea saldo monetario.

create or replace function public.place_esports_demo_prediction(
  p_market_id uuid,
  p_demo_points numeric
)
returns public.esports_demo_predictions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_market public.esports_markets%rowtype;
  v_match public.esports_matches%rowtype;
  v_prediction public.esports_demo_predictions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para guardar un pronóstico.';
  end if;

  if p_demo_points is null or p_demo_points <= 0 or p_demo_points > 1000 then
    raise exception 'Los puntos de demostración deben ser mayores que 0 y como máximo 1000.';
  end if;

  select * into v_market
  from public.esports_markets
  where id = p_market_id
  for share;

  if not found or not v_market.is_demo or v_market.status <> 'open' then
    raise exception 'Este mercado de demostración no está disponible.';
  end if;

  select * into v_match
  from public.esports_matches
  where id = v_market.match_id
  for share;

  if not found or not v_match.is_demo or v_match.status not in ('upcoming', 'live') then
    raise exception 'La partida de demostración no está disponible.';
  end if;

  insert into public.esports_demo_predictions (
    user_id, market_id, demo_points, odds_snapshot
  ) values (
    v_user_id, v_market.id, p_demo_points, v_market.odds
  )
  returning * into v_prediction;

  return v_prediction;
end;
$$;

revoke all on function public.place_esports_demo_prediction(uuid, numeric) from public;
grant execute on function public.place_esports_demo_prediction(uuid, numeric) to authenticated;

-- Impide que el cliente inserte directamente pronósticos saltándose la validación
-- del mercado y la cuota. El alta se hace únicamente mediante la función RPC.
drop policy if exists "Users can create their own demo predictions" on public.esports_demo_predictions;
revoke insert on public.esports_demo_predictions from anon, authenticated;
grant select on public.esports_demo_predictions to authenticated;

-- Mantener la lectura propia mediante la política RLS ya definida en el esquema base.
