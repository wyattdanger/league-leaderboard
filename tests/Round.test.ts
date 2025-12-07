import { Round } from '../src/models/Round';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load fixtures from actual tournament data
const fixturesDir = join(__dirname, 'fixtures');
const mockRegularMatch = JSON.parse(readFileSync(join(fixturesDir, 'match-regular.json'), 'utf-8'));
const mockDrawMatch = JSON.parse(readFileSync(join(fixturesDir, 'match-draw.json'), 'utf-8'));
const mockByeMatch = JSON.parse(readFileSync(join(fixturesDir, 'match-bye.json'), 'utf-8'));
const mockSweepMatch = JSON.parse(readFileSync(join(fixturesDir, 'match-sweep.json'), 'utf-8'));

describe('Round Model', () => {
  describe('fromMeleeMatches', () => {
    it('should create a Round from match data', () => {
      const matches = [mockRegularMatch, mockSweepMatch, mockByeMatch];
      const round = Round.fromMeleeMatches(matches);

      expect(round.number).toBe(mockRegularMatch.RoundNumber);
      expect(round.matches).toHaveLength(3);
    });

    it('should sort matches (regular first, byes last)', () => {
      const matches = [mockByeMatch, mockRegularMatch, mockSweepMatch];
      const round = Round.fromMeleeMatches(matches);

      // First two should be regular matches, last should be bye
      expect(round.matches[0].isRegularMatch).toBe(true);
      expect(round.matches[1].isRegularMatch).toBe(true);
      expect(round.matches[2].isBye).toBe(true);
    });

    it('should throw error for empty matches array', () => {
      expect(() => Round.fromMeleeMatches([])).toThrow(
        'Cannot create Round from empty matches array'
      );
    });

    it('should throw error for matches from different rounds', () => {
      const matches = [
        { ...mockRegularMatch, RoundNumber: 1 },
        { ...mockSweepMatch, RoundNumber: 2 },
      ];

      expect(() => Round.fromMeleeMatches(matches as any)).toThrow(
        'All matches must be from the same round'
      );
    });
  });

  describe('Match filtering', () => {
    let round: Round;

    beforeEach(() => {
      const matches = [mockRegularMatch, mockDrawMatch, mockSweepMatch, mockByeMatch];
      round = Round.fromMeleeMatches(matches);
    });

    it('should filter regular matches', () => {
      const regularMatches = round.regularMatches;
      expect(regularMatches).toHaveLength(3);
      expect(regularMatches.every((m) => m.isRegularMatch)).toBe(true);
    });

    it('should filter bye matches', () => {
      const byeMatches = round.byeMatches;
      expect(byeMatches).toHaveLength(1);
      expect(byeMatches.every((m) => m.isBye)).toBe(true);
    });
  });

  describe('Match counts', () => {
    it('should count total matches including byes', () => {
      const matches = [mockRegularMatch, mockSweepMatch, mockByeMatch];
      const round = Round.fromMeleeMatches(matches);
      expect(round.matchCount).toBe(3);
    });

    it('should count regular matches excluding byes', () => {
      const matches = [mockRegularMatch, mockSweepMatch, mockByeMatch];
      const round = Round.fromMeleeMatches(matches);
      expect(round.regularMatchCount).toBe(2);
    });

    it('should count bye matches', () => {
      const matches = [mockRegularMatch, mockSweepMatch, mockByeMatch];
      const round = Round.fromMeleeMatches(matches);
      expect(round.byeCount).toBe(1);
    });

    it('should handle round with no byes', () => {
      const matches = [mockRegularMatch, mockSweepMatch, mockDrawMatch];
      const round = Round.fromMeleeMatches(matches);
      expect(round.byeCount).toBe(0);
      expect(round.regularMatchCount).toBe(3);
    });

    it('should handle round with only byes', () => {
      const matches = [mockByeMatch];
      const round = Round.fromMeleeMatches(matches);
      expect(round.byeCount).toBe(1);
      expect(round.regularMatchCount).toBe(0);
    });
  });

  describe('Round completion', () => {
    it('should identify complete round', () => {
      const matches = [mockRegularMatch, mockSweepMatch, mockByeMatch];
      const round = Round.fromMeleeMatches(matches);
      expect(round.isComplete).toBe(true);
    });

    it('should identify incomplete round', () => {
      const incompleteMatch = {
        ...mockRegularMatch,
        Competitors: [
          { ...mockRegularMatch.Competitors[0], GameWins: 0 },
          { ...mockRegularMatch.Competitors[1], GameWins: 0 },
        ],
      };
      const matches = [incompleteMatch, mockSweepMatch];
      const round = Round.fromMeleeMatches(matches as any);
      expect(round.isComplete).toBe(false);
    });
  });

  describe('Display helpers', () => {
    it('should generate display label', () => {
      const matches = [mockRegularMatch];
      const round = Round.fromMeleeMatches(matches);
      expect(round.displayLabel).toBe(`Round ${mockRegularMatch.RoundNumber}`);
    });

    it('should generate display label for different round numbers', () => {
      const round1Matches = [{ ...mockRegularMatch, RoundNumber: 1 }];
      const round2Matches = [{ ...mockRegularMatch, RoundNumber: 2 }];
      const round3Matches = [{ ...mockRegularMatch, RoundNumber: 3 }];

      const round1 = Round.fromMeleeMatches(round1Matches as any);
      const round2 = Round.fromMeleeMatches(round2Matches as any);
      const round3 = Round.fromMeleeMatches(round3Matches as any);

      expect(round1.displayLabel).toBe('Round 1');
      expect(round2.displayLabel).toBe('Round 2');
      expect(round3.displayLabel).toBe('Round 3');
    });
  });
});
