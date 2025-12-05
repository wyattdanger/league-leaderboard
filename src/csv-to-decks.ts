import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { getTournamentMetadata } from './utils/tournamentData';

interface DeckData {
  [username: string]: string;
}

interface AllDecksData {
  [tournamentId: string]: DeckData;
}

async function csvToDecks(): Promise<void> {
  console.log('\n📥 Converting CSV to decks.yml\n');

  const csvPath = path.join(process.cwd(), 'decks.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('❌ decks.csv not found');
    process.exit(1);
  }

  const fileContents = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContents.split('\n');

  // Skip header
  const dataLines = lines.slice(1).filter((line) => line.trim());

  const allDecks: AllDecksData = {};

  for (const line of dataLines) {
    // Parse CSV with quoted fields
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());

    if (parts.length < 3) {
      console.warn(`⚠️  Skipping invalid line: ${line}`);
      continue;
    }

    const tournamentId = parts[0];
    // Skip the date field (parts[1])
    const username = parts[2];
    // Deck is in parts[3] (or empty)
    let deck = parts[3] || '';

    // Convert empty string back to underscore
    if (!deck) {
      deck = '_';
    }

    // Initialize tournament entry if needed
    if (!allDecks[tournamentId]) {
      allDecks[tournamentId] = {};
    }

    allDecks[tournamentId][username] = deck;
  }

  // Build YAML with comments
  const deckLines: string[] = [];
  const sortedTournamentIds = Object.keys(allDecks).sort((a, b) => parseInt(b) - parseInt(a));

  for (const tournamentId of sortedTournamentIds) {
    const metadata = getTournamentMetadata(parseInt(tournamentId));
    if (metadata) {
      deckLines.push(`# Tournament ${tournamentId} - ${metadata.dateDisplay}`);
    } else {
      deckLines.push(`# Tournament ${tournamentId}`);
    }

    deckLines.push(`'${tournamentId}':`);

    const deckData = allDecks[tournamentId];
    const sortedUsernames = Object.keys(deckData).sort();

    for (const username of sortedUsernames) {
      const deck = deckData[username];
      if (deck === '_') {
        deckLines.push(`  ${username}: _`);
      } else {
        deckLines.push(`  ${username}: ${deck}`);
      }
    }

    deckLines.push('');
  }

  // Write to file
  const decksPath = path.join(process.cwd(), 'decks.yml');
  fs.writeFileSync(decksPath, deckLines.join('\n'));

  console.log(`✓ Updated ${decksPath}`);
  console.log(`✓ Total tournaments: ${sortedTournamentIds.length}`);
  console.log(`✓ Total entries: ${dataLines.length}\n`);
}

// Run the converter
csvToDecks().catch((error) => {
  console.error('Error converting CSV to decks:', error.message);
  process.exit(1);
});
