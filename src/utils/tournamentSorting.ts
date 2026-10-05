import type { TournamentMetadata, PlayerTournamentPerformance } from '../types';

/**
 * Sort newest first by event date (ISO timestamp), falling back to tournament ID.
 * Don't sort by ID alone: Melee assigns IDs when an event is created on Melee,
 * not when it's played (e.g. 465043 on Sept 10 2026 vs 445684 on Sept 24 2026).
 */
function compareByDateDesc(
  a: { tournamentId: string; date?: string },
  b: { tournamentId: string; date?: string }
): number {
  if (a.date && b.date) {
    const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (diff !== 0) return diff;
  }
  return String(b.tournamentId).localeCompare(String(a.tournamentId));
}

export function sortTournamentsByDateDesc(tournaments: TournamentMetadata[]): TournamentMetadata[] {
  return [...tournaments].sort(compareByDateDesc);
}

export function sortTournamentPerformancesByDateDesc(
  performances: PlayerTournamentPerformance[]
): PlayerTournamentPerformance[] {
  return [...performances].sort(compareByDateDesc);
}
