/**
 * Archetype aliasing system for normalizing deck names across the site
 * Used by metagame explorer and player profiles to consolidate variants
 */

export const archetypeAliases: Record<string, string> = {
  // Oath variants
  'Oath': 'Oath',
  'Junk Oath': 'Oath',
  'Domain Oath': 'Oath',
  'UG Cognivore Oath': 'Oath',
  'Terra Oath': 'Oath',
  '4C Terra Oath': 'Oath',
  'GW terraoath': 'Oath',
  'Lan D Hoath': 'Oath',

  // Oath Ponza variants (any name containing "Oath" and "Ponza" also matches via fuzzy rule)
  'Oath Ponza': 'Oath Ponza',
  'Magnivore Oath': 'Oath Ponza',
  'RG Ponza': 'Oath Ponza',
  'RG Oath': 'Oath Ponza',
  'GW Tusker Oath': 'Oath Ponza',
  'Spec Oath': 'Oath Ponza',
  'Oath Spec': 'Oath Ponza',

  // Ponza (non-Oath) variants
  'Ponza': 'Ponza',
  'Mono Red Ponza': 'Ponza',
  'Mono red ponza': 'Ponza',
  'Black Ponza': 'Ponza',

  // Parfait variants
  'Parfait': 'Parfait',
  'Oath Parfait': 'Parfait',

  // Terrageddon variants (never anything with "Oath" in the name - those go to Oath)
  'Terrageddon': 'Terrageddon',
  '4-Color Terrageddon': 'Terrageddon',
  '4C Terrageddon': 'Terrageddon',
  'Naya Terrageddon': 'Terrageddon',
  'Terraclysm': 'Terrageddon',

  // Dreadnought variants (includes Stiflenought)
  'Dreadnought': 'Dreadnought',
  'UB Dreadnought': 'Dreadnought',
  'UW Dreadnought': 'Dreadnought',
  'U Dreadnought': 'Dreadnought',
  'Stiflenought': 'Dreadnought',
  'UW Stiflenought': 'Dreadnought',

  // Threshnought variants
  'Threshnought': 'Threshnought',
  'UG Threshnought': 'Threshnought',
  'WUG Threshnought': 'Threshnought',

  // Enchantress variants
  'Enchantress': 'Enchantress',
  'GW Enchantress': 'Enchantress',
  'Enchantress Prison': 'Enchantress',
  'Sam Black Enchantress': 'Enchantress',

  // Survival variants (any name containing "Survival" also matches via fuzzy rule)
  'Survival': 'Survival',
  'GB Survival': 'Survival',
  'BG Survival': 'Survival',
  'GR Survival': 'Survival',
  'Food Chain Elves': 'Survival',
  'Dogpile (Mono G Survival)': 'Survival',

  // Dogpile / Sneak Attack variants
  'Dogpile': 'Dogpile',
  'Sneak Attack': 'Dogpile',

  // Moneyball variants (any name containing "Moneyball" also matches via fuzzy rule)
  'Moneyball': 'Moneyball',
  'Moneyball Black': 'Moneyball',
  'Moneyball black': 'Moneyball',
  'Moneyball Red': 'Moneyball',
  'Moneyball Blue': 'Moneyball',
  'Dimir Infiltrator Moneyball': 'Moneyball',

  // Psychatog: hard control that wins with Psychatog alone
  'Psychatog': 'Psychatog',
  'UB Psychatog': 'Psychatog',
  'Esper Tog': 'Psychatog',
  'EsperTog': 'Psychatog',
  '5C Tog': 'Psychatog',
  '5c Psychatog': 'Psychatog',

  // Gro: any deck running Quirion Dryad (may also play Psychatog)
  'Gro': 'Gro',
  'GAT': 'Gro',
  'GAT w/Angel': 'Gro',
  'Gro-a-Tog': 'Gro',

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

  // Chromatic Control variants
  'Chromatic Control': 'Chromatic Control',
  'Chromatic Predict': 'Chromatic Control',
  '4C Chromatic Control': 'Chromatic Control',

  // Landstill variants
  'Landstill': 'Landstill',
  'UW Landstill': 'Landstill',
  'Tidestill': 'Landstill',

  // Welder variants
  'Welder': 'Welder',
  'Tinker Welder': 'Welder',
  'TinkUR Welder': 'Welder',
  'UR Welder': 'Welder',
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

  // Goblins variants (any name containing "Goblins" also matches via fuzzy rule)
  'Goblins': 'Goblins',
  'Goblin Sligh': 'Goblins',

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

  // Storm variants
  'Storm': 'Storm',
  'Frantic Storm': 'Storm',

  // Tron variants
  'Tron': 'Tron',
  'RG Tron': 'Tron',

  // Life variants
  'Life': 'Life',
  'Life Clerics': 'Life',
  'WB Life': 'Life',

  // Clerics variants (any name containing "Clerics" also matches via fuzzy rule)
  'Clerics': 'Clerics',
  'Mono Black Clerics': 'Clerics',
  'Mono black clerics': 'Clerics',
  'Mono-B Clerics': 'Clerics',

  // Aluren variants
  'Aluren': 'Aluren',
  'Samaluren': 'Aluren',
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
  const lower = deckName.toLowerCase();
  if (lower.includes('oath') && lower.includes('ponza')) return 'Oath Ponza';
  if (lower.includes('moneyball')) return 'Moneyball';
  if (lower.includes('threshnought')) return 'Threshnought';
  if (deckName.includes('Goblins')) return 'Goblins';
  if (deckName.includes('Dreadnought') || deckName.includes('Stiflenought')) return 'Dreadnought';
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
