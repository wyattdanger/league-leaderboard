import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { Match } from './standings-calculator.js';
import { calculateStandingsByUsername } from './standings-calculator.js';
import type { Standing } from './standings-calculator.js';
import { cleanDisplayName } from './utils/helpers.js';

interface League {
  name: string;
  tournaments: number[];
}

interface LeaguesConfig {
  leagues: League[];
}

async function aggregateLeague(tournamentIds: string[], leagueName?: string): Promise<void> {
  if (leagueName) {
    console.log(`\nAggregating standings for: ${leagueName}`);
  }
  console.log(`Tournaments: ${tournamentIds.length} events`);
  console.log(`IDs: ${tournamentIds.join(', ')}\n`);

  const allRounds: Match[][] = [];
  let totalRounds = 0;

  // Track which players participated in which tournaments
  const playerTournaments = new Map<string, Set<string>>();
  // Track trophies (3-0 finishes) per player
  const playerTrophies = new Map<string, number>();

  // Load all tournament data and combine all rounds
  for (const tournamentId of tournamentIds) {
    const tournamentDir = path.join(process.cwd(), 'output', `tournament_${tournamentId}`);

    if (!fs.existsSync(tournamentDir)) {
      console.error(`❌ Tournament ${tournamentId} not found. Run: npm run scrape ${tournamentId}`);
      continue;
    }

    // Find all match files
    const files = fs
      .readdirSync(tournamentDir)
      .filter((f) => f.endsWith('_Matches.json'))
      .sort();

    if (files.length === 0) {
      console.error(`❌ No match data found for tournament ${tournamentId}`);
      continue;
    }

    console.log(`Loading tournament ${tournamentId}: ${files.length} rounds`);
    totalRounds += files.length;

    for (const file of files) {
      const filePath = path.join(tournamentDir, file);
      const matches = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Track player participation in this tournament
      for (const match of matches) {
        for (const competitor of match.Competitors) {
          const username = competitor.Team.Players[0]?.Username || '';
          if (username) {
            if (!playerTournaments.has(username)) {
              playerTournaments.set(username, new Set());
            }
            playerTournaments.get(username)!.add(tournamentId);
          }
        }
      }

      allRounds.push(matches);
    }

    // Check final standings for 3-0 finishes (trophies)
    const standingsFiles = fs
      .readdirSync(tournamentDir)
      .filter((f) => f.endsWith('_Standings.json'))
      .sort()
      .reverse(); // Get most recent standings first

    if (standingsFiles.length > 0) {
      const finalStandings = JSON.parse(
        fs.readFileSync(path.join(tournamentDir, standingsFiles[0]), 'utf-8')
      );

      for (const standing of finalStandings) {
        const username = standing.Team?.Players?.[0]?.Username || '';
        if (
          username &&
          standing.MatchWins === 3 &&
          standing.MatchLosses === 0 &&
          standing.MatchDraws === 0
        ) {
          playerTrophies.set(username, (playerTrophies.get(username) || 0) + 1);
        }
      }
    }
  }

  if (allRounds.length === 0) {
    console.error('\n❌ No tournament data loaded. Exiting.');
    process.exit(1);
  }

  // Calculate league standings from all rounds combined
  console.log(`\nCalculating league standings from ${totalRounds} total rounds...`);
  const standings = calculateStandingsByUsername(allRounds);

  // Add tournament count and trophies to each standing
  for (const standing of standings) {
    const username = standing.Team.Players[0]?.Username || '';
    const tournamentCount = playerTournaments.get(username)?.size || 0;
    const trophies = playerTrophies.get(username) || 0;
    (standing as any).TournamentCount = tournamentCount;
    (standing as any).Trophies = trophies;
  }

  // Output directory
  const outputDir = path.join(process.cwd(), 'output', 'league');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0];
  let filename: string;
  if (leagueName) {
    const safeName = leagueName.toLowerCase().replace(/\s+/g, '_');
    filename = `league_standings_${safeName}_${timestamp}.json`;
  } else {
    const tournamentIdString = tournamentIds.join('_');
    filename = `league_standings_${timestamp}_${tournamentIdString}.json`;
  }
  const filePath = path.join(outputDir, filename);

  // Save to JSON
  fs.writeFileSync(filePath, JSON.stringify(standings, null, 2));

  // Print standings to console
  console.log('\n' + '='.repeat(120));
  console.log('LEAGUE STANDINGS');
  console.log('='.repeat(120));
  console.log(
    `${'Rank'.padEnd(6)} ` +
      `${'Player'.padEnd(25)} ` +
      `${'Events'.padEnd(8)} ` +
      `${'Points'.padEnd(8)} ` +
      `${'Match'.padEnd(12)} ` +
      `${'Game'.padEnd(12)} ` +
      `${'OMW%'.padEnd(8)} ` +
      `${'GW%'.padEnd(8)}`
  );
  console.log('-'.repeat(120));

  for (const standing of standings) {
    const rawDisplayName = standing.Team.Players[0]?.DisplayName || 'Unknown';
    const playerName = cleanDisplayName(rawDisplayName);
    const omwPct = (standing.OpponentMatchWinPercentage * 100).toFixed(1) + '%';
    const gwPct = (standing.TeamGameWinPercentage * 100).toFixed(1) + '%';
    const tournamentCount = (standing as any).TournamentCount || 0;

    console.log(
      `${standing.Rank.toString().padEnd(6)} ` +
        `${playerName.substring(0, 24).padEnd(25)} ` +
        `${tournamentCount.toString().padEnd(8)} ` +
        `${standing.Points.toString().padEnd(8)} ` +
        `${standing.MatchRecord.padEnd(12)} ` +
        `${standing.GameRecord.padEnd(12)} ` +
        `${omwPct.padEnd(8)} ` +
        `${gwPct.padEnd(8)}`
    );
  }

  console.log('='.repeat(120));
  console.log(`\n✓ League standings saved to ${filePath}`);
  console.log(
    `✓ ${standings.length} players across ${tournamentIds.length} tournaments (${totalRounds} total rounds)\n`
  );
}

function loadLeaguesConfig(): LeaguesConfig {
  const configPath = path.join(process.cwd(), 'leagues.yml');
  const fileContents = fs.readFileSync(configPath, 'utf8');
  return yaml.load(fileContents) as LeaguesConfig;
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--current') {
  // Load from config file - use current (first) league
  const config = loadLeaguesConfig();
  if (config.leagues.length === 0) {
    console.error('❌ No leagues found in leagues.yml');
    process.exit(1);
  }

  const currentLeague = config.leagues[0];
  const tournamentIds = currentLeague.tournaments.map(String);

  aggregateLeague(tournamentIds, currentLeague.name).catch((error) => {
    console.error('Error aggregating league standings:', error.message);
    process.exit(1);
  });
} else if (args[0] === '--league' && args[1]) {
  // Load specific league by name from config
  const config = loadLeaguesConfig();
  const league = config.leagues.find((l) => l.name === args[1]);

  if (!league) {
    console.error(`❌ League "${args[1]}" not found in leagues.yml`);
    console.error('Available leagues:');
    config.leagues.forEach((l) => console.error(`  - ${l.name}`));
    process.exit(1);
  }

  const tournamentIds = league.tournaments.map(String);
  aggregateLeague(tournamentIds, league.name).catch((error) => {
    console.error('Error aggregating league standings:', error.message);
    process.exit(1);
  });
} else {
  // Legacy mode: use command-line tournament IDs
  const tournamentIds = args;
  aggregateLeague(tournamentIds).catch((error) => {
    console.error('Error aggregating league standings:', error.message);
    process.exit(1);
  });
}
