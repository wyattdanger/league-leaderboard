import { Standing } from '../src/models/Standing';
import { Player } from '../src/models/Player';

// Test fixtures based on real tournament data
const mockMeleeStanding = {
  Team: {
    Players: [{
      Username: 'madmanpoet',
      DisplayName: 'Michael Flores 🏆'
    }],
    Name: 'madmanpoet'
  },
  Rank: 1,
  MatchWins: 2,
  MatchLosses: 0,
  MatchDraws: 1,
  GameWins: 5,
  GameLosses: 1,
  GameDraws: 0,
  Points: 7,
  OpponentMatchWinPercentage: 0.5833,
  OpponentGameWinPercentage: 0.5417,
  TeamGameWinPercentage: 0.8333,
  MatchRecord: '2-0-1'
};

const mockPerfectStanding = {
  Team: {
    Players: [{
      Username: 'swbmtg',
      DisplayName: 'Scott'
    }],
    Name: 'swbmtg'
  },
  Rank: 1,
  MatchWins: 3,
  MatchLosses: 0,
  MatchDraws: 0,
  GameWins: 6,
  GameLosses: 2,
  GameDraws: 0,
  Points: 9,
  OpponentMatchWinPercentage: 0.6667,
  OpponentGameWinPercentage: 0.6250,
  TeamGameWinPercentage: 0.7500
};

const mockLosingStanding = {
  Team: {
    Players: [{
      Username: 'testplayer',
      DisplayName: 'Test Player'
    }],
    Name: 'testplayer'
  },
  Rank: 8,
  MatchWins: 1,
  MatchLosses: 2,
  MatchDraws: 0,
  GameWins: 2,
  GameLosses: 4,
  GameDraws: 1,
  Points: 3,
  OpponentMatchWinPercentage: 0.4444,
  OpponentGameWinPercentage: 0.4286,
  TeamGameWinPercentage: 0.3571
};

describe('Standing Model', () => {
  describe('fromMeleeStanding', () => {
    it('should create a Standing from Melee data', () => {
      const standing = Standing.fromMeleeStanding(mockMeleeStanding);

      expect(standing.player.username).toBe('madmanpoet');
      expect(standing.player.displayName).toBe('Michael Flores'); // Emoji should be cleaned
      expect(standing.rank).toBe(1);
      expect(standing.matchWins).toBe(2);
      expect(standing.matchLosses).toBe(0);
      expect(standing.matchDraws).toBe(1);
      expect(standing.points).toBe(7);
    });

    it('should handle missing data with defaults', () => {
      const minimalData = {
        Team: {
          Players: [{
            Username: 'test',
            DisplayName: 'Test'
          }]
        }
      };

      const standing = Standing.fromMeleeStanding(minimalData as any);
      expect(standing.rank).toBe(0);
      expect(standing.matchWins).toBe(0);
      expect(standing.points).toBe(0);
    });
  });

  describe('Record formatting', () => {
    it('should format match record correctly', () => {
      const standing = Standing.fromMeleeStanding(mockMeleeStanding);
      expect(standing.matchRecord).toBe('2-0-1');
    });

    it('should format game record correctly', () => {
      const standing = Standing.fromMeleeStanding(mockMeleeStanding);
      expect(standing.gameRecord).toBe('5-1-0');
    });

    it('should format perfect record', () => {
      const standing = Standing.fromMeleeStanding(mockPerfectStanding);
      expect(standing.matchRecord).toBe('3-0-0');
    });
  });

  describe('Win percentage calculations', () => {
    it('should calculate match win percentage correctly', () => {
      const standing = Standing.fromMeleeStanding(mockMeleeStanding);
      // 2 wins + 0.5 for draw = 2.5 / 3 total matches = 0.8333...
      expect(standing.matchWinPercentage).toBeCloseTo(0.8333, 4);
      expect(standing.matchWinPercentageDisplay).toBe('83.3');
    });

    it('should use pre-calculated game win percentage', () => {
      const standing = Standing.fromMeleeStanding(mockMeleeStanding);
      expect(standing.gameWinPercentage).toBe(0.8333);
      expect(standing.gameWinPercentageDisplay).toBe('83.3');
    });

    it('should handle low win percentages', () => {
      const standing = Standing.fromMeleeStanding(mockLosingStanding);
      expect(standing.matchWinPercentage).toBeCloseTo(0.3333, 4);
      expect(standing.matchWinPercentageDisplay).toBe('33.3');
    });
  });

  describe('CSS class generation', () => {
    it('should return correct class for high win percentage', () => {
      const standing = Standing.fromMeleeStanding(mockMeleeStanding);
      expect(standing.matchWinPercentageClass).toBe('wp-high');
      expect(standing.gameWinPercentageClass).toBe('wp-high');
    });

    it('should return correct class for medium win percentage', () => {
      const standing = Standing.fromMeleeStanding({
        ...mockMeleeStanding,
        TeamGameWinPercentage: 0.5000
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

    it('should not identify 2-0-1 as trophy winner', () => {
      const standing = Standing.fromMeleeStanding(mockMeleeStanding);
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
        Standing.fromMeleeStanding(mockPerfectStanding), // 9 points, 3-0-0
        Standing.fromMeleeStanding(mockMeleeStanding),   // 7 points, 2-0-1
        Standing.fromMeleeStanding({                     // 7 points, 2-0-1
          ...mockMeleeStanding,
          Team: {
            Players: [{
              Username: 'player2',
              DisplayName: 'Player 2'
            }]
          },
          Rank: 2
        }),
        Standing.fromMeleeStanding(mockLosingStanding)   // 3 points, 1-2-0
      ];
    });

    describe('getTrophyWinners', () => {
      it('should return only 3-0 players', () => {
        const trophyWinners = Standing.getTrophyWinners(standings);
        expect(trophyWinners).toHaveLength(1);
        expect(trophyWinners[0].player.username).toBe('swbmtg');
      });

      it('should return empty array when no trophy winners', () => {
        const noTrophies = standings.slice(1); // Remove the 3-0 player
        const trophyWinners = Standing.getTrophyWinners(noTrophies);
        expect(trophyWinners).toHaveLength(0);
      });
    });

    describe('getTopFinishers', () => {
      it('should return all players tied for first place', () => {
        const noTrophyStandings = standings.slice(1); // Remove 3-0, leaving two 7-point players
        const topFinishers = Standing.getTopFinishers(noTrophyStandings);
        expect(topFinishers).toHaveLength(2);
        expect(topFinishers[0].points).toBe(7);
        expect(topFinishers[1].points).toBe(7);
      });

      it('should return single top finisher when no ties', () => {
        const topFinishers = Standing.getTopFinishers(standings);
        expect(topFinishers).toHaveLength(1);
        expect(topFinishers[0].points).toBe(9);
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
        expect(winners).toHaveLength(2); // Two players tied at 7 points
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
      const standing = Standing.fromMeleeStanding(mockMeleeStanding);
      expect(standing.opponentMatchWinPercentage).toBe(0.5833);
    });

    it('should expose opponent game win percentage', () => {
      const standing = Standing.fromMeleeStanding(mockMeleeStanding);
      expect(standing.opponentGameWinPercentage).toBe(0.5417);
    });
  });
});