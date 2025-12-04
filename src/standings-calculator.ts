export interface Match {
  Competitors: Competitor[];
  RoundNumber: number;
  TableNumber: number | null;
  ByeReason: number | null;
  GameDraws: number;
  [key: string]: unknown;
}

export interface Competitor {
  Team: Team;
  ID: number;
  GameWins: number | null;
  GameByes: number;
  SortOrder: number;
  TeamId: number;
  [key: string]: unknown;
}

export interface Team {
  Players: Player[];
  ID: number;
  Name: string | null;
  [key: string]: unknown;
}

export interface Player {
  ID: number;
  DisplayName: string;
  Username: string;
  TeamId: number;
  [key: string]: unknown;
}

export interface Standing {
  TeamId: number;
  Team: Team;
  Rank: number;
  MatchWins: number;
  MatchLosses: number;
  MatchDraws: number;
  GameWins: number;
  GameLosses: number;
  GameDraws: number;
  Points: number;
  MatchRecord: string;
  GameRecord: string;
  OpponentMatchWinPercentage: number;
  TeamGameWinPercentage: number;
  OpponentGameWinPercentage: number;
  OpponentCount: number;
  [key: string]: unknown;
}

interface TeamStats {
  teamId: number;
  team: Team;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  gameWins: number;
  gameLosses: number;
  gameDraws: number;
  opponents: Set<number>;
  opponentIds: number[];
}

interface PlayerStats {
  username: string;
  teamId: number; // Keep the most recent teamId
  team: Team; // Keep the most recent team data
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  gameWins: number;
  gameLosses: number;
  gameDraws: number;
  opponents: Set<string>; // Track opponents by username
}

/**
 * Calculate standings from match results
 */
export function calculateStandings(matchesPerRound: Match[][]): Standing[] {
  const teamStats = new Map<number, TeamStats>();

  // Process all rounds
  for (const matches of matchesPerRound) {
    for (const match of matches) {
      // Handle byes
      if (match.ByeReason !== null && match.Competitors.length === 1) {
        const competitor = match.Competitors[0];
        const teamId = competitor.TeamId;

        if (!teamStats.has(teamId)) {
          teamStats.set(teamId, {
            teamId,
            team: competitor.Team,
            matchWins: 0,
            matchLosses: 0,
            matchDraws: 0,
            gameWins: 0,
            gameLosses: 0,
            gameDraws: 0,
            opponents: new Set(),
            opponentIds: []
          });
        }

        const stats = teamStats.get(teamId)!;
        stats.matchWins += 1;
        stats.gameWins += (competitor.GameByes || 0);
        continue;
      }

      // Regular matches with 2 competitors
      if (match.Competitors.length === 2) {
        const [comp1, comp2] = match.Competitors;
        const team1Id = comp1.TeamId;
        const team2Id = comp2.TeamId;

        // Initialize team stats if needed
        for (const comp of [comp1, comp2]) {
          if (!teamStats.has(comp.TeamId)) {
            teamStats.set(comp.TeamId, {
              teamId: comp.TeamId,
              team: comp.Team,
              matchWins: 0,
              matchLosses: 0,
              matchDraws: 0,
              gameWins: 0,
              gameLosses: 0,
              gameDraws: 0,
              opponents: new Set(),
              opponentIds: []
            });
          }
        }

        const stats1 = teamStats.get(team1Id)!;
        const stats2 = teamStats.get(team2Id)!;

        // Track opponents
        stats1.opponents.add(team2Id);
        stats2.opponents.add(team1Id);
        stats1.opponentIds.push(team2Id);
        stats2.opponentIds.push(team1Id);

        const games1 = comp1.GameWins ?? 0;
        const games2 = comp2.GameWins ?? 0;
        const draws = match.GameDraws || 0;

        // Update game records
        stats1.gameWins += games1;
        stats2.gameWins += games2;
        stats1.gameLosses += games2;
        stats2.gameLosses += games1;
        stats1.gameDraws += draws;
        stats2.gameDraws += draws;

        // Determine match winner
        if (games1 > games2) {
          stats1.matchWins += 1;
          stats2.matchLosses += 1;
        } else if (games2 > games1) {
          stats2.matchWins += 1;
          stats1.matchLosses += 1;
        } else {
          stats1.matchDraws += 1;
          stats2.matchDraws += 1;
        }
      }
    }
  }

  // Calculate tiebreakers and create standings
  const standings: Standing[] = [];

  for (const stats of teamStats.values()) {
    const totalMatches = stats.matchWins + stats.matchLosses + stats.matchDraws;
    const totalGames = stats.gameWins + stats.gameLosses + stats.gameDraws;

    // Calculate opponent match win percentage
    // Average the MW% of all opponents (with 33% floor applied to each)
    let totalOppMw = 0;
    let oppMatchCount = 0;

    for (const oppId of stats.opponentIds) {
      const oppStats = teamStats.get(oppId);
      if (oppStats) {
        const oppTotalMatches = oppStats.matchWins + oppStats.matchLosses + oppStats.matchDraws;
        const oppRawMw = oppTotalMatches > 0 ? oppStats.matchWins / oppTotalMatches : 0;
        const oppMw = Math.max(0.33, oppRawMw);
        totalOppMw += oppMw;
        oppMatchCount++;
      }
    }

    const omw = oppMatchCount > 0 ? totalOppMw / oppMatchCount : 0;

    // Calculate team game win percentage (no floor for display)
    const gw = totalGames > 0 ? stats.gameWins / totalGames : 0;

    // Calculate opponent game win percentage
    // Average the GW% of all opponents (with 33% floor applied to each)
    let totalOppGw = 0;
    let oppCount = 0;

    for (const oppId of stats.opponentIds) {
      const oppStats = teamStats.get(oppId);
      if (oppStats) {
        const oppTotal = oppStats.gameWins + oppStats.gameLosses + oppStats.gameDraws;
        const oppRawGw = oppTotal > 0 ? oppStats.gameWins / oppTotal : 0;
        const oppGw = Math.max(0.33, oppRawGw);
        totalOppGw += oppGw;
        oppCount++;
      }
    }

    const ogw = oppCount > 0 ? totalOppGw / oppCount : 0;

    standings.push({
      TeamId: stats.teamId,
      Team: stats.team,
      Rank: 0, // Will be calculated after sorting
      MatchWins: stats.matchWins,
      MatchLosses: stats.matchLosses,
      MatchDraws: stats.matchDraws,
      GameWins: stats.gameWins,
      GameLosses: stats.gameLosses,
      GameDraws: stats.gameDraws,
      Points: stats.matchWins * 3 + stats.matchDraws * 1,
      MatchRecord: `${stats.matchWins}-${stats.matchLosses}-${stats.matchDraws}`,
      GameRecord: `${stats.gameWins}-${stats.gameLosses}-${stats.gameDraws}`,
      OpponentMatchWinPercentage: omw,
      TeamGameWinPercentage: gw,
      OpponentGameWinPercentage: ogw,
      OpponentCount: stats.opponents.size
    });
  }

  // Sort by: Points (desc), OMW% (desc), GW% (desc), OGW% (desc)
  standings.sort((a, b) => {
    if (b.Points !== a.Points) return b.Points - a.Points;
    if (b.OpponentMatchWinPercentage !== a.OpponentMatchWinPercentage) {
      return b.OpponentMatchWinPercentage - a.OpponentMatchWinPercentage;
    }
    if (b.TeamGameWinPercentage !== a.TeamGameWinPercentage) {
      return b.TeamGameWinPercentage - a.TeamGameWinPercentage;
    }
    if (b.OpponentGameWinPercentage !== a.OpponentGameWinPercentage) {
      return b.OpponentGameWinPercentage - a.OpponentGameWinPercentage;
    }
    // Final tiebreaker: TeamId for consistency
    return a.TeamId - b.TeamId;
  });

  // Assign ranks
  standings.forEach((standing, index) => {
    standing.Rank = index + 1;
  });

  return standings;
}

/**
 * Calculate standings by username for cross-tournament aggregation
 * This treats all rounds as part of one continuous tournament
 */
export function calculateStandingsByUsername(matchesPerRound: Match[][]): Standing[] {
  const playerStats = new Map<string, PlayerStats>();

  // Process all rounds
  for (const matches of matchesPerRound) {
    for (const match of matches) {
      // Handle byes
      if (match.ByeReason !== null && match.Competitors.length === 1) {
        const competitor = match.Competitors[0];
        const username = competitor.Team.Players[0]?.Username || '';

        if (!playerStats.has(username)) {
          playerStats.set(username, {
            username,
            teamId: competitor.TeamId,
            team: competitor.Team,
            matchWins: 0,
            matchLosses: 0,
            matchDraws: 0,
            gameWins: 0,
            gameLosses: 0,
            gameDraws: 0,
            opponents: new Set(),
          });
        }

        const stats = playerStats.get(username)!;
        stats.teamId = competitor.TeamId; // Update to most recent
        stats.team = competitor.Team; // Update to most recent
        stats.matchWins += 1;
        stats.gameWins += (competitor.GameByes || 0);
        continue;
      }

      // Regular matches with 2 competitors
      if (match.Competitors.length === 2) {
        const [comp1, comp2] = match.Competitors;
        const username1 = comp1.Team.Players[0]?.Username || '';
        const username2 = comp2.Team.Players[0]?.Username || '';

        // Initialize player stats if needed
        for (const [comp, username] of [[comp1, username1], [comp2, username2]] as const) {
          if (!playerStats.has(username)) {
            playerStats.set(username, {
              username,
              teamId: comp.TeamId,
              team: comp.Team,
              matchWins: 0,
              matchLosses: 0,
              matchDraws: 0,
              gameWins: 0,
              gameLosses: 0,
              gameDraws: 0,
              opponents: new Set(),
            });
          } else {
            // Update to most recent data
            const stats = playerStats.get(username)!;
            stats.teamId = comp.TeamId;
            stats.team = comp.Team;
          }
        }

        const stats1 = playerStats.get(username1)!;
        const stats2 = playerStats.get(username2)!;

        // Track opponents
        stats1.opponents.add(username2);
        stats2.opponents.add(username1);

        const games1 = comp1.GameWins ?? 0;
        const games2 = comp2.GameWins ?? 0;
        const draws = match.GameDraws || 0;

        // Update game records
        stats1.gameWins += games1;
        stats2.gameWins += games2;
        stats1.gameLosses += games2;
        stats2.gameLosses += games1;
        stats1.gameDraws += draws;
        stats2.gameDraws += draws;

        // Determine match winner
        if (games1 > games2) {
          stats1.matchWins += 1;
          stats2.matchLosses += 1;
        } else if (games2 > games1) {
          stats2.matchWins += 1;
          stats1.matchLosses += 1;
        } else {
          stats1.matchDraws += 1;
          stats2.matchDraws += 1;
        }
      }
    }
  }

  // Calculate tiebreakers and create standings
  const standings: Standing[] = [];

  for (const stats of playerStats.values()) {
    // Calculate OMW%
    let totalOppMw = 0;
    let oppCount = 0;
    for (const oppUsername of stats.opponents) {
      const oppStats = playerStats.get(oppUsername);
      if (oppStats) {
        const oppTotalMatches = oppStats.matchWins + oppStats.matchLosses + oppStats.matchDraws;
        const oppRawMw = oppTotalMatches > 0 ? oppStats.matchWins / oppTotalMatches : 0;
        const oppMw = Math.max(0.33, oppRawMw); // 33% floor for opponents
        totalOppMw += oppMw;
        oppCount++;
      }
    }
    const omw = oppCount > 0 ? totalOppMw / oppCount : 0;

    // Calculate GW% (no floor for player's own percentage)
    const totalGames = stats.gameWins + stats.gameLosses + stats.gameDraws;
    const gw = totalGames > 0 ? stats.gameWins / totalGames : 0;

    // Calculate OGW%
    let totalOppGw = 0;
    oppCount = 0;
    for (const oppUsername of stats.opponents) {
      const oppStats = playerStats.get(oppUsername);
      if (oppStats) {
        const oppTotalGames = oppStats.gameWins + oppStats.gameLosses + oppStats.gameDraws;
        const oppRawGw = oppTotalGames > 0 ? oppStats.gameWins / oppTotalGames : 0;
        const oppGw = Math.max(0.33, oppRawGw); // 33% floor for opponents
        totalOppGw += oppGw;
        oppCount++;
      }
    }
    const ogw = oppCount > 0 ? totalOppGw / oppCount : 0;

    standings.push({
      TeamId: stats.teamId,
      Team: stats.team,
      Rank: 0, // Will be calculated after sorting
      MatchWins: stats.matchWins,
      MatchLosses: stats.matchLosses,
      MatchDraws: stats.matchDraws,
      GameWins: stats.gameWins,
      GameLosses: stats.gameLosses,
      GameDraws: stats.gameDraws,
      Points: stats.matchWins * 3 + stats.matchDraws * 1,
      MatchRecord: `${stats.matchWins}-${stats.matchLosses}-${stats.matchDraws}`,
      GameRecord: `${stats.gameWins}-${stats.gameLosses}-${stats.gameDraws}`,
      OpponentMatchWinPercentage: omw,
      TeamGameWinPercentage: gw,
      OpponentGameWinPercentage: ogw,
      OpponentCount: stats.opponents.size
    });
  }

  // Sort by: Points (desc), OMW% (desc), GW% (desc), OGW% (desc)
  standings.sort((a, b) => {
    if (b.Points !== a.Points) return b.Points - a.Points;
    if (b.OpponentMatchWinPercentage !== a.OpponentMatchWinPercentage) {
      return b.OpponentMatchWinPercentage - a.OpponentMatchWinPercentage;
    }
    if (b.TeamGameWinPercentage !== a.TeamGameWinPercentage) {
      return b.TeamGameWinPercentage - a.TeamGameWinPercentage;
    }
    if (b.OpponentGameWinPercentage !== a.OpponentGameWinPercentage) {
      return b.OpponentGameWinPercentage - a.OpponentGameWinPercentage;
    }
    // Final tiebreaker: TeamId for consistency
    return a.TeamId - b.TeamId;
  });

  // Assign ranks
  standings.forEach((standing, index) => {
    standing.Rank = index + 1;
  });

  return standings;
}
