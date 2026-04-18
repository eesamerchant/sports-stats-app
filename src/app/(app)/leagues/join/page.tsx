"use client";

import { joinLeagueByCode, type LeagueActionState } from "@/lib/actions/league";
import { useActionState } from "react";

export default function JoinLeaguePage() {
  const [state, action, pending] = useActionState<LeagueActionState, FormData>(
    joinLeagueByCode,
    {}
  );

  return (
    <main className="container flex min-h-[60dvh] flex-col items-center justify-center py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Join a league</h1>
          <p className="text-sm text-muted-foreground">
            Enter the 6-character code your league manager shared
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">
              Join code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              maxLength={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-center text-2xl font-mono tracking-[0.3em] uppercase"
              placeholder="ABC123"
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
            {pending ? "Joining..." : "Join league"}
          </button>
        </form>
      </div>
    </main>
  );
}
