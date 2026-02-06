import { Player } from './Player';
import type { MeleeStanding } from '../types/melee';
import { calculateMatchWinPercentage, calculateGameWinPercentage } from '../utils/winPercentage';

/**
 * Standing model - represents a player's position and record in a tournament
 * Abstracts away tournament platform-specific data structure
 */
export class Standing {
  readonly player: Player;
  readonly rank: number;
  readonly matchWins: number;
  readonly matchLosses: number;
  readonly matchDraws: number;
  readonly gameWins: number;
  readonly gameLosses: number;
  readonly gameDraws: number;
  readonly points: number;
  private readonly _opponentMatchWinPercentage: number;
  private readonly _opponentGameWinPercentage: number;
  private readonly _gameWinPercentage: number;

  private constructor(data: {
    player: Player;
    rank: number;
    matchWins: number;
    matchLosses: number;
    matchDraws: number;
    gameWins: number;
    gameLosses: number;
    gameDraws: number;
    points: number;
    opponentMatchWinPercentage: number;
    opponentGameWinPercentage: number;
    gameWinPercentage: number;
  }) {
    this.player = data.player;
    this.rank = data.rank;
    this.matchWins = data.matchWins;
    this.matchLosses = data.matchLosses;
    this.matchDraws = data.matchDraws;
    this.gameWins = data.gameWins;
    this.gameLosses = data.gameLosses;
    this.gameDraws = data.gameDraws;
    this.points = data.points;
    this._opponentMatchWinPercentage = data.opponentMatchWinPercentage;
    this._opponentGameWinPercentage = data.opponentGameWinPercentage;
    this._gameWinPercentage = data.gameWinPercentage;
  }

  /**
   * Create a Standing from Melee.gg standing data
   * This is the ONLY place that knows about Melee's data structure
   */
  static fromMeleeStanding(meleeStanding: MeleeStanding): Standing {
    const player = Player.fromStanding(meleeStanding);

    return new Standing({
      player,
      rank: meleeStanding.Rank || 0,
      matchWins: meleeStanding.MatchWins || 0,
      matchLosses: meleeStanding.MatchLosses || 0,
      matchDraws: meleeStanding.MatchDraws || 0,
      gameWins: meleeStanding.GameWins || 0,
      gameLosses: meleeStanding.GameLosses || 0,
      gameDraws: meleeStanding.GameDraws || 0,
      points: meleeStanding.Points || 0,
      opponentMatchWinPercentage: meleeStanding.OpponentMatchWinPercentage || 0,
      opponentGameWinPercentage: meleeStanding.OpponentGameWinPercentage || 0,
      gameWinPercentage: meleeStanding.TeamGameWinPercentage || 0,
    });
  }

  /**
   * Format match record for display (e.g., "3-1-0")
   * Uses the pre-formatted MatchRecord if available, otherwise constructs it
   */
  get matchRecord(): string {
    // Most standings data includes a pre-formatted MatchRecord field
    // Fall back to constructing it if not available
    return `${this.matchWins}-${this.matchLosses}-${this.matchDraws}`;
  }

  /**
   * Format game record for display (e.g., "6-3-0")
   */
  get gameRecord(): string {
    return `${this.gameWins}-${this.gameLosses}-${this.gameDraws}`;
  }

  /**
   * Calculate match win percentage (0.0 to 1.0)
   * Draws count as 0.5 wins
   */
  get matchWinPercentage(): number {
    return calculateMatchWinPercentage({
      MatchWins: this.matchWins,
      MatchLosses: this.matchLosses,
      MatchDraws: this.matchDraws,
    });
  }

  /**
   * Get match win percentage as a formatted string (e.g., "75.0")
   */
  get matchWinPercentageDisplay(): string {
    return (this.matchWinPercentage * 100).toFixed(1);
  }

  /**
   * Get game win percentage (0.0 to 1.0)
   * This is pre-calculated by the tournament software
   */
  get gameWinPercentage(): number {
    return this._gameWinPercentage;
  }

  /**
   * Get game win percentage as a formatted string (e.g., "66.7")
   */
  get gameWinPercentageDisplay(): string {
    return (this.gameWinPercentage * 100).toFixed(1);
  }

  /**
   * Get CSS class for match win percentage coloring
   */
  get matchWinPercentageClass(): string {
    const mwp = this.matchWinPercentage;
    if (mwp > 0.59) return 'wp-high';
    if (mwp > 0.39) return 'wp-medium';
    return 'wp-low';
  }

  /**
   * Get CSS class for game win percentage coloring
   */
  get gameWinPercentageClass(): string {
    const gwp = this.gameWinPercentage;
    if (gwp > 0.59) return 'wp-high';
    if (gwp > 0.39) return 'wp-medium';
    return 'wp-low';
  }

  /**
   * Check if this is a perfect record (3-0-0)
   * Used to determine trophy/belt winners
   */
  get isPerfectRecord(): boolean {
    return this.matchWins === 3 && this.matchLosses === 0 && this.matchDraws === 0;
  }

  /**
   * Check if this standing qualifies for a trophy (3-0 record)
   * Alias for isPerfectRecord for semantic clarity
   */
  get isTrophyWinner(): boolean {
    return this.isPerfectRecord;
  }

  /**
   * Static method to filter trophy winners from a list of standings
   */
  static getTrophyWinners(standings: Standing[]): Standing[] {
    return standings.filter((s) => s.isTrophyWinner);
  }

  /**
   * Static method to get top finishers (all players tied for first place)
   * Used when there are no trophy winners
   */
  static getTopFinishers(standings: Standing[]): Standing[] {
    if (standings.length === 0) return [];
    const topPoints = standings[0].points;
    return standings.filter((s) => s.points === topPoints);
  }

  /**
   * Static method to get celebration winners (trophy winners if any, otherwise top finishers)
   * This is used for the celebration section at the bottom of event pages
   */
  static getCelebrationWinners(standings: Standing[]): Standing[] {
    const trophyWinners = Standing.getTrophyWinners(standings);
    return trophyWinners.length > 0 ? trophyWinners : Standing.getTopFinishers(standings);
  }

  /**
   * Check if there are any trophy winners in the standings
   */
  static hasTrophyWinners(standings: Standing[]): boolean {
    return Standing.getTrophyWinners(standings).length > 0;
  }

  /**
   * Get opponent match win percentage
   */
  get opponentMatchWinPercentage(): number {
    return this._opponentMatchWinPercentage;
  }

  /**
   * Get opponent match win percentage formatted for display
   */
  get opponentMatchWinPercentageDisplay(): string {
    return (this._opponentMatchWinPercentage * 100).toFixed(1);
  }

  /**
   * Get CSS class for opponent match win percentage styling
   */
  get opponentMatchWinPercentageClass(): string {
    // OMW uses neutral gray styling
    return 'omw-neutral';
  }

  /**
   * Get opponent game win percentage
   * Note: Currently not displayed in UI but used for tiebreaker calculations
   */
  get opponentGameWinPercentage(): number {
    return this._opponentGameWinPercentage;
  }
}
