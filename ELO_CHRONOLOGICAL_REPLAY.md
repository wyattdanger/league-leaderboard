# ELO Chronological Replay Strategy

## The Challenge

To calculate accurate ELO ratings, we need to:
1. Process **all matches** from **all tournaments** in **chronological order**
2. Track each player's rating after each match
3. Build a complete rating history

## Current Data Structure

```
output/
  tournament_380585/
    Round_1_Matches.json
    Round_2_Matches.json
    Round_3_Matches.json
  tournament_382756/
    Round_1_Matches.json
    Round_2_Matches.json
    Round_3_Matches.json
```

Matches within a tournament are ordered (Round 1, 2, 3), but **tournaments aren't ordered** in the filesystem.

## Solution: Build Chronological Match Timeline

### Step 1: Collect All Matches With Timestamps

```typescript
interface MatchWithContext {
  match: MeleeMatch;
  tournamentId: string;
  tournamentDate: Date;
  roundNumber: number;
  matchDate: Date; // Actual match timestamp from match.DateCreated
}

function collectAllMatches(tournamentIds: string[]): MatchWithContext[] {
  const allMatches: MatchWithContext[] = [];

  for (const tournamentId of tournamentIds) {
    // Get tournament metadata for date
    const metadata = getTournamentMetadata(tournamentId);
    if (!metadata) continue;

    const tournamentDate = new Date(metadata.date);

    // Load all rounds for this tournament
    const tournamentDir = path.join(process.cwd(), 'output', `tournament_${tournamentId}`);
    const roundFiles = fs.readdirSync(tournamentDir)
      .filter(f => /^Round_\d+_Matches\.json$/.test(f))
      .sort(); // Round_1, Round_2, Round_3

    for (const roundFile of roundFiles) {
      const roundNumber = parseInt(roundFile.match(/Round_(\d+)/)?.[1] || '0');
      const matches: MeleeMatch[] = JSON.parse(
        fs.readFileSync(path.join(tournamentDir, roundFile), 'utf-8')
      );

      for (const match of matches) {
        // Use match.DateCreated if available, otherwise use tournament date + round offset
        const matchDate = match.DateCreated
          ? new Date(match.DateCreated)
          : new Date(tournamentDate.getTime() + (roundNumber * 60 * 60 * 1000)); // +1hr per round

        allMatches.push({
          match,
          tournamentId,
          tournamentDate,
          roundNumber,
          matchDate,
        });
      }
    }
  }

  // Sort by match date, then tournament date, then round number
  allMatches.sort((a, b) => {
    if (a.matchDate.getTime() !== b.matchDate.getTime()) {
      return a.matchDate.getTime() - b.matchDate.getTime();
    }
    if (a.tournamentDate.getTime() !== b.tournamentDate.getTime()) {
      return a.tournamentDate.getTime() - b.tournamentDate.getTime();
    }
    return a.roundNumber - b.roundNumber;
  });

  return allMatches;
}
```

### Step 2: Replay Matches and Calculate ELO

```typescript
interface PlayerEloState {
  currentRating: number;
  peakRating: number;
  history: EloHistoryEntry[];
}

interface EloHistoryEntry {
  tournamentId: string;
  tournamentDate: string;
  roundNumber: number;
  opponent: string;
  result: 'W' | 'L' | 'D';
  ratingBefore: number;
  ratingAfter: number;
  ratingChange: number;
}

function calculateAllPlayerElos(matches: MatchWithContext[]): Map<string, PlayerEloState> {
  const STARTING_ELO = 1500;
  const K_FACTOR = 32;

  // Initialize all players at starting ELO
  const playerElos = new Map<string, PlayerEloState>();

  function getOrInitPlayer(username: string): PlayerEloState {
    if (!playerElos.has(username)) {
      playerElos.set(username, {
        currentRating: STARTING_ELO,
        peakRating: STARTING_ELO,
        history: [],
      });
    }
    return playerElos.get(username)!;
  }

  // Replay all matches chronologically
  for (const { match, tournamentId, tournamentDate, roundNumber } of matches) {
    // Skip byes (no opponent to compare against)
    if (match.ByeReason !== null || match.Competitors.length !== 2) {
      continue;
    }

    const comp1 = match.Competitors[0];
    const comp2 = match.Competitors[1];
    const player1 = Player.fromCompetitor(comp1);
    const player2 = Player.fromCompetitor(comp2);

    if (!player1 || !player2) continue;

    const username1 = player1.username;
    const username2 = player2.username;

    // Get current ratings
    const state1 = getOrInitPlayer(username1);
    const state2 = getOrInitPlayer(username2);

    const rating1Before = state1.currentRating;
    const rating2Before = state2.currentRating;

    // Determine result
    const games1 = comp1.GameWins ?? 0;
    const games2 = comp2.GameWins ?? 0;

    let result1: 'W' | 'L' | 'D';
    let result2: 'W' | 'L' | 'D';

    if (games1 > games2) {
      result1 = 'W';
      result2 = 'L';
    } else if (games2 > games1) {
      result1 = 'L';
      result2 = 'W';
    } else {
      result1 = 'D';
      result2 = 'D';
    }

    // Calculate ELO changes
    const eloResult1 = calculateElo(rating1Before, rating2Before, result1, K_FACTOR);
    const eloResult2 = calculateElo(rating2Before, rating1Before, result2, K_FACTOR);

    // Update ratings
    state1.currentRating = eloResult1.playerNewRating;
    state2.currentRating = eloResult2.playerNewRating;

    // Update peak ratings
    state1.peakRating = Math.max(state1.peakRating, state1.currentRating);
    state2.peakRating = Math.max(state2.peakRating, state2.currentRating);

    // Record history
    state1.history.push({
      tournamentId,
      tournamentDate: tournamentDate.toISOString(),
      roundNumber,
      opponent: username2,
      result: result1,
      ratingBefore: rating1Before,
      ratingAfter: eloResult1.playerNewRating,
      ratingChange: eloResult1.ratingChange,
    });

    state2.history.push({
      tournamentId,
      tournamentDate: tournamentDate.toISOString(),
      roundNumber,
      opponent: username1,
      result: result2,
      ratingBefore: rating2Before,
      ratingAfter: eloResult2.playerNewRating,
      ratingChange: eloResult2.ratingChange,
    });
  }

  return playerElos;
}
```

### Step 3: Integration with player-stats-generator

```typescript
// In generatePlayerStats()

async function generatePlayerStats(): Promise<void> {
  // ... existing code to collect tournaments ...

  // NEW: Collect all matches chronologically
  const allMatches = collectAllMatches(Array.from(allTournamentIds));

  // NEW: Calculate ELO for all players
  const playerElos = calculateAllPlayerElos(allMatches);

  // ... rest of existing code ...

  // When writing player stats files:
  for (const [username, playerData] of playerMatches.entries()) {
    const eloState = playerElos.get(username);

    const playerStats: PlayerDetailData = {
      username,
      displayName: playerData.displayName,
      // ... existing stats ...
      eloRating: eloState?.currentRating ?? 1500,
      peakEloRating: eloState?.peakRating ?? 1500,
      eloHistory: eloState?.history ?? [],
    };

    // Write to file
    const outputPath = path.join(playersDir, `player_stats_${username}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(playerStats, null, 2));
  }
}
```

## Key Insights

### Why Chronological Order Matters

**Scenario: Player A vs Player B**

**Wrong (per-tournament calculation):**
```
Tournament 1:
- A (1500) beats B (1500) → A gains 16, B loses 16
- A: 1516, B: 1484

Tournament 2:
- A (1500) beats B (1500) → A gains 16, B loses 16  ❌ WRONG!
- Should use updated ratings from Tournament 1!
```

**Right (chronological replay):**
```
Tournament 1, Round 1:
- A (1500) beats B (1500) → A: 1516, B: 1484

Tournament 1, Round 2:
- A (1516) loses to C (1500) → A: 1507, C: 1509

Tournament 2, Round 1:
- A (1507) beats B (1484) → A: 1520, B: 1471 ✅ CORRECT!
```

### Handling Match Timestamps

Most matches have `DateCreated` timestamps:
```json
{
  "DateCreated": "2025-11-07T00:57:17Z",
  "RoundNumber": 1
}
```

**If timestamp is missing:**
- Fall back to tournament date + round offset
- Assume rounds are 1 hour apart
- Still maintains correct ordering within tournament

### Performance Considerations

**Match Volume:**
- ~30 tournaments
- ~3 rounds per tournament
- ~5 matches per round
- **Total: ~450 matches**

**Processing Time:**
- Collect matches: ~10ms
- Sort chronologically: ~1ms
- Calculate ELO for all matches: ~50ms
- **Total: ~60ms** ⚡ (very fast!)

### Data Quality

**What we have:**
- ✅ Tournament dates (from metadata)
- ✅ Round numbers (from filenames)
- ✅ Match timestamps (from match.DateCreated)
- ✅ Match results (game wins/losses)

**What we need:**
- ✅ All of the above! We're good to go.

## Example Output

After running this, each player's stats file would include:

```json
{
  "username": "swbmtg",
  "displayName": "Scott",
  "eloRating": 1647,
  "peakEloRating": 1692,
  "eloHistory": [
    {
      "tournamentId": "380585",
      "tournamentDate": "2025-11-07T00:00:00Z",
      "roundNumber": 1,
      "opponent": "madmanpoet",
      "result": "L",
      "ratingBefore": 1500,
      "ratingAfter": 1484,
      "ratingChange": -16
    },
    {
      "tournamentId": "380585",
      "tournamentDate": "2025-11-07T00:00:00Z",
      "roundNumber": 2,
      "opponent": "zjr",
      "result": "W",
      "ratingBefore": 1484,
      "ratingAfter": 1500,
      "ratingChange": 16
    },
    // ... more matches ...
  ]
}
```

## Implementation Checklist

- [ ] Create `collectAllMatches()` function
- [ ] Create `calculateAllPlayerElos()` function
- [ ] Integrate with `generatePlayerStats()`
- [ ] Update `PlayerDetailData` type to include ELO fields
- [ ] Add tests for chronological ordering
- [ ] Add tests for ELO calculation
- [ ] Verify correct ordering with console logs
- [ ] Regenerate all player stats

## Testing Strategy

```typescript
// Test chronological ordering
it('should order matches chronologically', () => {
  const matches = collectAllMatches(['380585', '382756']);

  // Verify dates are in ascending order
  for (let i = 1; i < matches.length; i++) {
    expect(matches[i].matchDate.getTime())
      .toBeGreaterThanOrEqual(matches[i-1].matchDate.getTime());
  }
});

// Test ELO history accumulation
it('should build complete ELO history', () => {
  const matches = collectAllMatches(['380585']);
  const playerElos = calculateAllPlayerElos(matches);
  const player = playerElos.get('swbmtg');

  expect(player?.history.length).toBeGreaterThan(0);

  // Each entry should reference previous rating
  for (let i = 1; i < player!.history.length; i++) {
    expect(player!.history[i].ratingBefore)
      .toBe(player!.history[i-1].ratingAfter);
  }
});
```

## Summary

**Yes, you need chronological replay** - and here's why it's straightforward:

1. ✅ You already have tournament dates (via `getTournamentMetadata()`)
2. ✅ Matches have timestamps (`DateCreated`)
3. ✅ Round numbers give within-tournament ordering
4. ✅ Small dataset (~450 matches total) = fast processing

**The key steps:**
1. Collect all matches with their timestamps
2. Sort by (match date → tournament date → round number)
3. Replay in order, updating ELO after each match
4. Store complete history for each player

**Estimated time to implement:** 4-6 hours
- 1-2 hours: Chronological collection
- 1-2 hours: ELO replay logic
- 1-2 hours: Integration & testing
