"use client";

import { useState } from "react";

export function AddTeamForm({
  leagueId,
  existingTeams,
  onTeamAdded,
}: {
  leagueId: string;
  existingTeams: string[];
  onTeamAdded?: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = name.trim();

    if (!trimmed) {
      setError("Team name is required.");
      return;
    }

    if (existingTeams.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setError("A team with this name already exists.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/teams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId, teamName: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create team.");
      } else {
        setName("");
        setShowForm(false);
        onTeamAdded?.(trimmed);
        // Reload to see new team
        window.location.reload();
      }
    } catch {
      setError("Failed to create team.");
    } finally {
      setLoading(false);
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
      >
        + Add Team
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <label className="block text-sm font-medium mb-1">Team Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Thunder"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          autoFocus
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
      >
        {loading ? "Adding..." : "Add"}
      </button>
      <button
        type="button"
        onClick={() => { setShowForm(false); setError(""); }}
        className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
      >
        Cancel
      </button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
