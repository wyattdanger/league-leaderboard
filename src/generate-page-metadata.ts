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

function getDeckName(
  username: string,
  deckData: Record<string, string> | null,
  showDeckData: boolean
): string | null {
  if (!showDeckData || !deckData) return null;
  const deck = deckData[username];
  return deck && deck !== '_' ? deck : null;
}

function generateEventPageMetadata(tournamentId: string): void {
  const metadataDir = path.join(process.cwd(), 'output', `tournament_${tournamentId}`);

  if (!fs.existsSync(metadataDir)) {
    throw new Error(`Tournament directory not found: ${metadataDir}`);
  }

  const tournament = Tournament.load(tournamentId);

  // Check if this is a Top 8 tournament and get the league name
  const leaguesPath = path.join(process.cwd(), 'leagues.yml');
  let isTop8Tournament = false;
  let leagueName: string | null = null;
  if (fs.existsSync(leaguesPath)) {
    const leaguesYaml = fs.readFileSync(leaguesPath, 'utf-8');
    const config = yaml.load(leaguesYaml) as {
      leagues: Array<{ name: string; tournaments: number[]; top8Tournament?: number }>;
    };
    const matchingLeague = config.leagues.find(
      (league) => league.top8Tournament?.toString() === tournamentId
    );
    if (matchingLeague) {
      isTop8Tournament = true;
      leagueName = matchingLeague.name;
    }
  }

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
  let descriptionText: string;

  if (isTop8Tournament && leagueName) {
    // Special description for Top 8 tournaments - highlight the champion
    const champion = topFinishers.find(
      (s) => s.matchWins === 3 && s.matchLosses === 0 && s.matchDraws === 0
    );

    if (champion) {
      const championDeck = getDeckName(champion.player.username, deckData, showDeckData);
      const deckText = championDeck ? ` playing ${championDeck}` : '';
      descriptionText = `${champion.player.displayName} won the ${leagueName} Top 8${deckText} 👑`;
    } else {
      descriptionText = `${leagueName} Top 8 playoff tournament.`;
    }
  } else {
    // Regular tournament description
    descriptionText = `${tournament.playerCount} ${tournament.playerCount === 1 ? 'player' : 'players'} gathered.`;

    if (topFinishers.length > 0 && bestRecord) {
      const recordText = `${bestRecord.matchWins}-${bestRecord.matchLosses}${bestRecord.matchDraws > 0 ? `-${bestRecord.matchDraws}` : ''}`;

      const finisherTexts = topFinishers.map((standing) => {
        const playerName = standing.player.displayName;
        const deck = getDeckName(standing.player.username, deckData, showDeckData);
        return deck ? `${playerName} went ${recordText} on ${deck}` : `${playerName} went ${recordText}`;
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
      deck: getDeckName(s.player.username, deckData, showDeckData),
    })),
  };

  // Write metadata to file
  const metadataFile = path.join(metadataDir, 'page_metadata.json');
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
  console.log(`✓ Generated page metadata for tournament ${tournamentId}`);
}

// Main execution
const tournamentId = process.argv[2];

if (!tournamentId) {
  console.error('Usage: npm run generate-metadata <tournament-id>');
  console.error('Example: npm run generate-metadata 390154');
  process.exit(1);
}

try {
  generateEventPageMetadata(tournamentId);
} catch (error) {
  console.error('Error generating page metadata:', (error as Error).message);
  process.exit(1);
}
