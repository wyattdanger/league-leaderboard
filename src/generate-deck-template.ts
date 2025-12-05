import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { getTournamentMetadata } from './utils/tournamentData';

interface League {
  name: string;
  tournaments: number[];
}

interface LeaguesConfig {
  leagues: League[];
}

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

function loadLeaguesConfig(): LeaguesConfig {
  const configPath = path.join(process.cwd(), 'leagues.yml');
  const fileContents = fs.readFileSync(configPath, 'utf8');
  return yaml.load(fileContents) as LeaguesConfig;
}

function getPlayersForTournament(tournamentId: number): string[] {
  const tournamentDir = path.join(process.cwd(), 'output', `tournament_${tournamentId}`);

  if (!fs.existsSync(tournamentDir)) {
    return [];
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

async function generateDeckTemplate(): Promise<void> {
  console.log('\n🎴 Generating Deck Template\n');

  const config = loadLeaguesConfig();
  const allTournamentIds = new Set<number>();

  // Collect all tournament IDs
  for (const league of config.leagues) {
    for (const tournamentId of league.tournaments) {
      allTournamentIds.add(tournamentId);
    }
  }

  const sortedTournamentIds = Array.from(allTournamentIds).sort((a, b) => b - a); // Newest first

  console.log(`Processing ${sortedTournamentIds.length} tournaments...\n`);

  // Load existing deck data if it exists
  const decksPath = path.join(process.cwd(), 'decks.yml');
  let existingDecks: any = {};

  if (fs.existsSync(decksPath)) {
    const fileContents = fs.readFileSync(decksPath, 'utf-8');
    existingDecks = yaml.load(fileContents) || {};
  }

  // Build the deck data structure with comments
  const deckLines: string[] = [];

  for (const tournamentId of sortedTournamentIds) {
    const players = getPlayersForTournament(tournamentId);

    if (players.length === 0) {
      console.warn(`⚠️  No players found for tournament ${tournamentId}`);
      continue;
    }

    console.log(`Tournament ${tournamentId}: ${players.length} players`);

    // Get tournament metadata for the comment
    const metadata = getTournamentMetadata(tournamentId);
    if (metadata) {
      deckLines.push(`# Tournament ${tournamentId} - ${metadata.dateDisplay}`);
    } else {
      deckLines.push(`# Tournament ${tournamentId}`);
    }

    // Add tournament ID as the key
    deckLines.push(`'${tournamentId}':`);

    // If we already have deck data for this tournament, preserve it
    const existingTournamentDecks = existingDecks[tournamentId] || {};

    for (const username of players) {
      // Preserve existing deck data if it exists, otherwise set to underscore
      const deckValue = existingTournamentDecks[username] || '_';
      if (deckValue === '_') {
        deckLines.push(`  ${username}: _`);
      } else {
        deckLines.push(`  ${username}: ${deckValue}`);
      }
    }

    // Add blank line between tournaments
    deckLines.push('');
  }

  // Write to file
  fs.writeFileSync(decksPath, deckLines.join('\n'));

  console.log(`\n✓ Generated deck template at ${decksPath}`);
  console.log(`✓ Total tournaments: ${sortedTournamentIds.length}\n`);
}

// Run the generator
generateDeckTemplate().catch((error) => {
  console.error('Error generating deck template:', error.message);
  process.exit(1);
});
