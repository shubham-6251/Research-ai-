import type { GroundingSource } from '../types';

export function isSafeHttpUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function extractDomain(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return 'source';
  }
}

interface RawGroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

interface RawGroundingMetadata {
  groundingChunks?: RawGroundingChunk[];
}

export function extractGroundingSources(groundingMetadata: unknown): GroundingSource[] {
  if (!groundingMetadata || typeof groundingMetadata !== 'object') {
    return [];
  }

  const meta = groundingMetadata as RawGroundingMetadata;
  if (!Array.isArray(meta.groundingChunks)) {
    return [];
  }

  const seenUrls = new Set<string>();
  const results: GroundingSource[] = [];

  for (const chunk of meta.groundingChunks) {
    const uri = chunk?.web?.uri?.trim();
    if (!uri || !isSafeHttpUrl(uri) || seenUrls.has(uri)) {
      continue;
    }
    seenUrls.add(uri);
    const domain = extractDomain(uri);
    const rawTitle = chunk?.web?.title?.trim();
    const title = rawTitle && rawTitle.length > 0 ? rawTitle : domain;
    results.push({
      title,
      url: uri,
      domain,
    });
  }

  return results;
}

export function mergeUniqueSources(
  existing: GroundingSource[],
  incoming: GroundingSource[]
): GroundingSource[] {
  const map = new Map<string, GroundingSource>();
  for (const src of existing) {
    if (isSafeHttpUrl(src.url)) {
      map.set(src.url, src);
    }
  }
  for (const src of incoming) {
    if (isSafeHttpUrl(src.url) && !map.has(src.url)) {
      map.set(src.url, src);
    }
  }
  return Array.from(map.values());
}
