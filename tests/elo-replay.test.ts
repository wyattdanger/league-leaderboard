import {
  collectAllMatches,
  determineMatchResult,
  extractPlayersFromMatch,
  calculateAllPlayerElos,
} from '../src/utils/eloReplay';

describe('ELO Chronological Replay', () => {
  describe('extractPlayersFromMatch', () => {
    it('should extract both players from a match', () => {
      const match = {
        Competitors: [
          {
            Team: {
              Players: [{ Username: 'player1', DisplayName: 'Player One' }],
            },
          },
          {
            Team: {
              Players: [{ Username: 'player2', DisplayName: 'Player Two' }],
            },
          },
        ],
      } as any;

      const [player1, player2] = extractPlayersFromMatch(match);

      expect(player1.username).toBe('player1');
      expect(player1.displayName).toBe('Player One');
      expect(player2.username).toBe('player2');
      expect(player2.displayName).toBe('Player Two');
    });

    it('should throw error for matches without exactly 2 competitors', () => {
      const match = {
        Competitors: [
          {
            Team: {
              Players: [{ Username: 'player1', DisplayName: 'Player One' }],
            },
          },
        ],
      } as any;

      expect(() => extractPlayersFromMatch(match)).toThrow('Expected 2 competitors');
    });
  });

  describe('determineMatchResult', () => {
    it('should correctly identify wins', () => {
      const match = {
        Competitors: [
          {
            Team: { Players: [{ Username: 'player1', DisplayName: 'Player 1' }] },
            GameWins: 2,
          },
          {
            Team: { Players: [{ Username: 'player2', DisplayName: 'Player 2' }] },
            GameWins: 0,
          },
        ],
        GameDraws: 0,
      } as any;

      expect(determineMatchResult(match, 'player1')).toBe('win');
      expect(determineMatchResult(match, 'player2')).toBe('loss');
    });

    it('should correctly identify losses', () => {
      const match = {
        Competitors: [
          {
            Team: { Players: [{ Username: 'player1', DisplayName: 'Player 1' }] },
            GameWins: 0,
          },
          {
            Team: { Players: [{ Username: 'player2', DisplayName: 'Player 2' }] },
            GameWins: 2,
          },
        ],
        GameDraws: 0,
      } as any;

      expect(determineMatchResult(match, 'player1')).toBe('loss');
      expect(determineMatchResult(match, 'player2')).toBe('win');
    });

    it('should correctly identify draws', () => {
      const match = {
        Competitors: [
          {
            Team: { Players: [{ Username: 'player1', DisplayName: 'Player 1' }] },
            GameWins: 1,
          },
          {
            Team: { Players: [{ Username: 'player2', DisplayName: 'Player 2' }] },
            GameWins: 1,
          },
        ],
        GameDraws: 1,
      } as any;

      expect(determineMatchResult(match, 'player1')).toBe('draw');
      expect(determineMatchResult(match, 'player2')).toBe('draw');
    });

    it('should handle match with no game wins (0-0)', () => {
      const match = {
        Competitors: [
          {
            Team: { Players: [{ Username: 'player1', DisplayName: 'Player 1' }] },
            GameWins: 0,
          },
          {
            Team: { Players: [{ Username: 'player2', DisplayName: 'Player 2' }] },
            GameWins: 0,
          },
        ],
        GameDraws: 0,
      } as any;

      expect(determineMatchResult(match, 'player1')).toBe('draw');
      expect(determineMatchResult(match, 'player2')).toBe('draw');
    });

    it('should handle 2-1 match results', () => {
      const match = {
        Competitors: [
          {
            Team: { Players: [{ Username: 'player1', DisplayName: 'Player 1' }] },
            GameWins: 2,
          },
          {
            Team: { Players: [{ Username: 'player2', DisplayName: 'Player 2' }] },
            GameWins: 1,
          },
        ],
        GameDraws: 0,
      } as any;

      expect(determineMatchResult(match, 'player1')).toBe('win');
      expect(determineMatchResult(match, 'player2')).toBe('loss');
    });
  });

  describe('collectAllMatches', () => {
    it('should collect matches from a single tournament', () => {
      const matches = collectAllMatches(['380585']);

      // Should have matches (if tournament data exists)
      if (matches.length === 0) {
        console.log('Skipping test - no tournament data available');
        return;
      }

      expect(matches.length).toBeGreaterThan(0);

      // Every match should have enriched data
      for (const match of matches) {
        expect(match.tournamentId).toBe('380585');
        expect(match.tournamentDate).toBeDefined();
        expect(match.roundNumber).toBeDefined();
        expect(match.timestamp).toBeDefined();

        // Should not have byes
        expect(match.ByeReason).toBeNull();
        expect(match.Competitors.length).toBe(2);
      }
    });

    it('should sort matches chronologically within a tournament', () => {
      const matches = collectAllMatches(['380585']);

      // Verify chronological ordering by timestamp
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i].timestamp).toBeGreaterThanOrEqual(matches[i - 1].timestamp);
      }
    });

    it('should sort matches chronologically across multiple tournaments', () => {
      const matches = collectAllMatches(['380585', '382756', '384681', '388334']);

      if (matches.length === 0) {
        console.log('Skipping test - no tournament data available');
        return;
      }

      // Verify chronological ordering
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i].timestamp).toBeGreaterThanOrEqual(matches[i - 1].timestamp);
      }

      // Verify we have matches from multiple tournaments
      const tournamentIds = new Set(matches.map((m) => m.tournamentId));
      expect(tournamentIds.size).toBeGreaterThan(1);
    });

    it('should handle non-existent tournaments gracefully', () => {
      // Should not throw, just skip the non-existent tournament
      expect(() => collectAllMatches(['999999'])).not.toThrow();

      const matches = collectAllMatches(['999999']);
      expect(matches.length).toBe(0);
    });

    it('should assign consistent tournament dates within a tournament', () => {
      const matches = collectAllMatches(['380585']);

      if (matches.length === 0) {
        console.log('Skipping test - no tournament data available');
        return;
      }

      // All matches from same tournament should have same date
      const dates = new Set(matches.map((m) => m.tournamentDate));
      expect(dates.size).toBe(1);
    });
  });

  describe('calculateAllPlayerElos', () => {
    it('should calculate ELO ratings for all players in a tournament', () => {
      const playerElos = calculateAllPlayerElos(['380585']);

      if (playerElos.size === 0) {
        console.log('Skipping test - no tournament data available');
        return;
      }

      // Should have players
      expect(playerElos.size).toBeGreaterThan(0);

      // Every player should have complete ELO data
      for (const [username, eloData] of playerElos) {
        expect(eloData.username).toBe(username);
        expect(eloData.currentRating).toBeDefined();
        expect(eloData.peakRating).toBeDefined();
        expect(eloData.history).toBeDefined();
        expect(Array.isArray(eloData.history)).toBe(true);

        // Peak rating should be >= current rating or starting rating
        expect(eloData.peakRating).toBeGreaterThanOrEqual(1500);
        expect(eloData.peakRating).toBeGreaterThanOrEqual(eloData.currentRating);
      }
    });

    it('should build continuous ELO history for each player', () => {
      const playerElos = calculateAllPlayerElos(['380585']);

      for (const [username, eloData] of playerElos) {
        const { history } = eloData;

        if (history.length === 0) continue;

        // First match should start at 1500
        expect(history[0].ratingBefore).toBe(1500);

        // Each match's ratingBefore should equal previous match's ratingAfter
        for (let i = 1; i < history.length; i++) {
          expect(history[i].ratingBefore).toBe(history[i - 1].ratingAfter);
        }

        // Last match's ratingAfter should equal current rating
        expect(history[history.length - 1].ratingAfter).toBe(eloData.currentRating);
      }
    });

    it('should preserve zero-sum property across all matches', () => {
      const playerElos = calculateAllPlayerElos(['380585']);

      let totalRating = 0;
      for (const [, eloData] of playerElos) {
        totalRating += eloData.currentRating;
      }

      // Total rating should equal number of players × starting rating
      const expectedTotal = playerElos.size * 1500;
      expect(totalRating).toBe(expectedTotal);
    });

    it('should handle cross-tournament rating persistence', () => {
      const playerElos = calculateAllPlayerElos(['380585', '382756']);

      // Find a player who played in both tournaments
      for (const [username, eloData] of playerElos) {
        const tournaments = new Set(eloData.history.map((h) => h.tournamentId));

        if (tournaments.size > 1) {
          // Verify rating continuity across tournaments
          const allTournamentIds = Array.from(tournaments);
          const firstTournamentMatches = eloData.history.filter(
            (h) => h.tournamentId === allTournamentIds[0]
          );
          const secondTournamentMatches = eloData.history.filter(
            (h) => h.tournamentId === allTournamentIds[1]
          );

          if (firstTournamentMatches.length > 0 && secondTournamentMatches.length > 0) {
            // The rating should be continuous across tournaments
            const allMatches = eloData.history;
            for (let i = 1; i < allMatches.length; i++) {
              expect(allMatches[i].ratingBefore).toBe(allMatches[i - 1].ratingAfter);
            }
          }
        }
      }
    });

    it('should record correct opponent information', () => {
      const playerElos = calculateAllPlayerElos(['380585']);

      for (const [username, eloData] of playerElos) {
        for (const entry of eloData.history) {
          // Opponent should be a different player
          expect(entry.opponent).not.toBe(username);

          // Opponent should exist in the player map
          expect(playerElos.has(entry.opponent)).toBe(true);
        }
      }
    });

    it('should record accurate match results (W/L/D)', () => {
      const playerElos = calculateAllPlayerElos(['380585']);

      for (const [, eloData] of playerElos) {
        for (const entry of eloData.history) {
          // Result should be one of W, L, or D
          expect(['W', 'L', 'D']).toContain(entry.result);

          // Rating change should be consistent with result
          if (entry.result === 'W') {
            expect(entry.ratingChange).toBeGreaterThanOrEqual(0);
          } else if (entry.result === 'L') {
            expect(entry.ratingChange).toBeLessThanOrEqual(0);
          }
          // Draw can go either way depending on opponent rating
        }
      }
    });

    it('should calculate peak rating correctly', () => {
      const playerElos = calculateAllPlayerElos(['380585']);

      for (const [, eloData] of playerElos) {
        const { history, peakRating, currentRating } = eloData;

        if (history.length === 0) {
          // No matches = peak is starting rating
          expect(peakRating).toBe(1500);
          expect(currentRating).toBe(1500);
          continue;
        }

        // Peak should be the maximum ratingAfter in history
        const maxRating = Math.max(...history.map((h) => h.ratingAfter));
        expect(peakRating).toBe(maxRating);

        // Peak should be >= current rating
        expect(peakRating).toBeGreaterThanOrEqual(currentRating);
      }
    });
  });
});
