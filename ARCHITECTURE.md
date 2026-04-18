# Sports Stats App — Architecture

## Vision

A platform where **leagues** sign up and manage seasons, **players** register once and join any number of leagues, and every stat a player records — in any league — rolls up onto a single **player profile**. Launching with **softball**; the data model is built to extend to other sports without schema rewrites.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router, TypeScript) | SSR + client components, one codebase for web, trivial to wrap as PWA for mobile |
| Database | **Postgres** via **Supabase** | Free tier with 500MB, real-time subscriptions built in, generous row limits |
| Auth | **Supabase Auth** | Email/password + OAuth, integrated with Postgres row-level security |
| Hosting | **Vercel** | Free tier, zero-config Next.js deploys, edge network |
| UI | **Tailwind + shadcn/ui** | Polished components, full design control, no runtime cost |
| State | React Server Components + Supabase client | Minimal client state, real-time via Supabase channels |
| Mobile | **PWA** (installable web app) first, **Capacitor** wrapper later | Zero extra code for v1 mobile; native shell available if App Store presence becomes important |

**Running cost at <1k users: $0/month.**

## Built to scale

The stack is free today but the architecture doesn't paint us into a corner when traffic grows. Specifically:

- **Connection pooling from day 1** — every server route uses Supabase's `pgbouncer` pool URL, not the direct Postgres connection. A Vercel function burst won't exhaust Postgres connections.
- **Read-heavy pages are cached at the edge** — public player profiles use Next.js ISR with tag-based revalidation (`revalidateTag('player:' + id)` when stats change). One DB hit per profile per minute at any traffic level.
- **Aggregations are precomputed** — `player_career_stats` and `player_league_stats` are Postgres materialized views refreshed on stat-write (via trigger or a Supabase Edge Function). The profile page reads pre-aggregated rows, not live `SUM(...)` across a million at-bats.
- **Indexes defined up front** on every FK + `(league_id, game_date)`, `(player_id, league_id)`, full-text search on player/league names.
- **Row-level security, not app-level auth** — scales to any number of routes without re-checking permissions.
- **Environment separation** — local / staging / prod each get their own Supabase project, no data cross-contamination.
- **Sport-agnostic core** — adding basketball is a new event table, not a schema migration to existing ones.
- **Background work** — anything expensive (stat recomputes, email digests, leaderboards) runs on Vercel Cron or Supabase Edge Functions, not inline in request handlers.
- **Observability hooks** — Sentry for errors, Vercel Analytics for web vitals, Supabase logs for DB slow queries. Free tiers cover early traffic.

When the free tiers run out (roughly ~50k MAU or heavy writes), the upgrade path is paying on the same providers — no rewrite.

## Data model

The key insight: a **player** is a person, independent of any league. **League membership** is the join table that connects them, and every stat-producing event (a game, an at-bat) belongs to a league membership — not directly to the player. That lets us aggregate stats globally *or* scoped to any league.

```
users (Supabase auth) ──┬── league_owners
                        └── players ──┬── league_memberships ──── leagues
                                      │         │
                                      │         └── games ──── at_bats
                                      │
                                      └── (profile: bio, photo, etc.)
```

### Tables (softball v1)

**`leagues`** — name, sport (`'softball'`), season, owner_id, join_code, created_at

**`players`** — user_id, display_name, handedness, position_preferences, photo_url

**`league_memberships`** — player_id, league_id, team_name, jersey_number, role (`'player' | 'captain' | 'manager' | 'scorer'`), joined_at
*(unique on player_id + league_id)*

**`games`** — league_id, game_date, home_team, away_team, opponent_score, status (`'scheduled' | 'live' | 'final'`), created_by

**`at_bats`** — game_id, membership_id, inning, result (`'1B' | '2B' | '3B' | 'HR' | 'BB' | 'SO' | 'GO' | 'FO' | 'E' | 'SF' | 'SAC' | 'HBP'`), rbi, base_state_before (bitmask: 1=1B, 2=2B, 4=3B), outs_before, is_risp (generated: base_state_before & 6 > 0), created_at

**`game_player_stats`** — game_id, membership_id, GP, PA, AB, R, H, doubles, triples, HR, RBI, BB, SO, SF, AB_risp, H_risp
*(derived from at_bats, materialized for fast profile reads — this is the row that gets written when a scorer enters a post-game box score)*

### Aggregation views

- **`player_career_stats`** — sums across all memberships for a player (career totals)
- **`player_league_stats`** — per (player_id, league_id): totals, averages, slugging, OBP
- **`player_season_stats`** — per season within a league

Views keep the profile page fast without triggering N+1 queries.

### Extending to other sports

When basketball ships, add `basketball_events` (shots, rebounds, assists) and `basketball_game_stats` — the `players`, `leagues`, `league_memberships`, `games` tables stay the same. A `sport` column on `leagues` drives which event tables the UI writes to.

## Auth model

Three user tiers share the same Supabase user:

1. **App owner (you)** — platform-level admin with read/write to everything via an `/admin` dashboard. Marked on the `users` table with `is_app_admin = true`. Not self-signup; toggled via a protected SQL migration.
2. **League manager** — signs up → creates a league → gets a join code. Owns the league and controls who can score games for it.
3. **Player** — signs up → creates a player profile → joins a league via code (or invite link).

A single Supabase user can be both manager and player (commissioner who also plays on a team).

### Role gating within a league

Every league has its own roster of roles, stored on `league_memberships`:
- **`manager`** — the league's owner + any co-managers they designate. Full league admin.
- **`scorer`** — designated by the manager; can create games and enter stats.
- **`captain`** — optional team-level role; may be granted scorer permission by the manager.
- **`player`** — read-only for their league; can see schedule, roster, standings.

The manager toggles scorer permission from the league settings page. Implementation: a boolean `can_score` column on `league_memberships`, plus an RLS policy that gates writes on `games` / `at_bats` / `game_player_stats` to rows where the current user is a manager OR has `can_score = true` in that league.

### Row-level security policies (key ones)
- A player can read their own profile and any league they're a member of.
- A league manager can read/write all games and stats in their league.
- A member with `can_score = true` can write stats in their league.
- Anyone can read a player's **public** profile (stats + name); private fields (email, phone) are owner-only.
- App admins (`is_app_admin = true`) bypass RLS via a `SECURITY DEFINER` helper function.

### App-owner dashboard (`/admin`)

Route-gated server-side: if `!user.is_app_admin`, return 404. The dashboard gives you:
- **Leagues** table — search, edit, delete any league. Change owner.
- **Players** table — search, merge duplicates, edit handles, delete accounts.
- **Games & stats** — find any game, correct a box score, void a game.
- **User management** — promote/demote app admins, suspend users, reset a password.
- **Platform metrics** — signups, active leagues, games per day, error rate.
- **Audit log** — every admin action is written to an `admin_audit` table (who, what, when, before/after JSON) so we can trace changes.

## Key routes (Next.js App Router)

```
/                              → Marketing + sign in
/signup                        → Role picker: league or player
/dashboard                     → Player home (my leagues, my stats)
/leagues/new                   → Create a league
/leagues/[id]                  → League dashboard (roster, schedule, standings)
/leagues/[id]/games/new        → Schedule or start a game
/leagues/[id]/games/[gameId]   → Game page (live scoring if active, box score if final)
/players/[handle]              → Public player profile with career + per-league stats
/players/[handle]/edit         → Profile settings (owner only)
/join/[code]                   → Join-a-league landing page
/admin                         → App-owner dashboard (you only)
/admin/leagues                 → All leagues
/admin/players                 → All players
/admin/users                   → Promote/demote admins, manage users
/admin/audit                   → Admin action log
```

## Core user flows

**Commissioner sets up a league**
Sign up → create league (name, sport=softball, season) → get join code → share with players.

**Player joins and plays**
Sign up → create profile → paste join code → picked for a team → plays games → stats show up on profile.

**Recording stats (two paths)**
- **Post-game** (simple): official opens the game page, enters a box score per player (AB, H, R, RBI, BB, SO, 2B, 3B, HR). One form submission writes `game_player_stats` rows.
- **Live** (fancier): official opens the game in "Live" mode, taps each at-bat as it happens. `at_bats` rows stream in via Supabase Realtime; `game_player_stats` is regenerated on game finalization.

**Viewing a profile**
`/players/[handle]` shows three tabs: **Career** (totals across all leagues), **By league** (breakdown per league/season), **Recent games** (last 10 box scores).

## Softball stats tracked (v1)

**Counting stats (stored directly on `game_player_stats`):**

| Code | Name | Notes |
|---|---|---|
| GP | Games Played | counted from distinct games with a PA |
| AB | At Bats | PA minus BB, HBP, SF, SAC |
| R | Runs | scored |
| H | Hits | 1B + 2B + 3B + HR |
| 2B | Doubles | |
| 3B | Triples | |
| HR | Home Runs | |
| RBI | Runs Batted In | |
| BB | Walks | |
| SO | Strikeouts | |
| SF | Sacrifice Fly | excluded from AB |
| AB_RISP | AB with runners on 2nd/3rd | used for H/RISP |
| H_RISP | Hits with runners on 2nd/3rd | used for H/RISP |

**Derived stats (computed in views / on the client):**

| Code | Name | Formula |
|---|---|---|
| AVG | Batting Average | H / AB |
| OBP | On-Base Percentage | (H + BB + HBP) / (AB + BB + HBP + SF) |
| SLG | Slugging Percentage | (1B + 2×2B + 3×3B + 4×HR) / AB |
| XBH | Extra-Base Hits | 2B + 3B + HR |
| H/RISP | Batting Average with RISP | H_RISP / AB_RISP |

**Two entry modes:**
- **Box score entry** (post-game): a single form per player that captures the 12 counting stats above. Fast — one minute per player.
- **Live scoring** (play-by-play): each at-bat is logged with its result + base state before the plate appearance. RISP is derived from `base_state_before` so scorers don't have to remember to flag it. `game_player_stats` is regenerated on game finalization.

Not in v1 but easy to add later: pitching stats (IP, ER, K, BB, WHIP, ERA), fielding stats (PO, A, E, FP), situational splits beyond RISP (two-outs, late innings, vs. LHP).

## Roadmap

**v1 (4–6 weeks of solo work, faster with me building):** auth, league signup, player signup, join flow, post-game stat entry, live scoring, player profiles, PWA install.

**v1.1:** League standings page, player leaderboards, profile photos, shareable profile links.

**v2:** Pitching & fielding stats for softball. Export to CSV. Team pages.

**v3:** Second sport (basketball most likely — high user overlap, rich stat set). Abstraction layer for sport-specific events.

**v4:** Native mobile wrapper via Capacitor if iOS/App Store presence matters.
