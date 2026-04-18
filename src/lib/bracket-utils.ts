export type BracketFormat = "single_elim" | "double_elim" | "best_of_3" | "best_of_5";

export type BracketMatchup = {
  id: string;
  round: number;
  position: number;
  home_seed: number | null;
  away_seed: number | null;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  winner: string | null;
  bracket_side?: "winners" | "losers"; // for double elim
};

/** Generate bracket matchups for single elimination */
export function generateSingleElimination(teams: string[]): BracketMatchup[] {
  // Pad to nearest power of 2
  let size = 1;
  while (size < teams.length) size *= 2;

  const paddedTeams = [...teams];
  while (paddedTeams.length < size) paddedTeams.push("BYE");

  const totalRounds = Math.log2(size);
  const matchups: BracketMatchup[] = [];
  let matchId = 0;

  // First round
  for (let i = 0; i < size / 2; i++) {
    matchups.push({
      id: `m${matchId++}`,
      round: 1,
      position: i,
      home_seed: i * 2 + 1,
      away_seed: i * 2 + 2,
      home_team: paddedTeams[i * 2] === "BYE" ? null : paddedTeams[i * 2],
      away_team: paddedTeams[i * 2 + 1] === "BYE" ? null : paddedTeams[i * 2 + 1],
      home_score: null,
      away_score: null,
      winner:
        paddedTeams[i * 2 + 1] === "BYE" ? paddedTeams[i * 2] : null,
    });
  }

  // Subsequent rounds (empty, to be filled as winners advance)
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = size / Math.pow(2, round);
    for (let i = 0; i < matchesInRound; i++) {
      matchups.push({
        id: `m${matchId++}`,
        round,
        position: i,
        home_seed: null,
        away_seed: null,
        home_team: null,
        away_team: null,
        home_score: null,
        away_score: null,
        winner: null,
      });
    }
  }

  return matchups;
}

/** Generate double elimination bracket */
export function generateDoubleElimination(teams: string[]): BracketMatchup[] {
  const winners = generateSingleElimination(teams);
  winners.forEach((m) => (m.bracket_side = "winners"));

  // Losers bracket has fewer rounds initially
  const size = Math.pow(2, Math.ceil(Math.log2(teams.length)));
  const losersRounds = Math.ceil(Math.log2(size)) * 2 - 1;
  let matchId = winners.length;
  const losers: BracketMatchup[] = [];

  // Simplified: create placeholder losers bracket rounds
  let losersMatchesInRound = size / 4;
  for (let round = 1; round <= losersRounds && losersMatchesInRound >= 1; round++) {
    for (let i = 0; i < Math.max(1, losersMatchesInRound); i++) {
      losers.push({
        id: `m${matchId++}`,
        round,
        position: i,
        home_seed: null,
        away_seed: null,
        home_team: null,
        away_team: null,
        home_score: null,
        away_score: null,
        winner: null,
        bracket_side: "losers",
      });
    }
    if (round % 2 === 0) losersMatchesInRound /= 2;
  }

  // Grand finals
  losers.push({
    id: `m${matchId++}`,
    round: losersRounds + 1,
    position: 0,
    home_seed: null,
    away_seed: null,
    home_team: null,
    away_team: null,
    home_score: null,
    away_score: null,
    winner: null,
    bracket_side: "winners",
  });

  return [...winners, ...losers];
}

/** Generate best of 3 series matchups */
export function generateBestOf(teams: string[], seriesLength: 3 | 5): BracketMatchup[] {
  const matchups: BracketMatchup[] = [];
  let matchId = 0;

  // First round matchups for best of series
  for (let i = 0; i < teams.length / 2; i++) {
    for (let game = 1; game <= seriesLength; game++) {
      matchups.push({
        id: `m${matchId++}`,
        round: 1,
        position: i * seriesLength + (game - 1),
        home_seed: i * 2 + 1,
        away_seed: i * 2 + 2,
        home_team:
          teams[i * 2] === "BYE"
            ? null
            : teams[i * 2],
        away_team:
          teams[i * 2 + 1] === "BYE"
            ? null
            : teams[i * 2 + 1],
        home_score: null,
        away_score: null,
        winner: null,
      });
    }
  }

  return matchups;
}

/** Get round name */
export function getRoundName(round: number, totalRounds: number): string {
  if (round === totalRounds) return "Finals";
  if (round === totalRounds - 1) return "Semifinals";
  if (round === totalRounds - 2) return "Quarterfinals";
  return `Round ${round}`;
}

/** Group matchups by round */
export function groupByRound(matchups: BracketMatchup[]): Map<number, BracketMatchup[]> {
  const groups = new Map<number, BracketMatchup[]>();
  matchups.forEach((m) => {
    if (!groups.has(m.round)) {
      groups.set(m.round, []);
    }
    groups.get(m.round)!.push(m);
  });
  return groups;
}

/** Group matchups by bracket side (winners/losers) */
export function groupByBracketSide(
  matchups: BracketMatchup[]
): { winners: BracketMatchup[]; losers: BracketMatchup[] } {
  return {
    winners: matchups.filter((m) => m.bracket_side !== "losers"),
    losers: matchups.filter((m) => m.bracket_side === "losers"),
  };
}

/** Generate games array for bulkCreateGames from bracket matchups */
export function bracketMatchupsToGames(
  matchups: BracketMatchup[],
  baseDate: string
): Array<{
  game_date: string;
  start_time?: string;
  home_team: string;
  away_team: string;
  notes?: string;
}> {
  // Filter out matchups without teams (empty placeholders)
  const validMatchups = matchups.filter(
    (m) => m.home_team && m.away_team && m.home_team !== "BYE" && m.away_team !== "BYE"
  );

  return validMatchups.map((m, idx) => ({
    game_date: baseDate,
    home_team: m.home_team!,
    away_team: m.away_team!,
    notes: `bracket game - ${m.bracket_side || "tournament"} - round ${m.round}`,
  }));
}
