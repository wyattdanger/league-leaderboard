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

/**
 * Remove emojis and extra whitespace from display names
 */
export function cleanDisplayName(displayName: string): string {
  // Remove emojis using Unicode ranges
  const cleaned = displayName.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
  // Trim and normalize whitespace
  return cleaned.trim().replace(/\s+/g, ' ');
}
