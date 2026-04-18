"use client";

import React, { useState, useMemo } from "react";
import { generateRoundRobin } from "@/lib/schedule-utils";
import { bulkCreateGames } from "@/lib/actions/schedule";

interface ScheduleBuilderProps {
  leagueId: string;
  leagueName: string;
  teams: string[];
  existingGames: Array<{
    id: string;
    game_date: string;
    start_time: string | null;
    home_team: string;
    away_team: string;
    status: string;
    field_name?: string;
    location?: string;
  }>;
}

interface ScheduleState {
  teams: string[];
  startDate: string;
  endDate: string;
  format: "single" | "double";
  timeSlots: string[];
  fieldsCount: number;
  gamesPerFieldPerDay: number;
  gameDurationMinutes: number;
  maxGamesPerTeamPerDay: number;
  venueName: string;
  address: string;
  offWeeks: string[];
  randomizeOrder: boolean;
  preferredDays: Record<string, boolean>;
}

interface GeneratedGame {
  game_date: string;
  start_time: string;
  home_team: string;
  away_team: string;
  field_name?: string;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function getWeekStart(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  return result;
}

function getMonthDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = getWeekStart(firstDay);

  const days: (number | null)[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= lastDay || currentDate.getDay() !== 0) {
    if (
      currentDate.getMonth() === month &&
      currentDate.getDate() <= lastDay.getDate()
    ) {
      days.push(currentDate.getDate());
    } else {
      days.push(null);
    }
    currentDate = addDays(currentDate, 1);
  }

  return days;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ProgressBar = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  const steps = [
    "Teams",
    "Season Details",
    "Game Settings",
    "Location",
    "Rules",
    "Preview",
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div key={idx} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isCompleted ? "✓" : stepNum}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      isCompleted ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
              <p className="text-xs font-medium mt-2 text-center">{step}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CalendarPreview = ({ games }: { games: GeneratedGame[] }) => {
  const [viewDate, setViewDate] = useState(new Date());

  const gamesByDate = useMemo(() => {
    const map = new Map<string, GeneratedGame[]>();
    games.forEach((game) => {
      const key = game.game_date;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(game);
    });
    return map;
  }, [games]);

  const monthDays = getMonthDays(viewDate.getFullYear(), viewDate.getMonth());
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);

  const goToPrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1));
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="font-semibold mb-4">Live Calendar Preview</h3>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="px-3 py-1 text-sm border border-border rounded hover:bg-secondary"
        >
          ←
        </button>
        <h4 className="text-sm font-medium">
          {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h4>
        <button
          onClick={goToNextMonth}
          className="px-3 py-1 text-sm border border-border rounded hover:bg-secondary"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}

        {monthDays.map((dayNum, idx) => {
          const dateStr =
            dayNum !== null
              ? toDateStr(new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNum))
              : null;
          const dayGames = dateStr ? gamesByDate.get(dateStr) || [] : [];
          const hasGames = dayGames.length > 0;

          return (
            <div
              key={idx}
              className={`aspect-square rounded border flex flex-col items-center justify-center text-xs p-1 ${
                dayNum === null
                  ? "bg-secondary/30 border-border/30"
                  : hasGames
                    ? "bg-primary/20 border-primary text-foreground"
                    : "bg-secondary/50 border-border text-muted-foreground"
              }`}
            >
              {dayNum && (
                <>
                  <div className="font-semibold">{dayNum}</div>
                  {hasGames && (
                    <div className="text-primary font-bold">{dayGames.length}</div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {games.length > 0 && (
        <div className="mt-4 p-3 bg-secondary/50 rounded text-xs text-muted-foreground">
          {games.length} games scheduled across {gamesByDate.size} dates
        </div>
      )}
    </div>
  );
};

export default function ScheduleBuilder({
  leagueId,
  leagueName,
  teams: initialTeams,
  existingGames,
}: ScheduleBuilderProps) {
  const [step, setStep] = useState(1);
  const [newTeamInput, setNewTeamInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedGames, setGeneratedGames] = useState<GeneratedGame[]>([]);

  const [state, setState] = useState<ScheduleState>({
    teams: initialTeams,
    startDate: toDateStr(new Date()),
    endDate: toDateStr(addDays(new Date(), 90)),
    format: "single",
    timeSlots: ["18:00", "19:30", "21:00"],
    fieldsCount: 1,
    gamesPerFieldPerDay: 2,
    gameDurationMinutes: 60,
    maxGamesPerTeamPerDay: 2,
    venueName: "",
    address: "",
    offWeeks: [],
    randomizeOrder: false,
    preferredDays: {
      monday: true,
      tuesday: false,
      wednesday: true,
      thursday: false,
      friday: true,
      saturday: false,
      sunday: false,
    },
  });

  const addTeam = () => {
    if (newTeamInput.trim() && !state.teams.includes(newTeamInput.trim())) {
      setState({
        ...state,
        teams: [...state.teams, newTeamInput.trim()],
      });
      setNewTeamInput("");
    }
  };

  const removeTeam = (team: string) => {
    setState({
      ...state,
      teams: state.teams.filter((t) => t !== team),
    });
  };

  const addTimeSlot = () => {
    const newSlot = "19:00";
    if (!state.timeSlots.includes(newSlot)) {
      setState({
        ...state,
        timeSlots: [...state.timeSlots, newSlot],
      });
    }
  };

  const removeTimeSlot = (slot: string) => {
    setState({
      ...state,
      timeSlots: state.timeSlots.filter((s) => s !== slot),
    });
  };

  const togglePreferredDay = (day: string) => {
    setState({
      ...state,
      preferredDays: {
        ...state.preferredDays,
        [day]: !state.preferredDays[day as keyof typeof state.preferredDays],
      },
    });
  };

  const toggleOffWeek = (dateStr: string) => {
    setState({
      ...state,
      offWeeks: state.offWeeks.includes(dateStr)
        ? state.offWeeks.filter((d) => d !== dateStr)
        : [...state.offWeeks, dateStr],
    });
  };

  const generateSchedule = () => {
    if (state.teams.length < 2) {
      setError("At least 2 teams required");
      return;
    }

    const preferredDayNumbers = Object.entries(state.preferredDays)
      .filter(([_, selected]) => selected)
      .map(([day]) => {
        const dayMap: Record<string, number> = {
          sunday: 0,
          monday: 1,
          tuesday: 2,
          wednesday: 3,
          thursday: 4,
          friday: 5,
          saturday: 6,
        };
        return dayMap[day];
      });

    if (preferredDayNumbers.length === 0) {
      setError("Select at least one preferred game day");
      return;
    }

    const matchups = generateRoundRobin(state.teams, state.format === "double" ? 2 : 1);
    const games: GeneratedGame[] = [];

    let currentDate = new Date(state.startDate + "T00:00:00");
    const endDate = new Date(state.endDate + "T00:00:00");
    let timeSlotIdx = 0;
    let gamesOnCurrentDate = 0;

    for (const matchup of matchups) {
      while (currentDate <= endDate) {
        const weekStart = getWeekStart(new Date(currentDate));
        const weekStartStr = toDateStr(weekStart);
        const isOffWeek = state.offWeeks.some((offWeek) => {
          const offDate = new Date(offWeek + "T00:00:00");
          const offWeekStart = getWeekStart(offDate);
          return toDateStr(offWeekStart) === weekStartStr;
        });

        if (
          preferredDayNumbers.includes(currentDate.getDay()) &&
          !isOffWeek &&
          gamesOnCurrentDate < state.gamesPerFieldPerDay
        ) {
          const timeSlot = state.timeSlots[timeSlotIdx % state.timeSlots.length];

          games.push({
            game_date: toDateStr(currentDate),
            start_time: timeSlot,
            home_team: matchup.home,
            away_team: matchup.away,
            field_name: `Field ${(Math.floor(games.length / state.gamesPerFieldPerDay) % state.fieldsCount) + 1}`,
          });

          gamesOnCurrentDate++;
          timeSlotIdx++;

          if (gamesOnCurrentDate >= state.gamesPerFieldPerDay) {
            currentDate = addDays(currentDate, 1);
            gamesOnCurrentDate = 0;
          }

          break;
        }

        currentDate = addDays(currentDate, 1);
        gamesOnCurrentDate = 0;
      }
    }

    setGeneratedGames(games);
    setError(null);
  };

  const handlePublish = async () => {
    if (generatedGames.length === 0) return;
    setLoading(true);
    setError(null);

    const result = await bulkCreateGames(
      leagueId,
      generatedGames.map((g) => ({
        game_date: g.game_date,
        start_time: g.start_time,
        home_team: g.home_team,
        away_team: g.away_team,
        field_name: g.field_name,
        location: state.address || undefined,
        duration_minutes: state.gameDurationMinutes,
      }))
    );

    if (result.error) {
      setError(result.error);
    } else {
      setGeneratedGames([]);
      window.location.reload();
    }
    setLoading(false);
  };

  const canProceedToNextStep = () => {
    switch (step) {
      case 1:
        return state.teams.length >= 2;
      case 2:
        return state.startDate && state.endDate;
      case 3:
        return state.timeSlots.length > 0 && state.gameDurationMinutes > 0;
      case 4:
        return state.venueName.trim() !== "";
      case 5:
        return Object.values(state.preferredDays).some((v) => v);
      case 6:
        return generatedGames.length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="w-full space-y-8">
      {error && (
        <div className="fixed top-4 right-4 bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive max-w-md">
          {error}
        </div>
      )}

      <ProgressBar currentStep={step} totalSteps={6} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* STEP 1: Teams */}
          {step === 1 && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-semibold">Confirm Teams</h2>
              <p className="text-sm text-muted-foreground">
                Add or remove teams that will participate in this season.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTeamInput}
                  onChange={(e) => setNewTeamInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTeam()}
                  placeholder="Enter team name..."
                  className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm"
                />
                <button
                  onClick={addTeam}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {state.teams.map((team) => (
                  <div
                    key={team}
                    className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-sm border border-primary/30"
                  >
                    {team}
                    <button
                      onClick={() => removeTeam(team)}
                      className="text-primary hover:opacity-70 font-semibold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                {state.teams.length} teams
              </p>
            </div>
          )}

          {/* STEP 2: Season Details */}
          {step === 2 && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-semibold">Season Details</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <input
                    type="date"
                    value={state.startDate}
                    onChange={(e) =>
                      setState({ ...state, startDate: e.target.value })
                    }
                    className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <input
                    type="date"
                    value={state.endDate}
                    onChange={(e) =>
                      setState({ ...state, endDate: e.target.value })
                    }
                    className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Format</label>
                <div className="space-y-2">
                  {["single", "double"].map((fmt) => (
                    <label key={fmt} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="format"
                        value={fmt}
                        checked={state.format === fmt}
                        onChange={(e) =>
                          setState({ ...state, format: e.target.value as "single" | "double" })
                        }
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm">
                        {fmt === "single" ? "Single Round-Robin" : "Double Round-Robin"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Game Settings */}
          {step === 3 && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-semibold">Game Settings</h2>

              <div>
                <label className="block text-sm font-medium mb-3">Time Slots</label>
                <div className="space-y-2 mb-3">
                  {state.timeSlots.map((slot) => (
                    <div key={slot} className="flex items-center justify-between bg-secondary/50 px-3 py-2 rounded">
                      <span className="text-sm">{slot}</span>
                      <button
                        onClick={() => removeTimeSlot(slot)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addTimeSlot}
                  className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-secondary"
                >
                  + Add Time Slot
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Number of Fields
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={state.fieldsCount}
                    onChange={(e) =>
                      setState({ ...state, fieldsCount: parseInt(e.target.value) || 1 })
                    }
                    className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Games per Field per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={state.gamesPerFieldPerDay}
                    onChange={(e) =>
                      setState({
                        ...state,
                        gamesPerFieldPerDay: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Game Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="180"
                    step="15"
                    value={state.gameDurationMinutes}
                    onChange={(e) =>
                      setState({
                        ...state,
                        gameDurationMinutes: parseInt(e.target.value) || 60,
                      })
                    }
                    className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Games per Team per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    value={state.maxGamesPerTeamPerDay}
                    onChange={(e) =>
                      setState({
                        ...state,
                        maxGamesPerTeamPerDay: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Location */}
          {step === 4 && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-semibold">Location</h2>

              <div>
                <label className="block text-sm font-medium mb-2">Venue Name</label>
                <input
                  type="text"
                  value={state.venueName}
                  onChange={(e) =>
                    setState({ ...state, venueName: e.target.value })
                  }
                  placeholder="e.g., Central Sports Complex"
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Address</label>
                <input
                  type="text"
                  value={state.address}
                  onChange={(e) =>
                    setState({ ...state, address: e.target.value })
                  }
                  placeholder="e.g., 123 Main St, City, State"
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* STEP 5: Schedule Rules */}
          {step === 5 && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-semibold">Schedule Rules</h2>

              <div>
                <label className="block text-sm font-medium mb-3">
                  Preferred Game Days
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(state.preferredDays).map((day) => (
                    <label key={day} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.preferredDays[day as keyof typeof state.preferredDays]}
                        onChange={() => togglePreferredDay(day)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm capitalize">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Randomize Matchup Order</label>
                  <input
                    type="checkbox"
                    checked={state.randomizeOrder}
                    onChange={(e) =>
                      setState({ ...state, randomizeOrder: e.target.checked })
                    }
                    className="h-4 w-4 accent-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Preview & Publish */}
          {step === 6 && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-semibold">Preview & Publish</h2>

              {generatedGames.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Generate the schedule to see a preview</p>
                  <button
                    onClick={generateSchedule}
                    className="mt-4 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Generate Schedule
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-y-auto max-h-96 space-y-2">
                    {generatedGames.slice(0, 20).map((game, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-secondary/50 px-4 py-2 rounded text-sm"
                      >
                        <div>
                          <span className="font-medium">
                            {game.away_team} @ {game.home_team}
                          </span>
                          <span className="text-muted-foreground text-xs ml-2">
                            {game.game_date} at {game.start_time}
                          </span>
                        </div>
                        {game.field_name && (
                          <span className="text-xs text-muted-foreground">
                            {game.field_name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {generatedGames.length > 20 && (
                    <p className="text-xs text-muted-foreground">
                      ... and {generatedGames.length - 20} more games
                    </p>
                  )}

                  <button
                    onClick={handlePublish}
                    disabled={loading}
                    className="w-full rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? "Publishing..." : "Publish Schedule"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => {
                if (step === 5) {
                  generateSchedule();
                  if (!error) setStep(6);
                } else if (step < 6) {
                  setStep(step + 1);
                }
              }}
              disabled={!canProceedToNextStep()}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {step === 5 ? "Generate & Preview" : step === 6 ? "Done" : "Next"}
            </button>
          </div>
        </div>

        {/* Calendar Preview Sidebar */}
        {step >= 2 && (
          <div className="lg:col-span-1">
            <CalendarPreview games={generatedGames} />
          </div>
        )}
      </div>
    </div>
  );
}
