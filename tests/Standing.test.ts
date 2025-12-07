import { Standing } from '../src/models/Standing';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load fixtures from actual tournament data
const fixturesDir = join(__dirname, 'fixtures');
const mockPerfectStanding = JSON.parse(
  readFileSync(join(fixturesDir, 'standing-perfect-record.json'), 'utf-8')
);
const mockRecordWithDraw = JSON.parse(
  readFileSync(join(fixturesDir, 'standing-with-draw.json'), 'utf-8')
);
const mockLosingStanding = JSON.parse(
  readFileSync(join(fixturesDir, 'standing-losing-record.json'), 'utf-8')
);

describe('Standing Model', () => {
  describe('fromMeleeStanding', () => {
    it('should create a Standing from Melee data', () => {
      const standing = Standing.fromMeleeStanding(mockRecordWithDraw);

      expect(standing.player.username).toBe(mockRecordWithDraw.Team.Players[0].Username);
      expect(standing.rank).toBe(mockRecordWithDraw.Rank);
      expect(standing.matchWins).toBe(mockRecordWithDraw.MatchWins);
      expect(standing.matchLosses).toBe(mockRecordWithDraw.MatchLosses);
      expect(standing.matchDraws).toBe(mockRecordWithDraw.MatchDraws);
      expect(standing.points).toBe(mockRecordWithDraw.Points);
    });

    it('should handle missing data with defaults', () => {
      const minimalData = {
        Team: {
          Players: [
            {
              Username: 'test',
              DisplayName: 'Test',
            },
          ],
        },
      };

      const standing = Standing.fromMeleeStanding(minimalData as any);
      expect(standing.rank).toBe(0);
      expect(standing.matchWins).toBe(0);
      expect(standing.points).toBe(0);
    });
  });

  describe('Record formatting', () => {
    it('should format match record correctly', () => {
      const standing = Standing.fromMeleeStanding(mockRecordWithDraw);
      const expected = `${mockRecordWithDraw.MatchWins}-${mockRecordWithDraw.MatchLosses}-${mockRecordWithDraw.MatchDraws}`;
      expect(standing.matchRecord).toBe(expected);
    });

    it('should format game record correctly', () => {
      const standing = Standing.fromMeleeStanding(mockRecordWithDraw);
      const expected = `${mockRecordWithDraw.GameWins}-${mockRecordWithDraw.GameLosses}-${mockRecordWithDraw.GameDraws}`;
      expect(standing.gameRecord).toBe(expected);
    });

    it('should format perfect record', () => {
      const standing = Standing.fromMeleeStanding(mockPerfectStanding);
      expect(standing.matchRecord).toBe('3-0-0');
    });
  });

  describe('Win percentage calculations', () => {
    it('should calculate match win percentage correctly', () => {
      const standing = Standing.fromMeleeStanding(mockRecordWithDraw);
      const totalMatches =
        mockRecordWithDraw.MatchWins +
        mockRecordWithDraw.MatchLosses +
        mockRecordWithDraw.MatchDraws;
      const expected =
        (mockRecordWithDraw.MatchWins + 0.5 * mockRecordWithDraw.MatchDraws) / totalMatches;
      expect(standing.matchWinPercentage).toBeCloseTo(expected, 4);
    });

    it('should use pre-calculated game win percentage', () => {
      const standing = Standing.fromMeleeStanding(mockRecordWithDraw);
      expect(standing.gameWinPercentage).toBe(mockRecordWithDraw.TeamGameWinPercentage);
    });

    it('should handle low win percentages', () => {
      const standing = Standing.fromMeleeStanding(mockLosingStanding);
      const totalMatches =
        mockLosingStanding.MatchWins +
        mockLosingStanding.MatchLosses +
        mockLosingStanding.MatchDraws;
      const expected =
        (mockLosingStanding.MatchWins + 0.5 * mockLosingStanding.MatchDraws) / totalMatches;
      expect(standing.matchWinPercentage).toBeCloseTo(expected, 4);
    });
  });

  describe('CSS class generation', () => {
    it('should return correct class for high win percentage', () => {
      const standing = Standing.fromMeleeStanding(mockPerfectStanding);
      expect(standing.matchWinPercentageClass).toBe('wp-high');
      expect(standing.gameWinPercentageClass).toBe('wp-high');
    });

    it('should return correct class for medium win percentage', () => {
      const standing = Standing.fromMeleeStanding({
        ...mockRecordWithDraw,
        TeamGameWinPercentage: 0.5,
      });
      expect(standing.gameWinPercentageClass).toBe('wp-medium');
    });

    it('should return correct class for low win percentage', () => {
      const standing = Standing.fromMeleeStanding(mockLosingStanding);
      expect(standing.matchWinPercentageClass).toBe('wp-low');
      expect(standing.gameWinPercentageClass).toBe('wp-low');
    });
  });

  describe('Trophy/Belt detection', () => {
    it('should identify perfect record as trophy winner', () => {
      const standing = Standing.fromMeleeStanding(mockPerfectStanding);
      expect(standing.isPerfectRecord).toBe(true);
      expect(standing.isTrophyWinner).toBe(true);
    });

    it('should not identify non-perfect record as trophy winner', () => {
      const standing = Standing.fromMeleeStanding(mockRecordWithDraw);
      expect(standing.isPerfectRecord).toBe(false);
      expect(standing.isTrophyWinner).toBe(false);
    });

    it('should not identify losing record as trophy winner', () => {
      const standing = Standing.fromMeleeStanding(mockLosingStanding);
      expect(standing.isPerfectRecord).toBe(false);
      expect(standing.isTrophyWinner).toBe(false);
    });
  });

  describe('Static utility methods', () => {
    let standings: Standing[];

    beforeEach(() => {
      standings = [
        Standing.fromMeleeStanding(mockPerfectStanding),
        Standing.fromMeleeStanding(mockRecordWithDraw),
        Standing.fromMeleeStanding({
          ...mockRecordWithDraw,
          Team: {
            Players: [
              {
                Username: 'player2',
                DisplayName: 'Player 2',
              },
            ],
          },
          Rank: 2,
        }),
        Standing.fromMeleeStanding(mockLosingStanding),
      ];
    });

    describe('getTrophyWinners', () => {
      it('should return only 3-0 players', () => {
        const trophyWinners = Standing.getTrophyWinners(standings);
        expect(trophyWinners).toHaveLength(1);
        expect(trophyWinners[0].player.username).toBe(mockPerfectStanding.Team.Players[0].Username);
      });

      it('should return empty array when no trophy winners', () => {
        const noTrophies = standings.slice(1); // Remove the 3-0 player
        const trophyWinners = Standing.getTrophyWinners(noTrophies);
        expect(trophyWinners).toHaveLength(0);
      });
    });

    describe('getTopFinishers', () => {
      it('should return all players tied for first place', () => {
        const noTrophyStandings = standings.slice(1); // Remove 3-0
        const topFinishers = Standing.getTopFinishers(noTrophyStandings);
        expect(topFinishers.length).toBeGreaterThanOrEqual(1);
        expect(topFinishers[0].points).toBe(noTrophyStandings[0].points);
      });

      it('should return single top finisher when no ties', () => {
        const topFinishers = Standing.getTopFinishers(standings);
        expect(topFinishers).toHaveLength(1);
        expect(topFinishers[0].points).toBe(mockPerfectStanding.Points);
      });

      it('should handle empty standings', () => {
        const topFinishers = Standing.getTopFinishers([]);
        expect(topFinishers).toHaveLength(0);
      });
    });

    describe('getCelebrationWinners', () => {
      it('should return trophy winners when present', () => {
        const winners = Standing.getCelebrationWinners(standings);
        expect(winners).toHaveLength(1);
        expect(winners[0].isTrophyWinner).toBe(true);
      });

      it('should return top finishers when no trophy winners', () => {
        const noTrophyStandings = standings.slice(1);
        const winners = Standing.getCelebrationWinners(noTrophyStandings);
        expect(winners.length).toBeGreaterThanOrEqual(1);
        expect(winners[0].isTrophyWinner).toBe(false);
      });
    });

    describe('hasTrophyWinners', () => {
      it('should return true when trophy winners present', () => {
        expect(Standing.hasTrophyWinners(standings)).toBe(true);
      });

      it('should return false when no trophy winners', () => {
        const noTrophyStandings = standings.slice(1);
        expect(Standing.hasTrophyWinners(noTrophyStandings)).toBe(false);
      });
    });
  });

  describe('Opponent percentages', () => {
    it('should expose opponent match win percentage', () => {
      const standing = Standing.fromMeleeStanding(mockRecordWithDraw);
      expect(standing.opponentMatchWinPercentage).toBe(
        mockRecordWithDraw.OpponentMatchWinPercentage
      );
    });

    it('should expose opponent game win percentage', () => {
      const standing = Standing.fromMeleeStanding(mockRecordWithDraw);
      expect(standing.opponentGameWinPercentage).toBe(mockRecordWithDraw.OpponentGameWinPercentage);
    });
  });
});
