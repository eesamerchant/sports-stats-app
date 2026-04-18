"use client";

import { useState, useCallback } from "react";
import { updateManagerPermissions } from "@/lib/actions/permissions";

interface ManagerPermissionsProps {
  leagueId: string;
  initialPermissions: {
    can_add_players: boolean;
    can_remove_players: boolean;
    can_update_stats: boolean;
    can_edit_scores: boolean;
    can_manage_roster: boolean;
    can_create_games: boolean;
    can_edit_games: boolean;
  };
}

const PERMISSION_CONFIG = {
  playerManagement: [
    {
      key: "can_add_players" as const,
      label: "Add Players",
      description: "Allow team managers to add new players to the league",
    },
    {
      key: "can_remove_players" as const,
      label: "Remove Players",
      description: "Allow team managers to remove players from their team",
    },
    {
      key: "can_update_stats" as const,
      label: "Update Stats",
      description: "Allow team managers to enter and update player stats",
    },
    {
      key: "can_manage_roster" as const,
      label: "Manage Roster",
      description: "Allow team managers to change player details (jersey, team assignment)",
    },
  ],
  gameManagement: [
    {
      key: "can_create_games" as const,
      label: "Create Games",
      description: "Allow team managers to schedule new games",
    },
    {
      key: "can_edit_games" as const,
      label: "Edit Games",
      description: "Allow team managers to modify game details (date, time, teams)",
    },
    {
      key: "can_edit_scores" as const,
      label: "Edit Scores",
      description: "Allow team managers to edit final game scores",
    },
  ],
};

export function ManagerPermissions({
  leagueId,
  initialPermissions,
}: ManagerPermissionsProps) {
  const [permissions, setPermissions] = useState(initialPermissions);
  const [savedState, setSavedState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleToggle = useCallback(
    async (key: keyof typeof initialPermissions) => {
      const newValue = !permissions[key];
      const updatedPermissions = {
        ...permissions,
        [key]: newValue,
      };

      setPermissions(updatedPermissions);
      setError(null);
      setSavedState("saving");

      const result = await updateManagerPermissions(leagueId, updatedPermissions);

      if (result.error) {
        setError(result.error);
        setPermissions(permissions);
        setSavedState("idle");
      } else {
        setSavedState("saved");
        setTimeout(() => setSavedState("idle"), 2000);
      }
    },
    [leagueId, permissions]
  );

  const renderToggleSwitch = (enabled: boolean) => {
    return (
      <div
        className={`
          relative inline-flex h-7 w-12 items-center rounded-full
          transition-all duration-200 cursor-pointer
          ${enabled ? "bg-primary" : "bg-muted"}
        `}
      >
        <div
          className={`
            h-6 w-6 rounded-full bg-white shadow-md
            transform transition-transform duration-200
            ${enabled ? "translate-x-5" : "translate-x-0.5"}
          `}
        />
      </div>
    );
  };

  const renderPermissionRow = (
    key: keyof typeof initialPermissions,
    label: string,
    description: string
  ) => {
    return (
      <button
        key={key}
        onClick={() => handleToggle(key)}
        className="w-full flex items-start justify-between gap-4 px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground">{label}</div>
          <div className="text-sm text-muted-foreground mt-1">{description}</div>
        </div>
        <div className="flex-shrink-0 ml-2">
          {renderToggleSwitch(permissions[key])}
        </div>
      </button>
    );
  };

  return (
    <div className="w-full max-w-4xl space-y-8">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}

      {savedState === "saved" && (
        <div className="px-4 py-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm animate-in fade-in duration-200">
          Permissions updated
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            Player Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Control what team managers can do with players and rosters
          </p>
        </div>
        <div className="space-y-2 bg-card rounded-xl border border-border p-4">
          {PERMISSION_CONFIG.playerManagement.map((perm) =>
            renderPermissionRow(perm.key, perm.label, perm.description)
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            Game Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Control what team managers can do with games and schedules
          </p>
        </div>
        <div className="space-y-2 bg-card rounded-xl border border-border p-4">
          {PERMISSION_CONFIG.gameManagement.map((perm) =>
            renderPermissionRow(perm.key, perm.label, perm.description)
          )}
        </div>
      </div>

      {savedState === "saving" && (
        <div className="text-center text-sm text-muted-foreground">
          Saving...
        </div>
      )}
    </div>
  );
}
