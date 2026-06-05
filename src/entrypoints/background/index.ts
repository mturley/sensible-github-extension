import type {
  BackgroundMessage,
  BackgroundResponse,
  PRData,
} from "@/services/github/types";
import { createClient } from "@/services/github/client";
import { getRateLimitState } from "@/services/github/graphql-client";
import { getCached, setCached, isFreshForPageLoad, startEviction } from "@/services/cache";
import {
  getConfig,
  setSiteEnabled,
  setTokenError,
} from "@/services/storage";
const inflight = new Map<string, Promise<PRData>>();
const MIN_REQUEST_INTERVAL = 200; // ms between requests
let requestQueue: Promise<void> = Promise.resolve();

function throttle(): Promise<void> {
  const ticket = requestQueue.then(
    () => new Promise<void>((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL))
  );
  requestQueue = ticket;
  return ticket;
}

function cacheKey(owner: string, repo: string, number: number): string {
  return `${owner}/${repo}/${number}`;
}

async function fetchPR(
  owner: string,
  repo: string,
  number: number
): Promise<PRData> {
  const key = cacheKey(owner, repo, number);

  const cached = getCached(owner, repo, number);
  if (cached && isFreshForPageLoad(cached)) {
    return cached.data;
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const { remaining } = getRateLimitState();
      if (remaining !== null && remaining < 500) {
        const stale = getCached(owner, repo, number);
        if (stale) return stale.data;
      }

      await throttle();
      const client = await createClient();
      const data = await client.fetchPR(owner, repo, number);
      setCached(data);
      return data;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("401") || error.message.includes("403"))
      ) {
        await setTokenError(true);
      }
      throw error;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export default defineBackground(() => {
  startEviction();

  browser.runtime.onMessage.addListener(
    (
      message: BackgroundMessage,
      _sender: Browser.runtime.MessageSender
    ): Promise<BackgroundResponse> | undefined => {
      if (message.type === "fetchPR") {
        return fetchPR(message.owner, message.repo, message.number)
          .then((data): BackgroundResponse => ({ type: "prData", data }))
          .catch(
            (err): BackgroundResponse => ({
              type: "error",
              message: err instanceof Error ? err.message : String(err),
            })
          );
      }

      if (message.type === "toggleSite") {
        return setSiteEnabled(message.hostname, message.enabled).then(
          (): BackgroundResponse => ({
            type: "config",
            config: { pat: null, globalEnabled: true },
          })
        );
      }

      if (message.type === "getConfig") {
        return getConfig().then(
          (config): BackgroundResponse => ({ type: "config", config })
        );
      }

      if (message.type === "configChanged") {
        // Broadcast to all content scripts so they re-check token state
        browser.tabs.query({}).then((tabs) => {
          for (const tab of tabs) {
            if (tab.id) {
              browser.tabs.sendMessage(tab.id, { type: "configChanged" }).catch(() => {});
            }
          }
        });
        return getConfig().then(
          (config): BackgroundResponse => ({ type: "config", config })
        );
      }

      return undefined;
    }
  );
});
