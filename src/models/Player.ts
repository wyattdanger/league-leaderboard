import type { MeleePlayer, MeleeCompetitor, MeleeStanding } from '../types/melee';

/**
 * Player class - abstraction over tournament platform player data
 * Handles data cleaning and provides a consistent interface
 */
export class Player {
  readonly username: string;
  readonly displayName: string;

  private constructor(username: string, displayName: string) {
    this.username = username;
    this.displayName = displayName;
  }

  /**
   * Remove emojis and extra whitespace from display names
   */
  private static cleanDisplayName(displayName: string): string {
    // Remove emojis using Unicode ranges
    const cleaned = displayName.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
    // Trim and normalize whitespace
    return cleaned.trim().replace(/\s+/g, ' ');
  }

  /**
   * Create a Player from raw Melee.gg player data
   * @throws Error if username is missing or empty
   */
  static fromMeleeData(meleePlayerData: MeleePlayer): Player {
    const username = meleePlayerData.Username?.trim() || '';
    if (!username) {
      throw new Error('Player data is missing username');
    }

    const rawDisplayName = meleePlayerData.DisplayName || username;
    const displayName = Player.cleanDisplayName(rawDisplayName);

    return new Player(username, displayName);
  }

  /**
   * Create a Player from a Competitor object in Melee.gg match data
   * @throws Error if competitor data is missing or invalid
   */
  static fromCompetitor(competitor: MeleeCompetitor): Player {
    const playerData = competitor?.Team?.Players?.[0];
    if (!playerData) {
      throw new Error('Competitor data is missing player information');
    }
    return Player.fromMeleeData(playerData);
  }

  /**
   * Create a Player from a Standing object in Melee.gg standings data
   * @throws Error if standing data is missing or invalid
   */
  static fromStanding(standing: MeleeStanding): Player {
    const playerData = standing?.Team?.Players?.[0];
    if (!playerData) {
      throw new Error('Standing data is missing player information');
    }
    return Player.fromMeleeData(playerData);
  }

  /**
   * Check if this player matches a username
   */
  matches(username: string): boolean {
    return this.username === username;
  }

  /**
   * Get the URL path for this player's profile page
   */
  get profileUrl(): string {
    return `/player/${this.username.toLowerCase()}`;
  }
}
