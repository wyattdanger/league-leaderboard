# Add Tournament Skill

This skill handles the complete workflow for adding a new tournament to the league leaderboard system.

## Workflow Overview

When the user provides a tournament ID (from Melee.gg), follow these steps in order:

### Phase 1: Scraping and Setup

1. **Scrape the tournament data**:
   ```bash
   npm run scrape -- <tournament_id>
   ```

2. **Add tournament to leagues.yml**:
   - Tournaments are ordered from newest to oldest
   - The first league in the file is the "current" league
   - Add the new tournament ID to the appropriate league's `tournaments` array
   - Place it at the top of the list (newest first)

3. **Generate deck template**:
   ```bash
   npm run generate-deck-template
   ```
   - This prefills all player usernames with `_` placeholders in `decks.yml`
   - Creates entries under the tournament ID key

4. **PAUSE HERE** - Wait for user to provide deck data
   - User will give you deck names for each player
   - Replace `_` placeholders with actual deck names in `decks.yml`
   - It's OK if some players have `_` (unknown deck data)

### Phase 2: Generation and Build

5. **Sync league standings**:
   ```bash
   npm run sync-league  # Syncs current (first) league
   ```

6. **Generate page metadata** (for Open Graph social previews):
   ```bash
   npm run generate-metadata -- <tournament_id>
   ```

7. **Regenerate player stats**:
   ```bash
   npm run player-stats
   ```
   - This reads deck data from `decks.yml`
   - Must be done AFTER deck data is filled in

8. **Build the site**:
   ```bash
   npm run build
   ```

9. **Commit and push**:
   ```bash
   git add leagues.yml decks.yml output/
   git commit -m "Add tournament <tournament_id> to Q* 20**

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>"
   git push
   ```

## Handling Deck Data Updates

If the user provides updated deck data after the initial commit:

1. Update `decks.yml` with the new deck names
2. Regenerate player stats: `npm run player-stats`
3. Regenerate metadata: `npm run generate-metadata -- <tournament_id>` (or `npm run generate-all-metadata`)
4. Rebuild site: `npm run build`
5. Commit and push:
   ```bash
   git add decks.yml output/
   git commit -m "Update deck data for tournament <tournament_id>

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>"
   git push
   ```

## Quick Method (Automated)

There's also an automated script that combines many steps:

```bash
npm run process-tournament -- <tournament_id>
```

This will:
1. Scrape tournament data
2. Generate deck template
3. Pause for you to fill in deck data
4. Sync league standings
5. Regenerate player stats
6. Generate page metadata
7. Build the site

You'll still need to commit and push manually after this.

## Important Notes

- **Always use TodoWrite** to track progress through the workflow
- **Order matters**: Don't regenerate player stats before filling in deck data, or profiles will show `_` instead of deck names
- **Username is the primary key**: Never use TeamId for cross-tournament tracking
- **Deck data is optional**: Tournament pages work fine with missing deck data
- **Dev server caching**: After regenerating data, kill and restart the dev server (`lsof -ti:4321 | xargs kill -9 2>/dev/null && npm run dev`)

## Common Patterns

**User says**: "ok new event to scrape 123456"
- Immediately start with `npm run scrape -- 123456`
- Then follow Phase 1 workflow

**User provides deck data**: "username1: Deck Name, username2: Other Deck, ..."
- Update `decks.yml` under the tournament ID
- Follow Phase 2 workflow

**User says**: "updated decks from ppl" or "ok i updated decks again"
- Follow the "Handling Deck Data Updates" workflow
- Always regenerate player stats → metadata → build → commit → push

## Data Structure References

### decks.yml format:
```yaml
# Tournament 436157 - June 18, 2026
'436157':
  username1: The Rock
  username2: Domain
  username3: _  # Unknown/not yet filled
```

### leagues.yml format:
```yaml
leagues:
  - name: Q2 2026
    tournaments:
      - 436157  # Newest first
      - 436155
      - 434267
```

## Error Recovery

If something goes wrong:
- Check that tournament data was scraped successfully (`output/tournament_<id>/`)
- Verify `leagues.yml` syntax is correct
- Verify `decks.yml` syntax is correct (proper YAML indentation)
- Try regenerating individual steps to isolate the issue
- Check git status to see what files changed
