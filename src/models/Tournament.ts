import { Round } from './Round';
import { Standing } from './Standing';
import type { MeleeMatch, MeleeStanding } from '../types/melee';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Tournament model - represents a complete tournament event
 * Encapsulates all tournament data including rounds, standings, and metadata
 */
export class Tournament {
  readonly id: string;
  readonly name: string;
  readonly date: Date;
  readonly rounds: Round[];
  readonly finalStandings: Standing[];
  readonly playerCount: number;

  private constructor(data: {
    id: string;
    name: string;
    date: Date;
    rounds: Round[];
    finalStandings: Standing[];
  }) {
    this.id = data.id;
    this.name = data.name;
    this.date = data.date;
    this.rounds = data.rounds;
    this.finalStandings = data.finalStandings;
    this.playerCount = data.finalStandings.length;
  }

  /**
   * Load a Tournament from the file system
   * This is the ONLY place that knows about file structure
   */
  static load(tournamentId: string): Tournament {
    const tournamentDir = path.join(process.cwd(), 'output', `tournament_${tournamentId}`);

    if (!fs.existsSync(tournamentDir)) {
      throw new Error(`Tournament directory not found: ${tournamentDir}`);
    }

    // Load first standings to get metadata
    const round1StandingsPath = path.join(tournamentDir, 'Round_1_Standings.json');
    if (!fs.existsSync(round1StandingsPath)) {
      throw new Error(`Round 1 standings not found for tournament ${tournamentId}`);
    }

    const round1Standings = JSON.parse(fs.readFileSync(round1StandingsPath, 'utf-8'));
    if (!round1Standings || round1Standings.length === 0) {
      throw new Error(`Invalid standings data for tournament ${tournamentId}`);
    }

    // Extract metadata
    const firstStanding = round1Standings[0];
    const name = firstStanding.PhaseName || `Tournament ${tournamentId}`;

    // Get tournament date from earliest match
    let earliestMatchDate: string | null = null;
    const files = fs.readdirSync(tournamentDir);
    const roundFiles = files.filter((file) => /^Round_\d+_Matches\.json$/.test(file));

    for (const roundFile of roundFiles) {
      const matchesPath = path.join(tournamentDir, roundFile);
      const matches = JSON.parse(fs.readFileSync(matchesPath, 'utf-8'));

      for (const match of matches) {
        if (match.DateCreated) {
          if (!earliestMatchDate || match.DateCreated < earliestMatchDate) {
            earliestMatchDate = match.DateCreated;
          }
        }
      }
    }

    const dateString = earliestMatchDate || firstStanding.DateCreated || new Date().toISOString();
    const date = new Date(dateString);

    // Load all rounds
    const rounds: Round[] = [];
    for (const roundFile of roundFiles.sort()) {
      const matchesPath = path.join(tournamentDir, roundFile);
      const rawMatches: MeleeMatch[] = JSON.parse(fs.readFileSync(matchesPath, 'utf-8'));
      const round = Round.fromMeleeMatches(rawMatches);
      rounds.push(round);
    }

    // Load final standings
    const finalRoundNumber = rounds.length;
    const finalStandingsPath = path.join(tournamentDir, `Round_${finalRoundNumber}_Standings.json`);
    const rawFinalStandings: MeleeStanding[] = JSON.parse(
      fs.readFileSync(finalStandingsPath, 'utf-8')
    );
    const finalStandings = rawFinalStandings.map((s) => Standing.fromMeleeStanding(s));

    return new Tournament({
      id: tournamentId,
      name,
      date,
      rounds,
      finalStandings,
    });
  }

  /**
   * Get formatted date display (e.g., "January 15, 2025")
   */
  get dateDisplay(): string {
    return this.date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/New_York',
    });
  }

  /**
   * Get number of rounds in tournament
   */
  get roundCount(): number {
    return this.rounds.length;
  }

  /**
   * Get trophy winners (3-0 players)
   */
  get trophyWinners(): Standing[] {
    return Standing.getTrophyWinners(this.finalStandings);
  }

  /**
   * Get count of trophy winners
   */
  get trophyCount(): number {
    return this.trophyWinners.length;
  }

  /**
   * Check if tournament has any trophy winners
   */
  get hasTrophyWinners(): boolean {
    return this.trophyCount > 0;
  }

  /**
   * Get celebration winners (trophy winners or top finishers)
   */
  get celebrationWinners(): Standing[] {
    return Standing.getCelebrationWinners(this.finalStandings);
  }

  /**
   * Get all players in the tournament (from final standings)
   */
  get players(): string[] {
    return this.finalStandings.map((s) => s.player.username);
  }

  /**
   * Get a specific round by number (1-indexed)
   */
  getRound(roundNumber: number): Round | null {
    return this.rounds.find((r) => r.number === roundNumber) || null;
  }

  /**
   * Get standing for a specific player
   */
  getPlayerStanding(username: string): Standing | null {
    return this.finalStandings.find((s) => s.player.matches(username)) || null;
  }
}
