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
}

export interface League {
  name: string;
  tournaments: number[];
}

export interface LeaguesConfig {
  leagues: League[];
}
