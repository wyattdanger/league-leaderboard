import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

interface RoundInfo {
  id: string;
  name: string;
}

interface MatchData {
  [key: string]: unknown;
}

async function fetchTournamentPage(tournamentId: string): Promise<string> {
  const url = `https://melee.gg/Tournament/View/${tournamentId}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tournament page: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

function extractRoundIds(html: string): RoundInfo[] {
  const $ = cheerio.load(html);
  const rounds: RoundInfo[] = [];
  const seenIds = new Set<string>();

  // Find all buttons with class 'round-selector' that have data-id attribute
  // Only look in the pairings section to avoid duplicates
  $('#pairings-round-selector-container .round-selector[data-id]').each((_, element) => {
    const id = $(element).attr('data-id');
    const name = $(element).attr('data-name') || $(element).text().trim();

    if (id && !seenIds.has(id)) {
      rounds.push({ id, name });
      seenIds.add(id);
    }
  });

  return rounds;
}

async function fetchRoundMatches(roundId: string, tournamentId: string): Promise<MatchData[]> {
  const url = `https://melee.gg/Match/GetRoundMatches/${roundId}`;

  // DataTables format POST body
  const formData = new URLSearchParams({
    'draw': '1',
    'columns[0][data]': 'TableNumber',
    'columns[0][name]': 'TableNumber',
    'columns[0][searchable]': 'true',
    'columns[0][orderable]': 'true',
    'columns[0][search][value]': '',
    'columns[0][search][regex]': 'false',
    'columns[1][data]': 'PodNumber',
    'columns[1][name]': 'PodNumber',
    'columns[1][searchable]': 'true',
    'columns[1][orderable]': 'true',
    'columns[1][search][value]': '',
    'columns[1][search][regex]': 'false',
    'columns[2][data]': 'Teams',
    'columns[2][name]': 'Teams',
    'columns[2][searchable]': 'false',
    'columns[2][orderable]': 'false',
    'columns[2][search][value]': '',
    'columns[2][search][regex]': 'false',
    'columns[3][data]': 'Decklists',
    'columns[3][name]': 'Decklists',
    'columns[3][searchable]': 'false',
    'columns[3][orderable]': 'false',
    'columns[3][search][value]': '',
    'columns[3][search][regex]': 'false',
    'columns[4][data]': 'ResultString',
    'columns[4][name]': 'ResultString',
    'columns[4][searchable]': 'false',
    'columns[4][orderable]': 'false',
    'columns[4][search][value]': '',
    'columns[4][search][regex]': 'false',
    'order[0][column]': '0',
    'order[0][dir]': 'asc',
    'start': '0',
    'length': '1000', // Request more records to get all matches
    'search[value]': '',
    'search[regex]': 'false'
  });

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Referer': `https://melee.gg/Tournament/View/${tournamentId}`,
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': 'https://melee.gg',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData.toString()
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch round matches: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  const text = await response.text();

  if (!contentType?.includes('application/json')) {
    // Save the error response to a file for debugging
    const errorFile = path.join(process.cwd(), 'output', `error_response_${roundId}.html`);
    const errorDir = path.dirname(errorFile);
    if (!fs.existsSync(errorDir)) {
      fs.mkdirSync(errorDir, { recursive: true });
    }
    fs.writeFileSync(errorFile, text);
    throw new Error(`Expected JSON response but got: ${contentType}. Response saved to ${errorFile}`);
  }

  const jsonData = JSON.parse(text);

  // DataTables response format has the data in a 'data' property
  if (jsonData && jsonData.data && Array.isArray(jsonData.data)) {
    return jsonData.data;
  }

  return [];
}

async function fetchRoundStandings(roundId: string, tournamentId: string): Promise<MatchData[]> {
  const url = `https://melee.gg/Standing/GetRoundStandings`;

  // DataTables format POST body for standings
  const formData = new URLSearchParams({
    'draw': '1',
    'columns[0][data]': 'Rank',
    'columns[0][name]': 'Rank',
    'columns[0][searchable]': 'true',
    'columns[0][orderable]': 'true',
    'columns[0][search][value]': '',
    'columns[0][search][regex]': 'false',
    'columns[1][data]': 'Player',
    'columns[1][name]': 'Player',
    'columns[1][searchable]': 'false',
    'columns[1][orderable]': 'false',
    'columns[1][search][value]': '',
    'columns[1][search][regex]': 'false',
    'columns[2][data]': 'Decklists',
    'columns[2][name]': 'Decklists',
    'columns[2][searchable]': 'false',
    'columns[2][orderable]': 'false',
    'columns[2][search][value]': '',
    'columns[2][search][regex]': 'false',
    'columns[3][data]': 'MatchRecord',
    'columns[3][name]': 'MatchRecord',
    'columns[3][searchable]': 'false',
    'columns[3][orderable]': 'false',
    'columns[3][search][value]': '',
    'columns[3][search][regex]': 'false',
    'columns[4][data]': 'GameRecord',
    'columns[4][name]': 'GameRecord',
    'columns[4][searchable]': 'false',
    'columns[4][orderable]': 'false',
    'columns[4][search][value]': '',
    'columns[4][search][regex]': 'false',
    'columns[5][data]': 'Points',
    'columns[5][name]': 'Points',
    'columns[5][searchable]': 'true',
    'columns[5][orderable]': 'true',
    'columns[5][search][value]': '',
    'columns[5][search][regex]': 'false',
    'columns[6][data]': 'OpponentMatchWinPercentage',
    'columns[6][name]': 'OpponentMatchWinPercentage',
    'columns[6][searchable]': 'false',
    'columns[6][orderable]': 'true',
    'columns[6][search][value]': '',
    'columns[6][search][regex]': 'false',
    'columns[7][data]': 'TeamGameWinPercentage',
    'columns[7][name]': 'TeamGameWinPercentage',
    'columns[7][searchable]': 'false',
    'columns[7][orderable]': 'true',
    'columns[7][search][value]': '',
    'columns[7][search][regex]': 'false',
    'columns[8][data]': 'OpponentGameWinPercentage',
    'columns[8][name]': 'OpponentGameWinPercentage',
    'columns[8][searchable]': 'false',
    'columns[8][orderable]': 'true',
    'columns[8][search][value]': '',
    'columns[8][search][regex]': 'false',
    'columns[9][data]': 'FinalTiebreaker',
    'columns[9][name]': 'FinalTiebreaker',
    'columns[9][searchable]': 'false',
    'columns[9][orderable]': 'true',
    'columns[9][search][value]': '',
    'columns[9][search][regex]': 'false',
    'columns[10][data]': 'OpponentCount',
    'columns[10][name]': 'OpponentCount',
    'columns[10][searchable]': 'true',
    'columns[10][orderable]': 'true',
    'columns[10][search][value]': '',
    'columns[10][search][regex]': 'false',
    'order[0][column]': '0',
    'order[0][dir]': 'asc',
    'start': '0',
    'length': '1000',
    'search[value]': '',
    'search[regex]': 'false',
    'roundId': roundId
  });

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Referer': `https://melee.gg/Tournament/View/${tournamentId}`,
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': 'https://melee.gg',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData.toString()
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch round standings: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  const text = await response.text();

  if (!contentType?.includes('application/json')) {
    const errorFile = path.join(process.cwd(), 'output', `error_standings_${roundId}.html`);
    const errorDir = path.dirname(errorFile);
    if (!fs.existsSync(errorDir)) {
      fs.mkdirSync(errorDir, { recursive: true });
    }
    fs.writeFileSync(errorFile, text);
    throw new Error(`Expected JSON response but got: ${contentType}. Response saved to ${errorFile}`);
  }

  const jsonData = JSON.parse(text);

  if (jsonData && jsonData.data && Array.isArray(jsonData.data)) {
    return jsonData.data;
  }

  return [];
}

async function writeMatchesToJson(matches: MatchData[], roundName: string, outputDir: string): Promise<void> {
  if (matches.length === 0) {
    console.log(`No matches found for ${roundName}`);
    return;
  }

  const fileName = `${roundName.replace(/\s+/g, '_')}_Matches.json`;
  const filePath = path.join(outputDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(matches, null, 2));
  console.log(`✓ Wrote ${matches.length} matches to ${fileName}`);
}

async function writeStandingsToJson(standings: MatchData[], roundName: string, outputDir: string): Promise<void> {
  if (standings.length === 0) {
    console.log(`No standings found for ${roundName}`);
    return;
  }

  const fileName = `${roundName.replace(/\s+/g, '_')}_Standings.json`;
  const filePath = path.join(outputDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(standings, null, 2));
  console.log(`✓ Wrote ${standings.length} standings to ${fileName}`);
}

async function scrapeTournament(tournamentId: string): Promise<void> {
  console.log(`\nScraping tournament ${tournamentId}...`);

  // Fetch and parse tournament page
  console.log('Fetching tournament page...');
  const html = await fetchTournamentPage(tournamentId);

  // Extract round IDs
  console.log('Extracting round information...');
  const rounds = extractRoundIds(html);
  console.log(`Found ${rounds.length} rounds:`, rounds.map(r => `${r.name} (${r.id})`).join(', '));

  if (rounds.length === 0) {
    throw new Error('No rounds found in tournament page');
  }

  // Create output directory
  const outputDir = path.join(process.cwd(), 'output', `tournament_${tournamentId}`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Fetch and save matches and standings for each round
  for (const round of rounds) {
    console.log(`\nFetching data for ${round.name}...`);

    // Fetch matches
    console.log(`  - Fetching matches...`);
    const matches = await fetchRoundMatches(round.id, tournamentId);
    await writeMatchesToJson(matches, round.name, outputDir);

    // Fetch standings
    console.log(`  - Fetching standings...`);
    const standings = await fetchRoundStandings(round.id, tournamentId);
    await writeStandingsToJson(standings, round.name, outputDir);
  }

  console.log(`\n✓ Tournament scraping complete! Results saved to ${outputDir}`);
}

// Main execution
const tournamentId = process.argv[2];

if (!tournamentId) {
  console.error('Usage: node scraper.js <tournament-id>');
  console.error('Example: node scraper.js 371711');
  process.exit(1);
}

scrapeTournament(tournamentId)
  .catch(error => {
    console.error('Error scraping tournament:', error.message);
    process.exit(1);
  });
