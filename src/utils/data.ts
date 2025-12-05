import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { LeaguesConfig, LeagueStanding, League } from '../types';
import { getTournamentMetadata } from './tournamentData';

/**
 * Load the leagues configuration from leagues.yml
 */
export function loadLeaguesConfig(): LeaguesConfig {
  const configPath = path.join(process.cwd(), 'leagues.yml');
  const fileContents = fs.readFileSync(configPath, 'utf8');
  return yaml.load(fileContents) as LeaguesConfig;
}

/**
 * Load standings data for a specific league
 */
export function loadLeagueStandings(leagueName: string): LeagueStanding[] | null {
  const leagueDir = path.join(process.cwd(), 'output', 'league');
  if (!fs.existsSync(leagueDir)) {
    return null;
  }

  const safeName = leagueName.toLowerCase().replace(/\s+/g, '_');
  const files = fs
    .readdirSync(leagueDir)
    .filter((f) => f.startsWith(`league_standings_${safeName}_`) && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    return null;
  }

  const latestFile = path.join(leagueDir, files[0]);
  return JSON.parse(fs.readFileSync(latestFile, 'utf-8'));
}

/**
 * Aggregate standings across all leagues to create overall standings
 */
export function aggregateOverallStandings(allLeagues: LeaguesConfig['leagues']): LeagueStanding[] {
  // Load and combine standings from all leagues
  const allStandings: LeagueStanding[] = [];
  for (const league of allLeagues) {
    const leagueStandings = loadLeagueStandings(league.name);
    if (leagueStandings) {
      allStandings.push(...leagueStandings);
    }
  }

  // Aggregate by username across all leagues
  const playerStats = new Map<
    string,
    {
      username: string;
      displayName: string;
      teamId: number;
      team: any;
      points: number;
      matchWins: number;
      matchLosses: number;
      matchDraws: number;
      gameWins: number;
      gameLosses: number;
      gameDraws: number;
      tournaments: Set<number>;
      trophies: number;
      belts: number;
    }
  >();

  for (const standing of allStandings) {
    const username = standing.Team.Players[0]?.Username || '';
    if (!username) continue;

    if (!playerStats.has(username)) {
      playerStats.set(username, {
        username,
        displayName: standing.Team.Players[0]?.DisplayName || '',
        teamId: standing.TeamId,
        team: standing.Team,
        points: 0,
        matchWins: 0,
        matchLosses: 0,
        matchDraws: 0,
        gameWins: 0,
        gameLosses: 0,
        gameDraws: 0,
        tournaments: new Set(),
        trophies: 0,
        belts: 0,
      });
    }

    const stats = playerStats.get(username)!;
    stats.points += standing.Points;
    stats.matchWins += standing.MatchWins;
    stats.matchLosses += standing.MatchLosses;
    stats.matchDraws += standing.MatchDraws;
    stats.gameWins += standing.GameWins;
    stats.gameLosses += standing.GameLosses;
    stats.gameDraws += standing.GameDraws;
    if (standing.TournamentCount) {
      stats.tournaments.add(standing.TeamId);
    }
  }

  // Load player stats to get trophy and belt counts (source of truth)
  const playersDir = path.join(process.cwd(), 'output', 'players');
  if (fs.existsSync(playersDir)) {
    for (const [username, stats] of playerStats) {
      const playerFile = path.join(playersDir, `player_stats_${username.toLowerCase()}.json`);
      if (fs.existsSync(playerFile)) {
        const playerData = JSON.parse(fs.readFileSync(playerFile, 'utf-8'));
        stats.trophies = playerData.overallStats?.trophies || 0;
        stats.belts = playerData.overallStats?.belts || 0;
      }
    }
  }

  // Convert to standings format and sort by points
  return Array.from(playerStats.values())
    .map((stats) => ({
      TeamId: stats.teamId,
      Team: stats.team,
      Rank: 0,
      MatchWins: stats.matchWins,
      MatchLosses: stats.matchLosses,
      MatchDraws: stats.matchDraws,
      GameWins: stats.gameWins,
      GameLosses: stats.gameLosses,
      GameDraws: stats.gameDraws,
      Points: stats.points,
      MatchRecord: `${stats.matchWins}-${stats.matchLosses}-${stats.matchDraws}`,
      GameRecord: `${stats.gameWins}-${stats.gameLosses}-${stats.gameDraws}`,
      OpponentMatchWinPercentage: 0,
      TeamGameWinPercentage: stats.gameWins / (stats.gameWins + stats.gameLosses + stats.gameDraws),
      OpponentGameWinPercentage: 0,
      OpponentCount: 0,
      TournamentCount: stats.tournaments.size,
      Trophies: stats.trophies,
      Belts: stats.belts,
    }))
    .sort((a, b) => b.Points - a.Points)
    .map((s, i) => ({ ...s, Rank: i + 1 }));
}

/**
 * Determine if a given league is the current league (has the most recent tournament)
 */
export function isCurrentLeague(league: League, allLeagues: LeaguesConfig['leagues']): boolean {
  // Find the most recent tournament across all leagues
  const allTournamentIds = allLeagues.flatMap((l) => l.tournaments);
  const allMetadata = allTournamentIds
    .map((id) => getTournamentMetadata(id))
    .filter((meta) => meta !== null)
    .sort((a, b) => new Date(b!.date).getTime() - new Date(a!.date).getTime());

  if (allMetadata.length === 0) {
    return false;
  }

  const mostRecentTournament = allMetadata[0];
  // Check if this tournament belongs to the given league
  return league.tournaments.includes(mostRecentTournament!.tournamentId);
}
