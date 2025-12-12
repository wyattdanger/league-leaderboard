/**
 * ELO Rating System Implementation
 *
 * This module implements the ELO rating system for tracking relative player skill.
 * ELO is a zero-sum rating system where players gain/lose points based on match results
 * and the expected outcome based on rating differences.
 */

/**
 * Result of an ELO calculation containing all relevant information
 */
export interface EloResult {
  playerRating: number;
  opponentRating: number;
  playerNewRating: number;
  opponentNewRating: number;
  ratingChange: number;
  opponentRatingChange: number;
  expectedScore: number; // Probability player should win (0.0-1.0)
  expectedOpponentScore: number; // Probability opponent should win
}

/**
 * Calculate ELO rating change for a match result
 *
 * This is a simplified API that handles both players simultaneously.
 *
 * @param playerRating - Current rating of the player
 * @param opponentRating - Current rating of the opponent
 * @param result - Match outcome: 'win', 'loss', or 'draw'
 * @param kFactor - Rating volatility (default 32, standard chess value)
 * @returns EloResult with new ratings and change for both players
 */
export function calculateElo(
  playerRating: number,
  opponentRating: number,
  result: 'win' | 'loss' | 'draw',
  kFactor: number = 32
): EloResult {
  // Calculate expected scores (probabilities) for both players
  const expectedPlayerScore = getExpectedScore(playerRating, opponentRating);
  const expectedOpponentScore = getExpectedScore(opponentRating, playerRating);

  // Actual scores
  const actualPlayerScore = result === 'win' ? 1 : result === 'loss' ? 0 : 0.5;
  const actualOpponentScore = result === 'win' ? 0 : result === 'loss' ? 1 : 0.5;

  // Rating changes: K × (Actual - Expected)
  const playerRatingChange = Math.round(kFactor * (actualPlayerScore - expectedPlayerScore));
  const opponentRatingChange = Math.round(kFactor * (actualOpponentScore - expectedOpponentScore));

  return {
    playerRating,
    opponentRating,
    playerNewRating: playerRating + playerRatingChange,
    opponentNewRating: opponentRating + opponentRatingChange,
    ratingChange: playerRatingChange,
    opponentRatingChange,
    expectedScore: expectedPlayerScore,
    expectedOpponentScore,
  };
}

/**
 * Calculate expected score (probability of winning) between two players
 * Useful for displaying match predictions
 *
 * Formula: 1 / (1 + 10^((opponentRating - playerRating) / 400))
 *
 * @param playerRating - Rating of the player
 * @param opponentRating - Rating of the opponent
 * @returns Expected score (0.0 to 1.0, where 0.5 = 50% probability)
 */
export function getExpectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Get rating difference needed for a given win probability
 *
 * Examples:
 * - 50% win probability: 0 rating difference
 * - 64% win probability: ~100 rating difference
 * - 76% win probability: ~200 rating difference
 * - 91% win probability: ~400 rating difference
 *
 * @param winProbability - Desired win probability (0.0 to 1.0)
 * @returns Rating difference needed
 */
export function getRatingDifferenceForWinProbability(winProbability: number): number {
  if (winProbability <= 0 || winProbability >= 1) {
    throw new Error('Win probability must be between 0 and 1 (exclusive)');
  }
  return -400 * Math.log10(1 / winProbability - 1);
}

/**
 * Default starting rating for new players
 */
export const DEFAULT_STARTING_RATING = 1500;

/**
 * Default K-factor (rating volatility)
 * Higher K = more volatile ratings
 * Lower K = more stable ratings
 */
export const DEFAULT_K_FACTOR = 32;
