import * as fs from 'fs';
import * as path from 'path';
import { getTournamentMetadata } from './utils/tournamentData';
import yaml from 'js-yaml';

interface LeaguesConfig {
  leagues: Array<{
    name: string;
    tournaments: number[];
  }>;
}

function getStandingsDate(tournamentId: number): string | null {
  const tournamentDir = path.join(process.cwd(), 'output', `tournament_${tournamentId}`);
  const standingsPath = path.join(tournamentDir, 'Round_1_Standings.json');

  if (!fs.existsSync(standingsPath)) {
    return null;
  }

  try {
    const standings = JSON.parse(fs.readFileSync(standingsPath, 'utf-8'));
    if (!standings || standings.length === 0) {
      return null;
    }

    return standings[0].DateCreated || null;
  } catch (error) {
    return null;
  }
}

async function compareDates() {
  console.log('\n🔍 Comparing Tournament Dates (Standings vs Match Timestamps)\n');

  // Load leagues config to get all tournament IDs
  const leaguesPath = path.join(process.cwd(), 'leagues.yml');
  const leaguesConfig = yaml.load(fs.readFileSync(leaguesPath, 'utf-8')) as LeaguesConfig;

  const allTournamentIds: number[] = [];
  for (const league of leaguesConfig.leagues) {
    allTournamentIds.push(...league.tournaments);
  }

  // Sort tournaments by ID (newest first)
  allTournamentIds.sort((a, b) => b - a);

  let changedCount = 0;

  for (const tournamentId of allTournamentIds) {
    const standingsDateRaw = getStandingsDate(tournamentId);
    const metadata = getTournamentMetadata(tournamentId);

    if (!standingsDateRaw || !metadata) {
      continue;
    }

    const standingsDate = new Date(standingsDateRaw);
    const matchDate = new Date(metadata.date);

    const standingsDisplay = standingsDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const matchDisplay = matchDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (standingsDisplay !== matchDisplay) {
      changedCount++;
      console.log(`Tournament ${tournamentId}:`);
      console.log(`  Old (standings): ${standingsDisplay}`);
      console.log(`  New (matches):   ${matchDisplay}`);
      console.log();
    }
  }

  if (changedCount === 0) {
    console.log('✓ No date changes found. All tournaments have consistent dates.\n');
  } else {
    console.log(`⚠️  Found ${changedCount} tournament(s) with date changes.\n`);
  }
}

compareDates().catch(console.error);
