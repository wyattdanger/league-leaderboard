import {
  sortTournamentsByDateDesc,
  sortTournamentPerformancesByDateDesc,
} from '../src/utils/tournamentSorting';
import type { TournamentMetadata, PlayerTournamentPerformance } from '../src/types';

// Melee IDs are assigned when an event is created on Melee, not when it's played:
// 465043 (Sept 10) and 458540 (Aug 27) have higher IDs than later events
const events = [
  { tournamentId: '445681', date: '2026-09-03T23:30:00Z' },
  { tournamentId: '465043', date: '2026-09-10T23:30:00Z' },
  { tournamentId: '445685', date: '2026-10-01T23:44:27Z' },
  { tournamentId: '458540', date: '2026-08-27T23:30:00Z' },
  { tournamentId: '445684', date: '2026-09-24T23:05:16Z' },
];
const expected = ['445685', '445684', '465043', '445681', '458540'];

describe('tournament sorting', () => {
  it('sorts tournaments newest first by date, not by ID', () => {
    const sorted = sortTournamentsByDateDesc(events as TournamentMetadata[]);
    expect(sorted.map((t) => t.tournamentId)).toEqual(expected);
  });

  it('sorts player performances newest first by date, not by ID', () => {
    const sorted = sortTournamentPerformancesByDateDesc(events as PlayerTournamentPerformance[]);
    expect(sorted.map((p) => p.tournamentId)).toEqual(expected);
  });
});
