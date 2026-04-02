import type { PRData, BackgroundMessage, BackgroundResponse } from "@/services/github/types";
import type { TooltipState } from "./tooltip";
import { findPRLinks, prCacheKey } from "@/utils/pr-url-parser";
import { injectLoadingIcon, updateIcon, removeAllIcons, hasExistingNearbyIcon, cleanupOrphanedIcons } from "./icon-injector";
import { setupTooltipListeners, updateTooltipContent, hideActiveTooltip } from "./tooltip";

const HOVER_REVALIDATE_TTL = 60_000; // 1 minute

const processed = new Set<HTMLAnchorElement>();
const prHosts = new Map<string, HTMLElement[]>();
const prDataCache = new Map<string, PRData>();
const prErrors = new Map<string, string>();
const pendingRequests = new Set<string>();
let hasToken: boolean | null = null;

async function sendMessage(message: BackgroundMessage): Promise<BackgroundResponse> {
  return browser.runtime.sendMessage(message);
}

async function checkToken(): Promise<boolean> {
  if (hasToken !== null) return hasToken;
  try {
    const response = await sendMessage({ type: "getConfig" });
    if (response.type === "config") {
      hasToken = !!response.config.pat;
    } else {
      hasToken = false;
    }
  } catch {
    hasToken = false;
  }
  return hasToken;
}

function getTooltipState(key: string): TooltipState {
  const data = prDataCache.get(key);
  if (data) return { type: "data", data };
  if (hasToken === false) return { type: "no-token" };
  const error = prErrors.get(key);
  if (error) return { type: "error", message: error };
  if (pendingRequests.has(key)) return { type: "loading" };
  return { type: "loading" };
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
      prErrors.delete(key);
      for (const host of hosts) {
        updateIcon(host, response.data);
      }
    } else if (response.type === "error") {
      if (response.message === "GitHub token required") {
        hasToken = false;
      } else {
        prErrors.set(key, response.message);
      }
    }
  } catch (err) {
    prErrors.set(key, err instanceof Error ? err.message : "Unknown error");
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

async function processAnchors(root: Element | Document): Promise<void> {
  const links = findPRLinks(root);
  if (links.length === 0) return;

  await checkToken();

  for (const { element, link } of links) {
    if (processed.has(element)) continue;
    processed.add(element);

    const key = prCacheKey(link.owner, link.repo, link.number);

    if (!prHosts.has(key)) {
      prHosts.set(key, []);
    }

    if (!hasExistingNearbyIcon(element)) {
      const host = injectLoadingIcon(element);
      prHosts.get(key)!.push(host);

      const cached = prDataCache.get(key);
      if (cached) {
        updateIcon(host, cached);
      } else if (hasToken && !pendingRequests.has(key)) {
        fetchAndDecorate(link.owner, link.repo, link.number, prHosts.get(key)!);
      }
    }

    setupTooltipListeners(
      element,
      () => getTooltipState(key),
      () => revalidateOnHover(link.owner, link.repo, link.number)
    );
  }
}

function observeMutations(): void {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.removedNodes) {
        if (node instanceof HTMLElement) {
          cleanupOrphanedIcons(node);
          if (node.dataset?.prinfoIconId) {
            const iconId = node.dataset.prinfoIconId;
            document.getElementById(iconId)?.remove();
            processed.delete(node as HTMLAnchorElement);
          }
        }
      }
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          processAnchors(node);
        }
      }

      if (mutation.type === "attributes" && mutation.target instanceof HTMLElement) {
        handleContentEditableChange(mutation.target);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["contenteditable"] });
}

function handleContentEditableChange(target: HTMLElement): void {
  if (target.isContentEditable) {
    // Became editable — remove all injected icons and un-track anchors
    hideActiveTooltip();
    cleanupOrphanedIcons(target);
    target.querySelectorAll<HTMLAnchorElement>("a[data-prinfo-icon-id]").forEach((anchor) => {
      processed.delete(anchor);
    });
  } else {
    // No longer editable — re-process to pick up new/existing links
    processAnchors(target);
  }
}

export default defineContentScript({
  matches: ["<all_urls>"],
  excludeMatches: ["*://github.com/*", "*://localhost/*", "*://127.0.0.1/*", "*://[::1]/*"],
  async main() {
    await processAnchors(document);
    observeMutations();

    browser.runtime.onMessage.addListener((message: { type: string }) => {
      if (message.type === "siteDisabled") {
        hideActiveTooltip();
        removeAllIcons();
        processed.clear();
        prHosts.clear();
        prDataCache.clear();
        prErrors.clear();
      }
      if (message.type === "siteEnabled") {
        processAnchors(document);
      }
      if (message.type === "configChanged") {
        hasToken = null;
        processed.clear();
        prErrors.clear();
        processAnchors(document);
      }
    });
  },
});
