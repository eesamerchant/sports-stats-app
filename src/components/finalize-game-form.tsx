"use client";

import { finalizeGame } from "@/lib/actions/game";
import { useState } from "react";

export function FinalizeGameForm({ gameId }: { gameId: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError("");
    const result = await finalizeGame(gameId, formData);
    if (result?.error) {
      setError(result.error);
    }
    setPending(false);
  }

  return (
    <form
      action={handleSubmit}
      className="rounded-md border border-border p-4 space-y-4"
    >
      <h3 className="font-semibold">Finalize Game</h3>
      <p className="text-sm text-muted-foreground">
        Enter the final score to mark this game as complete.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="away_score" className="text-sm font-medium">
            Away score
          </label>
          <input
            id="away_score"
            name="away_score"
            type="number"
            min={0}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="home_score" className="text-sm font-medium">
            Home score
          </label>
          <input
            id="home_score"
            name="home_score"
            type="number"
            min={0}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Finalizing..." : "Mark as Final"}
      </button>
    </form>
  );
}
