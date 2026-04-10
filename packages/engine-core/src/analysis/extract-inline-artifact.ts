import { normalizeText } from "./text-utils.js";

const QUOTED_ARTIFACT_PATTERN =
  /["“”'`「『](.+?)["“”'`」』]/s;

export function extractInlineArtifact(text: string): string | undefined {
  const normalized = normalizeText(text);
  const quotedMatch = normalized.match(QUOTED_ARTIFACT_PATTERN);

  if (quotedMatch?.[1]) {
    const artifact = quotedMatch[1].trim();

    if (artifact.length >= 6) {
      return artifact;
    }
  }

  const colonIndex = normalized.lastIndexOf(":");

  if (colonIndex === -1) {
    return undefined;
  }

  const artifact = normalized.slice(colonIndex + 1).trim();

  if (artifact.length < 6) {
    return undefined;
  }

  return artifact;
}
