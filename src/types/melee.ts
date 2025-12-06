/**
 * Type definitions for Melee.gg API responses
 * Based on actual data structures from tournament JSON files
 */

export interface MeleePlayer {
  TeamId: number;
  ID: number;
  ScreenName: string;
  ProfileImageVersion: number;
  DisplayName: string;
  DisplayNameLastFirst: string;
  Username: string;
  LanguageDescription: string;
  PronounsDescription: string | null;
}

export interface MeleeTeam {
  Players: MeleePlayer[];
  ID: number;
  Name: string | null;
  StatusDescription: string;
  IsActive: boolean;
}

export interface MeleeCompetitor {
  Team: MeleeTeam;
  ID: number;
  CheckedIn: string;
  ResultConfirmed: string;
  SortOrder: number;
  GameByes: number;
  GameWins: number | null;
  TeamId: number;
  GameWinsAndGameByes: number;
  Decklists: any[];
}

export interface MeleeMatch {
  Competitors: MeleeCompetitor[];
  ByeReason: number | null;
  LossReason: string | null;
  RoundName: string | null;
  DateCreated: string;
  Type: number;
  FeatureMatch: boolean;
  HasResult: boolean;
  TimeExtended: boolean;
  MatchesPublished: boolean;
  RoundNumber: number;
  GameDraws: number;
  PodNumber: number | null;
  PhaseSortOrder: number;
  SortOrder: number | null;
  TableNumber: number | null;
  TimeExtensionMinutes: number | null;
  ID: number;
  PhaseId: number;
  RoundId: number;
  TournamentId: number;
  PhaseName: string;
  ResultString: string;
}

export interface MeleeStanding {
  Team: MeleeTeam;
  DateCreated: string;
  MatchingMethod: number;
  StandingsPublished: boolean;
  FinalTiebreaker: number;
  OpponentGameWinPercentage: number;
  OpponentMatchWinPercentage: number;
  TeamGameWinPercentage: number;
  GameCount: number;
  GameDraws: number;
  GameLosses: number;
  GameWins: number;
  MatchCount: number;
  MatchDraws: number;
  MatchLosses: number;
  MatchWins: number;
  OpponentCount: number;
  PhaseSortOrder: number;
  Points: number;
  Rank: number;
  RoundNumber: number;
  ID: number;
  PhaseId: number;
  RoundId: number;
  TeamId: number;
  TournamentId: number;
  FormatId: string;
  FormatName: string;
  PhaseName: string;
  MatchingMethodDescription: string;
  MatchRecord: string;
  GameRecord: string;
}
