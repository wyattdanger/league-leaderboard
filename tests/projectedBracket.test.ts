import { projectedSeeds, quarterfinalPairs, quarterfinalSummary } from '../src/utils/projectedBracket';

const standing = (rank: number, username: string, points: number) =>
  ({
    Rank: rank,
    Points: points,
    Team: { Players: [{ Username: username, DisplayName: username }] },
  }) as any;

// Deliberately out of order: seeding must follow Rank
const standings = [9, 3, 1, 8, 5, 2, 7, 4, 6, 10].map((r) => standing(r, `p${r}`, 100 - r));

describe('projected bracket', () => {
  it('seeds by league rank', () => {
    expect(projectedSeeds(standings).map((s) => s.name)).toEqual([
      'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8',
    ]);
  });

  it('pairs quarterfinals 1v8, 4v5, 3v6, 2v7', () => {
    const pairs = quarterfinalPairs(projectedSeeds(standings));
    expect(pairs.map(([a, b]) => [a.seed, b.seed])).toEqual([
      [1, 8],
      [4, 5],
      [3, 6],
      [2, 7],
    ]);
  });

  it('summarizes matchups on one line', () => {
    expect(quarterfinalSummary(projectedSeeds(standings))).toBe(
      '#1 p1 v #8 p8 · #4 p4 v #5 p5 · #3 p3 v #6 p6 · #2 p2 v #7 p7'
    );
  });
});
