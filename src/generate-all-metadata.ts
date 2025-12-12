import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Tournament } from './models/Tournament';

interface PageMetadata {
  title: string;
  description: string;
  url: string;
  playerCount: number;
  date: string;
  topFinishers: {
    username: string;
    displayName: string;
    record: string;
    deck: string | null;
  }[];
}

function generateEventPageMetadata(tournamentId: string): void {
  const metadataDir = path.join(process.cwd(), 'output', `tournament_${tournamentId}`);

  if (!fs.existsSync(metadataDir)) {
    console.warn(`Tournament directory not found: ${metadataDir}`);
    return;
  }

  const tournament = Tournament.load(tournamentId);

  // Load deck data
  const decksPath = path.join(process.cwd(), 'decks.yml');
  let deckData: Record<string, string> | null = null;

  if (fs.existsSync(decksPath)) {
    const decksYaml = fs.readFileSync(decksPath, 'utf-8');
    const allDecks = yaml.load(decksYaml) as Record<string, Record<string, string>>;
    deckData = allDecks[tournamentId] || null;
  }

  // Check if we have complete deck data
  const showDeckData =
    deckData !== null &&
    tournament.finalStandings.every((standing) => {
      const deck = deckData![standing.player.username];
      return deck && deck !== '_';
    });

  // Generate title
  const pageTitle = `NYC Premodern - ${tournament.dateDisplay} Meetup`;

  // Find best record and top finishers
  const topStandings = [...tournament.finalStandings].sort((a, b) => {
    if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
    if (a.matchLosses !== b.matchLosses) return a.matchLosses - b.matchLosses;
    return a.matchDraws - b.matchDraws;
  });

  const bestRecord = topStandings.length > 0 ? topStandings[0] : null;
  const topFinishers = bestRecord
    ? topStandings.filter(
        (s) =>
          s.matchWins === bestRecord.matchWins &&
          s.matchLosses === bestRecord.matchLosses &&
          s.matchDraws === bestRecord.matchDraws
      )
    : [];

  // Build description text
  let descriptionText = `${tournament.playerCount} ${tournament.playerCount === 1 ? 'player' : 'players'} gathered.`;

  if (topFinishers.length > 0 && bestRecord) {
    const recordText = `${bestRecord.matchWins}-${bestRecord.matchLosses}${bestRecord.matchDraws > 0 ? `-${bestRecord.matchDraws}` : ''}`;

    const finisherTexts = topFinishers.map((standing) => {
      const playerName = standing.player.displayName;
      const deck = showDeckData && deckData ? deckData[standing.player.username] : null;

      if (deck && deck !== '_') {
        return `${playerName} went ${recordText} on ${deck}`;
      } else {
        return `${playerName} went ${recordText}`;
      }
    });

    // Join with commas and "and" before the last one
    if (finisherTexts.length === 1) {
      descriptionText += ` ${finisherTexts[0]}`;
    } else if (finisherTexts.length === 2) {
      descriptionText += ` ${finisherTexts[0]} and ${finisherTexts[1]}`;
    } else {
      const allButLast = finisherTexts.slice(0, -1).join(', ');
      const last = finisherTexts[finisherTexts.length - 1];
      descriptionText += ` ${allButLast}, and ${last}`;
    }
  }

  // Create metadata object
  const metadata: PageMetadata = {
    title: pageTitle,
    description: descriptionText,
    url: `/event/${tournamentId}/`,
    playerCount: tournament.playerCount,
    date: tournament.dateDisplay,
    topFinishers: topFinishers.map((s) => ({
      username: s.player.username,
      displayName: s.player.displayName,
      record: `${s.matchWins}-${s.matchLosses}${s.matchDraws > 0 ? `-${s.matchDraws}` : ''}`,
      deck: showDeckData && deckData ? deckData[s.player.username] : null,
    })),
  };

  // Write metadata to file
  const metadataFile = path.join(metadataDir, 'page_metadata.json');
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
  console.log(`✓ Generated page metadata for tournament ${tournamentId}`);
}

// Main execution - process all tournaments
const outputDir = path.join(process.cwd(), 'output');
const tournamentDirs = fs.readdirSync(outputDir).filter((dir) => dir.startsWith('tournament_'));

console.log(`Generating metadata for ${tournamentDirs.length} tournaments...`);

let successCount = 0;
let errorCount = 0;

for (const dir of tournamentDirs) {
  const tournamentId = dir.replace('tournament_', '');
  try {
    generateEventPageMetadata(tournamentId);
    successCount++;
  } catch (error) {
    console.error(`✗ Failed to generate metadata for tournament ${tournamentId}:`, error);
    errorCount++;
  }
}

console.log(`\n✓ Completed: ${successCount} successful, ${errorCount} errors`);
