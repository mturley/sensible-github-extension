import { getHideBotsEnabled, getHideBotsDefault } from "@/services/storage";
import { hideBotComments, showAllComments, cleanupAttributes } from "./comment-hider";
import {
  injectConversationToggle,
  injectFilesChangedToggle,
  updateToggleCount,
  removeToggle,
  type ToggleElements,
} from "./toggle-ui";

let toggleElements: ToggleElements | null = null;
let isEnabled = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastPageType: "conversation" | "files" | null = null;

function isOnPRPage(): boolean {
  return /^https?:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(window.location.href);
}

function isOnFilesChangedPage(): boolean {
  return /^https?:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+\/files/.test(window.location.href);
}

function currentPageType(): "conversation" | "files" | null {
  if (!isOnPRPage()) return null;
  return isOnFilesChangedPage() ? "files" : "conversation";
}

async function applyState(): Promise<void> {
  if (!isOnPRPage()) {
    removeToggle();
    cleanupAttributes();
    return;
  }

  if (isEnabled) {
    const count = hideBotComments();
    if (toggleElements) {
      updateToggleCount(toggleElements.countSpan, count);
    }
  } else {
    showAllComments();
    if (toggleElements) {
      updateToggleCount(toggleElements.countSpan, 0);
    }
  }
}

async function handleToggle(enabled: boolean): Promise<void> {
  isEnabled = enabled;
  await applyState();
}

async function initialize(force = false): Promise<void> {
  const pageType = currentPageType();
  if (!pageType) return;

  const featureEnabled = await getHideBotsEnabled();
  if (!featureEnabled) {
    removeToggle();
    cleanupAttributes();
    return;
  }

  // Re-inject if page type changed (conversation <-> files) or if forced
  const existingToggle = document.getElementById("sensible-bot-toggle");
  if (existingToggle && !force && pageType === lastPageType) return;

  // Clean up before re-injecting
  if (existingToggle) {
    removeToggle();
    cleanupAttributes();
  }

  lastPageType = pageType;
  isEnabled = await getHideBotsDefault();

  if (pageType === "files") {
    toggleElements = injectFilesChangedToggle(isEnabled, handleToggle);
  } else {
    toggleElements = injectConversationToggle(isEnabled, handleToggle);
  }

  await applyState();
}

function debouncedInitialize(force = false): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    initialize(force);
  }, 100);
}

export default defineContentScript({
  matches: ["*://github.com/*/pull/*"],
  runAt: "document_end",
  async main() {
    await initialize();

    // Handle GitHub SPA navigation (Turbo)
    document.addEventListener("turbo:load", () => {
      toggleElements = null;
      lastPageType = null;
      cleanupAttributes();
      removeToggle();
      debouncedInitialize(true);
    });

    document.addEventListener("turbo:render", () => {
      debouncedInitialize(true);
    });

    // Watch for dynamic content changes (lazy-loaded comments, tab switches)
    const observer = new MutationObserver((mutations) => {
      if (!isOnPRPage()) return;

      let shouldReinit = false;
      let newCommentsOnly = false;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            // Check for new experience toolbar (class contains module hash)
            const isNewToolbar =
              node.tagName === "SECTION" &&
              node.className?.includes?.("PullRequestFilesToolbar");
            if (
              node.classList?.contains("js-discussion") ||
              node.querySelector?.(".js-discussion") ||
              node.classList?.contains("pr-toolbar") ||
              node.querySelector?.(".pr-toolbar") ||
              isNewToolbar ||
              node.querySelector?.("section[class*='PullRequestFilesToolbar']")
            ) {
              shouldReinit = true;
              break;
            }
            if (
              node.classList?.contains("js-timeline-item") ||
              node.classList?.contains("js-resolvable-timeline-thread-container")
            ) {
              newCommentsOnly = true;
            }
          }
        }
        if (shouldReinit) break;
      }

      if (shouldReinit) {
        debouncedInitialize(true);
      } else if (newCommentsOnly && isEnabled) {
        // Just process new comments without re-injecting toggle
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => applyState(), 100);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  },
});
