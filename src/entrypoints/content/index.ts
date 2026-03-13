import type { PRData, BackgroundMessage, BackgroundResponse } from "@/services/github/types";
import { findPRLinks, prCacheKey } from "@/utils/pr-url-parser";
import { injectLoadingIcon, updateIcon, removeAllIcons } from "./icon-injector";
import { setupTooltipListeners, updateTooltipContent, hideActiveTooltip } from "./tooltip";

const HOVER_REVALIDATE_TTL = 60_000; // 1 minute

const processed = new Set<HTMLAnchorElement>();
const prHosts = new Map<string, HTMLElement[]>();
const prDataCache = new Map<string, PRData>();
const pendingRequests = new Set<string>();

async function sendMessage(message: BackgroundMessage): Promise<BackgroundResponse> {
  return browser.runtime.sendMessage(message);
}

async function fetchAndDecorate(
  owner: string,
  repo: string,
  number: number,
  hosts: HTMLElement[]
): Promise<void> {
  const key = prCacheKey(owner, repo, number);
  if (pendingRequests.has(key)) return;
  pendingRequests.add(key);

  try {
    const response = await sendMessage({ type: "fetchPR", owner, repo, number });
    if (response.type === "prData") {
      prDataCache.set(key, response.data);
      for (const host of hosts) {
        updateIcon(host, response.data);
      }
    } else if (response.type === "error") {
      for (const host of hosts) {
        host.remove();
      }
    }
  } catch {
    for (const host of hosts) {
      host.remove();
    }
  } finally {
    pendingRequests.delete(key);
  }
}

async function revalidateOnHover(owner: string, repo: string, number: number): Promise<void> {
  const key = prCacheKey(owner, repo, number);
  const cached = prDataCache.get(key);

  if (!cached || Date.now() - cached.fetchedAt < HOVER_REVALIDATE_TTL) return;
  if (pendingRequests.has(key)) return;

  pendingRequests.add(key);
  try {
    const response = await sendMessage({ type: "fetchPR", owner, repo, number });
    if (response.type === "prData") {
      prDataCache.set(key, response.data);
      updateTooltipContent(response.data);
      const hosts = prHosts.get(key);
      if (hosts) {
        for (const host of hosts) {
          updateIcon(host, response.data);
        }
      }
    }
  } catch {
    // Keep showing cached data on revalidation failure
  } finally {
    pendingRequests.delete(key);
  }
}

function processAnchors(root: Element | Document): void {
  const links = findPRLinks(root);

  for (const { element, link } of links) {
    if (processed.has(element)) continue;
    processed.add(element);

    const key = prCacheKey(link.owner, link.repo, link.number);
    const host = injectLoadingIcon(element);

    if (!prHosts.has(key)) {
      prHosts.set(key, []);
    }
    prHosts.get(key)!.push(host);

    setupTooltipListeners(
      element,
      () => prDataCache.get(key),
      () => revalidateOnHover(link.owner, link.repo, link.number)
    );

    const cached = prDataCache.get(key);
    if (cached) {
      updateIcon(host, cached);
    } else if (!pendingRequests.has(key)) {
      fetchAndDecorate(link.owner, link.repo, link.number, prHosts.get(key)!);
    }
  }
}

function observeMutations(): void {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          processAnchors(node);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

export default defineContentScript({
  matches: ["<all_urls>"],
  excludeMatches: ["*://github.com/*"],
  async main() {
    processAnchors(document);
    observeMutations();

    browser.runtime.onMessage.addListener((message: { type: string }) => {
      if (message.type === "siteDisabled") {
        hideActiveTooltip();
        removeAllIcons();
        processed.clear();
        prHosts.clear();
        prDataCache.clear();
      }
      if (message.type === "siteEnabled") {
        processAnchors(document);
      }
    });
  },
});
