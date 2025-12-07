import { Tournament } from '../src/models/Tournament';
import * as fs from 'fs';
import * as path from 'path';

describe('Tournament Model', () => {
  // Use a real tournament for testing
  const testTournamentId = '380585';
  let tournament: Tournament;

  beforeAll(() => {
    // Verify test data exists
    const tournamentDir = path.join(process.cwd(), 'output', `tournament_${testTournamentId}`);
    if (!fs.existsSync(tournamentDir)) {
      throw new Error(`Test tournament ${testTournamentId} not found`);
    }
  });

  describe('load', () => {
    it('should load tournament from file system', () => {
      tournament = Tournament.load(testTournamentId);

      expect(tournament).toBeDefined();
      expect(tournament.id).toBe(testTournamentId);
      expect(tournament.name).toBeTruthy();
      expect(tournament.date).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent tournament', () => {
      expect(() => Tournament.load('999999')).toThrow('Tournament directory not found');
    });

    it('should load all rounds', () => {
      tournament = Tournament.load(testTournamentId);

      expect(tournament.rounds).toBeDefined();
      expect(tournament.rounds.length).toBeGreaterThan(0);
      expect(tournament.roundCount).toBe(tournament.rounds.length);

      // Verify rounds are in order
      tournament.rounds.forEach((round, index) => {
        expect(round.number).toBe(index + 1);
      });
    });

    it('should load final standings', () => {
      tournament = Tournament.load(testTournamentId);

      expect(tournament.finalStandings).toBeDefined();
      expect(tournament.finalStandings.length).toBeGreaterThan(0);
      expect(tournament.playerCount).toBe(tournament.finalStandings.length);
    });
  });

  describe('Basic properties', () => {
    beforeEach(() => {
      tournament = Tournament.load(testTournamentId);
    });

    it('should provide tournament ID', () => {
      expect(tournament.id).toBe(testTournamentId);
    });

    it('should provide tournament name', () => {
      expect(tournament.name).toBeTruthy();
      expect(typeof tournament.name).toBe('string');
    });

    it('should provide tournament date', () => {
      expect(tournament.date).toBeInstanceOf(Date);
      expect(tournament.date.getTime()).not.toBeNaN();
    });

    it('should provide formatted date display', () => {
      expect(tournament.dateDisplay).toBeTruthy();
      expect(tournament.dateDisplay).toMatch(/\w+ \d+, \d{4}/);
    });

    it('should provide player count', () => {
      expect(tournament.playerCount).toBeGreaterThan(0);
      expect(tournament.playerCount).toBe(tournament.finalStandings.length);
    });

    it('should provide round count', () => {
      expect(tournament.roundCount).toBeGreaterThan(0);
      expect(tournament.roundCount).toBe(tournament.rounds.length);
    });
  });

  describe('Trophy winners', () => {
    beforeEach(() => {
      tournament = Tournament.load(testTournamentId);
    });

    it('should identify trophy winners', () => {
      const trophyWinners = tournament.trophyWinners;

      expect(Array.isArray(trophyWinners)).toBe(true);
      trophyWinners.forEach((winner) => {
        expect(winner.isPerfectRecord).toBe(true);
      });
    });

    it('should provide trophy count', () => {
      expect(tournament.trophyCount).toBe(tournament.trophyWinners.length);
      expect(tournament.trophyCount).toBeGreaterThanOrEqual(0);
    });

    it('should check if tournament has trophy winners', () => {
      expect(typeof tournament.hasTrophyWinners).toBe('boolean');
      expect(tournament.hasTrophyWinners).toBe(tournament.trophyCount > 0);
    });
  });

  describe('Celebration winners', () => {
    beforeEach(() => {
      tournament = Tournament.load(testTournamentId);
    });

    it('should provide celebration winners', () => {
      const celebrationWinners = tournament.celebrationWinners;

      expect(Array.isArray(celebrationWinners)).toBe(true);
      expect(celebrationWinners.length).toBeGreaterThan(0);

      // Should be trophy winners if any exist, otherwise top finishers
      if (tournament.hasTrophyWinners) {
        expect(celebrationWinners).toEqual(tournament.trophyWinners);
      } else {
        // All celebration winners should have same points (tied for first)
        const topPoints = celebrationWinners[0].points;
        celebrationWinners.forEach((winner) => {
          expect(winner.points).toBe(topPoints);
        });
      }
    });
  });

  describe('Players list', () => {
    beforeEach(() => {
      tournament = Tournament.load(testTournamentId);
    });

    it('should provide list of all player usernames', () => {
      const players = tournament.players;

      expect(Array.isArray(players)).toBe(true);
      expect(players.length).toBe(tournament.playerCount);

      // All should be strings
      players.forEach((username) => {
        expect(typeof username).toBe('string');
        expect(username.length).toBeGreaterThan(0);
      });
    });

    it('should not have duplicate players', () => {
      const players = tournament.players;
      const uniquePlayers = new Set(players);
      expect(uniquePlayers.size).toBe(players.length);
    });
  });

  describe('Round access', () => {
    beforeEach(() => {
      tournament = Tournament.load(testTournamentId);
    });

    it('should get round by number', () => {
      const round1 = tournament.getRound(1);

      expect(round1).not.toBeNull();
      expect(round1?.number).toBe(1);
    });

    it('should return null for non-existent round', () => {
      const round999 = tournament.getRound(999);
      expect(round999).toBeNull();
    });

    it('should get all rounds sequentially', () => {
      for (let i = 1; i <= tournament.roundCount; i++) {
        const round = tournament.getRound(i);
        expect(round).not.toBeNull();
        expect(round?.number).toBe(i);
      }
    });
  });

  describe('Player standing access', () => {
    beforeEach(() => {
      tournament = Tournament.load(testTournamentId);
    });

    it('should get standing for existing player', () => {
      // Get first player from tournament
      const firstPlayer = tournament.finalStandings[0];
      const standing = tournament.getPlayerStanding(firstPlayer.player.username);

      expect(standing).not.toBeNull();
      expect(standing?.player.username).toBe(firstPlayer.player.username);
    });

    it('should return null for non-existent player', () => {
      const standing = tournament.getPlayerStanding('nonexistentplayer123');
      expect(standing).toBeNull();
    });
  });

  describe('Data integrity', () => {
    beforeEach(() => {
      tournament = Tournament.load(testTournamentId);
    });

    it('should have rounds with matches', () => {
      tournament.rounds.forEach((round) => {
        expect(round.matches.length).toBeGreaterThan(0);
      });
    });

    it('should have standings with valid ranks', () => {
      tournament.finalStandings.forEach((standing) => {
        expect(standing.rank).toBeGreaterThan(0);
        expect(standing.rank).toBeLessThanOrEqual(tournament.playerCount);
      });
    });

    it('should have standings sorted by rank', () => {
      for (let i = 0; i < tournament.finalStandings.length - 1; i++) {
        const current = tournament.finalStandings[i];
        const next = tournament.finalStandings[i + 1];
        expect(current.rank).toBeLessThanOrEqual(next.rank);
      }
    });
  });
});
