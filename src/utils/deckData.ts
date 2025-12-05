import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import type { DeckData, MetagameBreakdown } from '../types';

interface AllDecksData {
  [tournamentId: string]: DeckData;
}

let cachedDecksData: AllDecksData | null = null;

function loadAllDecksData(): AllDecksData {
  if (cachedDecksData) {
    return cachedDecksData;
  }

  const decksPath = path.join(process.cwd(), 'decks.yml');

  if (!fs.existsSync(decksPath)) {
    cachedDecksData = {};
    return cachedDecksData;
  }

  try {
    const fileContents = fs.readFileSync(decksPath, 'utf-8');
    cachedDecksData = yaml.load(fileContents) as AllDecksData;
    return cachedDecksData || {};
  } catch (error) {
    console.error('Error loading decks.yml:', error);
    cachedDecksData = {};
    return cachedDecksData;
  }
}

export function loadDeckData(tournamentId: number): DeckData | null {
  const allDecks = loadAllDecksData();
  const tournamentKey = tournamentId.toString();

  return allDecks[tournamentKey] || null;
}

export function hasCompleteDeckData(deckData: DeckData | null): boolean {
  if (!deckData) {
    return false;
  }

  // Check if all players have non-empty deck values (not _ or null)
  const allDecksKnown = Object.values(deckData).every(
    (deck) => deck && deck !== '_' && deck !== 'null'
  );

  return allDecksKnown;
}

export function calculateMetagameBreakdown(deckData: DeckData): MetagameBreakdown[] {
  const archetypeCounts = new Map<string, number>();

  // Count occurrences of each archetype (excluding _ and null)
  Object.values(deckData).forEach((archetype) => {
    if (archetype && archetype !== '_' && archetype !== 'null') {
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
