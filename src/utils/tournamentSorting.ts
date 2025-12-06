import type { TournamentMetadata, PlayerTournamentPerformance } from '../types';

/**
 * Sorts tournaments by ID in reverse alphabetical order (newest first)
 * This works because tournament IDs are formatted to be chronologically ordered:
 * - Regular IDs: YYMMDD format (e.g., "388334" for Dec 4, 2024)
 * - Special IDs: Alphabetical suffix (e.g., "380585b" for Brooklyn variant)
 */
export function sortTournamentsByIdDesc(tournaments: TournamentMetadata[]): TournamentMetadata[] {
  return [...tournaments].sort((a, b) => {
    const aId = String(a.tournamentId);
    const bId = String(b.tournamentId);
    return bId.localeCompare(aId);
  });
}

/**
 * Sorts tournament performances by tournament ID in reverse alphabetical order (newest first)
 */
export function sortTournamentPerformancesByIdDesc(performances: PlayerTournamentPerformance[]): PlayerTournamentPerformance[] {
  return [...performances].sort((a, b) => {
    const aId = String(a.tournamentId);
    const bId = String(b.tournamentId);
    return bId.localeCompare(aId);
  });
}

/**
 * Sorts tournament IDs (as strings) in reverse alphabetical order (newest first)
 */
export function sortTournamentIdsDesc(ids: string[]): string[] {
  return [...ids].sort((a, b) => b.localeCompare(a));
}

/**
 * Sorts tournaments by date (if available) or falls back to ID sorting
 * This provides a more robust sorting when date metadata might be missing
 */
export function sortTournamentsByDateDesc(tournaments: TournamentMetadata[]): TournamentMetadata[] {
  return [...tournaments].sort((a, b) => {
    // If both have dates, use date comparison
    if (a.date && b.date) {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) {
        return dateB - dateA; // Newer dates first
      }
    }
    // Fall back to ID comparison (which is alphabetical and chronological)
    return b.tournamentId.localeCompare(a.tournamentId);
  });
}