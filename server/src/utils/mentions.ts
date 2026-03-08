export function extractMentions(text: string): string[] {
  if (!text) return [];
  // Match @username (alphanumeric and underscores)
  const mentionRegex = /@(\w+(\.\w+)?)/g;
  const matches = text.match(mentionRegex);
  if (!matches) return [];
  // Return unique usernames without the @
  return [...new Set(matches.map(match => match.substring(1)))];
}
