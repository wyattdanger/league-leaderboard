import type { Match, Team } from './standings-calculator.js';
import { calculateGameWinPercentage } from './utils/winPercentage';

export interface LeagueStanding {
  TeamId: number;
  Team: Team;
  Rank: number;
  TournamentCount: number;
  TotalMatchWins: number;
  TotalMatchLosses: number;
  TotalMatchDraws: number;
  TotalGameWins: number;
  TotalGameLosses: number;
  TotalGameDraws: number;
  TotalPoints: number;
  MatchRecord: string;
  GameRecord: string;
  GameWinPercentage: number;
}

interface TeamLeagueStats {
  teamId: number;
  team: Team;
  tournamentIds: Set<string>;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  gameWins: number;
  gameLosses: number;
  gameDraws: number;
}

/**
 * Calculate league standings across multiple tournaments
 * No OMW%/OGW% since opponents don't overlap across tournaments
 */
export function calculateLeagueStandings(
  tournamentMatches: Map<string, Match[][]>
): LeagueStanding[] {
  const teamStats = new Map<number, TeamLeagueStats>();

  // Process all tournaments
  for (const [tournamentId, roundsMatches] of tournamentMatches.entries()) {
    // Process all rounds in this tournament
    for (const matches of roundsMatches) {
      for (const match of matches) {
        // Handle byes
        if (match.ByeReason !== null && match.Competitors.length === 1) {
          const competitor = match.Competitors[0];
          const teamId = competitor.TeamId;

          if (!teamStats.has(teamId)) {
            teamStats.set(teamId, {
              teamId,
              team: competitor.Team,
              tournamentIds: new Set(),
              matchWins: 0,
              matchLosses: 0,
              matchDraws: 0,
              gameWins: 0,
              gameLosses: 0,
              gameDraws: 0,
            });
          }

          const stats = teamStats.get(teamId)!;
          stats.tournamentIds.add(tournamentId);
          stats.matchWins += 1;
          stats.gameWins += competitor.GameByes || 0;
          continue;
        }

        // Regular matches with 2 competitors
        if (match.Competitors.length === 2) {
          const [comp1, comp2] = match.Competitors;

          // Initialize team stats if needed
          for (const comp of [comp1, comp2]) {
            if (!teamStats.has(comp.TeamId)) {
              teamStats.set(comp.TeamId, {
                teamId: comp.TeamId,
                team: comp.Team,
                tournamentIds: new Set(),
                matchWins: 0,
                matchLosses: 0,
                matchDraws: 0,
                gameWins: 0,
                gameLosses: 0,
                gameDraws: 0,
              });
            }
            teamStats.get(comp.TeamId)!.tournamentIds.add(tournamentId);
          }

          const stats1 = teamStats.get(comp1.TeamId)!;
          const stats2 = teamStats.get(comp2.TeamId)!;

          const games1 = comp1.GameWins ?? 0;
          const games2 = comp2.GameWins ?? 0;
          const draws = match.GameDraws || 0;

          // Update game records
          stats1.gameWins += games1;
          stats2.gameWins += games2;
          stats1.gameLosses += games2;
          stats2.gameLosses += games1;
          stats1.gameDraws += draws;
          stats2.gameDraws += draws;

          // Determine match winner
          if (games1 > games2) {
            stats1.matchWins += 1;
            stats2.matchLosses += 1;
          } else if (games2 > games1) {
            stats2.matchWins += 1;
            stats1.matchLosses += 1;
          } else {
            stats1.matchDraws += 1;
            stats2.matchDraws += 1;
          }
        }
      }
    }
  }

  // Create league standings
  const standings: LeagueStanding[] = [];

  for (const stats of teamStats.values()) {
    const gameWinPct = calculateGameWinPercentage(stats.gameWins, stats.gameLosses, stats.gameDraws);

    standings.push({
      TeamId: stats.teamId,
      Team: stats.team,
      Rank: 0, // Will be assigned after sorting
      TournamentCount: stats.tournamentIds.size,
      TotalMatchWins: stats.matchWins,
      TotalMatchLosses: stats.matchLosses,
      TotalMatchDraws: stats.matchDraws,
      TotalGameWins: stats.gameWins,
      TotalGameLosses: stats.gameLosses,
      TotalGameDraws: stats.gameDraws,
      TotalPoints: stats.matchWins * 3 + stats.matchDraws * 1,
      MatchRecord: `${stats.matchWins}-${stats.matchLosses}-${stats.matchDraws}`,
      GameRecord: `${stats.gameWins}-${stats.gameLosses}-${stats.gameDraws}`,
      GameWinPercentage: gameWinPct,
    });
  }

  // Sort by: Total Points (desc), Match Wins (desc), Game Win % (desc), TeamId (asc)
  standings.sort((a, b) => {
    if (b.TotalPoints !== a.TotalPoints) return b.TotalPoints - a.TotalPoints;
    if (b.TotalMatchWins !== a.TotalMatchWins) return b.TotalMatchWins - a.TotalMatchWins;
    if (b.GameWinPercentage !== a.GameWinPercentage)
      return b.GameWinPercentage - a.GameWinPercentage;
    return a.TeamId - b.TeamId;
  });

  // Assign ranks
  standings.forEach((standing, index) => {
    standing.Rank = index + 1;
  });

  return standings;
}
