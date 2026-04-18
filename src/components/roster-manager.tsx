"use client";

import { useState } from "react";
import { useActionState } from "react";
import {
  updateMembership,
  removeMember,
  type AdminActionState,
} from "@/lib/actions/admin";

type Membership = {
  id: string;
  playerId: string;
  role: "player" | "captain" | "scorer" | "manager";
  teamName: string | null;
  jerseyNumber: number | null;
  canScore: boolean;
  player: {
    id: string;
    handle: string;
    displayName: string;
  };
};

interface RosterManagerProps {
  leagueId: string;
  memberships: Membership[];
  isOwner: boolean;
}

export function RosterManager({
  leagueId,
  memberships,
  isOwner,
}: RosterManagerProps) {
  const [newTeamName, setNewTeamName] = useState("");
  const [showNewTeamForm, setShowNewTeamForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Group memberships by team_name
  const groupedByTeam = memberships.reduce(
    (acc, m) => {
      const team = m.teamName || "Unassigned";
      if (!acc[team]) {
        acc[team] = [];
      }
      acc[team].push(m);
      return acc;
    },
    {} as Record<string, Membership[]>
  );

  // Sort teams: "Unassigned" first, then alphabetically
  const sortedTeams = Object.keys(groupedByTeam).sort((a, b) => {
    if (a === "Unassigned") return -1;
    if (b === "Unassigned") return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      {/* Teams Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Teams & Roster</h2>
          {isOwner && (
            <button
              onClick={() => setShowNewTeamForm(!showNewTeamForm)}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              {showNewTeamForm ? "Cancel" : "+ New Team"}
            </button>
          )}
        </div>

        {/* New Team Form */}
        {showNewTeamForm && isOwner && (
          <div className="rounded-md border border-border bg-card p-4 space-y-3">
            <div>
              <label htmlFor="team_name" className="text-sm font-medium">
                Team Name
              </label>
              <input
                id="team_name"
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g., Team A, Visitors, etc."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm mt-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Select unassigned players below and assign them to this team using the role dropdown or edit actions.
            </p>
            <button
              onClick={() => {
                if (newTeamName.trim()) {
                  setNewTeamName("");
                  setShowNewTeamForm(false);
                  // Additional logic can be added here if needed
                }
              }}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              Create Team
            </button>
          </div>
        )}

        {/* Team Cards */}
        <div className="grid gap-4">
          {sortedTeams.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center">
              <p className="text-muted-foreground">
                No players in the roster yet.
              </p>
            </div>
          ) : (
            sortedTeams.map((teamName) => (
              <TeamCard
                key={teamName}
                teamName={teamName}
                members={groupedByTeam[teamName]}
                leagueId={leagueId}
                isOwner={isOwner}
                deletingId={deletingId}
                setDeletingId={setDeletingId}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function TeamCard({
  teamName,
  members,
  leagueId,
  isOwner,
  deletingId,
  setDeletingId,
}: {
  teamName: string;
  members: Membership[];
  leagueId: string;
  isOwner: boolean;
  deletingId: string | null;
  setDeletingId: (id: string | null) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      {/* Team Header */}
      <div className="bg-secondary/30 px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-foreground">{teamName}</h3>
        <p className="text-xs text-muted-foreground">
          {members.length} player{members.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Players Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2 font-medium">Player</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Jersey #</th>
              <th className="px-4 py-2 font-medium text-center">Can Score</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <PlayerRow
                key={member.id}
                member={member}
                leagueId={leagueId}
                isOwner={isOwner}
                isDeleting={deletingId === member.id}
                setDeletingId={setDeletingId}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlayerRow({
  member,
  leagueId,
  isOwner,
  isDeleting,
  setDeletingId,
}: {
  member: Membership;
  leagueId: string;
  isOwner: boolean;
  isDeleting: boolean;
  setDeletingId: (id: string | null) => void;
}) {
  const [editingJersey, setEditingJersey] = useState(false);
  const [jerseyValue, setJerseyValue] = useState(
    member.jerseyNumber?.toString() ?? ""
  );

  const boundUpdateAction = updateMembership.bind(null, member.id);
  const [updateState, updateAction, updatePending] =
    useActionState<AdminActionState, FormData>(boundUpdateAction, {});

  const boundRemoveAction = removeMember.bind(null, member.id);
  const [removeState, removeAction, removePending] =
    useActionState<AdminActionState, FormData>(boundRemoveAction, {});

  const handleJerseySave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("jersey_number", jerseyValue);
    updateAction(formData);
    setEditingJersey(false);
  };

  return (
    <tr className="border-b border-border/50 hover:bg-secondary/20">
      {/* Player Name */}
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-foreground">
            {member.player.displayName}
          </p>
          <p className="text-xs text-muted-foreground">
            @{member.player.handle}
          </p>
        </div>
      </td>

      {/* Role Dropdown */}
      <td className="px-4 py-3">
        {isOwner ? (
          <form
            action={updateAction}
            className="inline-block"
          >
            <select
              name="role"
              defaultValue={member.role}
              onChange={(e) => {
                const formData = new FormData();
                formData.append("role", e.target.value);
                updateAction(formData);
              }}
              className="rounded-md border border-border bg-background px-2 py-1 text-sm capitalize"
            >
              <option value="player">Player</option>
              <option value="captain">Captain</option>
              <option value="scorer">Scorer</option>
              <option value="manager">Manager</option>
            </select>
          </form>
        ) : (
          <span className="capitalize text-muted-foreground">
            {member.role}
          </span>
        )}
      </td>

      {/* Jersey Number */}
      <td className="px-4 py-3">
        {isOwner ? (
          <>
            {editingJersey ? (
              <form onSubmit={handleJerseySave} className="flex gap-1">
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={jerseyValue}
                  onChange={(e) => setJerseyValue(e.target.value)}
                  className="w-12 rounded-md border border-border bg-background px-2 py-1 text-sm text-center"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={updatePending}
                  className="rounded px-2 py-1 text-xs bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingJersey(false);
                    setJerseyValue(member.jerseyNumber?.toString() ?? "");
                  }}
                  className="rounded px-2 py-1 text-xs bg-secondary text-foreground hover:opacity-90"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => setEditingJersey(true)}
                className="rounded px-2 py-1 text-sm hover:bg-secondary transition"
              >
                {member.jerseyNumber ? `#${member.jerseyNumber}` : "—"}
              </button>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">
            {member.jerseyNumber ? `#${member.jerseyNumber}` : "—"}
          </span>
        )}
      </td>

      {/* Can Score Toggle */}
      <td className="px-4 py-3 text-center">
        {isOwner ? (
          <form action={updateAction}>
            <input
              type="hidden"
              name="can_score"
              value={member.canScore ? "false" : "true"}
            />
            <button
              type="submit"
              disabled={updatePending}
              className={`inline-flex items-center justify-center rounded px-2 py-1 text-xs font-medium transition ${
                member.canScore
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-muted-foreground"
              } hover:opacity-90 disabled:opacity-50`}
            >
              {member.canScore ? "Yes" : "No"}
            </button>
          </form>
        ) : (
          <span className={member.canScore ? "text-accent" : "text-muted-foreground"}>
            {member.canScore ? "Yes" : "No"}
          </span>
        )}
      </td>

      {/* Remove Button */}
      <td className="px-4 py-3 text-right">
        {isOwner && (
          <>
            {isDeleting ? (
              <div className="flex gap-1 justify-end">
                <form action={removeAction}>
                  <button
                    type="submit"
                    disabled={removePending}
                    className="rounded px-2 py-1 text-xs bg-destructive text-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {removePending ? "Removing..." : "Confirm"}
                  </button>
                </form>
                <button
                  onClick={() => setDeletingId(null)}
                  className="rounded px-2 py-1 text-xs bg-secondary text-foreground hover:opacity-90"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeletingId(member.id)}
                className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-destructive transition"
              >
                Remove
              </button>
            )}
          </>
        )}
      </td>
    </tr>
  );
}
