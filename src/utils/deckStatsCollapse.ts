import type { PlayerDeckStats } from '../types';
import { normalizeDeckName } from './archetypeAliases';

export interface VariantStats {
  variantName: string;
  events: number;
  matchRecord: string;
  gameRecord: string;
}

export interface CollapsedDeckStats extends PlayerDeckStats {
  variantStats: VariantStats[]; // Detailed stats per variant
}

/**
 * Collapse deck stats by normalizing archetype names and aggregating stats
 * Returns collapsed stats with per-variant breakdowns for tooltips
 */
export function collapseDeckStats(deckStats: PlayerDeckStats[]): CollapsedDeckStats[] {
  const collapsed = new Map<string, {
    stats: Omit<PlayerDeckStats, 'deckName'>;
    variantStatsMap: Map<string, PlayerDeckStats>;
  }>();

  // Aggregate stats by normalized deck name
  for (const deck of deckStats) {
    const normalizedName = normalizeDeckName(deck.deckName);

    if (!collapsed.has(normalizedName)) {
      collapsed.set(normalizedName, {
        stats: {
          events: 0,
          matchWins: 0,
          matchLosses: 0,
          matchDraws: 0,
          matchRecord: '',
          matchWinPercentage: 0,
          gameWins: 0,
          gameLosses: 0,
          gameDraws: 0,
          gameWinPercentage: 0,
          trophies: 0,
        },
        variantStatsMap: new Map(),
      });
    }

    const entry = collapsed.get(normalizedName)!;

    // Store original deck stats for variant breakdown
    entry.variantStatsMap.set(deck.deckName, deck);

    // Aggregate stats
    entry.stats.events += deck.events;
    entry.stats.matchWins += deck.matchWins;
    entry.stats.matchLosses += deck.matchLosses;
    entry.stats.matchDraws += deck.matchDraws;
    entry.stats.gameWins += deck.gameWins;
    entry.stats.gameLosses += deck.gameLosses;
    entry.stats.gameDraws += deck.gameDraws;
    entry.stats.trophies += deck.trophies;
  }

  // Convert to array and recalculate percentages and records
  const result: CollapsedDeckStats[] = [];

  for (const [deckName, { stats, variantStatsMap }] of collapsed.entries()) {
    const totalMatches = stats.matchWins + stats.matchLosses + stats.matchDraws;
    const totalGames = stats.gameWins + stats.gameLosses + stats.gameDraws;

    const matchWinPercentage = totalMatches > 0
      ? (stats.matchWins + stats.matchDraws * 0.5) / totalMatches
      : 0;

    const gameWinPercentage = totalGames > 0
      ? (stats.gameWins + stats.gameDraws * 0.5) / totalGames
      : 0;

    // Convert variant stats map to array with formatted strings
    const variantStats: VariantStats[] = Array.from(variantStatsMap.entries())
      .map(([variantName, stats]) => ({
        variantName,
        events: stats.events,
        matchRecord: stats.matchRecord,
        gameRecord: `${stats.gameWins}-${stats.gameLosses}-${stats.gameDraws}`,
      }))
      .sort((a, b) => b.events - a.events); // Sort by events desc

    result.push({
      deckName,
      events: stats.events,
      matchWins: stats.matchWins,
      matchLosses: stats.matchLosses,
      matchDraws: stats.matchDraws,
      matchRecord: `${stats.matchWins}-${stats.matchLosses}-${stats.matchDraws}`,
      matchWinPercentage,
      gameWins: stats.gameWins,
      gameLosses: stats.gameLosses,
      gameDraws: stats.gameDraws,
      gameWinPercentage,
      trophies: stats.trophies,
      variantStats,
    });
  }

  // Sort by events (desc), then by match win percentage (desc)
  result.sort((a, b) => {
    if (b.events !== a.events) return b.events - a.events;
    return b.matchWinPercentage - a.matchWinPercentage;
  });

  return result;
}
