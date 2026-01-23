# CLAUDE.md - AI Agent Context Guide

This document provides essential context for AI agents working on this codebase. It covers architecture, data flows, key patterns, and important gotchas.

## Project Overview

This is a **Premodern Magic: The Gathering league statistics website** that scrapes tournament data from Melee.gg, calculates standings and player statistics, and generates a static site using Astro.

**Technology Stack:**

- **Frontend**: Astro (SSG)
- **Language**: TypeScript
- **Styling**: CSS (inline in .astro components)
- **Testing**: Jest
- **Data Storage**: JSON files + YAML configs

## Architecture Overview

```
┌─────────────────┐
│   Melee.gg API  │ (External tournament platform)
└────────┬────────┘
         │
         ├─ Scraping Layer (src/index.ts)
         ↓
┌─────────────────┐
│  output/        │ Raw tournament data (JSON)
│  tournament_*/  │ - Matches per round
│                 │ - Standings per round
└────────┬────────┘
         │
         ├─ Calculation Layer
         ↓
┌─────────────────┐
│  Calculators    │ Process raw data
│  - standings    │ - Swiss pairings (Melee standard)
│  - league       │ - Tiebreakers (OMW%, OGW%)
│  - player-stats │ - Cross-tournament aggregation
└────────┬────────┘
         │
         ├─ Aggregation Layer
         ↓
┌─────────────────┐
│  output/        │ Processed data
│  - league/      │ - League standings
│  - players/     │ - Player profiles
└────────┬────────┘
         │
         ├─ Build Layer (Astro)
         ↓
┌─────────────────┐
│  dist/          │ Static website
│  - Pages        │ - Event details
│  - Components   │ - Player profiles
│                 │ - League standings
└─────────────────┘
```

## Key Data Structures

### 1. Player Identity (CRITICAL!)

**Username is the PRIMARY KEY across tournaments**

- `Username`: Stable identifier (e.g., "swbmtg")
- `DisplayName`: Human-readable name (e.g., "Scott")
- `TeamId`: **CHANGES PER TOURNAMENT** - DO NOT use for cross-tournament tracking!

**Always use `Username` when:**

- Aggregating stats across tournaments
- Linking to player profiles
- Calculating head-to-head records

### 2. Match Data Structure

Located in: `output/tournament_{id}/Round_{N}_Matches.json`

```typescript
interface Match {
  Competitors: [
    {
      TeamId: number; // Changes per tournament!
      Team: {
        Players: [
          {
            Username: string; // PRIMARY KEY
            DisplayName: string;
          },
        ];
      };
      GameWins: number; // Games won in this match
      GameByes: number; // For byes
    },
  ];
  GameDraws: number; // Total game draws in match
  ByeReason: number | null; // null = regular match
  RoundNumber: number;
  TournamentId: number;
}
```

### 3. Win Percentage Calculations (IMPORTANT!)

**Draws count as 0.5 wins**, not losses!

```typescript
// Match Win Percentage
MWP = (Wins + 0.5 × Draws) / (Wins + Losses + Draws)

// Game Win Percentage
GWP = (Game Wins + 0.5 × Game Draws) / (Game Wins + Game Losses + Game Draws)
```

**Always use utility functions:**

```typescript
import { calculateMatchWinPercentage, calculateGameWinPercentage } from './utils/winPercentage';

// Both functions accept either individual values or objects:
const mwp1 = calculateMatchWinPercentage(wins, losses, draws);
const mwp2 = calculateMatchWinPercentage(standing); // standing has MatchWins, MatchLosses, MatchDraws
```

### 4. Tiebreakers (Swiss System)

Sorting priority for standings:

1. **Points** (3 for win, 1 for draw, 0 for loss)
2. **OMW%** (Opponent Match Win %, 33% floor per opponent)
3. **GW%** (Game Win %)
4. **OGW%** (Opponent Game Win %, 33% floor per opponent)

See `src/standings-calculator.ts` for implementation details.

## Data Flow Patterns

### Pattern 1: Scraping Tournament Data

```bash
npm run scrape -- <tournament_id>
```

**What it does:**

1. Fetches tournament data from Melee.gg API
2. Saves raw JSON to `output/tournament_{id}/`
3. Files created:
   - `Round_{N}_Matches.json` (one per round)
   - `Round_{N}_Standings.json` (one per round)
   - `metadata.json` (tournament info)

**Important:** Melee.gg rate limits apply. Wait between requests.

### Pattern 2: Calculating League Standings

```bash
npm run league <tournament_id_1> <tournament_id_2> ...
```

**What it does:**

1. Loads matches from multiple tournaments
2. Aggregates by username (NOT TeamId!)
3. Calculates league-wide standings
4. Saves to `output/league/league_standings_{league_name}_{timestamp}.json`

**Key files:**

- `src/league-calculator.ts` - Aggregation logic
- `src/sync-league.ts` - Sync based on `leagues.yml` config

### Pattern 3: Generating Player Stats

```bash
npm run player-stats
```

**What it does:**

1. Loads `leagues.yml` to get all tournament IDs
2. For each player (by username):
   - Aggregates overall stats across all tournaments
   - Calculates per-league stats
   - Generates head-to-head records vs all opponents
   - Lists tournament performances
3. Saves to `output/players/player_stats_{username}.json`

**Key files:**

- `src/player-stats-generator.ts` - Main generator
- `src/utils/playerData.ts` - Helper functions for stats calculation
- `src/utils/winPercentage.ts` - Win % calculations

### Pattern 4: Generating Page Metadata

```bash
npm run generate-metadata -- <tournament_id>  # Single tournament
npm run generate-all-metadata                  # All tournaments
```

**What it does:**

1. Loads tournament data and final standings
2. Reads deck data from `decks.yml`
3. Generates Open Graph metadata for social media previews:
   - Title: "NYC Premodern - {Date} Meetup"
   - Description: "{x} players gathered. {player} went {record} on {deck}"
4. Saves to `output/tournament_{id}/page_metadata.json`

**Key files:**

- `src/generate-page-metadata.ts` - Single tournament metadata
- `src/generate-all-metadata.ts` - Batch processing for all tournaments

**Important:** This must be run BEFORE building the site. The event pages read this pre-generated metadata, they don't generate it during the build.

### Pattern 5: Building the Website

```bash
npm run build
```

**What it does:**

1. Astro reads JSON files from `output/` (including page_metadata.json)
2. Generates static HTML pages for:
   - Event detail pages (`/event/{id}`) with Open Graph tags
   - Player profile pages (`/player/{username}`)
   - League standings pages (`/league/{slug}`)
3. Outputs to `dist/`

**Important:** The site is FULLY STATIC. No server-side rendering or APIs.

## Configuration Files

### leagues.yml

Defines league structure and which tournaments belong to each league:

```yaml
leagues:
  - name: Q4 2025
    tournaments:
      - 388334
      - 384681

  - name: Q3 2025
    tournaments:
      - 382756
      - 380585
```

**When to update:**

- When starting a new league/season
- When adding tournaments to existing leagues
- When reorganizing league structure

### Deck Data (Optional)

Per-tournament deck lists in `output/tournament_{id}/Decks.yml`:

```yaml
# Tournament 388334 - December 4, 2024

username1: The Rock
username2: Domain
username3: Frantic Storm
```

**When deck data exists:**

- Metagame pie chart shows on event pages
- Deck columns appear in standings/pairings tables

## Important Patterns & Gotchas

### 1. Import Paths (TypeScript/Jest Issue)

**Do NOT use `.js` extensions in imports from TypeScript files:**

```typescript
// ❌ BAD - breaks Jest tests
import { foo } from './utils/bar.js';

// ✅ GOOD - works with both Jest and runtime
import { foo } from './utils/bar';
```

**Why:** Jest doesn't understand `.js` extensions when importing `.ts` files.

### 2. Player Stats Must Be Regenerated

**When to regenerate player stats:**

- After adding new tournament data
- After fixing calculation bugs
- After changing leagues.yml

**How to regenerate:**

```bash
npm run player-stats  # Regenerates all player JSON files
npm run build         # Rebuilds the website
```

### 3. Astro Static Path Generation

**All dynamic routes use `getStaticPaths()`:**

```typescript
// Example: src/pages/player/[username].astro
export async function getStaticPaths() {
  const playersDir = path.join(process.cwd(), 'output', 'players');
  const files = fs.readdirSync(playersDir);

  return files.map((file) => {
    const playerData = JSON.parse(fs.readFileSync(...));
    return {
      params: { username: usernameToSlug(playerData.username) },
      props: { playerData }
    };
  });
}
```

**Why this matters:**

- Pages are generated at BUILD TIME
- No dynamic data loading at runtime
- Must rebuild to see data changes

### 4. Byes Are Matches Too

**Byes are represented as single-competitor matches:**

```typescript
if (match.ByeReason !== null && match.Competitors.length === 1) {
  // This is a bye - player gets automatic match win
  // GameByes field contains number of game wins to credit
}
```

### 5. Match vs Game Distinction

- **Match**: Best-of-3 games (typical Premodern format)
- **Game**: Individual game within a match
- A match can end 2-0, 2-1, or 1-1-1 (with a draw)

**Standings track both:**

- Match record: 5-1-0 (5 matches won, 1 lost, 0 drawn)
- Game record: 10-4-1 (10 games won, 4 lost, 1 drawn)

### 6. Trophies vs Belts

**Trophies**: 3-0 finishes in regular league events
**Belts**: 3-0 finishes in Top 8 tournaments

Calculated in `src/player-stats-generator.ts`:

```typescript
if (standing.MatchWins === 3 && standing.MatchLosses === 0 && standing.MatchDraws === 0) {
  if (top8Tournaments.has(tournamentId)) {
    playerBelts++; // Top 8 3-0 = Belt
  } else {
    playerTrophies++; // Regular 3-0 = Trophy
  }
}
```

## Common Tasks

### Adding a New Tournament

**IMPORTANT: Correct Order of Operations**

When adding a new tournament, follow this EXACT sequence to ensure deck data is included in all generated files:

**Phase 1: Scraping and Preparation (BEFORE filling deck data)**

1. Scrape tournament data:
   ```bash
   npm run scrape -- <tournament_id>
   ```

2. Add tournament to `leagues.yml` under appropriate league

3. Generate deck template (prefills player usernames):
   ```bash
   npm run generate-deck-template
   ```

4. **PAUSE HERE** - Fill in deck data in `decks.yml` for the new tournament
   - All player usernames will be prefilled with `_` placeholders
   - Replace `_` with actual deck names
   - DO NOT proceed until ALL deck data is filled in

**Phase 2: Generation (AFTER deck data is complete)**

5. Sync league standings:
   ```bash
   npm run sync-league                      # Sync current league
   npm run sync-league -- --league "Q4 2025"  # Sync specific league
   ```

6. Regenerate player stats (this reads deck data from decks.yml):
   ```bash
   npm run player-stats
   ```

7. Generate page metadata for Open Graph previews:
   ```bash
   npm run generate-metadata -- <tournament_id>
   ```

8. Build the site:
   ```bash
   npm run build
   ```

9. **IMPORTANT: Restart the dev server if it's running:**
   ```bash
   # Kill the old dev server (if running)
   lsof -ti:4321 | xargs kill -9 2>/dev/null

   # Start fresh dev server with new data
   npm run dev
   ```

   **Why:** Astro's dev server caches static paths (from `getStaticPaths()`) at startup. After regenerating data files, the dev server will show stale/missing pages until restarted. This includes:
   - New player profiles
   - New event pages
   - Updated league standings
   - Any changes to JSON data files

**Why this order matters:**
- Player stats generation reads deck data from `decks.yml` at runtime
- If you generate player stats BEFORE filling in decks, player profiles will show `_` instead of deck names
- You'll have to regenerate player stats again after filling in decks
- Page metadata also uses deck data for event descriptions

**Quick Method (Automated):**

```bash
# Complete workflow - scrapes, generates templates, and rebuilds everything
npm run process-tournament -- <tournament_id>

# This will:
# 1. Scrape tournament data from Melee.gg
# 2. Generate deck template in decks.yml (if needed)
# 3. Pause for you to fill in deck data (if template was generated)
# 4. Sync league standings
# 5. Regenerate player stats
# 6. Generate page metadata for Open Graph previews
# 7. Build the site
```

7. Rebuild site:

   ```bash
   npm run build
   ```

**Important Notes:**

- Page metadata for Open Graph tags is generated BEFORE the build, not during it
- Metadata files are stored in `output/tournament_{id}/page_metadata.json`
- Always regenerate metadata after updating deck data to get updated descriptions

### Managing Deck Data

**Deck Data Structure:**

- Centralized in `decks.yml` at project root
- Maps tournament IDs → usernames → deck names
- Uses `_` (underscore) to indicate unfilled/unknown data
- Only shows deck columns/metagame when ALL players have deck data

**Adding Deck Data:**

1. **Manual editing** - Edit `decks.yml` directly:

   ```yaml
   '388334':
     username1: The Rock
     username2: Domain
     username3: _ # Not yet filled in
   ```

2. **Via CSV for crowdsourcing:**

   ```bash
   # Export to CSV
   npm run decks-to-csv

   # Upload decks.csv to Google Sheets
   # Share with contributors to fill in deck names
   # Download completed sheet as CSV

   # Import back to YAML
   npm run csv-to-decks
   ```

3. **Regenerate template** (preserves existing data):
   ```bash
   npm run generate-deck-template
   ```

**Deck Data Validation:**

- Event pages use `hasCompleteDeckData()` to check if all players have deck info
- Deck columns and metagame breakdown only display when data is complete
- Prevents showing partial/misleading deck information

### Fixing a Calculation Bug

1. Fix the calculation in source (likely in `src/utils/` or calculators)

2. Write/update tests in `tests/`

3. Run tests to verify:

   ```bash
   npm test
   ```

4. Regenerate all affected data:

   ```bash
   npm run player-stats                     # If player stats affected
   npm run sync-league                      # If current league standings affected
   npm run sync-league -- --league "Q3 2025"  # If specific league affected
   ```

5. Rebuild site:
   ```bash
   npm run build
   ```

### Adding a New Page Type

1. Create `.astro` file in `src/pages/`

2. If dynamic route, implement `getStaticPaths()`

3. Create any needed components in `src/components/`

4. Update navigation components if needed

5. Test with:
   ```bash
   npm run dev
   ```

## Testing Strategy

**Unit Tests** (`tests/*.test.ts`)

- Win percentage calculations
- Player data aggregation
- Head-to-head record calculation
- Standings calculation

**Run tests:**

```bash
npm test
```

**Coverage:**

- Core calculation logic is well-tested
- UI components are NOT tested (manual QA only)

## File Organization

```
scraping-project/
├── src/
│   ├── pages/           # Astro pages (routes)
│   │   ├── index.astro           # Homepage
│   │   ├── league.astro          # League standings
│   │   ├── league/[slug].astro   # Dynamic league pages
│   │   ├── player/[username].astro
│   │   └── event/[tournamentId].astro
│   │
│   ├── components/      # Reusable UI components
│   │   ├── Leaderboard.astro
│   │   ├── HeadToHead.astro
│   │   ├── PlayerLeagueStats.astro
│   │   └── MetagameBreakdown.astro
│   │
│   ├── utils/          # Pure utility functions
│   │   ├── winPercentage.ts   # Win % calculations
│   │   ├── playerData.ts      # Player stats helpers
│   │   ├── tournamentData.ts  # Tournament metadata
│   │   └── helpers.ts         # Misc helpers (slugs, etc)
│   │
│   ├── types.ts        # Shared TypeScript interfaces
│   │
│   ├── index.ts        # Scraper (fetch from Melee.gg)
│   ├── standings-calculator.ts   # Tournament standings
│   ├── league-calculator.ts      # League standings
│   ├── player-stats-generator.ts # Player profiles
│   └── sync-league.ts            # Sync league from config
│
├── output/             # Generated data (gitignored)
│   ├── tournament_*/   # Raw tournament data
│   ├── league/         # League standings
│   └── players/        # Player stats
│
├── tests/              # Jest tests
│   ├── winPercentage.test.ts
│   ├── player-data.test.ts
│   └── standings-calculator.test.ts
│
├── leagues.yml         # League configuration
└── package.json        # npm scripts
```

## Performance Considerations

### Build Time

- ~500ms to build 110 pages
- Scales linearly with number of tournaments/players
- No optimization needed yet

### Runtime Performance

- Fully static site = instant loads
- No backend API calls
- No JavaScript needed for core functionality

### Data Size

- Each tournament: ~50-200 KB of JSON
- Player stats: ~5-15 KB per player
- Total site size: ~5-10 MB (uncompressed)

## Debugging Tips

### "Player not found" Issues

- Check if you're using `Username` vs `TeamId`
- Remember: TeamId changes per tournament!

### Win Percentage Seems Wrong

- Verify draws are counted as 0.5 wins
- Check if you're using utility functions
- Test calculation manually with example

### Tournament Not Showing

- Verify tournament ID in `leagues.yml`
- Check if data exists in `output/tournament_{id}/`
- Regenerate league standings
- Rebuild site

### Styles Not Applying

- Astro uses scoped CSS by default
- Check if styles are in correct `<style>` block
- Use browser dev tools to inspect classes

### TypeScript Errors

- Run `npm run build` to see full error output
- Check import paths (no `.js` extensions!)
- Verify interface definitions in `src/types.ts`

## Git Workflow

### Committing Changes

**Best Practice: Use Atomic Commits**

Make small, focused commits that each do one thing. This makes the history easier to understand and revert if needed.

```bash
# Bad: One large commit with many changes
git add -A
git commit -m "Fix dates, remove files, update docs, regenerate data"

# Good: Separate atomic commits
git add output/tournament_380585/*.json
git commit -m "Fix tournament dates to use correct year"

git add output/tournament_380585/metadata.json
git commit -m "Remove unused metadata files"

git add CLAUDE.md
git commit -m "Update documentation with correct sync-league syntax"

git add output/players/*.json
git commit -m "Regenerate player stats after date corrections"
```

**For code changes:**

```bash
git add <files>
git commit -m "Description of changes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**For data regeneration:**

```bash
# After regenerating player stats or league standings
git add output/
git commit -m "Regenerate data after [reason]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### What to Commit

**DO commit:**

- Source code changes (`src/`)
- Test files (`tests/`)
- Configuration (`leagues.yml`, `decks.yml`)
- Documentation (`.md` files)
- Generated data (`output/` directory)

**DON'T commit (these should be gitignored):**

- `dist/` directory (built site)
- `node_modules/`

## Future Enhancements

Potential areas for improvement:

1. **Deck Data Automation**: Auto-populate deck lists from Melee (if available)
2. **Match History**: Show game-by-game results, not just match results
3. **Statistical Analysis**: Win rates by deck matchup, round-by-round performance
4. **Visualization**: Charts for player progress over time
5. **Search/Filter**: Filter standings/players by various criteria
6. **Export**: CSV/Excel exports of data
7. **API**: Add optional JSON API endpoints for external tools

## Resources

- **Melee.gg**: https://melee.gg
- **Premodern Format**: https://premodernmagic.com
- **Astro Docs**: https://docs.astro.build
- **Swiss Pairing System**: https://en.wikipedia.org/wiki/Swiss-system_tournament

---

Last updated: December 2024
