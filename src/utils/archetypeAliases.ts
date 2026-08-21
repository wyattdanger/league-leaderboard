/**
 * Archetype aliasing system for normalizing deck names across the site
 * Used by metagame explorer and player profiles to consolidate variants
 */

export const archetypeAliases: Record<string, string> = {
  // Oath variants
  'Oath': 'Oath',
  'Oath Ponza': 'Oath Ponza',
  'Magnivore Oath': 'Oath Ponza',
  'Junk Oath': 'Oath',
  'Domain Oath': 'Oath',

  // Parfait variants
  'Parfait': 'Parfait',
  'Oath Parfait': 'Parfait',

  // Dreadnought variants
  'Dreadnought': 'Dreadnought',
  'UB Dreadnought': 'Dreadnought',
  'U Dreadnought': 'Dreadnought',
  'Stiflenought': 'Stiflenought',

  // Enchantress variants
  'Enchantress': 'Enchantress',
  'GW Enchantress': 'Enchantress',
  'Enchantress Prison': 'Enchantress',

  // Terrageddon variants
  '4-Color Terrageddon': 'Terrageddon',
  'Naya Terrageddon': 'Terrageddon',
  'Terrageddon': 'Terrageddon',

  // Survival variants
  'Survival': 'Survival',
  'GR Survival': 'Survival',
  'GB Survival': 'Survival',
  'Food Chain Elves': 'Survival',
  'Madness Survival': 'Survival',

  // Dogpile / Sneak Attack variants
  'Dogpile': 'Dogpile',
  'Sneak Attack': 'Dogpile',

  // Moneyball variants
  'Moneyball Black': 'Moneyball Black',
  'Moneyball Red': 'Moneyball Black',
  'Dimir Infiltrator Moneyball': 'Moneyball Black',

  // Psychatog variants
  'Psychatog': 'Psychatog',
  'UB Psychatog': 'Psychatog',
  'Esper Tog': 'Psychatog',
  '5C Tog': 'Psychatog',
  '5c Psychatog': 'Psychatog',
  'Gro-a-Tog': 'Psychatog',

  // White Weenie variants
  'White Weenie': 'White Weenie',
  'White weenie': 'White Weenie',
  'WW': 'White Weenie',
  'WWu': 'White Weenie',
  'White Stompy': 'White Weenie',

  // Madness variants
  'Madness': 'Madness',
  'UG Madness': 'Madness',
  'UG madness': 'Madness',
  'WG Madness': 'Madness',
  'GW Madness': 'Madness',

  // Control variants
  'UW Control': 'UW Control',
  'Mono Blue Control': 'Mono Blue Control',
  'Mono U Control': 'Mono Blue Control',
  'U Control': 'Mono Blue Control',
  'Bant Control': 'Bant Control',
  'Bant Oath Control': 'Bant Control',
  'Bant Medallion': 'Bant Control',
  'Predict Medallion': 'Bant Control',

  // Welder variants
  'Welder': 'Welder',
  'Tinker Welder': 'Welder',
  'TinkUR Welder': 'Welder',
  'U/R Welder': 'Welder',
  'Mono R Welder': 'Welder',
  'Welder Prison': 'Welder',

  // Rifter / Lightning Rift variants
  'Rifter': 'Rifter',
  'RW Rifter': 'Rifter',
  'RW Rift': 'Rifter',
  'Boros Lightning Rift': 'Rifter',

  // FEB variants
  'FEB': 'FEB',
  'HFEB': 'FEB',
  'hFEB': 'FEB',

  // Ponza variants
  'RG Ponza': 'Oath Ponza',
  'Mono Red Ponza': 'Ponza',

  // Elves variants
  'Elves': 'Elves',
  'Survival-less Elves': 'Elves',

  // Stompy variants
  'Stompy': 'Stompy',
  '10 Land Stompy': 'Stompy',

  // Mad Dogs variants
  'Mad Dogs': 'Mad Dogs',
  'GW Mad Dogs': 'Mad Dogs',
  'GW Little Kid': 'Mad Dogs',

  // GAT variants
  'GAT': 'GAT',
  'GAT w/Angel': 'GAT',

  // Zoo variants
  'Zoo': 'Zoo',
  'RG Zoo': 'Zoo',

  // RG Aggro variants
  'RG Aggro': 'RG Aggro',
  'GR Aggro': 'RG Aggro',

  // BW Control variants
  'BW Control': 'BW Control',
  'BW Contorl': 'BW Control',

  // Pox/Rack variants
  'Pox': 'Pox',
  'Rack': 'Pox',
  'Pit Rack': 'Pox',
  'Pox Pit Rack': 'Pox',
  'Black Rack': 'Pox',

  // The Rock variants
  'The Rock': 'The Rock',
  'Gamekeeper Rock': 'The Rock',

  // Tide variants
  'Tide': 'Tide',
  'UB Tide': 'Tide',
  'UW Tide Control': 'Tide',

  // Burn variants
  'Burn': 'Burn',
  'Medvedev Burn': 'Burn',
  'Sligh': 'Burn',

  // Stasis variants
  'Stasis': 'Stasis',
  'UR Stasis': 'Stasis',
  'Stasis Oath': 'Stasis',
};

/**
 * Normalize a deck name using aliases and fuzzy matching
 */
export function normalizeDeckName(deckName: string): string {
  // First check exact alias match
  if (archetypeAliases[deckName]) {
    return archetypeAliases[deckName];
  }

  // Fuzzy matching for common patterns
  if (deckName.includes('Goblins')) return 'Goblins';
  if (deckName.includes('Dreadnought') && !deckName.includes('Stifle')) return 'Dreadnought';
  if (deckName.includes('Stiflenought')) return 'Stiflenought';
  if (deckName.includes('Landstill')) return 'Landstill';
  if (deckName.includes('Replenish') || deckName.includes('PandeBurst')) return 'Replenish';
  if (deckName.includes('Survival')) return 'Survival';
  if (deckName.includes('Clerics')) return 'Clerics';
  if (deckName.includes('Zombies')) return 'Zombies';

  // Return original if no match
  return deckName;
}

/**
 * Track which variants were collapsed into each normalized archetype
 */
export interface VariantInfo {
  normalizedName: string;
  variants: Set<string>;
}

/**
 * Get the normalized name and track the variant
 */
export function getNormalizedWithVariants(deckName: string): { normalized: string; original: string } {
  const normalized = normalizeDeckName(deckName);
  return {
    normalized,
    original: deckName,
  };
}
