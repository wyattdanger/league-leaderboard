import { normalizeDeckName } from '../src/utils/archetypeAliases';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

const decks = yaml.load(readFileSync(join(__dirname, '..', 'decks.yml'), 'utf-8')) as Record<
  string,
  Record<string, string> | null
>;
const allDeckNames = [
  ...new Set(
    Object.values(decks).flatMap((players) => Object.values(players || {}).filter((d) => d && d !== '_'))
  ),
];

describe('normalizeDeckName', () => {
  it.each([
    ['Gro', 'Gro'],
    ['GAT', 'Gro'],
    ['GAT w/Angel', 'Gro'],
    ['Gro-a-Tog', 'Gro'],
    ['Psychatog', 'Psychatog'],
    ['Esper Tog', 'Psychatog'],
    ['EsperTog', 'Psychatog'],
    ['Samaluren', 'Aluren'],
    ['Chromatic Predict', 'Chromatic Control'],
    ['4C Chromatic Control', 'Chromatic Control'],
    ['Moneyball Black', 'Moneyball'],
    ['Moneyball Red', 'Moneyball'],
    ['Moneyball black', 'Moneyball'],
    ['UG Threshnought', 'Threshnought'],
    ['WUG Threshnought', 'Threshnought'],
    ['Stiflenought', 'Dreadnought'],
    ['UW Stiflenought', 'Dreadnought'],
    ['GW Oath Ponza', 'Oath Ponza'],
    ['4c oath ponza', 'Oath Ponza'],
    ['GW Ponza Oath', 'Oath Ponza'],
    ['Mono Red Ponza', 'Ponza'],
    ['Terra Oath', 'Oath'],
    ['Lan D Hoath', 'Oath'],
    ['BG Survival', 'Survival'],
    ['Survival Madness', 'Survival'],
    ['Welder Prison', 'Welder'],
  ])('maps %s to %s', (deck, archetype) => {
    expect(normalizeDeckName(deck)).toBe(archetype);
  });

  it('returns unknown deck names unchanged', () => {
    expect(normalizeDeckName('Pattern Rector')).toBe('Pattern Rector');
  });

  it('never folds a deck with "oath" in its name into Terrageddon', () => {
    const offenders = allDeckNames.filter(
      (d) => /oath/i.test(d) && normalizeDeckName(d) === 'Terrageddon'
    );
    expect(offenders).toEqual([]);
  });

  it('has no deck names with a slash between colors', () => {
    const offenders = allDeckNames.filter((d) => /\b[WUBRG]{1,2}\/[WUBRG]{1,2}\b/i.test(d));
    expect(offenders).toEqual([]);
  });
});
