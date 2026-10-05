import { Player } from '../models/Player';
import { usernameToSlug } from './helpers';
import type { LeagueStanding } from '../types';

export interface BracketSeed {
  seed: number;
  name: string;
  slug: string;
  points: number;
}

/**
 * Seed a Top 8 from league standings (already ranked by the league's tiebreakers)
 */
export function projectedSeeds(standings: LeagueStanding[], count = 8): BracketSeed[] {
  return [...standings]
    .sort((a, b) => a.Rank - b.Rank)
    .slice(0, count)
    .map((standing, i) => {
      const player = Player.fromStanding(standing as any);
      return {
        seed: i + 1,
        name: player.displayName,
        slug: usernameToSlug(player.username),
        points: standing.Points,
      };
    });
}

/**
 * Standard bracket order: 1v8 and 4v5 meet in one semifinal, 3v6 and 2v7 in the other
 */
export function quarterfinalPairs(seeds: BracketSeed[]): [BracketSeed, BracketSeed][] {
  return [
    [1, 8],
    [4, 5],
    [3, 6],
    [2, 7],
  ].map(([a, b]) => [seeds[a - 1], seeds[b - 1]]);
}

/**
 * One-line matchup summary that survives link previews collapsing whitespace
 */
export function quarterfinalSummary(seeds: BracketSeed[]): string {
  return quarterfinalPairs(seeds)
    .map(([a, b]) => `#${a.seed} ${a.name} v #${b.seed} ${b.name}`)
    .join(' · ');
}
