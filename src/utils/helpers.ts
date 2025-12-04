/**
 * Convert a league name to a URL-friendly slug
 */
export function leagueNameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Convert a username to a URL-friendly slug
 */
export function usernameToSlug(username: string): string {
  return username.toLowerCase();
}
