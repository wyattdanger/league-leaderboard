# ELO System Design

## Overview

Add an ELO rating system to track relative player skill over time. ELO would complement existing stats (match win %, trophies, etc.) and provide a skill-based ranking.

## What is ELO?

- Rating system where players gain/lose points based on match results
- Higher-rated players are expected to beat lower-rated players
- Beating a higher-rated opponent gains more points
- Losing to a lower-rated opponent loses more points
- Self-correcting: ratings converge to reflect true skill over time

## Implementation Strategy

### 1. Core ELO Calculator

The ELO rating system uses these formulas:

**Expected Score (Probability of Winning):**
```
EA = 1 / (1 + 10^((RB - RA) / 400))
```
Where:
- EA = Expected score for player A
- RA = Current rating of player A
- RB = Current rating of player B

**New Rating:**
```
R'A = RA + K × (SA - EA)
```
Where:
- R'A = New rating for player A
- K = K-factor (rating volatility, typically 32)
- SA = Actual score (1 for win, 0 for loss, 0.5 for draw)
- EA = Expected score

**Implementation:**

```typescript
// src/utils/elo.ts

/**
 * Result of an ELO calculation containing all relevant information
 */
export interface EloResult {
  playerRating: number;
  opponentRating: number;
  playerNewRating: number;
  opponentNewRating: number;
  ratingChange: number;
  opponentRatingChange: number;
  expectedScore: number; // Probability player should win (0.0-1.0)
  expectedOpponentScore: number; // Probability opponent should win
}

/**
 * Calculate ELO rating change for a match result
 *
 * This is a simplified API that handles both players simultaneously.
 * For more advanced use cases (rating-dependent K factors, etc.), see createRatingSystem.
 *
 * @param playerRating - Current rating of the player
 * @param opponentRating - Current rating of the opponent
 * @param result - Match outcome: 'win', 'loss', or 'draw'
 * @param kFactor - Rating volatility (default 32, standard chess value)
 * @returns EloResult with new ratings and change for both players
 */
export function calculateElo(
  playerRating: number,
  opponentRating: number,
  result: 'win' | 'loss' | 'draw',
  kFactor: number = 32
): EloResult {
  // Calculate expected scores (probabilities) for both players
  const expectedPlayerScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const expectedOpponentScore = 1 / (1 + Math.pow(10, (playerRating - opponentRating) / 400));

  // Actual scores
  const actualPlayerScore = result === 'win' ? 1 : result === 'loss' ? 0 : 0.5;
  const actualOpponentScore = result === 'win' ? 0 : result === 'loss' ? 1 : 0.5;

  // Rating changes: K × (Actual - Expected)
  const playerRatingChange = Math.round(kFactor * (actualPlayerScore - expectedPlayerScore));
  const opponentRatingChange = Math.round(kFactor * (actualOpponentScore - expectedOpponentScore));

  return {
    playerRating,
    opponentRating,
    playerNewRating: playerRating + playerRatingChange,
    opponentNewRating: opponentRating + opponentRatingChange,
    ratingChange: playerRatingChange,
    opponentRatingChange,
    expectedScore: expectedPlayerScore,
    expectedOpponentScore,
  };
}

/**
 * Calculate expected score (probability of winning) between two players
 * Useful for displaying match predictions
 */
export function getExpectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Get rating difference needed for a given win probability
 * Examples:
 * - 50% win probability: 0 rating difference
 * - 64% win probability: ~100 rating difference
 * - 76% win probability: ~200 rating difference
 * - 91% win probability: ~400 rating difference
 */
export function getRatingDifferenceForWinProbability(winProbability: number): number {
  return -400 * Math.log10((1 / winProbability) - 1);
}
```

### 2. Data Structure

Add to player stats:
```typescript
export interface PlayerStats {
  username: string;
  displayName: string;
  // ... existing fields ...
  eloRating: number;        // Current ELO rating
  peakEloRating: number;    // Highest ELO achieved
  eloHistory: EloHistoryEntry[]; // Rating over time
}

export interface EloHistoryEntry {
  tournamentId: string;
  tournamentDate: string;
  roundNumber: number;
  opponent: string;
  result: 'W' | 'L' | 'D';
  ratingBefore: number;
  ratingAfter: number;
  ratingChange: number;
}
```

### 3. Calculation Approach: Chronological Replay

**The Chronological Replay Strategy**

We will implement a full chronological replay system that:
1. Collects ALL matches from ALL tournaments
2. Sorts them by timestamp (tournament date + round number)
3. Processes each match in exact chronological order
4. Updates player ratings after each match
5. Records the complete rating history for every player

**Why This Approach?**
- **Temporal accuracy**: Reflects the true competitive timeline
- **Reproducible**: Can regenerate from scratch anytime
- **Debuggable**: Easy to trace any player's rating evolution
- **Simple**: No complex state management between tournaments
- **Complete history**: Every match's ELO impact is recorded

**Key Implementation Details:**

```typescript
// Pseudo-code for the replay system
function calculateAllPlayerElos(tournamentIds: string[]): Map<string, PlayerEloData> {
  // Step 1: Collect and enrich all matches with timestamps
  const allMatches: EnrichedMatch[] = [];
  for (const tournamentId of tournamentIds) {
    const metadata = loadTournamentMetadata(tournamentId);
    const tournamentDate = metadata.StartDate; // e.g., "2025-11-07"

    for (const round of metadata.Rounds) {
      const matches = loadRoundMatches(tournamentId, round.Number);

      // Attach tournament date and round number to each match
      for (const match of matches) {
        allMatches.push({
          ...match,
          tournamentId,
          tournamentDate,
          roundNumber: round.Number,
          // Construct timestamp: date + round number determines order
          timestamp: new Date(tournamentDate).getTime() + (round.Number * 1000)
        });
      }
    }
  }

  // Step 2: Sort all matches chronologically
  allMatches.sort((a, b) => a.timestamp - b.timestamp);

  // Step 3: Initialize all players at 1500 ELO
  const playerElos = new Map<string, number>();
  const playerHistories = new Map<string, EloHistoryEntry[]>();

  for (const match of allMatches) {
    // Extract both players from match
    const [player1, player2] = extractPlayersFromMatch(match);

    // Initialize ratings if first time seeing these players
    if (!playerElos.has(player1.username)) {
      playerElos.set(player1.username, 1500);
      playerHistories.set(player1.username, []);
    }
    if (!playerElos.has(player2.username)) {
      playerElos.set(player2.username, 1500);
      playerHistories.set(player2.username, []);
    }

    // Get current ratings
    const player1Rating = playerElos.get(player1.username)!;
    const player2Rating = playerElos.get(player2.username)!;

    // Calculate result (W/L/D)
    const result = determineMatchResult(match, player1.username);

    // Calculate new ELO ratings
    const eloResult = calculateElo(player1Rating, player2Rating, result);

    // Update ratings
    playerElos.set(player1.username, eloResult.playerNewRating);
    playerElos.set(player2.username, eloResult.opponentNewRating);

    // Record history for both players
    playerHistories.get(player1.username)!.push({
      tournamentId: match.tournamentId,
      tournamentDate: match.tournamentDate,
      roundNumber: match.roundNumber,
      opponent: player2.username,
      result: result === 'win' ? 'W' : result === 'loss' ? 'L' : 'D',
      ratingBefore: player1Rating,
      ratingAfter: eloResult.playerNewRating,
      ratingChange: eloResult.ratingChange
    });

    playerHistories.get(player2.username)!.push({
      tournamentId: match.tournamentId,
      tournamentDate: match.tournamentDate,
      roundNumber: match.roundNumber,
      opponent: player1.username,
      result: result === 'win' ? 'L' : result === 'loss' ? 'W' : 'D',
      ratingBefore: player2Rating,
      ratingAfter: eloResult.opponentNewRating,
      ratingChange: eloResult.opponentRatingChange
    });
  }

  // Step 4: Calculate peak ratings and return
  const results = new Map<string, PlayerEloData>();
  for (const [username, currentRating] of playerElos) {
    const history = playerHistories.get(username)!;
    const peakRating = Math.max(
      1500, // Starting rating
      ...history.map(h => h.ratingAfter)
    );

    results.set(username, {
      username,
      currentRating,
      peakRating,
      history
    });
  }

  return results;
}
```

**Critical Implementation Notes:**

1. **Match Timestamps**: Construct timestamps from tournament date + round number to ensure proper ordering
2. **Bye Handling**: Skip matches where `ByeReason !== null` - byes don't affect ELO
3. **Rating Initialization**: Players start at 1500 the first time they appear in the timeline
4. **History Continuity**: Each player's history forms an unbroken chain from first to last match
5. **Cross-Tournament**: A player's rating carries over seamlessly between tournaments

**Helper Functions for Data Collection:**

```typescript
// src/utils/eloReplay.ts

import { Match } from '../types';

export interface EnrichedMatch extends Match {
  tournamentId: string;
  tournamentDate: string;
  roundNumber: number;
  timestamp: number;
}

export interface PlayerInMatch {
  username: string;
  displayName: string;
}

/**
 * Collect all matches from all tournaments and enrich with timestamp data
 */
export function collectAllMatches(tournamentIds: string[]): EnrichedMatch[] {
  const allMatches: EnrichedMatch[] = [];

  for (const tournamentId of tournamentIds) {
    const metadataPath = path.join(
      process.cwd(),
      'output',
      `tournament_${tournamentId}`,
      'metadata.json'
    );
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const tournamentDate = metadata.StartDate;

    for (const round of metadata.Rounds) {
      const matchesPath = path.join(
        process.cwd(),
        'output',
        `tournament_${tournamentId}`,
        `Round_${round.Number}_Matches.json`
      );
      const matches = JSON.parse(fs.readFileSync(matchesPath, 'utf-8'));

      for (const match of matches) {
        // Skip byes - they don't affect ELO
        if (match.ByeReason !== null || match.Competitors.length !== 2) {
          continue;
        }

        allMatches.push({
          ...match,
          tournamentId,
          tournamentDate,
          roundNumber: round.Number,
          // Timestamp: date + round offset ensures proper ordering
          timestamp: new Date(tournamentDate).getTime() + (round.Number * 1000)
        });
      }
    }
  }

  // Sort chronologically
  allMatches.sort((a, b) => a.timestamp - b.timestamp);

  return allMatches;
}

/**
 * Extract both players from a match
 */
export function extractPlayersFromMatch(match: Match): [PlayerInMatch, PlayerInMatch] {
  if (match.Competitors.length !== 2) {
    throw new Error(`Expected 2 competitors, got ${match.Competitors.length}`);
  }

  const player1 = {
    username: match.Competitors[0].Team.Players[0].Username,
    displayName: match.Competitors[0].Team.Players[0].DisplayName
  };

  const player2 = {
    username: match.Competitors[1].Team.Players[0].Username,
    displayName: match.Competitors[1].Team.Players[0].DisplayName
  };

  return [player1, player2];
}

/**
 * Determine match result from perspective of specified player
 * Returns 'win', 'loss', or 'draw'
 */
export function determineMatchResult(
  match: Match,
  playerUsername: string
): 'win' | 'loss' | 'draw' {
  const player1Username = match.Competitors[0].Team.Players[0].Username;
  const player1Wins = match.Competitors[0].GameWins || 0;
  const player2Wins = match.Competitors[1].GameWins || 0;
  const draws = match.GameDraws || 0;

  // Determine if player is competitor 0 or 1
  const isPlayer1 = player1Username === playerUsername;
  const playerWins = isPlayer1 ? player1Wins : player2Wins;
  const opponentWins = isPlayer1 ? player2Wins : player1Wins;

  // Match result logic
  if (playerWins > opponentWins) {
    return 'win';
  } else if (opponentWins > playerWins) {
    return 'loss';
  } else {
    // Equal game wins = match draw
    return 'draw';
  }
}
```

**Example Usage:**

```typescript
// In player-stats-generator.ts

import { calculateAllPlayerElos } from './utils/eloReplay';
import { loadLeaguesConfig } from './utils/leagueConfig';

// Get all tournament IDs from leagues.yml
const leagues = loadLeaguesConfig();
const allTournamentIds = leagues.flatMap(league => league.tournaments.map(String));

// Calculate ELO for all players
const playerEloData = calculateAllPlayerElos(allTournamentIds);

// Merge ELO data into player stats
for (const [username, eloData] of playerEloData) {
  const playerStats = getOrCreatePlayerStats(username);
  playerStats.eloRating = eloData.currentRating;
  playerStats.peakEloRating = eloData.peakRating;
  playerStats.eloHistory = eloData.history;
}
```

### 4. Data Persistence Strategy

**Where ELO Data Lives:**

ELO ratings and history are stored in the existing `output/players/player_stats_{username}.json` files, just like all other player statistics. This keeps everything centralized and follows the existing architecture.

**When ELO is Calculated:**

ELO ratings are calculated during the **player stats generation phase** (when running `npm run player-stats`), NOT at build time. This is the same approach used for all other statistics.

```bash
# Typical workflow when adding a new tournament:

# 1. Scrape new tournament data
npm run scrape -- 388334

# 2. Update leagues.yml with new tournament ID
# (manual edit)

# 3. Regenerate player stats (INCLUDING ELO)
npm run player-stats
# This replays ALL matches chronologically and updates ELO for all players

# 4. Build static site
npm run build
# Astro reads the JSON files (with ELO already calculated) and generates HTML
```

**Why This Approach:**

1. **Performance**: ELO calculation happens once during stats generation, not on every build
2. **Consistency**: Same pattern as existing stats (trophies, win %, head-to-head records)
3. **Debugging**: ELO data visible in JSON files for inspection/debugging
4. **Caching**: Astro build is fast because it just reads pre-calculated data

**Data Flow:**

```
┌─────────────────────┐
│ Raw Tournament Data │
│ output/tournament_* │
└──────────┬──────────┘
           │
           ├─ npm run player-stats
           ↓
┌─────────────────────┐
│ Player Stats + ELO  │  ← ELO calculated here
│ output/players/     │
│ player_stats_*.json │
└──────────┬──────────┘
           │
           ├─ npm run build (Astro)
           ↓
┌─────────────────────┐
│ Static HTML Pages   │  ← ELO just displayed
│ dist/               │
└─────────────────────┘
```

**Example: Updated Player Stats JSON**

```json
{
  "username": "swbmtg",
  "displayName": "Scott",
  "overallStats": {
    "matchWins": 15,
    "matchLosses": 3,
    "matchDraws": 0,
    "matchWinPercentage": 83.33
  },
  "eloRating": 1647,
  "peakEloRating": 1682,
  "eloHistory": [
    {
      "tournamentId": "380585",
      "tournamentDate": "2025-11-07",
      "roundNumber": 1,
      "opponent": "johndoe",
      "result": "W",
      "ratingBefore": 1500,
      "ratingAfter": 1516,
      "ratingChange": 16
    },
    {
      "tournamentId": "380585",
      "tournamentDate": "2025-11-07",
      "roundNumber": 2,
      "opponent": "janedoe",
      "result": "W",
      "ratingBefore": 1516,
      "ratingAfter": 1532,
      "ratingChange": 16
    }
    // ... more history entries
  ],
  "leagueStats": { ... },
  "headToHead": { ... }
}
```

**Important Notes:**

1. **Full Recalculation Every Time**: Every time you run `npm run player-stats`, ELO is recalculated from scratch by replaying ALL matches chronologically. We do NOT pick up where we left off.

2. **No Incremental Updates**: We don't try to "update" ELO for just the new tournament - we always recalculate the entire history. This is fine because calculation is fast (milliseconds for hundreds of matches).

3. **Why Not Incremental?**
   - **Simple**: No need to track "where we left off" or manage state
   - **Correct**: If we fix a bug in ELO calculation, full recalc fixes all data automatically
   - **Fast**: Processing hundreds of matches takes milliseconds
   - **Debuggable**: Easy to trace any issue by re-running the entire history
   - **Consistent**: Same approach as existing stats (trophies, win %, etc.)

4. **Git Ignored**: The `output/` directory is gitignored, so ELO data is regenerated on each deployment just like all other stats.

5. **Deterministic**: Because we replay matches in chronological order with fixed starting ratings (1500), the ELO calculation is 100% deterministic and reproducible.

**What About Performance at Scale?**

Current scale: ~10 tournaments × ~4 rounds × ~6 matches = ~240 matches
- Processing time: <100ms
- Not a bottleneck

Future scale (100 tournaments): ~2,400 matches
- Estimated processing time: ~500ms-1s
- Still negligible compared to other operations

**Only optimize if needed**: If you eventually have 10,000+ matches, you could implement incremental updates, but that's premature optimization for now.

**Comparison: Incremental vs Full Recalculation**

```
❌ INCREMENTAL (NOT IMPLEMENTED - adds complexity):
┌─────────────────────────────────────────────────┐
│ First run: npm run player-stats                 │
│ - Process tournaments 1-5                       │
│ - Save ELO ratings: player1=1547, player2=1523  │
│ - Save "last processed: tournament 5"           │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ Second run: npm run player-stats                │
│ - Read saved ELO ratings from file              │
│ - Read "last processed" marker                  │
│ - Process ONLY tournaments 6-7 (new)            │
│ - Update existing ELO ratings                   │
└─────────────────────────────────────────────────┘
Problems:
- Need to track "last processed" state
- Bug fixes don't retroactively fix old data
- Race conditions if state gets corrupted
- Harder to debug partial state

✅ FULL RECALCULATION (IMPLEMENTED - simple & correct):
┌─────────────────────────────────────────────────┐
│ Every run: npm run player-stats                 │
│ - Start ALL players at 1500                     │
│ - Replay ALL matches chronologically            │
│ - Generate complete ELO history from scratch    │
│ - Write fresh JSON files                        │
└─────────────────────────────────────────────────┘
Benefits:
- No state to track
- Always produces correct, complete data
- Bug fixes automatically apply to all history
- Easy to debug - just trace through the replay
- Fast enough for current scale
```

**Integration with Existing Code:**

```typescript
// src/player-stats-generator.ts (simplified)

async function generatePlayerStats() {
  // 1. Load all tournaments from leagues.yml
  const leagues = loadLeaguesConfig();
  const allTournamentIds = leagues.flatMap(league =>
    league.tournaments.map(String)
  );

  // 2. Calculate traditional stats (existing code)
  const playerStats = calculateTraditionalStats(allTournamentIds);

  // 3. Calculate ELO ratings (NEW)
  const playerEloData = calculateAllPlayerElos(allTournamentIds);

  // 4. Merge ELO data into player stats
  for (const [username, eloData] of playerEloData) {
    const stats = playerStats.get(username);
    if (stats) {
      stats.eloRating = eloData.currentRating;
      stats.peakEloRating = eloData.peakRating;
      stats.eloHistory = eloData.history;
    }
  }

  // 5. Write to JSON files (existing code)
  for (const [username, stats] of playerStats) {
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'players', `player_stats_${username}.json`),
      JSON.stringify(stats, null, 2)
    );
  }
}
```

### 5. Implementation Steps

#### Step 1: Create ELO Calculator
```bash
# Create utility
touch src/utils/elo.ts
touch tests/elo.test.ts

# Implement calculateElo() with tests
npm test -- elo.test.ts
```

#### Step 2: Extend Player Stats Generator
```typescript
// src/player-stats-generator.ts

// After loading all tournament data:
// 1. Build chronological match list with dates
// 2. Initialize all players at 1500 ELO
// 3. Process matches in order, updating ratings
// 4. Track history for each player
```

#### Step 3: Update Player Stats Schema
```typescript
// Add to output/players/player_stats_*.json:
{
  "username": "...",
  "eloRating": 1582,
  "peakEloRating": 1647,
  "eloHistory": [
    {
      "tournamentId": "380585",
      "tournamentDate": "2025-11-07",
      "roundNumber": 1,
      "opponent": "swbmtg",
      "result": "W",
      "ratingBefore": 1500,
      "ratingAfter": 1516,
      "ratingChange": 16
    }
  ]
}
```

#### Step 4: Display in UI

**Player Profile Page:**
```html
<div class="elo-section">
  <div class="elo-current">
    <div class="elo-value">{playerData.eloRating}</div>
    <div class="elo-label">Current ELO</div>
  </div>
  <div class="elo-peak">
    <div class="elo-value">{playerData.peakEloRating}</div>
    <div class="elo-label">Peak ELO</div>
  </div>
</div>

<!-- ELO history chart -->
<canvas id="elo-chart"></canvas>
```

**League Standings Page:**
```html
<th>Rank</th>
<th>Player</th>
<th>ELO</th>  <!-- New column -->
<th>Record</th>
<th>Points</th>
```

#### Step 5: ELO Leaderboard
Create new page: `/elo-rankings`
- Sort all players by current ELO
- Show top 25-50 players
- Include filters: by league, time period, minimum matches

### 5. Design Decisions

#### K-Factor (Rating Volatility)
- **32**: Standard chess value (recommended)
- **Higher (40-50)**: Faster rating changes, more volatile
- **Lower (16-24)**: Slower, more stable ratings

**Recommendation: 32** - proven in competitive systems

**Why 32?** This value balances responsiveness (ratings adjust meaningfully after each game) with stability (a few lucky/unlucky games don't drastically change rating).

#### Scale Factor (Default: 400)
- **400**: Standard value from chess rating history
- Controls the rating difference needed for a given win probability
- With 400: A 200-point advantage = ~76% win probability
- With 400: A 400-point advantage = ~91% win probability

**Why 400?** Makes rating differences human-intuitive. A player rated 2400 vs 1000 (1400 difference) represents a massive skill gap, whereas if scale factor was 1, the same gap would be 4.5 vs 1.0 (3.5 difference) which is less intuitive.

**Recommendation: Keep at 400** - standard across most ELO implementations. Only change if you have specific domain requirements.

#### Exponent Base (Default: 10)
- **10**: Standard value, almost never changed
- Used in expected score formula: `10^((ratingB - ratingA) / 400)`
- Equal ratings (diff = 0) always give 50% probability regardless of base

**Recommendation: Keep at 10** - no need to adjust. K-Factor and Scale Factor provide sufficient tuning.

#### Starting Rating
- **1500**: Standard starting point
- All new players start here
- Ratings diverge based on performance

**Why 1500?** Provides room for ratings to go both up and down without hitting zero.

#### Handling Byes
- **Do not affect ELO**: Byes are not skill-based
- Only head-to-head matches update ratings

#### Handling Draws
- **0.5 points**: Standard approach
- Both players' ratings move toward each other slightly

#### Zero-Sum Property (Important!)
ELO is a **zero-sum system**: rating points are conserved across the player population.

- When Player A gains +16 rating, Player B loses -16 rating
- Total rating points in the system remain constant
- No rating is created or destroyed, only transferred between players

**Why this matters:**
- Prevents rating inflation/deflation over time
- Ensures ratings are always relative to the player pool
- A rating of 1600 always means "better than 1500" regardless of when it was achieved

**Exception:** Rating-dependent K-factors break pure zero-sum property
- Player A might gain +20 while Player B loses -16 (different K-factors)
- Total rating can slightly increase/decrease over time
- Generally acceptable tradeoff for better rating stability at high levels

#### Decay/Activity
- **No decay initially**: Inactive players keep rating
- **Future consideration**: Decay toward mean after X months inactive

### 6. Testing Strategy

#### Unit Tests

```typescript
// tests/elo.test.ts
describe('ELO Calculator', () => {
  describe('Basic calculations', () => {
    it('should calculate rating change for evenly matched players', () => {
      const result = calculateElo(1500, 1500, 'win', 32);
      expect(result.ratingChange).toBe(16); // Expected 50%, actual 100%
      expect(result.expectedScore).toBeCloseTo(0.5);
    });

    it('should give more points for beating higher-rated player', () => {
      const result = calculateElo(1400, 1600, 'win', 32);
      expect(result.ratingChange).toBeGreaterThan(16);
      expect(result.expectedScore).toBeLessThan(0.5); // Underdog
    });

    it('should lose fewer points when losing to higher-rated player', () => {
      const result = calculateElo(1400, 1600, 'loss', 32);
      expect(Math.abs(result.ratingChange)).toBeLessThan(16);
    });

    it('should handle draws correctly', () => {
      const result = calculateElo(1500, 1500, 'draw', 32);
      expect(result.ratingChange).toBe(0); // Expected 50%, actual 50%
    });
  });

  describe('Conservation of ratings', () => {
    it('should be zero-sum (ratings gained = ratings lost)', () => {
      const result = calculateElo(1600, 1400, 'win', 32);
      // Player gains X, opponent loses X (in simple symmetric system)
      expect(result.ratingChange).toBe(-result.opponentRatingChange);
    });

    it('should conserve total rating points', () => {
      const player1Before = 1600;
      const player2Before = 1400;
      const totalBefore = player1Before + player2Before;

      const result = calculateElo(player1Before, player2Before, 'win', 32);
      const totalAfter = result.playerNewRating + result.opponentNewRating;

      expect(totalAfter).toBe(totalBefore);
    });
  });

  describe('Expected probabilities', () => {
    it('should give 50% probability for equal ratings', () => {
      const expected = getExpectedScore(1500, 1500);
      expect(expected).toBeCloseTo(0.5);
    });

    it('should give ~76% probability with 200 rating advantage', () => {
      const expected = getExpectedScore(1700, 1500);
      expect(expected).toBeCloseTo(0.76, 1);
    });

    it('should give ~91% probability with 400 rating advantage', () => {
      const expected = getExpectedScore(1900, 1500);
      expect(expected).toBeCloseTo(0.91, 1);
    });
  });
});
```

#### Integration Tests

Test the chronological replay system with real tournament data:

```typescript
// tests/elo-replay.test.ts
import { collectAllMatches, determineMatchResult, extractPlayersFromMatch } from '../src/utils/eloReplay';
import { calculateElo } from '../src/utils/elo';

describe('ELO Chronological Replay', () => {
  describe('Match Collection', () => {
    it('should collect matches from multiple tournaments', () => {
      const matches = collectAllMatches(['380585']);
      expect(matches.length).toBeGreaterThan(0);

      // Every match should have enriched data
      for (const match of matches) {
        expect(match.tournamentId).toBeDefined();
        expect(match.tournamentDate).toBeDefined();
        expect(match.roundNumber).toBeDefined();
        expect(match.timestamp).toBeDefined();
      }
    });

    it('should sort matches chronologically', () => {
      const matches = collectAllMatches(['380585', '382756']);

      // Verify chronological ordering
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i].timestamp).toBeGreaterThanOrEqual(matches[i - 1].timestamp);
      }
    });

    it('should skip bye matches', () => {
      const matches = collectAllMatches(['380585']);

      // No match should have ByeReason or single competitor
      for (const match of matches) {
        expect(match.ByeReason).toBeNull();
        expect(match.Competitors.length).toBe(2);
      }
    });

    it('should handle tournaments with different dates correctly', () => {
      const matches = collectAllMatches(['380585', '382756']);

      // Group by tournament
      const tournamentDates = new Map<string, Set<number>>();
      for (const match of matches) {
        if (!tournamentDates.has(match.tournamentId)) {
          tournamentDates.set(match.tournamentId, new Set());
        }
        tournamentDates.get(match.tournamentId)!.add(
          new Date(match.tournamentDate).getTime()
        );
      }

      // Each tournament should have exactly one date
      for (const [tournamentId, dates] of tournamentDates) {
        expect(dates.size).toBe(1);
      }
    });
  });

  describe('Match Result Determination', () => {
    it('should correctly identify wins', () => {
      const match = {
        Competitors: [
          {
            Team: { Players: [{ Username: 'player1', DisplayName: 'Player 1' }] },
            GameWins: 2
          },
          {
            Team: { Players: [{ Username: 'player2', DisplayName: 'Player 2' }] },
            GameWins: 0
          }
        ],
        GameDraws: 0
      } as any;

      expect(determineMatchResult(match, 'player1')).toBe('win');
      expect(determineMatchResult(match, 'player2')).toBe('loss');
    });

    it('should correctly identify draws', () => {
      const match = {
        Competitors: [
          {
            Team: { Players: [{ Username: 'player1', DisplayName: 'Player 1' }] },
            GameWins: 1
          },
          {
            Team: { Players: [{ Username: 'player2', DisplayName: 'Player 2' }] },
            GameWins: 1
          }
        ],
        GameDraws: 1
      } as any;

      expect(determineMatchResult(match, 'player1')).toBe('draw');
      expect(determineMatchResult(match, 'player2')).toBe('draw');
    });
  });

  describe('ELO History Continuity', () => {
    it('should build continuous ELO history for players', () => {
      const matches = collectAllMatches(['380585']);

      // Manually simulate the replay
      const playerRatings = new Map<string, number>();
      const playerHistories = new Map<string, any[]>();

      for (const match of matches) {
        const [player1, player2] = extractPlayersFromMatch(match);

        // Initialize if needed
        if (!playerRatings.has(player1.username)) {
          playerRatings.set(player1.username, 1500);
          playerHistories.set(player1.username, []);
        }
        if (!playerRatings.has(player2.username)) {
          playerRatings.set(player2.username, 1500);
          playerHistories.set(player2.username, []);
        }

        const p1Rating = playerRatings.get(player1.username)!;
        const p2Rating = playerRatings.get(player2.username)!;

        const result = determineMatchResult(match, player1.username);
        const eloResult = calculateElo(p1Rating, p2Rating, result);

        // Record history
        playerHistories.get(player1.username)!.push({
          ratingBefore: p1Rating,
          ratingAfter: eloResult.playerNewRating
        });
        playerHistories.get(player2.username)!.push({
          ratingBefore: p2Rating,
          ratingAfter: eloResult.opponentNewRating
        });

        // Update ratings
        playerRatings.set(player1.username, eloResult.playerNewRating);
        playerRatings.set(player2.username, eloResult.opponentNewRating);
      }

      // Verify continuity for each player
      for (const [username, history] of playerHistories) {
        // Each match's ratingBefore should equal previous match's ratingAfter
        for (let i = 1; i < history.length; i++) {
          expect(history[i].ratingBefore).toBe(history[i - 1].ratingAfter);
        }
      }
    });

    it('should handle cross-tournament rating persistence', () => {
      const matches = collectAllMatches(['380585', '382756']);

      // Build complete history
      const playerRatings = new Map<string, number>();
      const playerHistories = new Map<string, any[]>();

      for (const match of matches) {
        const [player1, player2] = extractPlayersFromMatch(match);

        if (!playerRatings.has(player1.username)) {
          playerRatings.set(player1.username, 1500);
          playerHistories.set(player1.username, []);
        }
        if (!playerRatings.has(player2.username)) {
          playerRatings.set(player2.username, 1500);
          playerHistories.set(player2.username, []);
        }

        const p1Rating = playerRatings.get(player1.username)!;
        const p2Rating = playerRatings.get(player2.username)!;

        const result = determineMatchResult(match, player1.username);
        const eloResult = calculateElo(p1Rating, p2Rating, result);

        playerHistories.get(player1.username)!.push({
          tournamentId: match.tournamentId,
          ratingBefore: p1Rating,
          ratingAfter: eloResult.playerNewRating
        });

        playerRatings.set(player1.username, eloResult.playerNewRating);
        playerRatings.set(player2.username, eloResult.opponentNewRating);
      }

      // Check that ratings persist across tournaments
      for (const [username, history] of playerHistories) {
        const tournaments = [...new Set(history.map(h => h.tournamentId))];

        if (tournaments.length > 1) {
          // Find last match of first tournament and first match of second tournament
          const t1Matches = history.filter(h => h.tournamentId === tournaments[0]);
          const t2Matches = history.filter(h => h.tournamentId === tournaments[1]);

          const lastT1Rating = t1Matches[t1Matches.length - 1].ratingAfter;
          const firstT2Rating = t2Matches[0].ratingBefore;

          // Rating should carry over exactly
          expect(firstT2Rating).toBe(lastT1Rating);
        }
      }
    });

    it('should preserve zero-sum property across all matches', () => {
      const matches = collectAllMatches(['380585']);

      let totalRatingPoints = 0;
      const playerRatings = new Map<string, number>();

      for (const match of matches) {
        const [player1, player2] = extractPlayersFromMatch(match);

        // Initialize at 1500
        if (!playerRatings.has(player1.username)) {
          playerRatings.set(player1.username, 1500);
          totalRatingPoints += 1500;
        }
        if (!playerRatings.has(player2.username)) {
          playerRatings.set(player2.username, 1500);
          totalRatingPoints += 1500;
        }

        const p1Rating = playerRatings.get(player1.username)!;
        const p2Rating = playerRatings.get(player2.username)!;

        const result = determineMatchResult(match, player1.username);
        const eloResult = calculateElo(p1Rating, p2Rating, result);

        playerRatings.set(player1.username, eloResult.playerNewRating);
        playerRatings.set(player2.username, eloResult.opponentNewRating);
      }

      // Calculate final total
      let finalTotal = 0;
      for (const rating of playerRatings.values()) {
        finalTotal += rating;
      }

      // Should be equal (zero-sum property)
      expect(finalTotal).toBe(totalRatingPoints);
    });
  });
});
```

### 7. Visualizations

#### ELO History Chart
- Line chart showing rating over time
- X-axis: Tournament dates
- Y-axis: ELO rating
- Hover: Show tournament, opponent, result

#### Distribution Chart
- Histogram of all player ratings
- Show where current player falls

#### Head-to-Head ELO Comparison
- When viewing H2H record, show ELO difference
- "You are +127 ELO vs this opponent"

### 8. Migration Path

**Phase 1: Backend (1-2 days)**
1. Implement ELO calculator with tests
2. Update player-stats-generator to calculate ELO
3. Regenerate all player stats files

**Phase 2: Display (1 day)**
1. Add ELO to player profile page
2. Add ELO column to league standings
3. Style badges for rating tiers (e.g., 1700+ = gold)

**Phase 3: Advanced Features (2-3 days)**
1. ELO leaderboard page
2. ELO history charts
3. Rating distribution visualizations

**Phase 4: Polish (1 day)**
1. Mobile responsive ELO displays
2. Tooltips explaining ELO
3. Documentation for users

**Total Estimate: 5-7 days**

### 9. Considerations

#### Pros
- Objective skill ranking independent of format
- Players can track improvement over time
- Exciting to see rating changes after matches
- Creates competitive metagame

#### Cons
- New players start at same rating (may take time to calibrate)
- Small player pool = more volatile ratings
- Need sufficient match history for accuracy
- Adds complexity to stats generation

#### Edge Cases
- **First tournament**: All players start at 1500, first tournament is highly volatile
- **Returning players**: Rating "frozen" while inactive, may be outdated
- **Very few matches**: Rating may not be representative
- **One-sided meta**: If one deck dominates, deck choice affects ELO more than skill

### 10. Future Enhancements

#### Rating-Dependent K-Factor

Instead of using a constant K-factor (32), adjust it based on player rating for more stability at higher levels:

```typescript
/**
 * Get K-factor based on player rating (chess standard)
 * - Below 2100: K = 32 (volatile, learning phase)
 * - 2100-2400: K = 24 (moderate stability)
 * - Above 2400: K = 16 (high stability, experienced players)
 */
export function getKFactor(rating: number): number {
  if (rating < 2100) return 32;
  if (rating < 2400) return 24;
  return 16;
}

// Usage in ELO calculation:
const playerKFactor = getKFactor(playerRating);
const opponentKFactor = getKFactor(opponentRating);
```

**Benefits:**
- New players' ratings adjust quickly
- Experienced players' ratings are more stable
- Prevents rating volatility at high levels

**Implementation Note:** This would require calculating each player's rating change independently rather than using the symmetric approach (where opponent loses exactly what player gains).

#### Advanced: Rating System Factory Pattern

For maximum flexibility, implement a "rating system" factory that encapsulates all parameters:

```typescript
export interface RatingSystem {
  calculateNextRatings(
    playerARating: number,
    playerBRating: number,
    score: number // 0 = A loses, 0.5 = draw, 1 = A wins
  ): EloResult;
}

export function createRatingSystem(
  kFactor: number | ((rating: number) => number) = 32,
  scaleFactor: number = 400,
  exponentBase: number = 10
): RatingSystem {
  // Returns a configured rating system
  // Allows for currying and deferred execution
  // See: https://github.com/sc2iq/sc2iq/tree/master/packages/ratingSystem
}
```

**When to use this:**
- Multiple leagues with different K-factors
- Experimenting with rating parameters
- A/B testing different configurations

**Recommendation:** Start with simple `calculateElo()` function. Only add this complexity if needed.

#### Other Future Enhancements

- **Separate ELO per format** (if you run multiple formats)
- **Provisional ratings** (special calculation for first 10 matches)
- **Rating floors** (can't drop below certain threshold)
- **Seasonal resets** (optional: reset to 1500 each league/season)
- **ELO-based seeding** (use ELO for tournament pairings)

## Files to Create/Modify

### New Files
```
src/utils/elo.ts           # ELO calculation logic
tests/elo.test.ts          # ELO calculator tests
src/pages/elo-rankings.astro  # ELO leaderboard page (optional)
```

### Modified Files
```
src/player-stats-generator.ts  # Add ELO calculation
src/utils/playerData.ts         # Add ELO to PlayerStats interface
src/types.ts                    # Add ELO types
src/pages/player/[username].astro  # Display ELO on profile
src/components/Leaderboard.astro   # Add ELO column (optional)
```

## Summary

Adding ELO is **very feasible** with your existing architecture:
- ✅ You already process matches chronologically
- ✅ You have player stats infrastructure
- ✅ You track head-to-head records
- ✅ You have tournament dates for temporal ordering

**Estimated effort: 5-7 days** for full implementation with visualizations.

The hardest part is ensuring chronological ordering across tournaments, which you already have via tournament dates. The rest is straightforward calculation and display!
