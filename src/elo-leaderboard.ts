/**
 * ELO Leaderboard Script
 *
 * Displays the top players ranked by current ELO rating
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PlayerDetailData } from './types';

interface EloPlayer {
  username: string;
  displayName: string;
  currentElo: number;
  peakElo: number;
  matchCount: number;
}

function getEloLeaderboard(topN: number = 16): EloPlayer[] {
  const playersDir = path.join(process.cwd(), 'output', 'players');

  if (!fs.existsSync(playersDir)) {
    console.error('Players directory not found. Run npm run player-stats first.');
    process.exit(1);
  }

  const files = fs.readdirSync(playersDir).filter(f => f.startsWith('player_stats_'));
  const players: EloPlayer[] = [];

  for (const file of files) {
    const filePath = path.join(playersDir, file);
    const playerData: PlayerDetailData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Only include players with ELO data
    if (playerData.eloRating !== undefined && playerData.peakEloRating !== undefined) {
      players.push({
        username: playerData.username,
        displayName: playerData.displayName,
        currentElo: playerData.eloRating,
        peakElo: playerData.peakEloRating,
        matchCount: playerData.eloHistory?.length || 0,
      });
    }
  }

  // Sort by current ELO (descending)
  players.sort((a, b) => b.currentElo - a.currentElo);

  // Return top N
  return players.slice(0, topN);
}

function displayLeaderboard(players: EloPlayer[]): void {
  console.log('\n🏆 ELO Leaderboard - Top 16 Players\n');
  console.log('═'.repeat(80));
  console.log(
    'Rank'.padEnd(6) +
    'Player'.padEnd(25) +
    'Current ELO'.padEnd(15) +
    'Peak ELO'.padEnd(15) +
    'Matches'
  );
  console.log('═'.repeat(80));

  players.forEach((player, index) => {
    const rank = (index + 1).toString().padEnd(6);
    const name = player.displayName.padEnd(25);
    const currentElo = player.currentElo.toString().padEnd(15);
    const peakElo = player.peakElo.toString().padEnd(15);
    const matches = player.matchCount.toString();

    // Add indicator if player is at their peak
    const atPeak = player.currentElo === player.peakElo ? '🔥' : '  ';

    console.log(`${rank}${name}${currentElo}${peakElo}${matches} ${atPeak}`);
  });

  console.log('═'.repeat(80));
  console.log('\n🔥 = Currently at peak ELO\n');

  // Stats summary
  const avgElo = players.reduce((sum, p) => sum + p.currentElo, 0) / players.length;
  const highestPeak = Math.max(...players.map(p => p.peakElo));
  const totalMatches = players.reduce((sum, p) => sum + p.matchCount, 0);

  console.log('📊 Statistics:');
  console.log(`   Average ELO (Top 16): ${Math.round(avgElo)}`);
  console.log(`   Highest Peak: ${highestPeak}`);
  console.log(`   Total Matches (Top 16): ${totalMatches}`);
  console.log();
}

// Run the script
const topPlayers = getEloLeaderboard(16);

if (topPlayers.length === 0) {
  console.error('No players with ELO data found. Run npm run player-stats first.');
  process.exit(1);
}

displayLeaderboard(topPlayers);
