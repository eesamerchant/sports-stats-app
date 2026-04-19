import type { SportKind } from "./supabase/database.types";

export interface StatField {
  key: string;
  label: string;
  shortLabel: string;
  type: "int" | "float";
  defaultValue: number;
  /** Whether this is a computed/derived stat (not entered directly) */
  computed?: boolean;
}

export interface SportStatConfig {
  sport: SportKind;
  displayName: string;
  icon: string;
  /** Stats that are entered per-game for each player */
  gameStats: StatField[];
  /** Computed / aggregate stats shown on leaderboards */
  leaderboardStats: StatField[];
  /** Column keys to show in compact table views */
  compactColumns: string[];
}

const baseballSoftballStats: StatField[] = [
  { key: "pa", label: "Plate Appearances", shortLabel: "PA", type: "int", defaultValue: 0 },
  { key: "ab", label: "At Bats", shortLabel: "AB", type: "int", defaultValue: 0 },
  { key: "r", label: "Runs", shortLabel: "R", type: "int", defaultValue: 0 },
  { key: "h", label: "Hits", shortLabel: "H", type: "int", defaultValue: 0 },
  { key: "doubles", label: "Doubles", shortLabel: "2B", type: "int", defaultValue: 0 },
  { key: "triples", label: "Triples", shortLabel: "3B", type: "int", defaultValue: 0 },
  { key: "hr", label: "Home Runs", shortLabel: "HR", type: "int", defaultValue: 0 },
  { key: "rbi", label: "RBI", shortLabel: "RBI", type: "int", defaultValue: 0 },
  { key: "bb", label: "Walks", shortLabel: "BB", type: "int", defaultValue: 0 },
  { key: "so", label: "Strikeouts", shortLabel: "SO", type: "int", defaultValue: 0 },
  { key: "sf", label: "Sac Flies", shortLabel: "SF", type: "int", defaultValue: 0 },
  { key: "hbp", label: "Hit By Pitch", shortLabel: "HBP", type: "int", defaultValue: 0 },
  { key: "ab_risp", label: "AB w/ RISP", shortLabel: "AB_RISP", type: "int", defaultValue: 0 },
  { key: "h_risp", label: "Hits w/ RISP", shortLabel: "H_RISP", type: "int", defaultValue: 0 },
];

const baseballSoftballLeaderboard: StatField[] = [
  { key: "gp", label: "Games Played", shortLabel: "GP", type: "int", defaultValue: 0 },
  { key: "ab", label: "At Bats", shortLabel: "AB", type: "int", defaultValue: 0 },
  { key: "h", label: "Hits", shortLabel: "H", type: "int", defaultValue: 0 },
  { key: "hr", label: "Home Runs", shortLabel: "HR", type: "int", defaultValue: 0 },
  { key: "rbi", label: "RBI", shortLabel: "RBI", type: "int", defaultValue: 0 },
  { key: "avg", label: "Batting Average", shortLabel: "AVG", type: "float", defaultValue: 0, computed: true },
  { key: "obp", label: "On-Base %", shortLabel: "OBP", type: "float", defaultValue: 0, computed: true },
  { key: "slg", label: "Slugging %", shortLabel: "SLG", type: "float", defaultValue: 0, computed: true },
  { key: "xbh", label: "Extra-Base Hits", shortLabel: "XBH", type: "int", defaultValue: 0, computed: true },
];

const basketballStats: StatField[] = [
  { key: "min", label: "Minutes", shortLabel: "MIN", type: "int", defaultValue: 0 },
  { key: "pts", label: "Points", shortLabel: "PTS", type: "int", defaultValue: 0 },
  { key: "fgm", label: "Field Goals Made", shortLabel: "FGM", type: "int", defaultValue: 0 },
  { key: "fga", label: "Field Goals Attempted", shortLabel: "FGA", type: "int", defaultValue: 0 },
  { key: "tpm", label: "3-Pointers Made", shortLabel: "3PM", type: "int", defaultValue: 0 },
  { key: "tpa", label: "3-Pointers Attempted", shortLabel: "3PA", type: "int", defaultValue: 0 },
  { key: "ftm", label: "Free Throws Made", shortLabel: "FTM", type: "int", defaultValue: 0 },
  { key: "fta", label: "Free Throws Attempted", shortLabel: "FTA", type: "int", defaultValue: 0 },
  { key: "reb", label: "Rebounds", shortLabel: "REB", type: "int", defaultValue: 0 },
  { key: "ast", label: "Assists", shortLabel: "AST", type: "int", defaultValue: 0 },
  { key: "stl", label: "Steals", shortLabel: "STL", type: "int", defaultValue: 0 },
  { key: "blk", label: "Blocks", shortLabel: "BLK", type: "int", defaultValue: 0 },
  { key: "to", label: "Turnovers", shortLabel: "TO", type: "int", defaultValue: 0 },
  { key: "pf", label: "Personal Fouls", shortLabel: "PF", type: "int", defaultValue: 0 },
];

const basketballLeaderboard: StatField[] = [
  { key: "gp", label: "Games Played", shortLabel: "GP", type: "int", defaultValue: 0 },
  { key: "pts", label: "Points", shortLabel: "PTS", type: "int", defaultValue: 0 },
  { key: "reb", label: "Rebounds", shortLabel: "REB", type: "int", defaultValue: 0 },
  { key: "ast", label: "Assists", shortLabel: "AST", type: "int", defaultValue: 0 },
  { key: "stl", label: "Steals", shortLabel: "STL", type: "int", defaultValue: 0 },
  { key: "blk", label: "Blocks", shortLabel: "BLK", type: "int", defaultValue: 0 },
  { key: "fg_pct", label: "FG%", shortLabel: "FG%", type: "float", defaultValue: 0, computed: true },
  { key: "tp_pct", label: "3P%", shortLabel: "3P%", type: "float", defaultValue: 0, computed: true },
  { key: "ft_pct", label: "FT%", shortLabel: "FT%", type: "float", defaultValue: 0, computed: true },
];

const soccerStats: StatField[] = [
  { key: "min", label: "Minutes", shortLabel: "MIN", type: "int", defaultValue: 0 },
  { key: "goals", label: "Goals", shortLabel: "G", type: "int", defaultValue: 0 },
  { key: "assists", label: "Assists", shortLabel: "A", type: "int", defaultValue: 0 },
  { key: "shots", label: "Shots", shortLabel: "SH", type: "int", defaultValue: 0 },
  { key: "sog", label: "Shots on Goal", shortLabel: "SOG", type: "int", defaultValue: 0 },
  { key: "saves", label: "Saves", shortLabel: "SV", type: "int", defaultValue: 0 },
  { key: "fouls", label: "Fouls", shortLabel: "F", type: "int", defaultValue: 0 },
  { key: "yellow", label: "Yellow Cards", shortLabel: "YC", type: "int", defaultValue: 0 },
  { key: "red", label: "Red Cards", shortLabel: "RC", type: "int", defaultValue: 0 },
  { key: "offsides", label: "Offsides", shortLabel: "OFF", type: "int", defaultValue: 0 },
];

const soccerLeaderboard: StatField[] = [
  { key: "gp", label: "Games Played", shortLabel: "GP", type: "int", defaultValue: 0 },
  { key: "goals", label: "Goals", shortLabel: "G", type: "int", defaultValue: 0 },
  { key: "assists", label: "Assists", shortLabel: "A", type: "int", defaultValue: 0 },
  { key: "shots", label: "Shots", shortLabel: "SH", type: "int", defaultValue: 0 },
  { key: "sog", label: "Shots on Goal", shortLabel: "SOG", type: "int", defaultValue: 0 },
  { key: "saves", label: "Saves", shortLabel: "SV", type: "int", defaultValue: 0 },
  { key: "yellow", label: "Yellow Cards", shortLabel: "YC", type: "int", defaultValue: 0 },
  { key: "red", label: "Red Cards", shortLabel: "RC", type: "int", defaultValue: 0 },
];

const cricketStats: StatField[] = [
  { key: "runs", label: "Runs Scored", shortLabel: "R", type: "int", defaultValue: 0 },
  { key: "balls_faced", label: "Balls Faced", shortLabel: "BF", type: "int", defaultValue: 0 },
  { key: "fours", label: "Fours", shortLabel: "4s", type: "int", defaultValue: 0 },
  { key: "sixes", label: "Sixes", shortLabel: "6s", type: "int", defaultValue: 0 },
  { key: "not_out", label: "Not Out", shortLabel: "NO", type: "int", defaultValue: 0 },
  { key: "overs", label: "Overs Bowled", shortLabel: "O", type: "float", defaultValue: 0 },
  { key: "maidens", label: "Maidens", shortLabel: "M", type: "int", defaultValue: 0 },
  { key: "runs_conceded", label: "Runs Conceded", shortLabel: "RC", type: "int", defaultValue: 0 },
  { key: "wickets", label: "Wickets", shortLabel: "W", type: "int", defaultValue: 0 },
  { key: "catches", label: "Catches", shortLabel: "CT", type: "int", defaultValue: 0 },
  { key: "run_outs", label: "Run Outs", shortLabel: "RO", type: "int", defaultValue: 0 },
  { key: "stumpings", label: "Stumpings", shortLabel: "ST", type: "int", defaultValue: 0 },
];

const cricketLeaderboard: StatField[] = [
  { key: "innings", label: "Innings", shortLabel: "INN", type: "int", defaultValue: 0 },
  { key: "runs", label: "Runs", shortLabel: "R", type: "int", defaultValue: 0 },
  { key: "fours", label: "Fours", shortLabel: "4s", type: "int", defaultValue: 0 },
  { key: "sixes", label: "Sixes", shortLabel: "6s", type: "int", defaultValue: 0 },
  { key: "sr", label: "Strike Rate", shortLabel: "SR", type: "float", defaultValue: 0, computed: true },
  { key: "bat_avg", label: "Batting Avg", shortLabel: "AVG", type: "float", defaultValue: 0, computed: true },
  { key: "wickets", label: "Wickets", shortLabel: "W", type: "int", defaultValue: 0 },
  { key: "bowl_avg", label: "Bowl Avg", shortLabel: "BAVG", type: "float", defaultValue: 0, computed: true },
  { key: "econ", label: "Economy", shortLabel: "ECON", type: "float", defaultValue: 0, computed: true },
];

const pickleballStats: StatField[] = [
  { key: "wins", label: "Games Won", shortLabel: "W", type: "int", defaultValue: 0 },
  { key: "losses", label: "Games Lost", shortLabel: "L", type: "int", defaultValue: 0 },
  { key: "pts_won", label: "Points Won", shortLabel: "PW", type: "int", defaultValue: 0 },
  { key: "pts_lost", label: "Points Lost", shortLabel: "PL", type: "int", defaultValue: 0 },
  { key: "aces", label: "Aces", shortLabel: "ACE", type: "int", defaultValue: 0 },
  { key: "faults", label: "Faults", shortLabel: "FLT", type: "int", defaultValue: 0 },
  { key: "winners", label: "Winners", shortLabel: "WIN", type: "int", defaultValue: 0 },
  { key: "errors", label: "Unforced Errors", shortLabel: "UE", type: "int", defaultValue: 0 },
  { key: "dinks", label: "Dink Winners", shortLabel: "DK", type: "int", defaultValue: 0 },
];

const pickleballLeaderboard: StatField[] = [
  { key: "matches", label: "Matches", shortLabel: "M", type: "int", defaultValue: 0 },
  { key: "wins", label: "Wins", shortLabel: "W", type: "int", defaultValue: 0 },
  { key: "losses", label: "Losses", shortLabel: "L", type: "int", defaultValue: 0 },
  { key: "win_pct", label: "Win %", shortLabel: "W%", type: "float", defaultValue: 0, computed: true },
  { key: "pts_won", label: "Points Won", shortLabel: "PW", type: "int", defaultValue: 0 },
  { key: "aces", label: "Aces", shortLabel: "ACE", type: "int", defaultValue: 0 },
  { key: "winners", label: "Winners", shortLabel: "WIN", type: "int", defaultValue: 0 },
  { key: "errors", label: "Unforced Errors", shortLabel: "UE", type: "int", defaultValue: 0 },
];

export const SPORT_CONFIGS: Record<SportKind, SportStatConfig> = {
  softball: {
    sport: "softball",
    displayName: "Softball",
    icon: "⚾",
    gameStats: baseballSoftballStats,
    leaderboardStats: baseballSoftballLeaderboard,
    compactColumns: ["ab", "h", "hr", "rbi", "avg"],
  },
  baseball: {
    sport: "baseball",
    displayName: "Baseball",
    icon: "⚾",
    gameStats: baseballSoftballStats,
    leaderboardStats: baseballSoftballLeaderboard,
    compactColumns: ["ab", "h", "hr", "rbi", "avg"],
  },
  basketball: {
    sport: "basketball",
    displayName: "Basketball",
    icon: "🏀",
    gameStats: basketballStats,
    leaderboardStats: basketballLeaderboard,
    compactColumns: ["pts", "reb", "ast", "stl", "fg_pct"],
  },
  soccer: {
    sport: "soccer",
    displayName: "Soccer",
    icon: "⚽",
    gameStats: soccerStats,
    leaderboardStats: soccerLeaderboard,
    compactColumns: ["goals", "assists", "sog", "saves", "yellow"],
  },
  cricket: {
    sport: "cricket",
    displayName: "Cricket",
    icon: "🏏",
    gameStats: cricketStats,
    leaderboardStats: cricketLeaderboard,
    compactColumns: ["runs", "wickets", "catches", "sr", "bat_avg"],
  },
  pickleball: {
    sport: "pickleball",
    displayName: "Pickleball",
    icon: "🏓",
    gameStats: pickleballStats,
    leaderboardStats: pickleballLeaderboard,
    compactColumns: ["wins", "losses", "aces", "winners", "win_pct"],
  },
};

export function getSportConfig(sport: SportKind): SportStatConfig {
  return SPORT_CONFIGS[sport];
}

/** Get the CSV header row for a sport's game stats */
export function getCsvHeaders(sport: SportKind): string {
  const config = SPORT_CONFIGS[sport];
  return ["Player", ...config.gameStats.map((s) => s.shortLabel)].join(",");
}

/** Get a template CSV row for a player */
export function getCsvTemplateRow(playerName: string, sport: SportKind): string {
  const config = SPORT_CONFIGS[sport];
  return [playerName, ...config.gameStats.map((s) => s.defaultValue)].join(",");
}
