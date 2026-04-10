export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function lowerText(text: string): string {
  return normalizeText(text).toLowerCase();
}

export function includesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce(
    (count, pattern) => count + (pattern.test(text) ? 1 : 0),
    0,
  );
}

export function truncateText(text: string, maxLength = 160): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}
