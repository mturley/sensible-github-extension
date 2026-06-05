import type { PRData, CacheEntry } from "@/services/github/types";
import { prCacheKey } from "@/utils/pr-url-parser";

const PAGE_LOAD_TTL = 5 * 60 * 1000; // 5 minutes
const HOVER_REVALIDATE_TTL = 5 * 60 * 1000; // 5 minutes

const cache = new Map<string, CacheEntry>();

export function getCached(
  owner: string,
  repo: string,
  number: number
): CacheEntry | null {
  const key = prCacheKey(owner, repo, number);
  return cache.get(key) ?? null;
}

export function setCached(data: PRData): void {
  const key = prCacheKey(data.owner, data.repo, data.number);
  cache.set(key, { key, data, fetchedAt: data.fetchedAt });
}

export function isFreshForPageLoad(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < PAGE_LOAD_TTL;
}

export function needsHoverRevalidation(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt >= HOVER_REVALIDATE_TTL;
}

export function clearCache(): void {
  cache.clear();
}

const EVICTION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

function evictStaleEntries(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.fetchedAt > EVICTION_MAX_AGE) {
      cache.delete(key);
    }
  }
}

setInterval(evictStaleEntries, 30 * 60 * 1000);
