import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import type { DeckData, MetagameBreakdown } from '../types';

export function loadDeckData(tournamentId: number): DeckData | null {
  const tournamentDir = path.join(process.cwd(), 'output', `tournament_${tournamentId}`);
  const decksPath = path.join(tournamentDir, 'Decks.yml');

  if (!fs.existsSync(decksPath)) {
    return null;
  }

  try {
    const fileContents = fs.readFileSync(decksPath, 'utf-8');
    const decks = yaml.load(fileContents) as DeckData;
    return decks;
  } catch (error) {
    console.error(`Error loading deck data for tournament ${tournamentId}:`, error);
    return null;
  }
}

export function calculateMetagameBreakdown(deckData: DeckData): MetagameBreakdown[] {
  const archetypeCounts = new Map<string, number>();

  // Count occurrences of each archetype
  Object.values(deckData).forEach((archetype) => {
    if (archetype) {
      archetypeCounts.set(archetype, (archetypeCounts.get(archetype) || 0) + 1);
    }
  });

  const totalDecks = Object.keys(deckData).length;

  // Convert to array and calculate percentages
  const breakdown: MetagameBreakdown[] = Array.from(archetypeCounts.entries())
    .map(([archetype, count]) => ({
      archetype,
      count,
      percentage: (count / totalDecks) * 100,
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending

  return breakdown;
}
