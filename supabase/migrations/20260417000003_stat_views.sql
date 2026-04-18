-- ============================================================================
-- Aggregation views for player profile pages.
-- ----------------------------------------------------------------------------
-- These are regular views (not materialized) for correctness during early-
-- stage development. Convert to materialized views + refresh-on-write
-- triggers once we have real traffic — the API shape won't change.
-- ============================================================================

-- Per-player, per-league, per-season rollup.
create or replace view public.player_league_stats as
select
    p.id                          as player_id,
    p.handle                      as player_handle,
    p.display_name                as player_name,
    l.id                          as league_id,
    l.name                        as league_name,
    l.season                      as season,
    lm.team_name                  as team_name,
    count(distinct s.game_id)     as gp,
    sum(s.pa)::int                as pa,
    sum(s.ab)::int                as ab,
    sum(s.r)::int                 as r,
    sum(s.h)::int                 as h,
    sum(s.doubles)::int           as doubles,
    sum(s.triples)::int           as triples,
    sum(s.hr)::int                as hr,
    sum(s.rbi)::int               as rbi,
    sum(s.bb)::int                as bb,
    sum(s.so)::int                as so,
    sum(s.sf)::int                as sf,
    sum(s.hbp)::int               as hbp,
    sum(s.ab_risp)::int           as ab_risp,
    sum(s.h_risp)::int            as h_risp,
    (sum(s.doubles) + sum(s.triples) + sum(s.hr))::int as xbh,
    case when sum(s.ab) = 0 then 0
         else round(sum(s.h)::numeric / sum(s.ab), 3) end as avg,
    case when (sum(s.ab) + sum(s.bb) + sum(s.hbp) + sum(s.sf)) = 0 then 0
         else round(
             (sum(s.h) + sum(s.bb) + sum(s.hbp))::numeric
             / (sum(s.ab) + sum(s.bb) + sum(s.hbp) + sum(s.sf)),
             3) end as obp,
    case when sum(s.ab) = 0 then 0
         else round(
             ((sum(s.h) - sum(s.doubles) - sum(s.triples) - sum(s.hr))
              + 2*sum(s.doubles) + 3*sum(s.triples) + 4*sum(s.hr))::numeric
             / sum(s.ab), 3) end as slg,
    case when sum(s.ab_risp) = 0 then 0
         else round(sum(s.h_risp)::numeric / sum(s.ab_risp), 3) end as avg_risp
from public.players p
join public.league_memberships lm on lm.player_id = p.id
join public.leagues l on l.id = lm.league_id
left join public.softball_game_player_stats s on s.membership_id = lm.id
group by p.id, p.handle, p.display_name, l.id, l.name, l.season, lm.team_name;

-- Career rollup across every league a player has ever been in.
create or replace view public.player_career_stats as
select
    player_id,
    player_handle,
    player_name,
    sum(gp)::int           as gp,
    sum(pa)::int           as pa,
    sum(ab)::int           as ab,
    sum(r)::int            as r,
    sum(h)::int            as h,
    sum(doubles)::int      as doubles,
    sum(triples)::int      as triples,
    sum(hr)::int           as hr,
    sum(rbi)::int          as rbi,
    sum(bb)::int           as bb,
    sum(so)::int           as so,
    sum(sf)::int           as sf,
    sum(hbp)::int          as hbp,
    sum(ab_risp)::int      as ab_risp,
    sum(h_risp)::int       as h_risp,
    sum(xbh)::int          as xbh,
    case when sum(ab) = 0 then 0
         else round(sum(h)::numeric / sum(ab), 3) end as avg,
    case when (sum(ab) + sum(bb) + sum(hbp) + sum(sf)) = 0 then 0
         else round(
             (sum(h) + sum(bb) + sum(hbp))::numeric
             / (sum(ab) + sum(bb) + sum(hbp) + sum(sf)),
             3) end as obp,
    case when sum(ab) = 0 then 0
         else round(
             ((sum(h) - sum(doubles) - sum(triples) - sum(hr))
              + 2*sum(doubles) + 3*sum(triples) + 4*sum(hr))::numeric
             / sum(ab), 3) end as slg,
    case when sum(ab_risp) = 0 then 0
         else round(sum(h_risp)::numeric / sum(ab_risp), 3) end as avg_risp
from public.player_league_stats
group by player_id, player_handle, player_name;

grant select on public.player_league_stats to anon, authenticated;
grant select on public.player_career_stats to anon, authenticated;
