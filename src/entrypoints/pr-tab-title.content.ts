import { parsePRUrl } from "@/utils/pr-url-parser";
import { getPrTabTitleEnabled } from "@/services/storage";

const THRASH_WINDOW_MS = 2000;
const THRASH_MAX_ATTEMPTS = 5;

let lastTitleWeSet = "";
let recentAttempts: number[] = [];
let abandoned = false;

async function applyPrefix(): Promise<void> {
  if (abandoned) return;
  if (!await getPrTabTitleEnabled()) return;

  const prLink = parsePRUrl(window.location.href);
  if (!prLink) return;

  const prefix = `#${prLink.number} · `;

  // If the title is exactly what we last set, this mutation was caused by us — skip.
  if (document.title === lastTitleWeSet) return;

  if (!document.title.startsWith(prefix)) {
    const now = Date.now();
    recentAttempts = recentAttempts.filter((t) => now - t < THRASH_WINDOW_MS);
    recentAttempts.push(now);

    if (recentAttempts.length >= THRASH_MAX_ATTEMPTS) {
      console.warn("[sensible-github] Title prefix thrashing detected, abandoning updates for this tab.");
      abandoned = true;
      return;
    }

    lastTitleWeSet = prefix + document.title;
    document.title = lastTitleWeSet;
  } else {
    lastTitleWeSet = document.title;
  }
}

export default defineContentScript({
  matches: ["*://github.com/*/pull/*"],
  runAt: "document_end",
  main() {
    applyPrefix();

    new MutationObserver(() => applyPrefix()).observe(document.head, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  },
});
