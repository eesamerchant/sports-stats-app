"use client";

import { createLeague, type LeagueActionState } from "@/lib/actions/league";
import { useActionState } from "react";

export default function OnboardingLeaguePage() {
  const [state, action, pending] = useActionState<LeagueActionState, FormData>(
    createLeague,
    {}
  );

  return (
    <main className="container flex min-h-dvh flex-col items-center justify-center py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Create your league</h1>
          <p className="text-sm text-muted-foreground">
            Set up your league and invite players with a join code
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              League name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={100}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Sunday Night Softball"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="sport" className="text-sm font-medium">
              Sport
            </label>
            <select
              id="sport"
              name="sport"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a sport...</option>
              <option value="softball">Softball</option>
              <option value="baseball">Baseball</option>
              <option value="basketball">Basketball</option>
              <option value="soccer">Soccer</option>
              <option value="cricket">Cricket</option>
              <option value="pickleball">Pickleball</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="season" className="text-sm font-medium">
              Season <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="season"
              name="season"
              type="text"
              maxLength={50}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Spring 2026"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              maxLength={500}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Tell players about your league..."
            />
          </div>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Creating league..." : "Create league"}
          </button>
        </form>
      </div>
    </main>
  );
}
