# Sports Stats App

A multi-league player-stats tracker. Launch sport: softball. Scales to basketball, baseball, and beyond without schema rewrites.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the design rationale, data model, and scaling plan.

## What's in the repo

| Path | What's there |
|---|---|
| `src/app/` | Next.js App Router pages (landing, signup, leagues, profiles, admin — being built out) |
| `src/lib/supabase/` | Browser, server, and middleware Supabase clients. `database.types.ts` is regenerated from the DB. |
| `src/lib/stats.ts` | Pure softball stat math (AVG, OBP, SLG, RISP) — unit-testable without a DB. |
| `src/middleware.ts` | Refreshes Supabase auth cookies on every request. |
| `supabase/migrations/` | SQL migrations. Run in order. |
| `supabase/config.toml` | Supabase CLI config. |

## First-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to https://supabase.com/dashboard and create a new project.
2. Wait for it to provision (~1 minute).
3. Under **Settings → API**, copy `URL` and `anon public` key.
4. Under **Settings → Database**, copy the **Transaction mode pooler** connection string.

### 3. Configure local env

```bash
cp .env.local.example .env.local
```

Fill in the three Supabase values and set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

### 4. Run the migrations

Install the Supabase CLI once:

```bash
npm install --save-dev supabase
```

Then link to your project and push migrations:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

This creates all tables, RLS policies, views, and helper functions.

### 5. Generate TypeScript types

```bash
npm run db:gen-types
```

Overwrites `src/lib/supabase/database.types.ts` with the real schema.

### 6. Promote yourself to app admin

After signing up once at `/signup`, open the SQL editor in Supabase Studio and run:

```sql
update public.user_profiles
set is_app_admin = true
where email = 'eesamerchant@gmail.com';
```

You'll then have access to `/admin`.

### 7. Run it

```bash
npm run dev
```

Open http://localhost:3000.

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import into Vercel.
3. Add the same env vars from `.env.local` to the Vercel project settings.
4. Deploy.

Free-tier limits are fine for early traffic. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the scale plan.

## What's built vs. what's next

**Built in this scaffold**
- Project structure + config
- Supabase client setup (browser, server, middleware)
- Complete database schema + RLS policies
- Player/league/career aggregation views
- Stat math library
- Landing page shell

**Next features to build (in order)**
1. Signup + login (email/password) with role routing
2. Create-a-league flow + join-a-league flow
3. League dashboard: roster, schedule
4. Post-game box score entry
5. Player profile page with career + per-league tabs
6. Live scoring
7. League settings (role/permission management)
8. App admin dashboard at `/admin`
9. PWA manifest + install prompt

Each of these will get its own focused commit. None depend on rewrites of what's already scaffolded.
