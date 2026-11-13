#!/usr/bin/env node
/**
 * Build the final-round standings file from match results.
 *
 * Use when Melee hasn't published the last round's standings
 * (scraper prints "No standings found for Round N"). Writes
 * output/tournament_{id}/Round_{N}_Standings.json, marked with `_source`.
 * A later successful `npm run scrape` overwrites it with Melee's own file.
 *
 * Ranking uses calculateStandings (src/standings-calculator.ts):
 * Points, then OMW% (33% floor per opponent), GW%, OGW% (33% floor). Records
 * match Melee; tiebreak order can differ from Melee's for players level on points.
 *
 * Usage: npm run generate-final-standings -- <tournament_id> [--force]
 */

import * as fs from 'fs';
import * as path from 'path';
import { calculateStandings } from './standings-calculator';
import type { Match } from './standings-calculator';

const roundNum = (f: string) => parseInt(f.match(/Round_(\d+)_/)![1], 10);

function main(): void {
  const args = process.argv.slice(2);
  const id = parseInt(args.find((a) => /^\d+$/.test(a)) ?? '', 10);
  const force = args.includes('--force');
  if (!id) {
    console.error('Usage: npm run generate-final-standings -- <tournament_id> [--force]');
    process.exit(1);
  }

  const dir = path.join(process.cwd(), 'output', `tournament_${id}`);
  if (!fs.existsSync(dir)) throw new Error(`Tournament directory not found: ${dir}`);

  const matchFiles = fs
    .readdirSync(dir)
    .filter((f) => /^Round_\d+_Matches\.json$/.test(f))
    .sort((a, b) => roundNum(a) - roundNum(b));
  if (matchFiles.length === 0) throw new Error(`No match files in ${dir}`);

  const finalRound = roundNum(matchFiles[matchFiles.length - 1]);
  const outFile = path.join(dir, `Round_${finalRound}_Standings.json`);

  if (fs.existsSync(outFile) && !force) {
    const existing = JSON.parse(fs.readFileSync(outFile, 'utf-8'));
    if (!Array.isArray(existing) || !existing[0]?._source) {
      console.error(`${path.basename(outFile)} already exists (from Melee). Use --force to overwrite.`);
      process.exit(1);
    }
  }

  const rounds: Match[][] = matchFiles.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')));
  const standings = calculateStandings(rounds).map((s) => ({
    ...s,
    RoundNumber: finalRound,
    Round: `Round ${finalRound}`,
    TournamentId: id,
    _source: 'generated from match results by generate-final-standings (not published by Melee)',
  }));

  fs.writeFileSync(outFile, JSON.stringify(standings, null, 2));
  console.log(`✓ Wrote ${standings.length} standings to ${path.basename(outFile)}\n`);
  for (const s of standings) {
    const p = s.Team.Players[0];
    console.log(
      `${String(s.Rank).padStart(2)}. ${p.Username.padEnd(16)} ${s.MatchRecord}  ` +
        `OMW ${(s.OpponentMatchWinPercentage * 100).toFixed(1)}%  GW ${(s.TeamGameWinPercentage * 100).toFixed(1)}%  ` +
        `OGW ${(s.OpponentGameWinPercentage * 100).toFixed(1)}%`
    );
  }
}

main();
