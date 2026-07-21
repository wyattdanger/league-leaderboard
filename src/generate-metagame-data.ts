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

interface DeckTrophies {
  [deckName: string]: number;
}

interface LeagueMetagame {
  leagueName: string;
  tournaments: number[];
  deckCounts: DeckCount;
  deckTrophies: DeckTrophies;
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
    const deckTrophies: DeckTrophies = {};
    let totalDecks = 0;
    let totalTrophies = 0;

    // Get all tournaments for this league
    const allTournaments = [...league.tournaments];
    if (league.top8Tournament) {
      allTournaments.push(league.top8Tournament);
    }

    // Count decks and trophies across all tournaments
    for (const tournamentId of allTournaments) {
      const tournamentDecks = deckData[tournamentId.toString()];
      if (!tournamentDecks) {
        console.log(`  ⚠️  No deck data for tournament ${tournamentId}`);
        continue;
      }

      // Load final standings to check for 3-0 finishes
      const standingsPath = path.join(
        process.cwd(),
        'output',
        `tournament_${tournamentId}`,
        'Round_3_Standings.json'
      );

      let standings = [];
      if (fs.existsSync(standingsPath)) {
        standings = JSON.parse(fs.readFileSync(standingsPath, 'utf8'));
      }

      for (const [username, deck] of Object.entries(tournamentDecks)) {
        // Skip missing deck data (marked with _)
        if (deck === '_') {
          continue;
        }

        totalDecks++;
        deckCounts[deck] = (deckCounts[deck] || 0) + 1;

        // Check if this player went 3-0 (trophy)
        const playerStanding = standings.find(
          (s: any) => s.Team.Players[0].Username === username
        );

        if (
          playerStanding &&
          playerStanding.MatchWins === 3 &&
          playerStanding.MatchLosses === 0 &&
          playerStanding.MatchDraws === 0
        ) {
          deckTrophies[deck] = (deckTrophies[deck] || 0) + 1;
          totalTrophies++;
        }
      }
    }

    const uniqueArchetypes = Object.keys(deckCounts).length;

    leaguesMetagame.push({
      leagueName: league.name,
      tournaments: allTournaments,
      deckCounts,
      deckTrophies,
    });

    console.log(`  ✓ ${totalDecks} decks, ${uniqueArchetypes} unique archetypes, ${totalTrophies} trophies`);
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
