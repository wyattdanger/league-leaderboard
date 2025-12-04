import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';

interface League {
  name: string;
  tournaments: number[];
}

interface LeaguesConfig {
  leagues: League[];
}

function loadLeaguesConfig(): LeaguesConfig {
  const configPath = path.join(process.cwd(), 'leagues.yml');
  const fileContents = fs.readFileSync(configPath, 'utf8');
  return yaml.load(fileContents) as LeaguesConfig;
}

function tournamentDataExists(tournamentId: number): boolean {
  const tournamentDir = path.join(process.cwd(), 'output', `tournament_${tournamentId}`);

  if (!fs.existsSync(tournamentDir)) {
    return false;
  }

  // Check if we have match files (at least one round)
  const files = fs.readdirSync(tournamentDir)
    .filter(f => f.endsWith('_Matches.json'));

  return files.length > 0;
}

async function scrapeTournament(tournamentId: number): Promise<void> {
  console.log(`Scraping tournament ${tournamentId}...`);
  try {
    execSync(`npm run scrape ${tournamentId}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Failed to scrape tournament ${tournamentId}`);
    throw error;
  }
}

async function syncLeague(leagueName?: string): Promise<void> {
  const config = loadLeaguesConfig();

  if (config.leagues.length === 0) {
    console.error('❌ No leagues found in leagues.yml');
    process.exit(1);
  }

  // Determine which league to sync
  let league: League;
  if (leagueName) {
    const found = config.leagues.find(l => l.name === leagueName);
    if (!found) {
      console.error(`❌ League "${leagueName}" not found in leagues.yml`);
      console.error('Available leagues:');
      config.leagues.forEach(l => console.error(`  - ${l.name}`));
      process.exit(1);
    }
    league = found;
  } else {
    // Use current (first) league
    league = config.leagues[0];
  }

  console.log(`\n🔄 Syncing league: ${league.name}`);
  console.log(`Tournaments: ${league.tournaments.join(', ')}\n`);

  // Check each tournament and scrape if needed
  for (const tournamentId of league.tournaments) {
    if (tournamentDataExists(tournamentId)) {
      console.log(`✓ Tournament ${tournamentId} data already exists`);
    } else {
      console.log(`⚠ Tournament ${tournamentId} data missing`);
      await scrapeTournament(tournamentId);
    }
  }

  console.log(`\n📊 Aggregating league standings...`);

  // Run league aggregator
  try {
    if (leagueName) {
      execSync(`npm run league -- --league "${leagueName}"`, { stdio: 'inherit' });
    } else {
      execSync('npm run league --current', { stdio: 'inherit' });
    }
  } catch (error) {
    console.error('❌ Failed to aggregate league standings');
    throw error;
  }

  console.log(`\n✅ League sync complete!`);
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--current') {
  syncLeague()
    .catch(error => {
      console.error('Error syncing league:', error.message);
      process.exit(1);
    });
} else if (args[0] === '--league' && args[1]) {
  syncLeague(args[1])
    .catch(error => {
      console.error('Error syncing league:', error.message);
      process.exit(1);
    });
} else {
  console.error('Usage:');
  console.error('  npm run sync-league              # Sync current league');
  console.error('  npm run sync-league --current    # Sync current league');
  console.error('  npm run sync-league --league "Winter 2025"  # Sync specific league');
  process.exit(1);
}
