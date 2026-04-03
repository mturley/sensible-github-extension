const HIDDEN_ATTR = "data-sensible-bot-hidden";
const PLACEHOLDER_ATTR = "data-sensible-bot-placeholder";
const CHECKED_ATTR = "data-sensible-bot-checked";
const OVERRIDDEN_ATTR = "data-sensible-bot-overridden";

interface BotComment {
  element: HTMLElement;
  username: string;
  isReview: boolean;
}

const PLACEHOLDER_STYLES = [
  "display: flex",
  "align-items: center",
  "gap: 8px",
  "padding: 8px 16px",
  "margin: 8px 0",
  "background: var(--bgColor-muted, #f6f8fa)",
  "border: 1px solid var(--borderColor-default, #d0d7de)",
  "border-radius: 6px",
  "font-size: 12px",
  "color: var(--fgColor-muted, #656d76)",
  "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
].join("; ");

const TOGGLE_BTN_STYLES = [
  "background: none",
  "border: 1px solid var(--borderColor-default, #d0d7de)",
  "border-radius: 4px",
  "padding: 2px 8px",
  "font-size: 11px",
  "color: var(--fgColor-muted, #656d76)",
  "cursor: pointer",
  "font-family: inherit",
  "margin-left: auto",
].join("; ");

function isCommentItem(item: HTMLElement): boolean {
  if (item.querySelector(".comment-body, .js-comment-body")) return true;
  if (item.querySelector(".timeline-comment")) return true;
  return false;
}

function isReviewItem(item: HTMLElement): boolean {
  const gid = item.getAttribute("data-gid") || "";
  if (gid.startsWith("PRR_")) return true;
  if (item.querySelector("[id^='pullrequestreview']")) return true;
  return false;
}

/**
 * Detect if a timeline item is from a bot by looking for GitHub's "bot" badge
 * — a <span class="Label Label--secondary">bot</span> that is a sibling
 * of the a.author element in the comment header.
 */
function hasBotBadge(item: HTMLElement): boolean {
  const authorEl = item.querySelector("a.author");
  if (!authorEl) return false;

  let sibling = authorEl.nextElementSibling;
  while (sibling) {
    if (
      sibling.classList?.contains("Label") &&
      sibling.textContent?.trim().toLowerCase() === "bot"
    ) {
      return true;
    }
    sibling = sibling.nextElementSibling;
  }
  return false;
}

function findCommentItems(): { element: HTMLElement; isReview: boolean }[] {
  const items: { element: HTMLElement; isReview: boolean }[] = [];

  const discussion = document.querySelector(".js-discussion");
  if (discussion) {
    const timelineItems = discussion.querySelectorAll<HTMLElement>(
      ":scope > * > .js-timeline-item",
    );
    for (const item of timelineItems) {
      if (isCommentItem(item)) {
        items.push({ element: item, isReview: isReviewItem(item) });
      }
    }
  }

  const inlineThreads = document.querySelectorAll<HTMLElement>(
    ".js-resolvable-timeline-thread-container",
  );
  for (const thread of inlineThreads) {
    items.push({ element: thread, isReview: false });
  }

  return items;
}

function extractAuthor(item: HTMLElement): string | null {
  const authorEl = item.querySelector<HTMLAnchorElement>("a.author");
  if (authorEl) {
    return authorEl.textContent?.trim() || null;
  }
  return null;
}

function createPlaceholder(element: HTMLElement, username: string, isReview: boolean): HTMLElement {
  const placeholder = document.createElement("div");
  placeholder.setAttribute(PLACEHOLDER_ATTR, "true");
  placeholder.style.cssText = PLACEHOLDER_STYLES;

  const kind = isReview ? "review" : "comment";

  const text = document.createElement("span");
  text.textContent = `Bot ${kind} hidden (${username})`;

  const btn = document.createElement("button");
  btn.textContent = "Show";
  btn.style.cssText = TOGGLE_BTN_STYLES;

  // For regular comments, collapse the gap between placeholder and comment.
  // For reviews, keep the gap since they start with an event header.
  const innerTimelineItem = isReview ? null : element.querySelector<HTMLElement>(".TimelineItem");

  btn.addEventListener("click", () => {
    const isCurrentlyHidden = element.style.display === "none";
    if (isCurrentlyHidden) {
      element.style.display = "";
      element.setAttribute(OVERRIDDEN_ATTR, "true");
      if (innerTimelineItem) {
        placeholder.style.marginBottom = "0";
        innerTimelineItem.style.paddingTop = "0";
      }
      btn.textContent = "Hide";
      text.textContent = `Bot ${kind} shown (${username})`;
    } else {
      element.style.display = "none";
      element.removeAttribute(OVERRIDDEN_ATTR);
      if (innerTimelineItem) {
        placeholder.style.marginBottom = "";
        innerTimelineItem.style.paddingTop = "";
      }
      btn.textContent = "Show";
      text.textContent = `Bot ${kind} hidden (${username})`;
    }
  });

  placeholder.appendChild(text);
  placeholder.appendChild(btn);
  return placeholder;
}

function findBotComments(): BotComment[] {
  const items = findCommentItems();
  const botComments: BotComment[] = [];

  for (const { element, isReview } of items) {
    if (element.getAttribute(CHECKED_ATTR)) continue;
    element.setAttribute(CHECKED_ATTR, "true");

    if (hasBotBadge(element)) {
      const username = extractAuthor(element) || "bot";
      botComments.push({ element, username, isReview });
    }
  }

  return botComments;
}

export function hideBotComments(): number {
  const botComments = findBotComments();

  for (const { element, username, isReview } of botComments) {
    element.setAttribute(HIDDEN_ATTR, "true");
    element.style.display = "none";
    element.before(createPlaceholder(element, username, isReview));
  }

  return document.querySelectorAll(`[${HIDDEN_ATTR}]`).length;
}

export function showAllComments(): void {
  const hidden = document.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}]`);
  for (const item of hidden) {
    item.style.display = "";
    item.removeAttribute(HIDDEN_ATTR);
    item.removeAttribute(OVERRIDDEN_ATTR);
    const inner = item.querySelector<HTMLElement>(".TimelineItem");
    if (inner) inner.style.paddingTop = "";
  }

  const placeholders = document.querySelectorAll<HTMLElement>(`[${PLACEHOLDER_ATTR}]`);
  for (const p of placeholders) {
    p.remove();
  }

  const checked = document.querySelectorAll<HTMLElement>(`[${CHECKED_ATTR}]`);
  for (const item of checked) {
    item.removeAttribute(CHECKED_ATTR);
  }
}

export function cleanupAttributes(): void {
  const placeholders = document.querySelectorAll<HTMLElement>(`[${PLACEHOLDER_ATTR}]`);
  for (const p of placeholders) {
    p.remove();
  }

  for (const attr of [HIDDEN_ATTR, CHECKED_ATTR, OVERRIDDEN_ATTR]) {
    const elements = document.querySelectorAll<HTMLElement>(`[${attr}]`);
    for (const el of elements) {
      el.removeAttribute(attr);
      if (attr === HIDDEN_ATTR) {
        el.style.display = "";
        const inner = el.querySelector<HTMLElement>(".TimelineItem");
        if (inner) inner.style.paddingTop = "";
      }
    }
  }
}
