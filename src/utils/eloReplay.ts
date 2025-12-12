/**
 * ELO Chronological Replay System
 *
 * This module handles collecting all matches from all tournaments,
 * sorting them chronologically, and replaying them to calculate
 * ELO ratings and complete rating history for all players.
 */

import * as fs from 'fs';
import * as path from 'path';
import { calculateElo, DEFAULT_STARTING_RATING } from './elo';

// Match types from Melee.gg API
interface Match {
  Competitors: Competitor[];
  ByeReason: number | null;
  [key: string]: unknown;
}

interface Competitor {
  Team: {
    Players: Array<{
      Username: string;
      DisplayName: string;
    }>;
  };
  GameWins: number | null;
}

/**
 * Match enriched with tournament context and timestamp for chronological sorting
 */
export interface EnrichedMatch extends Match {
  tournamentId: string;
  tournamentDate: string;
  roundNumber: number;
  timestamp: number;
}

/**
 * Player information extracted from a match
 */
export interface PlayerInMatch {
  username: string;
  displayName: string;
}

/**
 * Single entry in a player's ELO history
 */
export interface EloHistoryEntry {
  tournamentId: string;
  tournamentDate: string;
  roundNumber: number;
  opponent: string;
  result: 'W' | 'L' | 'D';
  ratingBefore: number;
  ratingAfter: number;
  ratingChange: number;
}

/**
 * Complete ELO data for a player
 */
export interface PlayerEloData {
  username: string;
  currentRating: number;
  peakRating: number;
  history: EloHistoryEntry[];
}

/**
 * Collect all matches from all tournaments and enrich with timestamp data
 *
 * @param tournamentIds - Array of tournament IDs to process
 * @returns Array of matches sorted chronologically
 */
export function collectAllMatches(tournamentIds: string[]): EnrichedMatch[] {
  const allMatches: EnrichedMatch[] = [];

  for (const tournamentId of tournamentIds) {
    const tournamentDir = path.join(process.cwd(), 'output', `tournament_${tournamentId}`);

    // Skip if tournament directory doesn't exist
    if (!fs.existsSync(tournamentDir)) {
      console.warn(`Warning: Tournament ${tournamentId} not found, skipping`);
      continue;
    }

    // Find all match files
    const files = fs.readdirSync(tournamentDir);
    const matchFiles = files.filter((f) => /^Round_\d+_Matches\.json$/.test(f)).sort();

    if (matchFiles.length === 0) {
      console.warn(`Warning: Tournament ${tournamentId} has no match files, skipping`);
      continue;
    }

    // Get tournament date from first match's DateCreated
    let tournamentDate: string | null = null;

    for (const matchFile of matchFiles) {
      const matchesPath = path.join(tournamentDir, matchFile);
      const matches = JSON.parse(fs.readFileSync(matchesPath, 'utf-8'));

      // Extract round number from filename (e.g., "Round_1_Matches.json" -> 1)
      const roundMatch = matchFile.match(/Round_(\d+)_Matches\.json/);
      const roundNumber = roundMatch ? parseInt(roundMatch[1], 10) : 0;

      // Get tournament date from first match if we haven't yet
      if (!tournamentDate && matches.length > 0 && matches[0].DateCreated) {
        const date = new Date(matches[0].DateCreated);
        tournamentDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      }

      for (const match of matches) {
        // Skip byes - they don't affect ELO
        if (match.ByeReason !== null || match.Competitors.length !== 2) {
          continue;
        }

        // Timestamp: date + round offset ensures proper ordering
        // Rounds within same day are ordered by round number
        const dateTimestamp = tournamentDate
          ? new Date(tournamentDate).getTime()
          : Date.now();
        const timestamp = dateTimestamp + roundNumber * 1000;

        allMatches.push({
          ...match,
          tournamentId,
          tournamentDate: tournamentDate || 'Unknown',
          roundNumber,
          timestamp,
        });
      }
    }
  }

  // Sort chronologically
  allMatches.sort((a, b) => a.timestamp - b.timestamp);

  return allMatches;
}

/**
 * Extract both players from a match
 *
 * @param match - The match to extract players from
 * @returns Tuple of [player1, player2]
 * @throws Error if match doesn't have exactly 2 competitors
 */
export function extractPlayersFromMatch(match: Match): [PlayerInMatch, PlayerInMatch] {
  if (match.Competitors.length !== 2) {
    throw new Error(`Expected 2 competitors, got ${match.Competitors.length}`);
  }

  const player1 = {
    username: match.Competitors[0].Team.Players[0].Username,
    displayName: match.Competitors[0].Team.Players[0].DisplayName,
  };

  const player2 = {
    username: match.Competitors[1].Team.Players[0].Username,
    displayName: match.Competitors[1].Team.Players[0].DisplayName,
  };

  return [player1, player2];
}

/**
 * Determine match result from perspective of specified player
 *
 * @param match - The match to analyze
 * @param playerUsername - Username of the player to get result for
 * @returns 'win', 'loss', or 'draw'
 */
export function determineMatchResult(
  match: Match,
  playerUsername: string
): 'win' | 'loss' | 'draw' {
  const player1Username = match.Competitors[0].Team.Players[0].Username;
  const player1Wins = match.Competitors[0].GameWins || 0;
  const player2Wins = match.Competitors[1].GameWins || 0;

  // Determine if player is competitor 0 or 1
  const isPlayer1 = player1Username === playerUsername;
  const playerWins = isPlayer1 ? player1Wins : player2Wins;
  const opponentWins = isPlayer1 ? player2Wins : player1Wins;

  // Match result logic
  if (playerWins > opponentWins) {
    return 'win';
  } else if (opponentWins > playerWins) {
    return 'loss';
  } else {
    // Equal game wins = match draw
    return 'draw';
  }
}

/**
 * Calculate ELO ratings for all players by replaying all matches chronologically
 *
 * This is the main entry point for ELO calculation. It:
 * 1. Collects all matches from all tournaments
 * 2. Sorts them chronologically
 * 3. Replays each match, updating player ratings
 * 4. Records complete rating history for each player
 *
 * @param tournamentIds - Array of tournament IDs to process
 * @returns Map of username -> PlayerEloData
 */
export function calculateAllPlayerElos(tournamentIds: string[]): Map<string, PlayerEloData> {
  // Step 1: Collect and sort all matches chronologically
  const allMatches = collectAllMatches(tournamentIds);

  console.log(`Processing ${allMatches.length} matches across ${tournamentIds.length} tournaments for ELO calculation`);

  // Step 2: Initialize tracking structures
  const playerRatings = new Map<string, number>();
  const playerHistories = new Map<string, EloHistoryEntry[]>();

  // Step 3: Process each match in chronological order
  for (const match of allMatches) {
    const [player1, player2] = extractPlayersFromMatch(match);

    // Initialize ratings if first time seeing these players
    if (!playerRatings.has(player1.username)) {
      playerRatings.set(player1.username, DEFAULT_STARTING_RATING);
      playerHistories.set(player1.username, []);
    }
    if (!playerRatings.has(player2.username)) {
      playerRatings.set(player2.username, DEFAULT_STARTING_RATING);
      playerHistories.set(player2.username, []);
    }

    // Get current ratings
    const player1Rating = playerRatings.get(player1.username)!;
    const player2Rating = playerRatings.get(player2.username)!;

    // Calculate result (W/L/D)
    const player1Result = determineMatchResult(match, player1.username);

    // Calculate new ELO ratings
    const eloResult = calculateElo(player1Rating, player2Rating, player1Result);

    // Update ratings
    playerRatings.set(player1.username, eloResult.playerNewRating);
    playerRatings.set(player2.username, eloResult.opponentNewRating);

    // Record history for both players
    playerHistories.get(player1.username)!.push({
      tournamentId: match.tournamentId,
      tournamentDate: match.tournamentDate,
      roundNumber: match.roundNumber,
      opponent: player2.username,
      result: player1Result === 'win' ? 'W' : player1Result === 'loss' ? 'L' : 'D',
      ratingBefore: player1Rating,
      ratingAfter: eloResult.playerNewRating,
      ratingChange: eloResult.ratingChange,
    });

    // Player 2's result is opposite of player 1's
    const player2Result = player1Result === 'win' ? 'L' : player1Result === 'loss' ? 'W' : 'D';

    playerHistories.get(player2.username)!.push({
      tournamentId: match.tournamentId,
      tournamentDate: match.tournamentDate,
      roundNumber: match.roundNumber,
      opponent: player1.username,
      result: player2Result,
      ratingBefore: player2Rating,
      ratingAfter: eloResult.opponentNewRating,
      ratingChange: eloResult.opponentRatingChange,
    });
  }

  // Step 4: Calculate peak ratings and return
  const results = new Map<string, PlayerEloData>();
  for (const [username, currentRating] of playerRatings) {
    const history = playerHistories.get(username)!;
    const peakRating = Math.max(
      DEFAULT_STARTING_RATING,
      ...history.map((h) => h.ratingAfter)
    );

    results.set(username, {
      username,
      currentRating,
      peakRating,
      history,
    });
  }

  console.log(`Calculated ELO ratings for ${results.size} players`);

  return results;
}
