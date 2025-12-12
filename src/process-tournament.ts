#!/usr/bin/env node
/**
 * Complete tournament processing workflow
 *
 * This script handles the entire flow of adding a new tournament:
 * 1. Scrape tournament data from Melee.gg
 * 2. Generate deck template in decks.yml (if it doesn't exist)
 * 3. Sync league standings (for current league)
 * 4. Regenerate player stats
 * 5. Generate page metadata for the tournament
 * 6. Build the site
 *
 * Usage: npm run process-tournament <tournament-id>
 * Example: npm run process-tournament 390154
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ Running: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', reject);
  });
}

async function processTournament(tournamentId: string) {
  console.log(`\n🏆 Processing tournament ${tournamentId}\n`);
  console.log('This will:');
  console.log('  1. Scrape tournament data from Melee.gg');
  console.log('  2. Generate deck template (if needed)');
  console.log('  3. Sync league standings');
  console.log('  4. Regenerate player stats');
  console.log('  5. Generate page metadata');
  console.log('  6. Build the site\n');

  try {
    // Step 1: Scrape tournament
    console.log('\n📡 Step 1: Scraping tournament data...');
    await runCommand('npm', ['run', 'scrape', '--', tournamentId]);

    // Step 2: Generate deck template (if tournament doesn't have deck data)
    console.log('\n📋 Step 2: Checking deck data...');
    const decksPath = path.join(process.cwd(), 'decks.yml');
    let needsDeckTemplate = true;

    if (fs.existsSync(decksPath)) {
      const decksYaml = fs.readFileSync(decksPath, 'utf-8');
      const allDecks = yaml.load(decksYaml) as Record<string, Record<string, string>>;
      needsDeckTemplate = !allDecks[tournamentId];
    }

    if (needsDeckTemplate) {
      console.log('  No deck data found, generating template...');
      await runCommand('npm', ['run', 'generate-deck-template']);
      console.log('\n⚠️  IMPORTANT: Fill in deck data in decks.yml before continuing!');
      console.log('  After filling in decks, run:');
      console.log(`    npm run process-tournament -- ${tournamentId} --skip-scrape\n`);
      return; // Exit here so user can fill in decks
    } else {
      console.log('  ✓ Deck data already exists');
    }

    // Step 3: Sync league standings
    console.log('\n📊 Step 3: Syncing league standings...');
    await runCommand('npm', ['run', 'sync-league']);

    // Step 4: Regenerate player stats
    console.log('\n👤 Step 4: Regenerating player stats...');
    await runCommand('npm', ['run', 'player-stats']);

    // Step 5: Generate page metadata
    console.log('\n📝 Step 5: Generating page metadata...');
    await runCommand('npm', ['run', 'generate-metadata', '--', tournamentId]);

    // Step 6: Build site
    console.log('\n🏗️  Step 6: Building site...');
    await runCommand('npm', ['run', 'build']);

    console.log('\n✅ Tournament processing complete!\n');
    console.log('Next steps:');
    console.log('  1. Review the generated metadata in:');
    console.log(`     output/tournament_${tournamentId}/page_metadata.json`);
    console.log('  2. Preview the site: npm run preview');
    console.log('  3. Commit and deploy your changes\n');
  } catch (error) {
    console.error('\n❌ Error processing tournament:', (error as Error).message);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);
const tournamentId = args.find((arg) => !arg.startsWith('--'));

if (!tournamentId) {
  console.error('Usage: npm run process-tournament <tournament-id>');
  console.error('Example: npm run process-tournament 390154');
  process.exit(1);
}

processTournament(tournamentId).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
