export interface LeagueStanding {
  TeamId: number;
  Team: {
    Players: Array<{
      DisplayName: string;
      Username: string;
    }>;
  };
  Rank: number;
  MatchWins: number;
  MatchLosses: number;
  MatchDraws: number;
  GameWins: number;
  GameLosses: number;
  GameDraws: number;
  Points: number;
  MatchRecord: string;
  GameRecord: string;
  OpponentMatchWinPercentage: number;
  TeamGameWinPercentage: number;
  OpponentGameWinPercentage: number;
  OpponentCount: number;
  TournamentCount?: number;
  Trophies?: number;
}

export interface League {
  name: string;
  tournaments: number[];
}

export interface LeaguesConfig {
  leagues: League[];
}

export interface HeadToHeadRecord {
  opponentUsername: string;
  opponentDisplayName: string;
  matchesPlayed: number;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  matchWinPercentage: number;
  gameWins: number;
  gameLosses: number;
  gameDraws: number;
  gameWinPercentage: number;
  lastFiveResults: ('W' | 'L' | 'D')[];
}

export interface PlayerOverallStats {
  totalTournaments: number;
  totalPoints: number;
  totalMatches: number;
  matchRecord: string;
  matchWinPercentage: number;
  gameRecord: string;
  gameWinPercentage: number;
  trophies: number;
  belts: number;
}

export interface PlayerLeagueStats {
  leagueName: string;
  events: number;
  points: number;
  matchRecord: string;
  matchWinPercentage: number;
  gameRecord: string;
  gameWinPercentage: number;
}

export interface PlayerTournamentPerformance {
  tournamentId: number;
  dateDisplay: string;
  playerCount: number;
  trophyCount: number;
  roundCount: number;
  rank: number;
  points: number;
  matchRecord: string;
  matchWinPercentage: number;
  gameWinPercentage: number;
  deck?: string; // Optional deck archetype
}

export interface PlayerDetailData {
  username: string;
  displayName: string;
  overallStats: PlayerOverallStats;
  leagueStats: PlayerLeagueStats[];
  headToHead: HeadToHeadRecord[];
  tournamentPerformances: PlayerTournamentPerformance[];
}

export interface TournamentMetadata {
  tournamentId: number;
  name: string;
  date: string;
  dateDisplay: string;
  playerCount: number;
  roundCount: number;
  trophyCount: number;
  winnerDisplayName?: string; // For Top 8s, the 3-0 winner's display name
}

export interface DeckData {
  [username: string]: string;
}

export interface MetagameBreakdown {
  archetype: string;
  count: number;
  percentage: number;
}
