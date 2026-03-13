import type { PRLink } from "@/services/github/types";

const PR_URL_REGEX =
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;

export function parsePRUrl(url: string): PRLink | null {
  const match = url.match(PR_URL_REGEX);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    number: parseInt(match[3], 10),
    url,
  };
}

export function isGitHubPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "github.com";
  } catch {
    return false;
  }
}

export function prCacheKey(owner: string, repo: string, number: number): string {
  return `${owner}/${repo}/${number}`;
}

export function findPRLinks(root: Element | Document): { element: HTMLAnchorElement; link: PRLink }[] {
  const anchors = root.querySelectorAll<HTMLAnchorElement>("a[href]");
  const results: { element: HTMLAnchorElement; link: PRLink }[] = [];
  for (const anchor of anchors) {
    const link = parsePRUrl(anchor.href);
    if (link) {
      results.push({ element: anchor, link });
    }
  }
  return results;
}
