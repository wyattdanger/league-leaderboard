#!/usr/bin/env node
/**
 * Add a single tournament to decks.yml
 *
 * This script adds deck template entries for a specific tournament,
 * preserving existing data if it already exists.
 *
 * Usage: npm run add-tournament-to-decks <tournament-id>
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { getTournamentMetadata } from './utils/tournamentData';

interface Match {
  Competitors: Array<{
    Team: {
      Players: Array<{
        Username: string;
        DisplayName: string;
      }>;
    };
  }>;
}

function getPlayersForTournament(tournamentId: number): string[] {
  const tournamentDir = path.join(process.cwd(), 'output', `tournament_${tournamentId}`);

  if (!fs.existsSync(tournamentDir)) {
    throw new Error(`Tournament directory not found: ${tournamentDir}`);
  }

  const players = new Set<string>();

  // Find all match files
  const matchFiles = fs
    .readdirSync(tournamentDir)
    .filter((f) => f.endsWith('_Matches.json'))
    .sort();

  for (const file of matchFiles) {
    const filePath = path.join(tournamentDir, file);
    const matches: Match[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const match of matches) {
      for (const competitor of match.Competitors) {
        const username = competitor.Team.Players[0]?.Username;
        if (username) {
          players.add(username);
        }
      }
    }
  }

  return Array.from(players).sort();
}

async function addTournamentToDecks(tournamentId: number): Promise<void> {
  console.log(`\n🎴 Adding tournament ${tournamentId} to decks.yml\n`);

  const decksPath = path.join(process.cwd(), 'decks.yml');
  let existingDecks: any = {};

  // Load existing deck data if it exists
  if (fs.existsSync(decksPath)) {
    const fileContents = fs.readFileSync(decksPath, 'utf-8');
    existingDecks = yaml.load(fileContents) || {};
  }

  // Check if tournament already exists
  if (existingDecks[tournamentId]) {
    console.log(`✓ Tournament ${tournamentId} already exists in decks.yml`);
    return;
  }

  // Get players for the tournament
  const players = getPlayersForTournament(tournamentId);

  if (players.length === 0) {
    throw new Error(`No players found for tournament ${tournamentId}`);
  }

  console.log(`Found ${players.length} players`);

  // Get tournament metadata for the comment
  const metadata = getTournamentMetadata(tournamentId);
  const dateComment = metadata ? `${metadata.dateDisplay}` : 'Date unknown';

  // Build the new tournament entry
  const newEntry: string[] = [];
  newEntry.push(`# Tournament ${tournamentId} - ${dateComment}`);
  newEntry.push(`'${tournamentId}':`);

  for (const username of players) {
    newEntry.push(`  ${username}: _`);
  }
  newEntry.push(''); // Add blank line after tournament

  // Read existing file content
  let existingContent = '';
  if (fs.existsSync(decksPath)) {
    existingContent = fs.readFileSync(decksPath, 'utf-8');
  }

  // Prepend new tournament to the beginning
  const newContent = newEntry.join('\n') + '\n' + existingContent;
  fs.writeFileSync(decksPath, newContent);

  console.log(`\n✓ Added tournament ${tournamentId} to ${decksPath}`);
  console.log(`✓ Total players: ${players.length}\n`);
}

// Main execution
const args = process.argv.slice(2);
const tournamentIdStr = args[0];

if (!tournamentIdStr) {
  console.error('Usage: npm run add-tournament-to-decks <tournament-id>');
  console.error('Example: npm run add-tournament-to-decks 445677');
  process.exit(1);
}

const tournamentId = parseInt(tournamentIdStr, 10);
if (isNaN(tournamentId)) {
  console.error(`Invalid tournament ID: ${tournamentIdStr}`);
  process.exit(1);
}

addTournamentToDecks(tournamentId).catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
