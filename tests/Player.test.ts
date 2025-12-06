import { describe, expect, it } from '@jest/globals';
import { Player } from '../src/models/Player';
import type { MeleePlayer, MeleeCompetitor, MeleeStanding } from '../src/types/melee';

describe('Player', () => {
  describe('fromMeleeData', () => {
    it('should create a Player from raw Melee.gg player data', () => {
      const meleeData: MeleePlayer = {
        Username: 'testuser',
        DisplayName: 'Test User',
        TeamId: 12345,
        ID: 1,
        ScreenName: 'testuser',
        ProfileImageVersion: 0,
        DisplayNameLastFirst: 'User, Test',
        LanguageDescription: 'English',
        PronounsDescription: null,
      };

      const player = Player.fromMeleeData(meleeData);

      expect(player.username).toBe('testuser');
      expect(player.displayName).toBe('Test User');
    });

    it('should clean emojis from display names', () => {
      const meleeData: MeleePlayer = {
        Username: 'swbmtg',
        DisplayName: 'swb 👋',
        TeamId: 12345,
        ID: 1,
        ScreenName: 'swbmtg',
        ProfileImageVersion: 0,
        DisplayNameLastFirst: 'swb 👋',
        LanguageDescription: 'English',
        PronounsDescription: null,
      };

      const player = Player.fromMeleeData(meleeData);

      expect(player.username).toBe('swbmtg');
      expect(player.displayName).toBe('swb');
    });

    it('should clean multiple emojis from display names', () => {
      const meleeData: MeleePlayer = {
        Username: 'testuser',
        DisplayName: '🎮 Player 🏆 Name 🎉',
        TeamId: 12345,
        ID: 1,
        ScreenName: 'testuser',
        ProfileImageVersion: 0,
        DisplayNameLastFirst: 'Name, Player',
        LanguageDescription: 'English',
        PronounsDescription: null,
      };

      const player = Player.fromMeleeData(meleeData);

      expect(player.username).toBe('testuser');
      expect(player.displayName).toBe('Player Name');
    });

    it('should normalize whitespace after emoji removal', () => {
      const meleeData: MeleePlayer = {
        Username: 'testuser',
        DisplayName: '  Player   👋   Name  ',
        TeamId: 12345,
        ID: 1,
        ScreenName: 'testuser',
        ProfileImageVersion: 0,
        DisplayNameLastFirst: 'Name, Player',
        LanguageDescription: 'English',
        PronounsDescription: null,
      };

      const player = Player.fromMeleeData(meleeData);

      expect(player.username).toBe('testuser');
      expect(player.displayName).toBe('Player Name');
    });

    it('should use username as fallback when DisplayName is empty', () => {
      const meleeData: MeleePlayer = {
        Username: 'testuser',
        DisplayName: '',
        TeamId: 12345,
        ID: 1,
        ScreenName: 'testuser',
        ProfileImageVersion: 0,
        DisplayNameLastFirst: '',
        LanguageDescription: 'English',
        PronounsDescription: null,
      };

      const player = Player.fromMeleeData(meleeData);

      expect(player.username).toBe('testuser');
      expect(player.displayName).toBe('testuser');
    });
  });

  describe('fromCompetitor', () => {
    it('should create a Player from a Competitor object', () => {
      const competitor: MeleeCompetitor = {
        Team: {
          Players: [
            {
              Username: 'testuser',
              DisplayName: 'Test User',
              TeamId: 12345,
              ID: 1,
              ScreenName: 'testuser',
              ProfileImageVersion: 0,
              DisplayNameLastFirst: 'User, Test',
              LanguageDescription: 'English',
              PronounsDescription: null,
            },
          ],
          ID: 12345,
          Name: null,
          StatusDescription: 'Active',
          IsActive: true,
        },
        ID: 1,
        CheckedIn: '2024-01-01T10:00:00',
        ResultConfirmed: '2024-01-01T12:00:00',
        SortOrder: 1,
        GameByes: 0,
        GameWins: 2,
        TeamId: 12345,
        GameWinsAndGameByes: 2,
        Decklists: [],
      };

      const player = Player.fromCompetitor(competitor);

      expect(player.username).toBe('testuser');
      expect(player.displayName).toBe('Test User');
    });

    it('should throw error for competitor without player data', () => {
      const competitor: MeleeCompetitor = {
        Team: {
          Players: [],
          ID: 12345,
          Name: null,
          StatusDescription: 'Active',
          IsActive: true,
        },
        ID: 1,
        CheckedIn: '2024-01-01T10:00:00',
        ResultConfirmed: '2024-01-01T12:00:00',
        SortOrder: 1,
        GameByes: 0,
        GameWins: 2,
        TeamId: 12345,
        GameWinsAndGameByes: 2,
        Decklists: [],
      };

      expect(() => Player.fromCompetitor(competitor)).toThrow('Competitor data is missing player information');
    });

    it('should clean emojis when creating from competitor', () => {
      const competitor: MeleeCompetitor = {
        Team: {
          Players: [
            {
              Username: 'swbmtg',
              DisplayName: 'swb 👋',
              TeamId: 12345,
              ID: 1,
              ScreenName: 'swbmtg',
              ProfileImageVersion: 0,
              DisplayNameLastFirst: 'swb 👋',
              LanguageDescription: 'English',
              PronounsDescription: null,
            },
          ],
          ID: 12345,
          Name: null,
          StatusDescription: 'Active',
          IsActive: true,
        },
        ID: 1,
        CheckedIn: '2024-01-01T10:00:00',
        ResultConfirmed: '2024-01-01T12:00:00',
        SortOrder: 1,
        GameByes: 0,
        GameWins: 2,
        TeamId: 12345,
        GameWinsAndGameByes: 2,
        Decklists: [],
      };

      const player = Player.fromCompetitor(competitor);

      expect(player.username).toBe('swbmtg');
      expect(player.displayName).toBe('swb');
    });
  });

  describe('fromStanding', () => {
    it('should create a Player from a Standing object', () => {
      const standing: MeleeStanding = {
        Team: {
          Players: [
            {
              Username: 'testuser',
              DisplayName: 'Test User',
              TeamId: 12345,
              ID: 1,
              ScreenName: 'testuser',
              ProfileImageVersion: 0,
              DisplayNameLastFirst: 'User, Test',
              LanguageDescription: 'English',
              PronounsDescription: null,
            },
          ],
          ID: 12345,
          Name: null,
          StatusDescription: 'Active',
          IsActive: true,
        },
        DateCreated: '2024-01-01T10:00:00',
        MatchingMethod: 1,
        StandingsPublished: true,
        FinalTiebreaker: 0.5,
        OpponentGameWinPercentage: 0.55,
        OpponentMatchWinPercentage: 0.6,
        TeamGameWinPercentage: 0.65,
        GameCount: 9,
        GameDraws: 0,
        GameLosses: 3,
        GameWins: 6,
        MatchCount: 3,
        MatchDraws: 0,
        MatchLosses: 1,
        MatchWins: 2,
        OpponentCount: 3,
        PhaseSortOrder: 1,
        Points: 6,
        Rank: 1,
        RoundNumber: 3,
        ID: 1,
        PhaseId: 1,
        RoundId: 3,
        TeamId: 12345,
        TournamentId: 388334,
        FormatId: 'premodern',
        FormatName: 'Premodern',
        PhaseName: 'Swiss',
        MatchingMethodDescription: 'Swiss',
        MatchRecord: '2-1-0',
        GameRecord: '6-3-0',
      };

      const player = Player.fromStanding(standing);

      expect(player.username).toBe('testuser');
      expect(player.displayName).toBe('Test User');
    });

    it('should throw error for standing without player data', () => {
      const standing: MeleeStanding = {
        Team: {
          Players: [],
          ID: 12345,
          Name: null,
          StatusDescription: 'Active',
          IsActive: true,
        },
        DateCreated: '2024-01-01T10:00:00',
        MatchingMethod: 1,
        StandingsPublished: true,
        FinalTiebreaker: 0.5,
        OpponentGameWinPercentage: 0.55,
        OpponentMatchWinPercentage: 0.6,
        TeamGameWinPercentage: 0.65,
        GameCount: 9,
        GameDraws: 0,
        GameLosses: 3,
        GameWins: 6,
        MatchCount: 3,
        MatchDraws: 0,
        MatchLosses: 1,
        MatchWins: 2,
        OpponentCount: 3,
        PhaseSortOrder: 1,
        Points: 6,
        Rank: 1,
        RoundNumber: 3,
        ID: 1,
        PhaseId: 1,
        RoundId: 3,
        TeamId: 12345,
        TournamentId: 388334,
        FormatId: 'premodern',
        FormatName: 'Premodern',
        PhaseName: 'Swiss',
        MatchingMethodDescription: 'Swiss',
        MatchRecord: '2-1-0',
        GameRecord: '6-3-0',
      };

      expect(() => Player.fromStanding(standing)).toThrow('Standing data is missing player information');
    });

    it('should clean emojis when creating from standing', () => {
      const standing: MeleeStanding = {
        Team: {
          Players: [
            {
              Username: 'swbmtg',
              DisplayName: 'swb 👋',
              TeamId: 12345,
              ID: 1,
              ScreenName: 'swbmtg',
              ProfileImageVersion: 0,
              DisplayNameLastFirst: 'swb 👋',
              LanguageDescription: 'English',
              PronounsDescription: null,
            },
          ],
          ID: 12345,
          Name: null,
          StatusDescription: 'Active',
          IsActive: true,
        },
        DateCreated: '2024-01-01T10:00:00',
        MatchingMethod: 1,
        StandingsPublished: true,
        FinalTiebreaker: 0.5,
        OpponentGameWinPercentage: 0.55,
        OpponentMatchWinPercentage: 0.6,
        TeamGameWinPercentage: 0.65,
        GameCount: 9,
        GameDraws: 0,
        GameLosses: 3,
        GameWins: 6,
        MatchCount: 3,
        MatchDraws: 0,
        MatchLosses: 1,
        MatchWins: 2,
        OpponentCount: 3,
        PhaseSortOrder: 1,
        Points: 6,
        Rank: 1,
        RoundNumber: 3,
        ID: 1,
        PhaseId: 1,
        RoundId: 3,
        TeamId: 12345,
        TournamentId: 388334,
        FormatId: 'premodern',
        FormatName: 'Premodern',
        PhaseName: 'Swiss',
        MatchingMethodDescription: 'Swiss',
        MatchRecord: '2-1-0',
        GameRecord: '6-3-0',
      };

      const player = Player.fromStanding(standing);

      expect(player.username).toBe('swbmtg');
      expect(player.displayName).toBe('swb');
    });
  });

  describe('matches', () => {
    it('should correctly identify matching username', () => {
      const meleeData: MeleePlayer = {
        Username: 'testuser',
        DisplayName: 'Test User',
        TeamId: 12345,
        ID: 1,
        ScreenName: 'testuser',
        ProfileImageVersion: 0,
        DisplayNameLastFirst: 'User, Test',
        LanguageDescription: 'English',
        PronounsDescription: null,
      };

      const player = Player.fromMeleeData(meleeData);

      expect(player.matches('testuser')).toBe(true);
      expect(player.matches('otheruser')).toBe(false);
    });
  });
});
