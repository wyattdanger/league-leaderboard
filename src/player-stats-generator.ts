import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { Match } from './utils/playerData';
import type {
  PlayerDetailData,
  PlayerOverallStats,
  PlayerLeagueStats,
  PlayerTournamentPerformance,
} from './types';
import { calculateMatchWinPercentage, calculateGameWinPercentage } from './utils/winPercentage';
import { calculatePlayerStats, calculateHeadToHeadRecords } from './utils/playerData';
import { getTournamentMetadata } from './utils/tournamentData';

interface League {
  name: string;
  tournaments: number[];
}

interface LeaguesConfig {
  leagues: League[];
}

interface TournamentLeagueMap {
  [tournamentId: string]: string; // tournament ID -> league name
}

function loadLeaguesConfig(): LeaguesConfig {
  const configPath = path.join(process.cwd(), 'leagues.yml');
  const fileContents = fs.readFileSync(configPath, 'utf8');
  return yaml.load(fileContents) as LeaguesConfig;
}

async function generatePlayerStats(): Promise<void> {
  console.log('\n🏆 Generating Player Stats\n');

  const config = loadLeaguesConfig();
  const allTournamentIds = new Set<string>();
  const tournamentToLeague: TournamentLeagueMap = {};

  // Collect all tournament IDs and map them to leagues
  for (const league of config.leagues) {
    for (const tournamentId of league.tournaments) {
      const tidStr = tournamentId.toString();
      allTournamentIds.add(tidStr);
      tournamentToLeague[tidStr] = league.name;
    }
  }

  console.log(
    `Processing ${allTournamentIds.size} unique tournaments across ${config.leagues.length} leagues\n`
  );

  // Collect all players and their matches
  const playerMatches = new Map<string, { matchesPerRound: Match[][]; displayName: string }>();
  const playerTournaments = new Map<string, Set<string>>();
  const playerPoints = new Map<string, number>();
  const playerTrophies = new Map<string, number>();
  const playerBelts = new Map<string, number>();

  // Identify which tournaments are Top 8s
  const top8Tournaments = new Set<string>();
  for (const league of config.leagues) {
    if (league.name === 'Top 8s') {
      league.tournaments.forEach((tid) => top8Tournaments.add(tid.toString()));
    }
  }

  // Load all tournament data
  for (const tournamentId of allTournamentIds) {
    const tournamentDir = path.join(process.cwd(), 'output', `tournament_${tournamentId}`);

    if (!fs.existsSync(tournamentDir)) {
      console.warn(`⚠️  Tournament ${tournamentId} not found. Skipping...`);
      continue;
    }

    // Find all match files
    const matchFiles = fs
      .readdirSync(tournamentDir)
      .filter((f) => f.endsWith('_Matches.json'))
      .sort();

    if (matchFiles.length === 0) {
      console.warn(`⚠️  No match data found for tournament ${tournamentId}`);
      continue;
    }

    console.log(`Loading tournament ${tournamentId}: ${matchFiles.length} rounds`);

    const tournamentMatches: Match[] = [];

    for (const file of matchFiles) {
      const filePath = path.join(tournamentDir, file);
      const matches: Match[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      tournamentMatches.push(...matches);

      // Track players in this tournament
      for (const match of matches) {
        for (const competitor of match.Competitors) {
          const username = competitor.Team.Players[0]?.Username || '';
          const displayName = competitor.Team.Players[0]?.DisplayName || username;

          if (username) {
            if (!playerTournaments.has(username)) {
              playerTournaments.set(username, new Set());
            }
            playerTournaments.get(username)!.add(tournamentId);

            if (!playerMatches.has(username)) {
              playerMatches.set(username, {
                matchesPerRound: [],
                displayName,
              });
            }
          }
        }
      }
    }

    // Add this tournament's matches to each player's collection
    for (const [username] of playerTournaments) {
      if (playerTournaments.get(username)!.has(tournamentId)) {
        const playerData = playerMatches.get(username)!;
        playerData.matchesPerRound.push(tournamentMatches);
      }
    }

    // Load standings to get points and check for 3-0 finishes (trophies/belts)
    const standingsFiles = fs
      .readdirSync(tournamentDir)
      .filter((f) => f.endsWith('_Standings.json'))
      .sort()
      .reverse();

    if (standingsFiles.length > 0) {
      const standingsPath = path.join(tournamentDir, standingsFiles[0]);
      const standings = JSON.parse(fs.readFileSync(standingsPath, 'utf-8'));

      for (const standing of standings) {
        const username = standing.Team.Players[0]?.Username || '';
        if (username) {
          playerPoints.set(username, (playerPoints.get(username) || 0) + (standing.Points || 0));

          // Check for 3-0 finish
          if (
            standing.MatchWins === 3 &&
            standing.MatchLosses === 0 &&
            standing.MatchDraws === 0
          ) {
            if (top8Tournaments.has(tournamentId)) {
              // Top 8 3-0s count as belts only
              playerBelts.set(username, (playerBelts.get(username) || 0) + 1);
            } else {
              // Regular league 3-0s count as trophies only
              playerTrophies.set(username, (playerTrophies.get(username) || 0) + 1);
            }
          }
        }
      }
    }
  }

  console.log(`\nFound ${playerMatches.size} unique players\n`);

  // Generate stats for each player
  const outputDir = path.join(process.cwd(), 'output', 'players');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let processedCount = 0;

  for (const [username, data] of playerMatches) {
    const { matchesPerRound, displayName } = data;

    // Calculate head-to-head records (across all tournaments)
    const headToHead = calculateHeadToHeadRecords(username, matchesPerRound);

    // Calculate overall stats and per-league stats
    let totalMatchWins = 0;
    let totalMatchLosses = 0;
    let totalMatchDraws = 0;
    let totalGameWins = 0;
    let totalGameLosses = 0;
    let totalGameDraws = 0;

    // Group tournaments by league for this player
    const leagueStatsMap = new Map<
      string,
      {
        matchWins: number;
        matchLosses: number;
        matchDraws: number;
        gameWins: number;
        gameLosses: number;
        gameDraws: number;
        points: number;
        events: number;
      }
    >();

    // Sum up stats from all tournaments
    for (const tournamentId of playerTournaments.get(username) || []) {
      // Find matches for this tournament only
      const tournamentMatchesPerRound: Match[][] = [];
      for (const matches of matchesPerRound) {
        const tournamentMatches = matches.filter((m) => m.TournamentId.toString() === tournamentId);
        if (tournamentMatches.length > 0) {
          tournamentMatchesPerRound.push(tournamentMatches);
        }
      }

      const stats = calculatePlayerStats(
        username,
        tournamentMatchesPerRound,
        parseInt(tournamentId)
      );
      if (stats) {
        // Add to overall totals
        totalMatchWins += stats.matchWins;
        totalMatchLosses += stats.matchLosses;
        totalMatchDraws += stats.matchDraws;
        totalGameWins += stats.gameWins;
        totalGameLosses += stats.gameLosses;
        totalGameDraws += stats.gameDraws;

        // Add to league-specific stats
        const leagueName = tournamentToLeague[tournamentId];
        if (leagueName) {
          if (!leagueStatsMap.has(leagueName)) {
            leagueStatsMap.set(leagueName, {
              matchWins: 0,
              matchLosses: 0,
              matchDraws: 0,
              gameWins: 0,
              gameLosses: 0,
              gameDraws: 0,
              points: 0,
              events: 0,
            });
          }

          const leagueData = leagueStatsMap.get(leagueName)!;
          leagueData.matchWins += stats.matchWins;
          leagueData.matchLosses += stats.matchLosses;
          leagueData.matchDraws += stats.matchDraws;
          leagueData.gameWins += stats.gameWins;
          leagueData.gameLosses += stats.gameLosses;
          leagueData.gameDraws += stats.gameDraws;
          leagueData.events += 1;
        }
      }
    }

    // Load standings to get points per league
    for (const tournamentId of playerTournaments.get(username) || []) {
      const leagueName = tournamentToLeague[tournamentId];
      if (!leagueName) continue;

      const tournamentDir = path.join(process.cwd(), 'output', `tournament_${tournamentId}`);
      const standingsFiles = fs
        .readdirSync(tournamentDir)
        .filter((f) => f.endsWith('_Standings.json'))
        .sort()
        .reverse();

      if (standingsFiles.length > 0) {
        const standingsPath = path.join(tournamentDir, standingsFiles[0]);
        const standings = JSON.parse(fs.readFileSync(standingsPath, 'utf-8'));

        for (const standing of standings) {
          const standingUsername = standing.Team.Players[0]?.Username || '';
          if (standingUsername === username) {
            const leagueData = leagueStatsMap.get(leagueName)!;
            leagueData.points += standing.Points || 0;
            break;
          }
        }
      }
    }

    // Convert league stats map to array
    const leagueStats: PlayerLeagueStats[] = Array.from(leagueStatsMap.entries()).map(
      ([leagueName, data]) => {
        return {
          leagueName,
          events: data.events,
          points: data.points,
          matchRecord: `${data.matchWins}-${data.matchLosses}-${data.matchDraws}`,
          matchWinPercentage: calculateMatchWinPercentage(data.matchWins, data.matchLosses, data.matchDraws),
          gameRecord: `${data.gameWins}-${data.gameLosses}-${data.gameDraws}`,
          gameWinPercentage: calculateGameWinPercentage(data.gameWins, data.gameLosses, data.gameDraws),
        };
      }
    );

    const totalMatches = totalMatchWins + totalMatchLosses + totalMatchDraws;
    const totalGames = totalGameWins + totalGameLosses + totalGameDraws;

    const overallStats: PlayerOverallStats = {
      totalTournaments: playerTournaments.get(username)?.size || 0,
      totalPoints: playerPoints.get(username) || 0,
      totalMatches,
      matchRecord: `${totalMatchWins}-${totalMatchLosses}-${totalMatchDraws}`,
      matchWinPercentage: calculateMatchWinPercentage(totalMatchWins, totalMatchLosses, totalMatchDraws),
      gameRecord: `${totalGameWins}-${totalGameLosses}-${totalGameDraws}`,
      gameWinPercentage: totalGames > 0 ? totalGameWins / totalGames : 0,
      trophies: playerTrophies.get(username) || 0,
      belts: playerBelts.get(username) || 0,
    };

    // Collect tournament performances
    const tournamentPerformances: PlayerTournamentPerformance[] = [];
    for (const tournamentId of playerTournaments.get(username) || []) {
      const tournamentDir = path.join(process.cwd(), 'output', `tournament_${tournamentId}`);
      const standingsFiles = fs
        .readdirSync(tournamentDir)
        .filter((f) => f.endsWith('_Standings.json'))
        .sort()
        .reverse();

      if (standingsFiles.length > 0) {
        const standingsPath = path.join(tournamentDir, standingsFiles[0]);
        const standings = JSON.parse(fs.readFileSync(standingsPath, 'utf-8'));

        for (const standing of standings) {
          const standingUsername = standing.Team.Players[0]?.Username || '';
          if (standingUsername === username) {
            const metadata = getTournamentMetadata(parseInt(tournamentId));
            if (metadata) {
              const mwp = calculateMatchWinPercentage(standing);
              const gwp = standing.TeamGameWinPercentage || 0;

              tournamentPerformances.push({
                tournamentId: parseInt(tournamentId),
                dateDisplay: metadata.dateDisplay,
                playerCount: metadata.playerCount,
                trophyCount: metadata.trophyCount,
                roundCount: metadata.roundCount,
                rank: standing.Rank,
                points: standing.Points || 0,
                matchRecord: standing.MatchRecord,
                matchWinPercentage: mwp,
                gameWinPercentage: gwp,
              });
            }
            break;
          }
        }
      }
    }

    // Sort by date (newest first)
    tournamentPerformances.sort((a, b) => b.tournamentId - a.tournamentId);

    const playerDetailData: PlayerDetailData = {
      username,
      displayName,
      overallStats,
      leagueStats,
      headToHead,
      tournamentPerformances,
    };

    // Write to file
    const filename = `player_stats_${username.toLowerCase()}.json`;
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(playerDetailData, null, 2));

    processedCount++;
    if (processedCount % 10 === 0) {
      process.stdout.write(`\rProcessed ${processedCount}/${playerMatches.size} players...`);
    }
  }

  console.log(`\n\n✓ Generated stats for ${processedCount} players`);
  console.log(`✓ Files saved to ${outputDir}\n`);
}

// Run the generator
generatePlayerStats().catch((error) => {
  console.error('Error generating player stats:', error.message);
  process.exit(1);
});
