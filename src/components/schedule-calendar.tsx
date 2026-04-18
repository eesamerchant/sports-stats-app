"use client";

import React, { useState, useMemo } from "react";
import { updateGameSchedule, deleteGame } from "@/lib/actions/schedule";

interface GameType {
  id: string;
  game_date: string;
  start_time: string | null;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  notes: string | null;
  field_name?: string | null;
  location?: string | null;
  duration_minutes?: number | null;
}

interface ScheduleCalendarProps {
  leagueId: string;
  games: GameType[];
  teams: string[];
  canEdit: boolean;
  schedulePublished: boolean;
}

// Generate iCalendar format for export
function generateICS(games: GameType[]): string {
  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Sports Stats App//EN");
  lines.push("CALSCALE:GREGORIAN");

  games.forEach((game) => {
    if (game.status === "voided") return;

    const gameDate = new Date(game.game_date);
    const [year, month, day] = [
      gameDate.getUTCFullYear(),
      String(gameDate.getUTCMonth() + 1).padStart(2, "0"),
      String(gameDate.getUTCDate()).padStart(2, "0"),
    ];

    let startTime = `${year}${month}${day}T090000Z`;
    let endTime = `${year}${month}${day}T100000Z`;

    if (game.start_time) {
      const [hours, minutes] = game.start_time.split(":").map(Number);
      startTime = `${year}${month}${day}T${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}00Z`;
      const durationMins = game.duration_minutes || 90;
      const endHours = Math.floor((hours * 60 + minutes + durationMins) / 60);
      const endMins = (minutes + durationMins) % 60;
      endTime = `${year}${month}${day}T${String(endHours).padStart(2, "0")}${String(endMins).padStart(2, "0")}00Z`;
    }

    const summary = `${game.away_team || "TBD"} @ ${game.home_team || "TBD"}`;
    const location = game.location || game.field_name || "TBD";

    lines.push("BEGIN:VEVENT");
    lines.push(`DTSTART:${startTime}`);
    lines.push(`DTEND:${endTime}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`LOCATION:${location}`);
    lines.push(`UID:${game.id}@sportsapp.local`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// Status badge colors
function getStatusColor(status: string): string {
  switch (status) {
    case "scheduled":
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "live":
      return "bg-red-500/20 text-red-300 border-red-500/30";
    case "final":
      return "bg-green-500/20 text-green-300 border-green-500/30";
    case "voided":
      return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    default:
      return "bg-gray-500/20 text-gray-300 border-gray-500/30";
  }
}

export default function ScheduleCalendar({
  leagueId,
  games,
  teams,
  canEdit,
  schedulePublished,
}: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isMobile, setIsMobile] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<GameType>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter games
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      if (filterTeam !== "all" && game.home_team !== filterTeam && game.away_team !== filterTeam) {
        return false;
      }
      if (filterStatus !== "all" && game.status !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [games, filterTeam, filterStatus]);

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Get games for a specific day
  const getGamesForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filteredGames.filter((game) => game.game_date === dateStr);
  };

  // Check if date is today
  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // Open detail view
  const handleSelectGame = (game: GameType) => {
    setSelectedGame(game);
    setEditFormData(game);
    setEditMode(false);
    setError(null);
  };

  // Save game changes
  const handleSaveGame = async () => {
    if (!selectedGame) return;
    setLoading(true);
    setError(null);

    try {
      const result = await updateGameSchedule(selectedGame.id, {
        game_date: editFormData.game_date || selectedGame.game_date,
        start_time: editFormData.start_time || selectedGame.start_time || undefined,
        home_team: editFormData.home_team || selectedGame.home_team || undefined,
        away_team: editFormData.away_team || selectedGame.away_team || undefined,
        notes: editFormData.notes || selectedGame.notes || undefined,
        status: editFormData.status || selectedGame.status,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSelectedGame(null);
        setEditMode(false);
      }
    } catch (err) {
      setError("Failed to save game");
    } finally {
      setLoading(false);
    }
  };

  // Delete game
  const handleDeleteGame = async () => {
    if (!selectedGame || !confirm("Are you sure you want to delete this game?")) return;
    setLoading(true);
    setError(null);

    try {
      const result = await deleteGame(selectedGame.id);
      if (result.error) {
        setError(result.error);
      } else {
        setSelectedGame(null);
      }
    } catch (err) {
      setError("Failed to delete game");
    } finally {
      setLoading(false);
    }
  };

  // Void game (mark as voided)
  const handleVoidGame = async () => {
    if (!selectedGame || !confirm("Are you sure you want to void this game?")) return;
    setLoading(true);
    setError(null);

    try {
      const result = await updateGameSchedule(selectedGame.id, {
        status: "voided",
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSelectedGame(null);
      }
    } catch (err) {
      setError("Failed to void game");
    } finally {
      setLoading(false);
    }
  };

  // Export to ICS
  const handleExportICS = () => {
    const icsContent = generateICS(filteredGames);
    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schedule-${new Date().toISOString().slice(0, 10)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (isMobile) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Schedule</h2>
          <button onClick={() => setIsMobile(false)} className="text-sm text-primary hover:underline">Calendar View</button>
        </div>

        <div className="space-y-3">
          <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded text-sm">
            <option value="all">All Teams</option>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded text-sm">
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="live">Live</option>
            <option value="final">Final</option>
            <option value="voided">Voided</option>
          </select>
          <button onClick={handleExportICS} className="w-full px-3 py-2 bg-primary hover:opacity-90 text-primary-foreground text-sm rounded font-medium transition">Export to Calendar</button>
        </div>

        <div className="space-y-2">
          {filteredGames.length === 0 ? (
            <p className="text-muted-foreground text-sm">No games scheduled</p>
          ) : (
            filteredGames
              .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
              .map((game) => (
                <div key={game.id} onClick={() => handleSelectGame(game)} className="p-3 bg-card border border-border rounded cursor-pointer hover:bg-accent/50 transition">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium">{game.away_team || "TBD"} @ {game.home_team || "TBD"}</div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(game.status)}`}>{game.status}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(game.game_date + "T00:00:00").toLocaleDateString()} {game.start_time || "TBD"}</div>
                  {game.field_name && <div className="text-xs text-muted-foreground">{game.field_name}</div>}
                </div>
              ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">{monthYear}</h2>
          <div className="flex gap-2">
            <button onClick={handlePrevMonth} className="px-3 py-1 bg-secondary hover:bg-accent rounded text-sm border border-border transition">←</button>
            <button onClick={handleNextMonth} className="px-3 py-1 bg-secondary hover:bg-accent rounded text-sm border border-border transition">→</button>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsMobile(true)} className="px-3 py-1 bg-secondary hover:bg-accent rounded text-sm border border-border transition">List View</button>
          <button onClick={handleExportICS} className="px-4 py-1 bg-primary hover:opacity-90 text-primary-foreground rounded text-sm font-medium transition">Export ICS</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)} className="px-3 py-2 bg-input border border-border rounded text-sm">
          <option value="all">All Teams</option>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-input border border-border rounded text-sm">
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="live">Live</option>
          <option value="final">Final</option>
          <option value="voided">Voided</option>
        </select>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-secondary">
          {dayNames.map((day) => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-foreground">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-background border border-border aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayGames = getGamesForDay(day);
            const today = isToday(day);
            return (
              <div key={day} className={`border border-border aspect-square p-2 overflow-y-auto ${today ? "ring-2 ring-primary bg-card" : dayGames.length > 0 ? "bg-primary/5" : "bg-background"}`}>
                <div className={`text-xs font-semibold mb-1 ${today ? "text-primary" : "text-foreground"}`}>{day}</div>
                <div className="space-y-1">
                  {dayGames.map((game) => (
                    <div key={game.id} onClick={() => handleSelectGame(game)} className="text-xs p-1 bg-primary/30 border border-primary/40 rounded cursor-pointer hover:bg-primary/50 transition truncate">
                      <div className="font-medium">{game.start_time && <span>{game.start_time} </span>}{game.away_team || "TBD"}</div>
                      <div className="text-muted-foreground">vs {game.home_team || "TBD"}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Game Detail Modal */}
      {selectedGame && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{selectedGame.away_team || "TBD"} @ {selectedGame.home_team || "TBD"}</h3>
                <button onClick={() => setSelectedGame(null)} className="text-muted-foreground hover:text-foreground text-2xl leading-none">×</button>
              </div>

              {error && <div className="p-3 bg-destructive/20 border border-destructive/40 rounded text-destructive text-sm">{error}</div>}

              {!editMode ? (
                <div className="space-y-3 text-sm">
                  <div><div className="text-muted-foreground">Date</div><div className="font-medium">{new Date(selectedGame.game_date + "T00:00:00").toLocaleDateString()}</div></div>
                  <div><div className="text-muted-foreground">Time</div><div className="font-medium">{selectedGame.start_time || "TBD"}</div></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><div className="text-muted-foreground">Home Team</div><div className="font-medium">{selectedGame.home_team || "TBD"}</div></div>
                    <div><div className="text-muted-foreground">Away Team</div><div className="font-medium">{selectedGame.away_team || "TBD"}</div></div>
                  </div>
                  {selectedGame.home_score !== null && selectedGame.away_score !== null && (
                    <div className="grid grid-cols-2 gap-4">
                      <div><div className="text-muted-foreground">Home Score</div><div className="font-medium">{selectedGame.home_score}</div></div>
                      <div><div className="text-muted-foreground">Away Score</div><div className="font-medium">{selectedGame.away_score}</div></div>
                    </div>
                  )}
                  {selectedGame.field_name && <div><div className="text-muted-foreground">Field</div><div className="font-medium">{selectedGame.field_name}</div></div>}
                  {selectedGame.location && <div><div className="text-muted-foreground">Location</div><div className="font-medium">{selectedGame.location}</div></div>}
                  <div><div className="text-muted-foreground">Status</div><span className={`inline-block px-3 py-0.5 rounded text-xs font-medium border ${getStatusColor(selectedGame.status)}`}>{selectedGame.status}</span></div>
                  {selectedGame.notes && <div><div className="text-muted-foreground">Notes</div><div className="text-xs bg-secondary p-2 rounded">{selectedGame.notes}</div></div>}
                  {canEdit && (
                    <div className="flex gap-2 pt-4">
                      <button onClick={() => setEditMode(true)} className="flex-1 px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded font-medium text-sm transition">Edit</button>
                      {selectedGame.status !== "voided" && (
                        <>
                          <button onClick={handleVoidGame} disabled={loading} className="flex-1 px-4 py-2 bg-secondary hover:bg-accent rounded font-medium text-sm disabled:opacity-50 transition">Void</button>
                          <button onClick={handleDeleteGame} disabled={loading} className="flex-1 px-4 py-2 bg-destructive hover:opacity-90 text-destructive-foreground rounded font-medium text-sm disabled:opacity-50 transition">Delete</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="text-muted-foreground block mb-1">Date</label>
                    <input type="date" value={editFormData.game_date || selectedGame.game_date} onChange={(e) => setEditFormData({ ...editFormData, game_date: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded" />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Time</label>
                    <input type="time" value={editFormData.start_time || selectedGame.start_time || ""} onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded" />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Home Team</label>
                    <select value={editFormData.home_team || selectedGame.home_team || ""} onChange={(e) => setEditFormData({ ...editFormData, home_team: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded">
                      <option value="">Select Team</option>
                      {teams.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Away Team</label>
                    <select value={editFormData.away_team || selectedGame.away_team || ""} onChange={(e) => setEditFormData({ ...editFormData, away_team: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded">
                      <option value="">Select Team</option>
                      {teams.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Status</label>
                    <select value={editFormData.status || selectedGame.status} onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded">
                      <option value="scheduled">Scheduled</option>
                      <option value="live">Live</option>
                      <option value="final">Final</option>
                      <option value="voided">Voided</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Notes</label>
                    <textarea value={editFormData.notes || selectedGame.notes || ""} onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded h-20 resize-none" />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button onClick={handleSaveGame} disabled={loading} className="flex-1 px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded font-medium text-sm disabled:opacity-50 transition">{loading ? "Saving..." : "Save"}</button>
                    <button onClick={() => { setEditMode(false); setEditFormData(selectedGame); }} disabled={loading} className="flex-1 px-4 py-2 bg-secondary hover:bg-accent rounded font-medium text-sm disabled:opacity-50 transition">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
