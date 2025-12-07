import { Match } from '../src/models/Match';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load fixtures from actual tournament data
const fixturesDir = join(__dirname, 'fixtures');
const mockRegularMatch = JSON.parse(readFileSync(join(fixturesDir, 'match-regular.json'), 'utf-8'));
const mockDrawMatch = JSON.parse(readFileSync(join(fixturesDir, 'match-draw.json'), 'utf-8'));
const mockByeMatch = JSON.parse(readFileSync(join(fixturesDir, 'match-bye.json'), 'utf-8'));
const mockSweepMatch = JSON.parse(readFileSync(join(fixturesDir, 'match-sweep.json'), 'utf-8'));

describe('Match Model', () => {
  describe('fromMeleeMatch', () => {
    it('should create a Match from regular match data', () => {
      const match = Match.fromMeleeMatch(mockRegularMatch);

      expect(match.round).toBe(mockRegularMatch.RoundNumber);
      expect(match.player1).not.toBeNull();
      expect(match.player2).not.toBeNull();
      expect(match.player1Games).toBe(mockRegularMatch.Competitors[0].GameWins);
      expect(match.player2Games).toBe(mockRegularMatch.Competitors[1].GameWins);
      expect(match.gameDraws).toBe(mockRegularMatch.GameDraws || 0);
    });

    it('should create a Match from bye data', () => {
      const match = Match.fromMeleeMatch(mockByeMatch);

      expect(match.round).toBe(mockByeMatch.RoundNumber);
      expect(match.player1).not.toBeNull();
      expect(match.player2).toBeNull();
      expect(match.player1Games).toBe(mockByeMatch.Competitors[0].GameByes); // GameByes credited
      expect(match.player2Games).toBe(0);
    });

    it('should create a Match from draw data', () => {
      const match = Match.fromMeleeMatch(mockDrawMatch);

      expect(match.player1Games).toBe(mockDrawMatch.Competitors[0].GameWins);
      expect(match.player2Games).toBe(mockDrawMatch.Competitors[1].GameWins);
      expect(match.gameDraws).toBe(1);
    });

    it('should handle missing data gracefully', () => {
      const minimalData = {
        Competitors: [],
        ByeReason: null,
        GameDraws: 0
      };

      const match = Match.fromMeleeMatch(minimalData as any);
      expect(match.round).toBe(0);
      expect(match.player1).toBeNull();
      expect(match.player2).toBeNull();
    });
  });

  describe('Bye detection', () => {
    it('should identify bye by single competitor', () => {
      const match = Match.fromMeleeMatch(mockByeMatch);
      expect(match.isBye).toBe(true);
    });

    it('should identify bye by ByeReason', () => {
      const match = Match.fromMeleeMatch(mockByeMatch);
      expect(match.isBye).toBe(true);
    });

    it('should not identify regular match as bye', () => {
      const match = Match.fromMeleeMatch(mockRegularMatch);
      expect(match.isBye).toBe(false);
    });

    it('should provide isRegularMatch convenience method', () => {
      const regularMatch = Match.fromMeleeMatch(mockRegularMatch);
      const byeMatch = Match.fromMeleeMatch(mockByeMatch);

      expect(regularMatch.isRegularMatch).toBe(true);
      expect(byeMatch.isRegularMatch).toBe(false);
    });
  });

  describe('Winner determination', () => {
    it('should identify winner of regular match', () => {
      const match = Match.fromMeleeMatch(mockRegularMatch);
      const winner = match.winner;

      expect(winner).not.toBeNull();
      expect(winner?.username).toBe(mockRegularMatch.Competitors[0].Team.Players[0].Username);
    });

    it('should return player1 as winner of bye', () => {
      const match = Match.fromMeleeMatch(mockByeMatch);
      const winner = match.winner;

      expect(winner).not.toBeNull();
      expect(winner?.username).toBe(mockByeMatch.Competitors[0].Team.Players[0].Username);
    });

    it('should return null for drawn match', () => {
      const match = Match.fromMeleeMatch(mockDrawMatch);
      expect(match.winner).toBeNull();
    });

    it('should identify winner of 2-0 sweep', () => {
      const match = Match.fromMeleeMatch(mockSweepMatch);
      const winner = match.winner;

      expect(winner).not.toBeNull();
      // Winner is the competitor with 2 game wins
      const winnerComp = mockSweepMatch.Competitors.find(c => c.GameWins === 2);
      expect(winner?.username).toBe(winnerComp.Team.Players[0].Username);
    });
  });

  describe('Loser determination', () => {
    it('should identify loser of regular match', () => {
      const match = Match.fromMeleeMatch(mockRegularMatch);
      const loser = match.loser;

      expect(loser).not.toBeNull();
      expect(loser?.username).toBe(mockRegularMatch.Competitors[1].Team.Players[0].Username);
    });

    it('should return null for bye', () => {
      const match = Match.fromMeleeMatch(mockByeMatch);
      expect(match.loser).toBeNull();
    });

    it('should return null for draw', () => {
      const match = Match.fromMeleeMatch(mockDrawMatch);
      expect(match.loser).toBeNull();
    });
  });

  describe('Draw detection', () => {
    it('should identify drawn match', () => {
      const match = Match.fromMeleeMatch(mockDrawMatch);
      expect(match.isDraw).toBe(true);
    });

    it('should not identify regular match as draw', () => {
      const match = Match.fromMeleeMatch(mockRegularMatch);
      expect(match.isDraw).toBe(false);
    });

    it('should not identify bye as draw', () => {
      const match = Match.fromMeleeMatch(mockByeMatch);
      expect(match.isDraw).toBe(false);
    });
  });

  describe('Match completion', () => {
    it('should identify complete match', () => {
      const match = Match.fromMeleeMatch(mockRegularMatch);
      expect(match.isComplete).toBe(true);
    });

    it('should identify bye as complete', () => {
      const match = Match.fromMeleeMatch(mockByeMatch);
      expect(match.isComplete).toBe(true);
    });

    it('should identify draw as complete', () => {
      const match = Match.fromMeleeMatch(mockDrawMatch);
      expect(match.isComplete).toBe(true);
    });
  });

  describe('Result string formatting', () => {
    it('should format regular match result', () => {
      const match = Match.fromMeleeMatch(mockRegularMatch);
      const p1Games = mockRegularMatch.Competitors[0].GameWins;
      const p2Games = mockRegularMatch.Competitors[1].GameWins;
      expect(match.resultString).toBe(`${p1Games}-${p2Games}`);
    });

    it('should format bye result', () => {
      const match = Match.fromMeleeMatch(mockByeMatch);
      expect(match.resultString).toBe('BYE');
    });

    it('should format result with draw', () => {
      const match = Match.fromMeleeMatch(mockDrawMatch);
      const p1Games = mockDrawMatch.Competitors[0].GameWins;
      const p2Games = mockDrawMatch.Competitors[1].GameWins;
      expect(match.resultString).toBe(`${p1Games}-${p2Games}-1`);
    });

    it('should format 2-0 sweep result', () => {
      const match = Match.fromMeleeMatch(mockSweepMatch);
      // Result string shows games in player1-player2 order
      const p1Games = mockSweepMatch.Competitors[0].GameWins;
      const p2Games = mockSweepMatch.Competitors[1].GameWins;
      expect(match.resultString).toBe(`${p1Games}-${p2Games}`);
    });
  });

  describe('Display helpers', () => {
    it('should put winner on left', () => {
      const match = Match.fromMeleeMatch(mockRegularMatch);
      const left = match.leftPlayer;
      const right = match.rightPlayer;

      expect(left.player?.username).toBe(mockRegularMatch.Competitors[0].Team.Players[0].Username);
      expect(left.games).toBe(mockRegularMatch.Competitors[0].GameWins);
      expect(right.player?.username).toBe(mockRegularMatch.Competitors[1].Team.Players[0].Username);
      expect(right.games).toBe(mockRegularMatch.Competitors[1].GameWins);
    });

    it('should swap players when player2 wins', () => {
      const match = Match.fromMeleeMatch({
        ...mockRegularMatch,
        Competitors: [
          {
            ...mockRegularMatch.Competitors[0],
            GameWins: 1
          },
          {
            ...mockRegularMatch.Competitors[1],
            GameWins: 2
          }
        ]
      } as any);

      const left = match.leftPlayer;
      expect(left.player?.username).toBe(mockRegularMatch.Competitors[1].Team.Players[0].Username);
      expect(left.games).toBe(2);
    });

    it('should handle bye display', () => {
      const match = Match.fromMeleeMatch(mockByeMatch);
      const left = match.leftPlayer;
      const right = match.rightPlayer;

      expect(left.player?.username).toBe(mockByeMatch.Competitors[0].Team.Players[0].Username);
      expect(left.games).toBe(mockByeMatch.Competitors[0].GameByes);
      expect(right.player).toBeNull();
      expect(right.games).toBe(0);
    });

    it('should handle draw display', () => {
      const match = Match.fromMeleeMatch(mockDrawMatch);
      const left = match.leftPlayer;
      const right = match.rightPlayer;

      // In a draw, player1 stays on left
      expect(left.player?.username).toBe(mockDrawMatch.Competitors[0].Team.Players[0].Username);
      expect(right.player?.username).toBe(mockDrawMatch.Competitors[1].Team.Players[0].Username);
    });
  });

  describe('Static utility methods', () => {
    describe('sortMatches', () => {
      it('should sort matches with byes last', () => {
        const matches = [
          Match.fromMeleeMatch(mockByeMatch),
          Match.fromMeleeMatch(mockRegularMatch),
          Match.fromMeleeMatch(mockDrawMatch)
        ];

        const sorted = Match.sortMatches(matches);

        expect(sorted[0].isRegularMatch).toBe(true);
        expect(sorted[1].isRegularMatch).toBe(true);
        expect(sorted[2].isBye).toBe(true);
      });

      it('should sort by table number when available', () => {
        const match1 = Match.fromMeleeMatch({ ...mockRegularMatch, TableNumber: 5 });
        const match2 = Match.fromMeleeMatch({ ...mockRegularMatch, TableNumber: 2 });
        const match3 = Match.fromMeleeMatch({ ...mockRegularMatch, TableNumber: 8 });

        const sorted = Match.sortMatches([match1, match2, match3]);

        // Verify sorting by table number
        expect(sorted[0].tableNumber).toBe(2);
        expect(sorted[1].tableNumber).toBe(5);
        expect(sorted[2].tableNumber).toBe(8);
      });

      it('should not mutate original array', () => {
        const matches = [
          Match.fromMeleeMatch(mockByeMatch),
          Match.fromMeleeMatch(mockRegularMatch)
        ];

        const originalFirst = matches[0];
        Match.sortMatches(matches);

        expect(matches[0]).toBe(originalFirst); // Original unchanged
      });
    });
  });
});
