import type { HeadToHeadRecord } from '../types';
import type { MeleeMatch } from '../types/melee';
import { Player } from '../models/Player';

// Re-export MeleeMatch as Match for backward compatibility
export type Match = MeleeMatch;

export interface PlayerStats {
  username: string;
  displayName: string;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  gameWins: number;
  gameLosses: number;
  gameDraws: number;
  matchWinPercentage: number;
  gameWinPercentage: number;
}

/**
 * Calculate overall stats for a single player across all rounds in a tournament
 */
export function calculatePlayerStats(
  username: string,
  matchesPerRound: Match[][],
  tournamentId: string
): PlayerStats | null {
  let displayName = '';
  let matchWins = 0;
  let matchLosses = 0;
  let matchDraws = 0;
  let gameWins = 0;
  let gameLosses = 0;
  let gameDraws = 0;

  let foundPlayer = false;

  for (const matches of matchesPerRound) {
    for (const match of matches) {
      // Skip bye matches
      if (match.ByeReason !== null && match.ByeReason !== undefined) {
        // Check if this is the player with the bye
        if (match.Competitors.length === 1) {
          const competitor = match.Competitors[0];
          const player = Player.fromCompetitor(competitor);
          if (player && player.username === username) {
            foundPlayer = true;
            displayName = player.displayName;
            // Bye counts as a match win with game byes
            matchWins++;
            gameWins += competitor.GameByes || 0;
          }
        }
        continue;
      }

      // Regular match - find if player is in this match
      if (match.Competitors.length !== 2) continue;

      const comp1 = match.Competitors[0];
      const comp2 = match.Competitors[1];
      const player1 = Player.fromCompetitor(comp1);
      const player2 = Player.fromCompetitor(comp2);

      let playerComp = null;
      let opponentComp = null;

      if (player1 && player1.username === username) {
        foundPlayer = true;
        displayName = player1.displayName;
        playerComp = comp1;
        opponentComp = comp2;
      } else if (player2 && player2.username === username) {
        foundPlayer = true;
        displayName = player2.displayName;
        playerComp = comp2;
        opponentComp = comp1;
      }

      if (playerComp && opponentComp) {
        const playerGameWins = playerComp.GameWins ?? 0;
        const opponentGameWins = opponentComp.GameWins ?? 0;
        const draws = match.GameDraws || 0;

        // Determine match result
        if (playerGameWins > opponentGameWins) {
          matchWins++;
        } else if (playerGameWins < opponentGameWins) {
          matchLosses++;
        } else {
          matchDraws++;
        }

        // Accumulate game stats
        gameWins += playerGameWins;
        gameLosses += opponentGameWins;
        gameDraws += draws;
      }
    }
  }

  if (!foundPlayer) {
    return null;
  }

  const totalMatches = matchWins + matchLosses + matchDraws;
  const totalGames = gameWins + gameLosses + gameDraws;

  return {
    username,
    displayName,
    matchWins,
    matchLosses,
    matchDraws,
    gameWins,
    gameLosses,
    gameDraws,
    matchWinPercentage: totalMatches > 0 ? matchWins / totalMatches : 0,
    gameWinPercentage: totalGames > 0 ? gameWins / totalGames : 0,
  };
}

/**
 * Calculate head-to-head records for a player against all opponents
 */
export function calculateHeadToHeadRecords(
  username: string,
  matchesPerRound: Match[][],
  tournamentMetadataMap?: Map<string, { dateDisplay: string }>,
  deckDataMap?: Map<string, { [username: string]: string }>
): HeadToHeadRecord[] {
  const opponentStats = new Map<
    string,
    {
      displayName: string;
      matchWins: number;
      matchLosses: number;
      matchDraws: number;
      gameWins: number;
      gameLosses: number;
      gameDraws: number;
      matchDetails: Array<{
        tournamentId: string;
        dateDisplay: string;
        result: 'W' | 'L' | 'D';
        playerDeck?: string;
        opponentDeck?: string;
        playerGameWins: number;
        opponentGameWins: number;
        gameDraws: number;
      }>;
    }
  >();

  for (const matches of matchesPerRound) {
    for (const match of matches) {
      // Skip bye matches
      if (match.ByeReason !== null && match.ByeReason !== undefined) {
        continue;
      }

      // Only process regular 2-player matches
      if (match.Competitors.length !== 2) continue;

      const comp1 = match.Competitors[0];
      const comp2 = match.Competitors[1];
      const player1 = Player.fromCompetitor(comp1);
      const player2 = Player.fromCompetitor(comp2);

      let playerComp = null;
      let opponentComp = null;
      let opponentUsername = '';
      let opponentDisplayName = '';

      if (player1 && player1.username === username) {
        playerComp = comp1;
        opponentComp = comp2;
        opponentUsername = player2?.username || '';
        opponentDisplayName = player2?.displayName || '';
      } else if (player2 && player2.username === username) {
        playerComp = comp2;
        opponentComp = comp1;
        opponentUsername = player1?.username || '';
        opponentDisplayName = player1?.displayName || '';
      }

      if (playerComp && opponentComp && opponentUsername) {
        // Initialize opponent stats if needed
        if (!opponentStats.has(opponentUsername)) {
          opponentStats.set(opponentUsername, {
            displayName: opponentDisplayName,
            matchWins: 0,
            matchLosses: 0,
            matchDraws: 0,
            gameWins: 0,
            gameLosses: 0,
            gameDraws: 0,
            matchDetails: [],
          });
        }

        const stats = opponentStats.get(opponentUsername)!;
        const playerGameWins = playerComp.GameWins ?? 0;
        const opponentGameWins = opponentComp.GameWins ?? 0;
        const draws = match.GameDraws || 0;

        // Determine match result
        let result: 'W' | 'L' | 'D';
        if (playerGameWins > opponentGameWins) {
          stats.matchWins++;
          result = 'W';
        } else if (playerGameWins < opponentGameWins) {
          stats.matchLosses++;
          result = 'L';
        } else {
          stats.matchDraws++;
          result = 'D';
        }

        // Accumulate game stats
        stats.gameWins += playerGameWins;
        stats.gameLosses += opponentGameWins;
        stats.gameDraws += draws;

        // Store detailed match information
        const tournamentId = match.TournamentId?.toString() || '';
        const dateDisplay = tournamentMetadataMap?.get(tournamentId)?.dateDisplay || '';
        const deckData = deckDataMap?.get(tournamentId);
        const playerDeck = deckData?.[username];
        const opponentDeck = deckData?.[opponentUsername];

        stats.matchDetails.push({
          tournamentId,
          dateDisplay,
          result,
          playerDeck,
          opponentDeck,
          playerGameWins,
          opponentGameWins,
          gameDraws: draws,
        });
      }
    }
  }

  // Convert to HeadToHeadRecord array
  const records: HeadToHeadRecord[] = Array.from(opponentStats.entries()).map(
    ([opponentUsername, stats]) => {
      const matchesPlayed = stats.matchWins + stats.matchLosses + stats.matchDraws;
      const totalGames = stats.gameWins + stats.gameLosses + stats.gameDraws;

      return {
        opponentUsername,
        opponentDisplayName: stats.displayName,
        matchesPlayed,
        matchWins: stats.matchWins,
        matchLosses: stats.matchLosses,
        matchDraws: stats.matchDraws,
        matchWinPercentage: matchesPlayed > 0 ? (stats.matchWins + 0.5 * stats.matchDraws) / matchesPlayed : 0,
        gameWins: stats.gameWins,
        gameLosses: stats.gameLosses,
        gameDraws: stats.gameDraws,
        gameWinPercentage: totalGames > 0 ? stats.gameWins / totalGames : 0,
        matches: stats.matchDetails,
      };
    }
  );

  // Sort by matches played (descending)
  records.sort((a, b) => b.matchesPlayed - a.matchesPlayed);

  return records;
}
