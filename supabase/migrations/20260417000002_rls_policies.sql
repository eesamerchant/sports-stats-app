-- ============================================================================
-- Row-Level Security policies
-- ----------------------------------------------------------------------------
-- Philosophy: all tables are locked by default. Every access path is an
-- explicit policy. App admins bypass via the is_app_admin() helper.
-- ============================================================================

-- ─── Helpers ───────────────────────────────────────────────────────────────
create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = public as $$
    select coalesce(
        (select is_app_admin from public.user_profiles where id = auth.uid()),
        false
    );
$$;

create or replace function public.is_league_manager(p_league_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists(
        select 1 from public.leagues
        where id = p_league_id and owner_id = auth.uid()
    ) or exists(
        select 1
        from public.league_memberships lm
        join public.players p on p.id = lm.player_id
        where lm.league_id = p_league_id
          and p.user_id = auth.uid()
          and lm.role = 'manager'
    );
$$;

create or replace function public.can_score_league(p_league_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select public.is_league_manager(p_league_id) or exists(
        select 1
        from public.league_memberships lm
        join public.players p on p.id = lm.player_id
        where lm.league_id = p_league_id
          and p.user_id = auth.uid()
          and (lm.can_score = true or lm.role in ('scorer','manager'))
    );
$$;

-- ─── Enable RLS on every table ─────────────────────────────────────────────
alter table public.user_profiles                enable row level security;
alter table public.players                      enable row level security;
alter table public.leagues                      enable row level security;
alter table public.league_memberships           enable row level security;
alter table public.games                        enable row level security;
alter table public.softball_at_bats             enable row level security;
alter table public.softball_game_player_stats   enable row level security;
alter table public.admin_audit                  enable row level security;

-- ─── user_profiles ─────────────────────────────────────────────────────────
create policy "user_profiles read own or admin" on public.user_profiles
    for select using (id = auth.uid() or public.is_app_admin());

create policy "user_profiles update own" on public.user_profiles
    for update using (id = auth.uid()) with check (id = auth.uid());

create policy "user_profiles admin full access" on public.user_profiles
    for all using (public.is_app_admin()) with check (public.is_app_admin());

-- ─── players ───────────────────────────────────────────────────────────────
-- Public read of player cards (profile pages are public). Sensitive
-- contact fields live on user_profiles and are not exposed here.
create policy "players public read" on public.players
    for select using (true);

create policy "players insert own" on public.players
    for insert with check (user_id = auth.uid());

create policy "players update own" on public.players
    for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "players admin full" on public.players
    for all using (public.is_app_admin()) with check (public.is_app_admin());

-- ─── leagues ───────────────────────────────────────────────────────────────
create policy "leagues public read" on public.leagues
    for select using (true);

create policy "leagues insert self as owner" on public.leagues
    for insert with check (owner_id = auth.uid());

create policy "leagues manager update" on public.leagues
    for update using (public.is_league_manager(id))
    with check (public.is_league_manager(id));

create policy "leagues manager delete" on public.leagues
    for delete using (public.is_league_manager(id));

create policy "leagues admin full" on public.leagues
    for all using (public.is_app_admin()) with check (public.is_app_admin());

-- ─── league_memberships ────────────────────────────────────────────────────
create policy "memberships read members" on public.league_memberships
    for select using (true); -- roster is public

create policy "memberships self-join" on public.league_memberships
    for insert with check (
        exists(select 1 from public.players where id = player_id and user_id = auth.uid())
        or public.is_league_manager(league_id)
    );

create policy "memberships manager or self update" on public.league_memberships
    for update using (
        public.is_league_manager(league_id)
        or exists(select 1 from public.players where id = player_id and user_id = auth.uid())
    ) with check (
        public.is_league_manager(league_id)
        or exists(select 1 from public.players where id = player_id and user_id = auth.uid())
    );

create policy "memberships manager delete" on public.league_memberships
    for delete using (public.is_league_manager(league_id));

create policy "memberships admin full" on public.league_memberships
    for all using (public.is_app_admin()) with check (public.is_app_admin());

-- ─── games ─────────────────────────────────────────────────────────────────
create policy "games public read" on public.games
    for select using (true);

create policy "games scorer write" on public.games
    for insert with check (public.can_score_league(league_id));

create policy "games scorer update" on public.games
    for update using (public.can_score_league(league_id))
    with check (public.can_score_league(league_id));

create policy "games manager delete" on public.games
    for delete using (public.is_league_manager(league_id));

create policy "games admin full" on public.games
    for all using (public.is_app_admin()) with check (public.is_app_admin());

-- ─── softball_at_bats ──────────────────────────────────────────────────────
create policy "at_bats public read" on public.softball_at_bats
    for select using (true);

create policy "at_bats scorer write" on public.softball_at_bats
    for all using (
        public.can_score_league((select league_id from public.games where id = game_id))
    ) with check (
        public.can_score_league((select league_id from public.games where id = game_id))
    );

create policy "at_bats admin full" on public.softball_at_bats
    for all using (public.is_app_admin()) with check (public.is_app_admin());

-- ─── softball_game_player_stats ────────────────────────────────────────────
create policy "sgps public read" on public.softball_game_player_stats
    for select using (true);

create policy "sgps scorer write" on public.softball_game_player_stats
    for all using (
        public.can_score_league((select league_id from public.games where id = game_id))
    ) with check (
        public.can_score_league((select league_id from public.games where id = game_id))
    );

create policy "sgps admin full" on public.softball_game_player_stats
    for all using (public.is_app_admin()) with check (public.is_app_admin());

-- ─── admin_audit (append-only, admin-read) ─────────────────────────────────
create policy "admin_audit admin read" on public.admin_audit
    for select using (public.is_app_admin());

create policy "admin_audit admin insert" on public.admin_audit
    for insert with check (public.is_app_admin());
