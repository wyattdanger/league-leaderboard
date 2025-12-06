import { describe, expect, it } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';

// We'll implement these functions in src/utils/playerData.ts
import {
  calculatePlayerStats,
  calculateHeadToHeadRecords,
  type Match,
} from '../src/utils/playerData';

// Load test fixtures
function loadTestMatches(): Match[][] {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const round1 = JSON.parse(
    fs.readFileSync(path.join(fixturesDir, 'Round_1_Matches.json'), 'utf-8')
  );
  const round2 = JSON.parse(
    fs.readFileSync(path.join(fixturesDir, 'Round_2_Matches.json'), 'utf-8')
  );
  const round3 = JSON.parse(
    fs.readFileSync(path.join(fixturesDir, 'Round_3_Matches.json'), 'utf-8')
  );
  return [round1, round2, round3];
}

describe('Player Stats Calculation', () => {
  describe('calculatePlayerStats', () => {
    it('should calculate overall stats for a player across all rounds', () => {
      const matchesPerRound = loadTestMatches();
      const stats = calculatePlayerStats('swbmtg', matchesPerRound, 371711);

      expect(stats.username).toBe('swbmtg');
      expect(stats.displayName).toBe('swb'); // Emoji cleaned by Player class
      expect(stats.matchWins).toBeGreaterThanOrEqual(0);
      expect(stats.matchLosses).toBeGreaterThanOrEqual(0);
      expect(stats.gameWins).toBeGreaterThanOrEqual(0);
      expect(stats.gameLosses).toBeGreaterThanOrEqual(0);
    });

    it('should handle players with byes correctly', () => {
      const matchesPerRound = loadTestMatches();
      const stats = calculatePlayerStats('Matt_W', matchesPerRound, 371711);

      expect(stats.username).toBe('Matt_W');
      // Player with bye in round 1 should have recorded stats
      expect(stats.matchWins + stats.matchLosses + stats.matchDraws).toBeGreaterThan(0);
    });

    it('should calculate correct match win percentage', () => {
      const matchesPerRound = loadTestMatches();
      const stats = calculatePlayerStats('swbmtg', matchesPerRound, 371711);

      const totalMatches = stats.matchWins + stats.matchLosses + stats.matchDraws;
      if (totalMatches > 0) {
        const expectedMWP = stats.matchWins / totalMatches;
        expect(stats.matchWinPercentage).toBeCloseTo(expectedMWP, 4);
      }
    });

    it('should calculate correct game win percentage', () => {
      const matchesPerRound = loadTestMatches();
      const stats = calculatePlayerStats('swbmtg', matchesPerRound, 371711);

      const totalGames = stats.gameWins + stats.gameLosses + stats.gameDraws;
      if (totalGames > 0) {
        const expectedGWP = stats.gameWins / totalGames;
        expect(stats.gameWinPercentage).toBeCloseTo(expectedGWP, 4);
      }
    });

    it('should return null for non-existent player', () => {
      const matchesPerRound = loadTestMatches();
      const stats = calculatePlayerStats('NonExistentPlayer', matchesPerRound, 371711);

      expect(stats).toBeNull();
    });
  });

  describe('calculateHeadToHeadRecords', () => {
    it('should calculate head-to-head records against all opponents', () => {
      const matchesPerRound = loadTestMatches();
      const h2hRecords = calculateHeadToHeadRecords('swbmtg', matchesPerRound);

      expect(Array.isArray(h2hRecords)).toBe(true);
      expect(h2hRecords.length).toBeGreaterThan(0);

      // Each record should have required fields
      h2hRecords.forEach((record) => {
        expect(record.opponentUsername).toBeTruthy();
        expect(record.opponentDisplayName).toBeTruthy();
        expect(record.matchesPlayed).toBeGreaterThan(0);
        expect(typeof record.matchWinPercentage).toBe('number');
        expect(typeof record.gameWinPercentage).toBe('number');
        expect(Array.isArray(record.lastFiveResults)).toBe(true);
      });
    });

    it('should sort head-to-head records by matches played (descending)', () => {
      const matchesPerRound = loadTestMatches();
      const h2hRecords = calculateHeadToHeadRecords('swbmtg', matchesPerRound);

      for (let i = 0; i < h2hRecords.length - 1; i++) {
        expect(h2hRecords[i].matchesPlayed).toBeGreaterThanOrEqual(h2hRecords[i + 1].matchesPlayed);
      }
    });

    it('should calculate correct match win percentage in head-to-head', () => {
      const matchesPerRound = loadTestMatches();
      const h2hRecords = calculateHeadToHeadRecords('swbmtg', matchesPerRound);

      h2hRecords.forEach((record) => {
        const totalMatches = record.matchWins + record.matchLosses + record.matchDraws;
        expect(record.matchesPlayed).toBe(totalMatches);

        if (totalMatches > 0) {
          const expectedMWP = record.matchWins / totalMatches;
          expect(record.matchWinPercentage).toBeCloseTo(expectedMWP, 4);
        }
      });
    });

    it('should calculate correct game win percentage in head-to-head', () => {
      const matchesPerRound = loadTestMatches();
      const h2hRecords = calculateHeadToHeadRecords('swbmtg', matchesPerRound);

      h2hRecords.forEach((record) => {
        const totalGames = record.gameWins + record.gameLosses + record.gameDraws;
        if (totalGames > 0) {
          const expectedGWP = record.gameWins / totalGames;
          expect(record.gameWinPercentage).toBeCloseTo(expectedGWP, 4);
        }
      });
    });

    it('should limit lastFiveResults to maximum 5 results', () => {
      const matchesPerRound = loadTestMatches();
      const h2hRecords = calculateHeadToHeadRecords('swbmtg', matchesPerRound);

      h2hRecords.forEach((record) => {
        expect(record.lastFiveResults.length).toBeLessThanOrEqual(5);
        expect(record.lastFiveResults.length).toBeLessThanOrEqual(record.matchesPlayed);
      });
    });

    it('should only include W, L, or D in lastFiveResults', () => {
      const matchesPerRound = loadTestMatches();
      const h2hRecords = calculateHeadToHeadRecords('swbmtg', matchesPerRound);

      h2hRecords.forEach((record) => {
        record.lastFiveResults.forEach((result) => {
          expect(['W', 'L', 'D']).toContain(result);
        });
      });
    });

    it('should not include bye matches in head-to-head records', () => {
      const matchesPerRound = loadTestMatches();
      const h2hRecords = calculateHeadToHeadRecords('Matt_W', matchesPerRound);

      // Matt_W had a bye in round 1, so we verify byes don't appear as opponents
      h2hRecords.forEach((record) => {
        expect(record.opponentUsername).not.toBe('');
        expect(record.opponentUsername).not.toBeNull();
      });
    });

    it('should return empty array for non-existent player', () => {
      const matchesPerRound = loadTestMatches();
      const h2hRecords = calculateHeadToHeadRecords('NonExistentPlayer', matchesPerRound);

      expect(h2hRecords).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle matches with draws', () => {
      const matchesPerRound = loadTestMatches();
      // Find a player and calculate their stats
      const stats = calculatePlayerStats('swbmtg', matchesPerRound, 371711);

      // Total matches should equal wins + losses + draws
      const totalMatches = stats.matchWins + stats.matchLosses + stats.matchDraws;
      expect(totalMatches).toBeGreaterThan(0);
    });

    it('should handle empty match data', () => {
      const emptyMatches: Match[][] = [[], [], []];
      const stats = calculatePlayerStats('swbmtg', emptyMatches, 371711);

      expect(stats).toBeNull();
    });
  });
});
