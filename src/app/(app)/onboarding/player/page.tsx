"use client";

import { createPlayerProfile, type CreatePlayerState } from "@/lib/actions/player";
import { useActionState } from "react";

export default function OnboardingPlayerPage() {
  const [state, action, pending] = useActionState<CreatePlayerState, FormData>(
    createPlayerProfile,
    {}
  );

  return (
    <main className="container flex min-h-dvh flex-col items-center justify-center py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Create your player profile</h1>
          <p className="text-sm text-muted-foreground">
            This is how other players and leagues will see you
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="handle" className="text-sm font-medium">
              Handle <span className="text-muted-foreground">(unique username)</span>
            </label>
            <input
              id="handle"
              name="handle"
              type="text"
              required
              pattern="[a-zA-Z0-9_]+"
              minLength={3}
              maxLength={30}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="slugger_42"
            />
            {state.fieldErrors?.handle && (
              <p className="text-xs text-destructive">{state.fieldErrors.handle[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="display_name" className="text-sm font-medium">
              Display name
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              required
              maxLength={100}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="John Doe"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="bats" className="text-sm font-medium">
                Bats
              </label>
              <select
                id="bats"
                name="bats"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">--</option>
                <option value="R">Right</option>
                <option value="L">Left</option>
                <option value="S">Switch</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="throws" className="text-sm font-medium">
                Throws
              </label>
              <select
                id="throws"
                name="throws"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">--</option>
                <option value="R">Right</option>
                <option value="L">Left</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="hometown" className="text-sm font-medium">
              Hometown <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="hometown"
              name="hometown"
              type="text"
              maxLength={100}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Chicago, IL"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="bio" className="text-sm font-medium">
              Bio <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              maxLength={500}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Tell us about yourself..."
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
            {pending ? "Creating profile..." : "Create profile"}
          </button>
        </form>
      </div>
    </main>
  );
}
