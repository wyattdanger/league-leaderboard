import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface LeagueConfig {
  name: string;
  tournaments: number[];
  top8Tournament?: number;
}

interface LeaguesConfig {
  leagues: LeagueConfig[];
}

interface DeckData {
  [tournamentId: string]: {
    [username: string]: string;
  };
}

interface DeckCount {
  [deckName: string]: number;
}

interface LeagueMetagame {
  leagueName: string;
  tournaments: number[];
  deckCounts: DeckCount;
}

interface MetagameData {
  leagues: LeagueMetagame[];
}

function generateMetagameData(): void {
  console.log('🎴 Generating Metagame Data\n');

  // Load leagues config
  const leaguesPath = path.join(process.cwd(), 'leagues.yml');
  const leaguesYaml = fs.readFileSync(leaguesPath, 'utf8');
  const leaguesConfig = yaml.load(leaguesYaml) as LeaguesConfig;

  // Load deck data
  const decksPath = path.join(process.cwd(), 'decks.yml');
  const decksYaml = fs.readFileSync(decksPath, 'utf8');
  const deckData = yaml.load(decksYaml) as DeckData;

  const leaguesMetagame: LeagueMetagame[] = [];

  // Process each league
  for (const league of leaguesConfig.leagues) {
    console.log(`Processing ${league.name}...`);

    const deckCounts: DeckCount = {};
    let totalDecks = 0;

    // Get all tournaments for this league
    const allTournaments = [...league.tournaments];
    if (league.top8Tournament) {
      allTournaments.push(league.top8Tournament);
    }

    // Count decks across all tournaments
    for (const tournamentId of allTournaments) {
      const tournamentDecks = deckData[tournamentId.toString()];
      if (!tournamentDecks) {
        console.log(`  ⚠️  No deck data for tournament ${tournamentId}`);
        continue;
      }

      for (const [username, deck] of Object.entries(tournamentDecks)) {
        // Skip missing deck data (marked with _)
        if (deck === '_') {
          continue;
        }

        totalDecks++;
        deckCounts[deck] = (deckCounts[deck] || 0) + 1;
      }
    }

    const uniqueArchetypes = Object.keys(deckCounts).length;

    leaguesMetagame.push({
      leagueName: league.name,
      tournaments: allTournaments,
      deckCounts,
    });

    console.log(`  ✓ ${totalDecks} decks, ${uniqueArchetypes} unique archetypes`);
  }

  const metagameData: MetagameData = {
    leagues: leaguesMetagame,
  };

  // Write to output
  const outputPath = path.join(process.cwd(), 'output', 'metagame_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(metagameData, null, 2));

  console.log(`\n✓ Metagame data saved to ${outputPath}\n`);
}

// Run the generator
generateMetagameData();
