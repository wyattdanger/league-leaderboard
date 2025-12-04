/**
 * Convert a league name to a URL-friendly slug
 */
export function leagueNameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}
