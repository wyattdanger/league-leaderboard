interface StandingWithMatchRecord {
  MatchWins: number;
  MatchLosses: number;
  MatchDraws: number;
}

interface StandingWithGameRecord {
  GameWins: number;
  GameLosses: number;
  GameDraws: number;
}

/**
 * Calculate match win percentage
 * Draws count as 0.5 wins
 * Formula: (Wins + 0.5 * Draws) / (Wins + Losses + Draws)
 */
export function calculateMatchWinPercentage(
  winsOrStanding: number | StandingWithMatchRecord,
  losses?: number,
  draws?: number
): number {
  let wins: number;
  let matchLosses: number;
  let matchDraws: number;

  if (typeof winsOrStanding === 'object') {
    wins = winsOrStanding.MatchWins;
    matchLosses = winsOrStanding.MatchLosses;
    matchDraws = winsOrStanding.MatchDraws;
  } else {
    wins = winsOrStanding;
    matchLosses = losses!;
    matchDraws = draws!;
  }

  const totalMatches = wins + matchLosses + matchDraws;
  if (totalMatches === 0) return 0;

  const effectiveWins = wins + matchDraws * 0.5;
  return effectiveWins / totalMatches;
}

/**
 * Calculate game win percentage
 * Draws count as 0.5 wins
 * Formula: (Wins + 0.5 * Draws) / (Wins + Losses + Draws)
 */
export function calculateGameWinPercentage(
  winsOrStanding: number | StandingWithGameRecord,
  losses?: number,
  draws?: number
): number {
  let wins: number;
  let gameLosses: number;
  let gameDraws: number;

  if (typeof winsOrStanding === 'object') {
    wins = winsOrStanding.GameWins;
    gameLosses = winsOrStanding.GameLosses;
    gameDraws = winsOrStanding.GameDraws;
  } else {
    wins = winsOrStanding;
    gameLosses = losses!;
    gameDraws = draws!;
  }

  const totalGames = wins + gameLosses + gameDraws;
  if (totalGames === 0) return 0;

  const effectiveWins = wins + gameDraws * 0.5;
  return effectiveWins / totalGames;
}
