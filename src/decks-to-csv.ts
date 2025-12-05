import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { getTournamentMetadata } from './utils/tournamentData';

interface DeckData {
  [username: string]: string | null;
}

interface AllDecksData {
  [tournamentId: string]: DeckData;
}

async function decksToCSV(): Promise<void> {
  console.log('\n📊 Converting decks.yml to CSV\n');

  const decksPath = path.join(process.cwd(), 'decks.yml');

  if (!fs.existsSync(decksPath)) {
    console.error('❌ decks.yml not found');
    process.exit(1);
  }

  const fileContents = fs.readFileSync(decksPath, 'utf-8');
  const allDecks = yaml.load(fileContents) as AllDecksData;

  // CSV header
  const csvLines: string[] = ['Tournament ID,Tournament Date,Player Username,Deck'];

  // Sort tournament IDs (newest first)
  const sortedTournamentIds = Object.keys(allDecks).sort((a, b) => parseInt(b) - parseInt(a));

  for (const tournamentId of sortedTournamentIds) {
    const deckData = allDecks[tournamentId];
    const metadata = getTournamentMetadata(parseInt(tournamentId));
    const dateDisplay = metadata ? metadata.dateDisplay : 'Unknown Date';

    // Sort usernames alphabetically
    const sortedUsernames = Object.keys(deckData).sort();

    for (const username of sortedUsernames) {
      const deck = deckData[username];
      const deckValue = !deck || deck === '_' ? '' : deck;

      // Escape values that contain commas
      const escapedDate = `"${dateDisplay}"`;
      const escapedDeck = deckValue.includes(',') ? `"${deckValue}"` : deckValue;

      csvLines.push(`${tournamentId},${escapedDate},${username},${escapedDeck}`);
    }
  }

  // Write to file
  const csvPath = path.join(process.cwd(), 'decks.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'));

  console.log(`✓ Generated CSV at ${csvPath}`);
  console.log(`✓ Total rows: ${csvLines.length - 1} (plus 1 header row)`);
  console.log(`✓ Total tournaments: ${sortedTournamentIds.length}\n`);
}

// Run the converter
decksToCSV().catch((error) => {
  console.error('Error converting decks to CSV:', error.message);
  process.exit(1);
});
