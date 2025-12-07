import { Player } from './Player';
import type { MeleeMatch, MeleeCompetitor } from '../types/melee';

/**
 * Match model - represents a single match/pairing in a tournament
 * Abstracts away tournament platform-specific data structure
 */
export class Match {
  readonly round: number;
  readonly player1: Player | null;
  readonly player2: Player | null;
  readonly player1Games: number;
  readonly player2Games: number;
  readonly gameDraws: number;
  private readonly _isBye: boolean;
  private readonly _tableNumber: number | null;

  private constructor(data: {
    round: number;
    player1: Player | null;
    player2: Player | null;
    player1Games: number;
    player2Games: number;
    gameDraws: number;
    isBye: boolean;
    tableNumber: number | null;
  }) {
    this.round = data.round;
    this.player1 = data.player1;
    this.player2 = data.player2;
    this.player1Games = data.player1Games;
    this.player2Games = data.player2Games;
    this.gameDraws = data.gameDraws;
    this._isBye = data.isBye;
    this._tableNumber = data.tableNumber;
  }

  /**
   * Create a Match from Melee.gg match data
   * This is the ONLY place that knows about Melee's data structure
   */
  static fromMeleeMatch(meleeMatch: MeleeMatch): Match {
    const competitors = meleeMatch.Competitors || [];

    // Check if this is a bye (single competitor or ByeReason set)
    const isBye = competitors.length === 1 ||
                  meleeMatch.ByeReason !== null ||
                  competitors[0]?.ByeReason !== undefined;

    // Extract players
    const competitor1 = competitors[0];
    const competitor2 = isBye ? null : competitors[1];

    let player1: Player | null = null;
    let player2: Player | null = null;

    try {
      if (competitor1) {
        player1 = Player.fromCompetitor(competitor1);
      }
      if (competitor2) {
        player2 = Player.fromCompetitor(competitor2);
      }
    } catch (error) {
      // Handle cases where player data might be missing
      console.warn('Failed to extract player from match:', error);
    }

    // Extract game wins
    const player1Games = competitor1?.GameWins || 0;
    const player2Games = competitor2?.GameWins || 0;

    // For byes, the player gets credited with GameByes (usually 2)
    const byeGames = isBye ? (competitor1?.GameByes || 2) : 0;

    return new Match({
      round: meleeMatch.RoundNumber || 0,
      player1,
      player2: isBye ? null : player2,
      player1Games: isBye ? byeGames : player1Games,
      player2Games: isBye ? 0 : player2Games,
      gameDraws: meleeMatch.GameDraws || 0,
      isBye,
      tableNumber: meleeMatch.TableNumber
    });
  }

  /**
   * Check if this is a bye match
   */
  get isBye(): boolean {
    return this._isBye;
  }

  /**
   * Get the winner of the match
   * Returns null if the match is a draw or incomplete
   */
  get winner(): Player | null {
    if (this.isBye && this.player1) {
      return this.player1;
    }
    if (this.player1Games > this.player2Games) {
      return this.player1;
    }
    if (this.player2Games > this.player1Games) {
      return this.player2;
    }
    return null; // Draw or incomplete
  }

  /**
   * Get the loser of the match
   * Returns null if the match is a draw, incomplete, or bye
   */
  get loser(): Player | null {
    if (this.isBye) {
      return null;
    }
    if (this.player1Games > this.player2Games) {
      return this.player2;
    }
    if (this.player2Games > this.player1Games) {
      return this.player1;
    }
    return null; // Draw or incomplete
  }

  /**
   * Check if the match is a draw
   */
  get isDraw(): boolean {
    return !this.isBye && this.player1Games === this.player2Games;
  }

  /**
   * Check if the match is complete (has a result)
   */
  get isComplete(): boolean {
    if (this.isBye) return true;
    // A match is complete if total games played equals 2 (best of 3) or has a winner at 2 games
    const totalGames = this.player1Games + this.player2Games + this.gameDraws;
    return totalGames > 0 && (this.player1Games === 2 || this.player2Games === 2 || totalGames === 3);
  }

  /**
   * Get match result as a string (e.g., "2-0" or "2-1")
   */
  get resultString(): string {
    if (this.isBye) return 'BYE';
    if (!this.isComplete) return '—';

    if (this.gameDraws > 0) {
      return `${this.player1Games}-${this.player2Games}-${this.gameDraws}`;
    }
    return `${this.player1Games}-${this.player2Games}`;
  }

  /**
   * Get display data for left side (winner or player1)
   * This is used for consistent display with winner on left
   */
  get leftPlayer(): {
    player: Player | null;
    games: number;
  } {
    const winner = this.winner;
    if (winner === this.player2) {
      return { player: this.player2, games: this.player2Games };
    }
    // Default to player1 (for draws, byes, or when player1 won)
    return { player: this.player1, games: this.player1Games };
  }

  /**
   * Get display data for right side (loser or player2)
   */
  get rightPlayer(): {
    player: Player | null;
    games: number;
  } {
    if (this.isBye) {
      return { player: null, games: 0 };
    }

    const winner = this.winner;
    if (winner === this.player2) {
      return { player: this.player1, games: this.player1Games };
    }
    // Default to player2
    return { player: this.player2, games: this.player2Games };
  }


  /**
   * Get table number if available (used for sorting)
   */
  get tableNumber(): number | null {
    return this._tableNumber;
  }

  /**
   * Check if this is a regular match (not a bye)
   */
  get isRegularMatch(): boolean {
    return !this.isBye;
  }

  /**
   * Static method to sort matches (regular matches first, byes last)
   */
  static sortMatches(matches: Match[]): Match[] {
    return [...matches].sort((a, b) => {
      if (a.isBye && !b.isBye) return 1;
      if (!a.isBye && b.isBye) return -1;
      // Secondary sort by table number if available
      if (a.tableNumber !== null && b.tableNumber !== null) {
        return a.tableNumber - b.tableNumber;
      }
      return 0;
    });
  }
}