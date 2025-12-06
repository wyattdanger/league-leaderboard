import * as fs from 'fs';
import * as path from 'path';
import type { TournamentMetadata } from '../types';
import { loadDeckData } from './deckData';
import { Player } from '../models/Player';

/**
 * Get tournament metadata (ID, name, date) from tournament data
 */
export function getTournamentMetadata(tournamentId: string): TournamentMetadata | null {
  const tournamentDir = path.join(process.cwd(), 'output', `tournament_${tournamentId}`);

  if (!fs.existsSync(tournamentDir)) {
    return null;
  }

  // Load first standings file to get metadata
  const standingsPath = path.join(tournamentDir, 'Round_1_Standings.json');

  if (!fs.existsSync(standingsPath)) {
    return null;
  }

  try {
    const standings = JSON.parse(fs.readFileSync(standingsPath, 'utf-8'));

    if (!standings || standings.length === 0) {
      return null;
    }

    // Extract metadata from first standing
    const firstStanding: any = standings[0];
    const name = firstStanding.PhaseName || `Tournament ${tournamentId}`;

    // Count rounds by looking for Round_X_Matches.json files
    const files = fs.readdirSync(tournamentDir);
    const roundFiles = files.filter((file) => /^Round_\d+_Matches\.json$/.test(file));
    const roundCount = roundFiles.length;

    // Get the actual tournament date from the earliest match timestamp
    // (Standings DateCreated can be delayed if TO publishes results late)
    let earliestMatchDate: string | null = null;

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

    const date = earliestMatchDate || firstStanding.DateCreated || new Date().toISOString();

    const dateObj = new Date(date);
    const dateDisplay = dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const playerCount = standings.length;

    // Calculate trophy count from final standings (players who went 3-0)
    let trophyCount = 0;
    let winnerDisplayName: string | undefined;
    let winnerDeck: string | undefined;
    if (roundCount > 0) {
      const finalStandingsPath = path.join(tournamentDir, `Round_${roundCount}_Standings.json`);
      if (fs.existsSync(finalStandingsPath)) {
        const finalStandings = JSON.parse(fs.readFileSync(finalStandingsPath, 'utf-8'));
        // Find players with 3 match wins and 0 match losses
        const winners = finalStandings.filter((s: any) =>
          (s.MatchWins || 0) === 3 && (s.MatchLosses || 0) === 0
        );
        trophyCount = winners.length;

        // If exactly 1 winner (Top 8 format), capture their display name and deck
        if (trophyCount === 1 && winners[0]) {
          const winnerPlayer = Player.fromStanding(winners[0]);
          winnerDisplayName = winnerPlayer.displayName;

          // Load deck data to get winner's deck
          const deckData = loadDeckData(tournamentId);
          if (deckData) {
            winnerDeck = deckData[winnerPlayer.username];
          }
        }
      }
    }

    return {
      tournamentId,
      name,
      date,
      dateDisplay,
      playerCount,
      roundCount,
      trophyCount,
      winnerDisplayName,
      winnerDeck,
    };
  } catch (error) {
    console.error(`Error loading metadata for tournament ${tournamentId}:`, error);
    return null;
  }
}
