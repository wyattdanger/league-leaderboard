import { Match } from './Match';
import type { MeleeMatch } from '../types/melee';

/**
 * Round model - represents a single round of tournament play
 * Groups matches that occurred in the same round
 */
export class Round {
  readonly number: number;
  readonly matches: Match[];

  private constructor(data: { number: number; matches: Match[] }) {
    this.number = data.number;
    this.matches = data.matches;
  }

  /**
   * Create a Round from an array of Melee.gg match data
   * This is the ONLY place that knows about Melee's data structure
   */
  static fromMeleeMatches(meleeMatches: MeleeMatch[]): Round {
    if (meleeMatches.length === 0) {
      throw new Error('Cannot create Round from empty matches array');
    }

    // Extract round number from first match
    const roundNumber = meleeMatches[0]?.RoundNumber || 0;

    // Verify all matches are from the same round
    const allSameRound = meleeMatches.every((m) => m.RoundNumber === roundNumber);
    if (!allSameRound) {
      throw new Error(
        `All matches must be from the same round. Found matches from multiple rounds.`
      );
    }

    // Convert to Match models and sort
    const matches = meleeMatches.map((m) => Match.fromMeleeMatch(m));
    const sortedMatches = Match.sortMatches(matches);

    return new Round({
      number: roundNumber,
      matches: sortedMatches,
    });
  }

  /**
   * Get all regular (non-bye) matches
   */
  get regularMatches(): Match[] {
    return this.matches.filter((m) => m.isRegularMatch);
  }

  /**
   * Get all bye matches
   */
  get byeMatches(): Match[] {
    return this.matches.filter((m) => m.isBye);
  }

  /**
   * Get total number of matches (including byes)
   */
  get matchCount(): number {
    return this.matches.length;
  }

  /**
   * Get number of regular matches (excluding byes)
   */
  get regularMatchCount(): number {
    return this.regularMatches.length;
  }

  /**
   * Get number of bye matches
   */
  get byeCount(): number {
    return this.byeMatches.length;
  }

  /**
   * Check if all matches in the round are complete
   */
  get isComplete(): boolean {
    return this.matches.every((m) => m.isComplete);
  }

  /**
   * Get display label for round (e.g., "Round 1")
   */
  get displayLabel(): string {
    return `Round ${this.number}`;
  }
}
