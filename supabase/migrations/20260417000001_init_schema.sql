-- ============================================================================
-- Sports Stats App — Initial Schema
-- ----------------------------------------------------------------------------
-- Design goals:
--   • Players live independent of leagues. A player can be in many leagues.
--   • Every stat is attached to a league_membership, so we can aggregate
--     per-league OR globally from the same rows.
--   • Sport-agnostic core (users/players/leagues/games); softball-specific
--     tables live alongside and will be joined by basketball/etc. later.
--   • Indexes defined up front for scale.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "citext";
create extension if not exists "pg_trgm";

-- ─── Users (profile extension of auth.users) ───────────────────────────────
create table public.user_profiles (
    id                uuid primary key references auth.users on delete cascade,
    email             citext not null unique,
    display_name      text not null,
    is_app_admin      boolean not null default false,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

comment on column public.user_profiles.is_app_admin is
    'Platform-level admin (Eesa). Bypasses RLS via SECURITY DEFINER helper.';

-- ─── Players ───────────────────────────────────────────────────────────────
create table public.players (
    id                uuid primary key default uuid_generate_v4(),
    user_id           uuid not null references public.user_profiles on delete cascade,
    handle            citext not null unique,
    display_name      text not null,
    bats              text check (bats in ('L','R','S')),
    throws            text check (throws in ('L','R')),
    photo_url         text,
    bio               text,
    hometown          text,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create unique index players_user_id_key on public.players(user_id);
create index players_handle_trgm on public.players using gin(handle gin_trgm_ops);
create index players_display_name_trgm on public.players using gin(display_name gin_trgm_ops);

-- ─── Leagues ───────────────────────────────────────────────────────────────
create type public.sport_kind as enum ('softball', 'baseball', 'basketball');
create type public.league_status as enum ('draft','active','archived');

create table public.leagues (
    id                uuid primary key default uuid_generate_v4(),
    owner_id          uuid not null references public.user_profiles on delete restrict,
    name              text not null,
    sport             public.sport_kind not null default 'softball',
    season            text,
    join_code         text not null unique,
    status            public.league_status not null default 'active',
    description       text,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index leagues_owner_id on public.leagues(owner_id);
create index leagues_name_trgm on public.leagues using gin(name gin_trgm_ops);
create index leagues_sport on public.leagues(sport);

-- ─── League memberships (player ↔ league join) ─────────────────────────────
create type public.league_role as enum ('player','captain','scorer','manager');

create table public.league_memberships (
    id                uuid primary key default uuid_generate_v4(),
    player_id         uuid not null references public.players on delete cascade,
    league_id         uuid not null references public.leagues on delete cascade,
    team_name         text,
    jersey_number     text,
    role              public.league_role not null default 'player',
    can_score         boolean not null default false,
    joined_at         timestamptz not null default now(),
    left_at           timestamptz,
    unique(player_id, league_id)
);

comment on column public.league_memberships.can_score is
    'If true, this member may enter stats for games in this league. Managers always can.';

create index league_memberships_league_id on public.league_memberships(league_id);
create index league_memberships_player_id on public.league_memberships(player_id);
create index league_memberships_can_score on public.league_memberships(league_id, can_score) where can_score;

-- ─── Games ─────────────────────────────────────────────────────────────────
create type public.game_status as enum ('scheduled','live','final','voided');

create table public.games (
    id                uuid primary key default uuid_generate_v4(),
    league_id         uuid not null references public.leagues on delete cascade,
    game_date         date not null,
    start_time        timestamptz,
    home_team         text,
    away_team         text,
    home_score        smallint,
    away_score        smallint,
    status            public.game_status not null default 'scheduled',
    notes             text,
    created_by        uuid references public.user_profiles on delete set null,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index games_league_date on public.games(league_id, game_date desc);
create index games_status on public.games(status);

-- ─── Softball at-bats (play-by-play, optional) ─────────────────────────────
create type public.ab_result as enum (
    '1B','2B','3B','HR','BB','SO','GO','FO','E','SF','SAC','HBP','FC'
);

create table public.softball_at_bats (
    id                bigserial primary key,
    game_id           uuid not null references public.games on delete cascade,
    membership_id     uuid not null references public.league_memberships on delete cascade,
    inning            smallint not null,
    half              text check (half in ('top','bottom')),
    sequence          smallint not null,     -- order within the game
    result            public.ab_result not null,
    rbi               smallint not null default 0,
    base_state_before smallint not null default 0, -- bitmask: 1=1B, 2=2B, 4=3B
    outs_before       smallint not null default 0,
    -- generated: any runner on 2B or 3B = RISP
    is_risp           boolean generated always as ((base_state_before & 6) > 0) stored,
    created_at        timestamptz not null default now()
);

create index softball_at_bats_game on public.softball_at_bats(game_id);
create index softball_at_bats_membership on public.softball_at_bats(membership_id);

-- ─── Softball per-game player stats (materialized box score) ───────────────
-- Written by either (a) the post-game box score form directly, or
-- (b) a trigger that aggregates `softball_at_bats` when a game is finalized.
create table public.softball_game_player_stats (
    id                uuid primary key default uuid_generate_v4(),
    game_id           uuid not null references public.games on delete cascade,
    membership_id     uuid not null references public.league_memberships on delete cascade,
    -- counting stats (the Eesa list)
    gp                smallint not null default 1,
    pa                smallint not null default 0,
    ab                smallint not null default 0,
    r                 smallint not null default 0,
    h                 smallint not null default 0,
    doubles           smallint not null default 0,
    triples           smallint not null default 0,
    hr                smallint not null default 0,
    rbi               smallint not null default 0,
    bb                smallint not null default 0,
    so                smallint not null default 0,
    sf                smallint not null default 0,
    hbp               smallint not null default 0,
    ab_risp           smallint not null default 0,
    h_risp            smallint not null default 0,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    unique(game_id, membership_id)
);

create index sgps_membership on public.softball_game_player_stats(membership_id);
create index sgps_game on public.softball_game_player_stats(game_id);

-- ─── Admin audit log ───────────────────────────────────────────────────────
create table public.admin_audit (
    id                bigserial primary key,
    actor_id          uuid references public.user_profiles on delete set null,
    action            text not null,
    entity_type       text not null,
    entity_id         text,
    before_state      jsonb,
    after_state       jsonb,
    created_at        timestamptz not null default now()
);

create index admin_audit_actor on public.admin_audit(actor_id);
create index admin_audit_entity on public.admin_audit(entity_type, entity_id);
create index admin_audit_created on public.admin_audit(created_at desc);

-- ─── updated_at trigger ────────────────────────────────────────────────────
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end $$;

create trigger user_profiles_updated_at
    before update on public.user_profiles
    for each row execute function public.tg_set_updated_at();

create trigger players_updated_at
    before update on public.players
    for each row execute function public.tg_set_updated_at();

create trigger leagues_updated_at
    before update on public.leagues
    for each row execute function public.tg_set_updated_at();

create trigger games_updated_at
    before update on public.games
    for each row execute function public.tg_set_updated_at();

create trigger sgps_updated_at
    before update on public.softball_game_player_stats
    for each row execute function public.tg_set_updated_at();

-- ─── Auto-create user_profile on auth.users insert ─────────────────────────
create or replace function public.tg_create_user_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    insert into public.user_profiles (id, email, display_name)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
    )
    on conflict (id) do nothing;
    return new;
end $$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.tg_create_user_profile();
