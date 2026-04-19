export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SportKind = "softball" | "baseball" | "basketball";
export type LeagueStatus = "draft" | "active" | "archived";
export type LeagueRole = "player" | "captain" | "scorer" | "manager";
export type GameStatus = "scheduled" | "live" | "final" | "voided";
export type AbResult =
  | "1B" | "2B" | "3B" | "HR" | "BB" | "SO"
  | "GO" | "FO" | "E" | "SF" | "SAC" | "HBP" | "FC";

export type UserProfile = {
  id: string;
  email: string;
  display_name: string;
  is_app_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type Player = {
  id: string;
  user_id: string;
  handle: string;
  display_name: string;
  player_number: number;
  bats: "L" | "R" | "S" | null;
  throws: "L" | "R" | null;
  photo_url: string | null;
  bio: string | null;
  hometown: string | null;
  created_at: string;
  updated_at: string;
};

export type JoinMode = "open" | "admin_approval" | "manager_approval" | "invite_only";

export type League = {
  id: string;
  owner_id: string;
  name: string;
  sport: SportKind;
  season: string | null;
  join_code: string;
  status: LeagueStatus;
  description: string | null;
  schedule_published: boolean;
  logo_url: string | null;
  website: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_twitter: string | null;
  social_tiktok: string | null;
  join_mode: JoinMode;
  created_at: string;
  updated_at: string;
};

export type LeagueJoinRequest = {
  id: string;
  league_id: string;
  player_id: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LeagueMembership = {
  id: string;
  player_id: string;
  league_id: string;
  team_name: string | null;
  jersey_number: string | null;
  role: LeagueRole;
  can_score: boolean;
  joined_at: string;
  left_at: string | null;
};

export type Game = {
  id: string;
  league_id: string;
  game_date: string;
  start_time: string | null;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  status: GameStatus;
  notes: string | null;
  field_name: string | null;
  location: string | null;
  duration_minutes: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LeagueManagerPermissions = {
  id: string;
  league_id: string;
  can_add_players: boolean;
  can_remove_players: boolean;
  can_update_stats: boolean;
  can_edit_scores: boolean;
  can_manage_roster: boolean;
  can_create_games: boolean;
  can_edit_games: boolean;
  created_at: string;
  updated_at: string;
};

export type SoftballAtBat = {
  id: number;
  game_id: string;
  membership_id: string;
  inning: number;
  half: "top" | "bottom" | null;
  sequence: number;
  result: AbResult;
  rbi: number;
  base_state_before: number;
  outs_before: number;
  is_risp: boolean;
  created_at: string;
};

export type SoftballGamePlayerStats = {
  id: string;
  game_id: string;
  membership_id: string;
  gp: number;
  pa: number;
  ab: number;
  r: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  sf: number;
  hbp: number;
  ab_risp: number;
  h_risp: number;
  created_at: string;
  updated_at: string;
};

export type PlayerLeagueStats = {
  player_id: string;
  player_handle: string;
  player_name: string;
  league_id: string;
  league_name: string;
  season: string | null;
  team_name: string | null;
  gp: number;
  pa: number;
  ab: number;
  r: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  sf: number;
  hbp: number;
  ab_risp: number;
  h_risp: number;
  xbh: number;
  avg: number;
  obp: number;
  slg: number;
  avg_risp: number;
};

export type PlayerCareerStats = {
  player_id: string;
  player_handle: string;
  player_name: string;
  gp: number;
  pa: number;
  ab: number;
  r: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  sf: number;
  hbp: number;
  ab_risp: number;
  h_risp: number;
  xbh: number;
  avg: number;
  obp: number;
  slg: number;
  avg_risp: number;
};

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, "created_at" | "updated_at" | "is_app_admin"> & {
          is_app_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<UserProfile, "id" | "created_at">>;
      };
      players: {
        Row: Player;
        Insert: Omit<Player, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Player, "id" | "user_id" | "created_at">>;
      };
      leagues: {
        Row: League;
        Insert: Omit<League, "id" | "created_at" | "updated_at" | "status"> & {
          id?: string;
          status?: LeagueStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<League, "id" | "created_at">>;
      };
      league_memberships: {
        Row: LeagueMembership;
        Insert: Omit<LeagueMembership, "id" | "joined_at" | "left_at" | "role" | "can_score"> & {
          id?: string;
          role?: LeagueRole;
          can_score?: boolean;
          joined_at?: string;
          left_at?: string | null;
        };
        Update: Partial<Omit<LeagueMembership, "id">>;
      };
      games: {
        Row: Game;
        Insert: Omit<Game, "id" | "created_at" | "updated_at" | "status"> & {
          id?: string;
          status?: GameStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Game, "id" | "created_at">>;
      };
      softball_at_bats: {
        Row: SoftballAtBat;
        Insert: Omit<SoftballAtBat, "id" | "created_at" | "is_risp"> & {
          created_at?: string;
        };
        Update: Partial<Omit<SoftballAtBat, "id" | "created_at" | "is_risp">>;
      };
      softball_game_player_stats: {
        Row: SoftballGamePlayerStats;
        Insert: Omit<SoftballGamePlayerStats, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SoftballGamePlayerStats, "id" | "created_at">>;
      };
      league_manager_permissions: {
        Row: LeagueManagerPermissions;
        Insert: Omit<LeagueManagerPermissions, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<LeagueManagerPermissions, "id" | "created_at">>;
      };
      league_join_requests: {
        Row: LeagueJoinRequest;
        Insert: Omit<LeagueJoinRequest, "id" | "created_at" | "updated_at" | "status" | "reviewed_by"> & {
          id?: string;
          status?: "pending" | "approved" | "rejected";
          reviewed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<LeagueJoinRequest, "id" | "created_at">>;
      };
      admin_audit: {
        Row: {
          id: number;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          before_state: Json | null;
          after_state: Json | null;
          created_at: string;
        };
        Insert: {
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          before_state?: Json | null;
          after_state?: Json | null;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
    };
    Views: {
      player_league_stats: { Row: PlayerLeagueStats };
      player_career_stats: { Row: PlayerCareerStats };
    };
    Functions: {
      generate_join_code: { Args: Record<string, never>; Returns: string };
      join_league_by_code: { Args: { p_code: string }; Returns: string };
      is_app_admin: { Args: Record<string, never>; Returns: boolean };
      is_league_manager: { Args: { p_league_id: string }; Returns: boolean };
      can_score_league: { Args: { p_league_id: string }; Returns: boolean };
      set_app_admin: { Args: { p_user_id: string; p_is_admin: boolean }; Returns: void };
    };
    Enums: {
      sport_kind: SportKind;
      league_status: LeagueStatus;
      league_role: LeagueRole;
      game_status: GameStatus;
      ab_result: AbResult;
    };
  };
};
