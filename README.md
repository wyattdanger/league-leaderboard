# NYC Premodern League Leaderboard

A static site for tracking NYC Premodern League standings and player statistics, built with Astro.

## 🏆 Features

- **League Standings**: View standings for each league (Q4 2025, Q3 2025, Top 8s, Overall)
- **Player Detail Pages**: Individual player pages with head-to-head matchup data
- **Per-League Stats**: Track player performance across different leagues
- **Match Win % & Game Win %**: Color-coded performance metrics
- **Head-to-Head Records**: See how players fare against specific opponents
- **Recent Form**: Last 5 results shown for each matchup

## 📊 Data Generation Workflow

Before deploying or previewing the site, you must generate all data files. Run these commands in order:

### 1. Scrape Tournament Data

Scrape match and standings data from a specific tournament:

```sh
npm run scrape <tournament-id>
```

Example:

```sh
npm run scrape 384681
```

### 2. Generate League Standings

Aggregate standings across tournaments for each league:

```sh
npm run league
```

This reads from `leagues.yml` and generates league standings files in `output/league/`.

### 3. Generate Player Stats

Calculate individual player statistics and head-to-head records:

```sh
npm run player-stats
```

This generates player stat files in `output/players/` with per-league breakdowns and head-to-head matchup data.

### 4. Build the Site

Build the static site with all generated data:

```sh
npm run build
```

### Full Workflow Example

```sh
# Scrape latest tournaments (if needed)
npm run scrape 384681
npm run scrape 382756

# Generate all stats
npm run league
npm run player-stats

# Build the site
npm run build

# Preview locally (optional)
npm run preview
```

## 🚀 Commands

| Command                | Action                                                        |
| :--------------------- | :------------------------------------------------------------ |
| `npm install`          | Install dependencies                                          |
| `npm run dev`          | Start local dev server at `localhost:4321`                    |
| `npm run build`        | Build production site to `./dist/`                            |
| `npm run preview`      | Preview your build locally before deploying                   |
| `npm run scrape <id>`  | Scrape tournament data by ID                                  |
| `npm run league`       | Generate league standings from all tournaments                |
| `npm run player-stats` | Generate individual player stats and head-to-head records     |
| `npm run sync-league`  | Sync latest league data (scrape + league + player-stats)      |
| `npm test`             | Run tests                                                     |
| `npm run format`       | Format code with Prettier                                     |
| `npm run format:check` | Check code formatting without modifying files                 |

## 📁 Project Structure

```text
/
├── output/                   # Generated data (not in git)
│   ├── tournament_*/         # Scraped tournament data
│   ├── league/               # League standings JSON files
│   └── players/              # Player stats JSON files
├── src/
│   ├── components/           # Reusable Astro components
│   │   ├── Leaderboard.astro
│   │   ├── HeadToHead.astro
│   │   ├── PlayerLeagueStats.astro
│   │   └── ...
│   ├── pages/                # Routes
│   │   ├── index.astro       # Homepage (newest league)
│   │   ├── league/
│   │   │   └── [slug].astro  # Dynamic league pages
│   │   └── player/
│   │       └── [username].astro  # Dynamic player pages
│   ├── utils/                # Utility functions
│   │   ├── data.ts           # Data loading utilities
│   │   ├── playerData.ts     # Player stats calculations
│   │   └── helpers.ts        # Helper functions
│   ├── types.ts              # TypeScript type definitions
│   ├── scraper.ts            # Tournament data scraper
│   ├── league-aggregator.ts  # League standings generator
│   └── player-stats-generator.ts  # Player stats generator
├── tests/                    # Jest tests
├── leagues.yml               # League configuration
└── package.json
```

## 🔧 Configuration

Edit `leagues.yml` to configure leagues and their tournaments:

```yaml
leagues:
  - name: Q4 2025
    tournaments:
      - 384681
      - 382756
  - name: Q3 2025
    tournaments:
      - 380585
      - 377629
```

### Adding a New Tournament to an Existing League

When a new weekly tournament finishes, follow these steps:

1. **Add the tournament ID to `leagues.yml`**:
   ```yaml
   leagues:
     - name: Q4 2025
       tournaments:
         - 388334  # ← Add new tournament ID here
         - 384681
         - 382756
   ```

2. **Scrape the tournament data**:
   ```sh
   npm run scrape 388334
   ```

3. **Rebuild all data and the site**:
   ```sh
   npm run rebuild-all
   ```

   This command runs:
   - `npm run league` - Regenerates all league standings
   - `npm run player-stats` - Regenerates all player stats
   - `npm run build` - Rebuilds the static site

4. **Verify locally** (optional):
   ```sh
   npm run preview
   ```

5. **Commit and deploy**:
   ```sh
   git add .
   git commit -m "Add tournament 388334 to Q4 2025"
   git push
   ```

## 📱 Deployment

The site is deployed on Vercel and automatically rebuilds when changes are pushed to GitHub.

Before deploying, ensure all data is up-to-date:

```sh
npm run league && npm run player-stats && npm run build
```

## 🧪 Testing

Run the test suite:

```sh
npm test
```

Tests include:

- Player stats calculation
- Head-to-head record generation
- Match/game win percentage calculations
- Edge cases (byes, draws, empty data)
