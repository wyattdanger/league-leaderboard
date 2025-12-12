import { calculateElo, getExpectedScore, getRatingDifferenceForWinProbability, DEFAULT_STARTING_RATING } from '../src/utils/elo';

describe('ELO Calculator', () => {
  describe('calculateElo', () => {
    describe('Basic calculations', () => {
      it('should calculate rating change for evenly matched players (win)', () => {
        const result = calculateElo(1500, 1500, 'win', 32);

        // Expected score is 50%, actual is 100%, so gain = 32 * 0.5 = 16
        expect(result.ratingChange).toBe(16);
        expect(result.opponentRatingChange).toBe(-16);
        expect(result.playerNewRating).toBe(1516);
        expect(result.opponentNewRating).toBe(1484);
        expect(result.expectedScore).toBeCloseTo(0.5);
      });

      it('should calculate rating change for evenly matched players (draw)', () => {
        const result = calculateElo(1500, 1500, 'draw', 32);

        // Expected 50%, actual 50%, no change
        expect(result.ratingChange).toBe(0);
        expect(result.opponentRatingChange).toBe(0);
        expect(result.playerNewRating).toBe(1500);
        expect(result.opponentNewRating).toBe(1500);
      });

      it('should give more points for beating higher-rated player', () => {
        const result = calculateElo(1400, 1600, 'win', 32);

        // Underdog wins, should gain more than 16 points
        expect(result.ratingChange).toBeGreaterThan(16);
        expect(result.expectedScore).toBeLessThan(0.5);
      });

      it('should lose fewer points when losing to higher-rated player', () => {
        const result = calculateElo(1400, 1600, 'loss', 32);

        // Expected to lose, should lose fewer than 16 points
        expect(Math.abs(result.ratingChange)).toBeLessThan(16);
        expect(result.ratingChange).toBeLessThan(0);
      });

      it('should lose more points when losing to lower-rated player', () => {
        const result = calculateElo(1600, 1400, 'loss', 32);

        // Favorite loses, should lose more than 16 points
        expect(Math.abs(result.ratingChange)).toBeGreaterThan(16);
        expect(result.ratingChange).toBeLessThan(0);
      });

      it('should gain fewer points when beating lower-rated player', () => {
        const result = calculateElo(1600, 1400, 'win', 32);

        // Expected to win, should gain fewer than 16 points
        expect(result.ratingChange).toBeLessThan(16);
        expect(result.ratingChange).toBeGreaterThan(0);
      });
    });

    describe('Conservation of ratings (zero-sum property)', () => {
      it('should be zero-sum (ratings gained = ratings lost)', () => {
        const result = calculateElo(1600, 1400, 'win', 32);

        // Player gains X, opponent loses X
        expect(result.ratingChange).toBe(-result.opponentRatingChange);
      });

      it('should conserve total rating points on win', () => {
        const player1Before = 1600;
        const player2Before = 1400;
        const totalBefore = player1Before + player2Before;

        const result = calculateElo(player1Before, player2Before, 'win', 32);
        const totalAfter = result.playerNewRating + result.opponentNewRating;

        expect(totalAfter).toBe(totalBefore);
      });

      it('should conserve total rating points on loss', () => {
        const player1Before = 1600;
        const player2Before = 1400;
        const totalBefore = player1Before + player2Before;

        const result = calculateElo(player1Before, player2Before, 'loss', 32);
        const totalAfter = result.playerNewRating + result.opponentNewRating;

        expect(totalAfter).toBe(totalBefore);
      });

      it('should conserve total rating points on draw', () => {
        const player1Before = 1600;
        const player2Before = 1400;
        const totalBefore = player1Before + player2Before;

        const result = calculateElo(player1Before, player2Before, 'draw', 32);
        const totalAfter = result.playerNewRating + result.opponentNewRating;

        expect(totalAfter).toBe(totalBefore);
      });
    });

    describe('K-factor variations', () => {
      it('should produce larger rating changes with higher K-factor', () => {
        const result32 = calculateElo(1500, 1500, 'win', 32);
        const result64 = calculateElo(1500, 1500, 'win', 64);

        expect(result64.ratingChange).toBe(result32.ratingChange * 2);
      });

      it('should produce smaller rating changes with lower K-factor', () => {
        const result32 = calculateElo(1500, 1500, 'win', 32);
        const result16 = calculateElo(1500, 1500, 'win', 16);

        expect(result16.ratingChange).toBe(result32.ratingChange / 2);
      });
    });

    describe('Edge cases', () => {
      it('should handle very large rating differences', () => {
        const result = calculateElo(1200, 2000, 'win', 32);

        // Massive underdog wins, should gain close to max (32 points)
        expect(result.ratingChange).toBeGreaterThan(28);
        expect(result.ratingChange).toBeLessThanOrEqual(32);
      });

      it('should handle identical ratings', () => {
        const result = calculateElo(1750, 1750, 'win', 32);

        expect(result.ratingChange).toBe(16);
        expect(result.expectedScore).toBeCloseTo(0.5);
      });

      it('should round rating changes to integers', () => {
        const result = calculateElo(1537, 1463, 'win', 32);

        // Ensure result is an integer
        expect(Number.isInteger(result.ratingChange)).toBe(true);
        expect(Number.isInteger(result.opponentRatingChange)).toBe(true);
        expect(Number.isInteger(result.playerNewRating)).toBe(true);
        expect(Number.isInteger(result.opponentNewRating)).toBe(true);
      });
    });
  });

  describe('getExpectedScore', () => {
    it('should give 50% probability for equal ratings', () => {
      const expected = getExpectedScore(1500, 1500);
      expect(expected).toBeCloseTo(0.5);
    });

    it('should give ~76% probability with 200 rating advantage', () => {
      const expected = getExpectedScore(1700, 1500);
      expect(expected).toBeCloseTo(0.76, 1);
    });

    it('should give ~24% probability with 200 rating disadvantage', () => {
      const expected = getExpectedScore(1500, 1700);
      expect(expected).toBeCloseTo(0.24, 1);
    });

    it('should give ~91% probability with 400 rating advantage', () => {
      const expected = getExpectedScore(1900, 1500);
      expect(expected).toBeCloseTo(0.91, 1);
    });

    it('should give ~9% probability with 400 rating disadvantage', () => {
      const expected = getExpectedScore(1500, 1900);
      expect(expected).toBeCloseTo(0.09, 1);
    });

    it('should give ~64% probability with 100 rating advantage', () => {
      const expected = getExpectedScore(1600, 1500);
      expect(expected).toBeCloseTo(0.64, 1);
    });

    it('should be symmetric (probabilities sum to 1)', () => {
      const player1Expected = getExpectedScore(1600, 1400);
      const player2Expected = getExpectedScore(1400, 1600);

      expect(player1Expected + player2Expected).toBeCloseTo(1.0);
    });
  });

  describe('getRatingDifferenceForWinProbability', () => {
    it('should return 0 for 50% win probability', () => {
      const diff = getRatingDifferenceForWinProbability(0.5);
      expect(diff).toBeCloseTo(0, 0);
    });

    it('should return ~100 for 64% win probability', () => {
      const diff = getRatingDifferenceForWinProbability(0.64);
      expect(diff).toBeCloseTo(100, 0);
    });

    it('should return ~200 for 76% win probability', () => {
      const diff = getRatingDifferenceForWinProbability(0.76);
      expect(diff).toBeCloseTo(200, 0);
    });

    it('should return ~400 for 91% win probability', () => {
      const diff = getRatingDifferenceForWinProbability(0.91);
      expect(diff).toBeCloseTo(400, -1); // Within 5 rating points
    });

    it('should return negative for <50% win probability', () => {
      const diff = getRatingDifferenceForWinProbability(0.3);
      expect(diff).toBeLessThan(0);
    });

    it('should throw error for 0% win probability', () => {
      expect(() => getRatingDifferenceForWinProbability(0)).toThrow();
    });

    it('should throw error for 100% win probability', () => {
      expect(() => getRatingDifferenceForWinProbability(1)).toThrow();
    });
  });

  describe('Real-world scenarios', () => {
    it('should simulate a tournament between three players', () => {
      // Initial ratings
      let playerA = DEFAULT_STARTING_RATING;
      let playerB = DEFAULT_STARTING_RATING;
      let playerC = DEFAULT_STARTING_RATING;

      // Round 1: A beats B
      const match1 = calculateElo(playerA, playerB, 'win');
      playerA = match1.playerNewRating;
      playerB = match1.opponentNewRating;
      expect(playerA).toBe(1516);
      expect(playerB).toBe(1484);

      // Round 2: C beats A
      const match2 = calculateElo(playerC, playerA, 'win');
      playerC = match2.playerNewRating;
      playerA = match2.opponentNewRating;
      expect(playerC).toBeGreaterThan(DEFAULT_STARTING_RATING);
      expect(playerA).toBeLessThan(1516);

      // Round 3: B beats C
      const match3 = calculateElo(playerB, playerC, 'win');
      playerB = match3.playerNewRating;
      playerC = match3.opponentNewRating;

      // Total rating should still be 3 * 1500 = 4500
      expect(playerA + playerB + playerC).toBe(3 * DEFAULT_STARTING_RATING);
    });

    it('should simulate rating convergence over many matches', () => {
      // Simulate strong player (1800 "true skill") vs average (1500)
      let strong = DEFAULT_STARTING_RATING;
      let average = DEFAULT_STARTING_RATING;

      // Strong player wins 10 matches in a row
      for (let i = 0; i < 10; i++) {
        const result = calculateElo(strong, average, 'win');
        strong = result.playerNewRating;
        average = result.opponentNewRating;
      }

      // Strong player should now be significantly higher
      expect(strong).toBeGreaterThan(1600);
      expect(average).toBeLessThan(1400);

      // Total rating conserved
      expect(strong + average).toBe(2 * DEFAULT_STARTING_RATING);
    });
  });
});
