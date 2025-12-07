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
export interface EloResult {
  playerRating: number;
  opponentRating: number;
  playerNewRating: number;
  opponentNewRating: number;
  ratingChange: number;
  expectedScore: number; // Probability player should win (0.0-1.0)
}

/**
 * Calculate ELO rating change for a match result
 *
 * @param playerRating - Current rating of the player
 * @param opponentRating - Current rating of the opponent
 * @param result - Match outcome: 'win', 'loss', or 'draw'
 * @param kFactor - Rating volatility (default 32, standard chess value)
 * @returns EloResult with new ratings and change
 */
export function calculateElo(
  playerRating: number,
  opponentRating: number,
  result: 'win' | 'loss' | 'draw',
  kFactor: number = 32
): EloResult {
  // Expected score (probability of winning)
  // Formula: EA = 1 / (1 + 10^((RB - RA) / 400))
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));

  // Actual score
  const actualScore = result === 'win' ? 1 : result === 'loss' ? 0 : 0.5;

  // Rating change: K × (Actual - Expected)
  const ratingChange = Math.round(kFactor * (actualScore - expectedScore));

  return {
    playerRating,
    opponentRating,
    playerNewRating: playerRating + ratingChange,
    opponentNewRating: opponentRating - ratingChange,
    ratingChange,
    expectedScore,
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

### 3. Calculation Approach

**Option A: Tournament-by-Tournament (Recommended)**
- Process tournaments in chronological order
- Update ratings after each match within a tournament
- Maintains temporal accuracy
- Ratings evolve as players compete

**Option B: Full Recalculation**
- Start all players at base rating (1500)
- Process all matches chronologically across all tournaments
- Generate complete history
- Run whenever data changes

**Recommendation: Option B**
- More accurate: reflects actual competitive timeline
- Easier to debug: reproducible from scratch
- Simpler: no need to store/update partial state

### 4. Implementation Steps

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

#### Starting Rating
- **1500**: Standard starting point
- All new players start here
- Ratings diverge based on performance

#### Handling Byes
- **Do not affect ELO**: Byes are not skill-based
- Only head-to-head matches update ratings

#### Handling Draws
- **0.5 points**: Standard approach
- Both players' ratings move toward each other slightly

#### Decay/Activity
- **No decay initially**: Inactive players keep rating
- **Future consideration**: Decay toward mean after X months inactive

### 6. Testing Strategy

```typescript
// tests/elo.test.ts
describe('ELO Calculator', () => {
  it('should calculate rating change for evenly matched players', () => {
    const result = calculateElo(1500, 1500, 'win', 32);
    expect(result.ratingChange).toBe(16); // Expected 50%, actual 100%
  });

  it('should give more points for beating higher-rated player', () => {
    const result = calculateElo(1400, 1600, 'win', 32);
    expect(result.ratingChange).toBeGreaterThan(16);
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
