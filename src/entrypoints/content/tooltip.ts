import type { PRData, ReviewEntry } from "@/services/github/types";
import { relativeTime, relativeTimeFromTimestamp } from "@/utils/relative-time";
import { latestReviewPerReviewer } from "@/services/review-staleness";

const TOOLTIP_CLASS = "prinfo-tooltip-host";
const HIDE_DELAY = 200;

let activeTooltip: HTMLElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const TOOLTIP_STYLES = `
  :host {
    position: fixed;
    z-index: 2147483647;
    pointer-events: auto;
  }
  .tooltip {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    padding: 12px 16px;
    max-width: 420px;
    min-width: 280px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    color: #e6edf3;
    pointer-events: auto;
  }
  .tooltip-header {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 8px;
  }
  .tooltip-title {
    font-weight: 600;
    font-size: 14px;
    color: #e6edf3;
    word-break: break-word;
  }
  .tooltip-number {
    color: #8b949e;
    font-weight: 400;
  }
  .tooltip-meta {
    color: #8b949e;
    font-size: 12px;
    margin-bottom: 8px;
  }
  .tooltip-meta span {
    margin-right: 8px;
  }
  .state-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    color: #fff;
  }
  .state-open { background: #1a7f37; }
  .state-merged { background: #8250df; }
  .state-closed { background: #cf222e; }
  .state-draft { background: #656d76; }
  .ci-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    margin-left: 8px;
  }
  .ci-success { color: #1a7f37; }
  .ci-failure { color: #cf222e; }
  .ci-pending { color: #bf8700; }
  .ci-none { color: #8b949e; }
  .section {
    border-top: 1px solid #30363d;
    padding-top: 8px;
    margin-top: 8px;
  }
  .section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: #8b949e;
    margin-bottom: 4px;
  }
  .reviewer {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
    font-size: 12px;
  }
  .review-state {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 500;
  }
  .review-approved { background: #1b4721; color: #3fb950; }
  .review-changes { background: #462c16; color: #d29922; }
  .review-commented { background: #12283e; color: #58a6ff; }
  .review-dismissed { background: #21262d; color: #8b949e; }
  .review-pending { background: #3b2e00; color: #d29922; }
  .review-stale {
    opacity: 0.5;
  }
  .stale-badge {
    font-size: 10px;
    color: #bf8700;
    font-weight: 500;
  }
  .comment-preview {
    font-size: 12px;
    color: #e6edf3;
  }
  .comment-author {
    font-weight: 600;
  }
  .comment-body {
    white-space: pre-wrap;
    word-break: break-word;
    color: #8b949e;
    margin-top: 2px;
  }
  .comment-time {
    color: #8b949e;
    font-size: 11px;
  }
`;

function ciIcon(status: PRData["ciStatus"]): string {
  switch (status) {
    case "success":
      return `<span class="ci-indicator ci-success">&#10003; CI passed</span>`;
    case "failure":
      return `<span class="ci-indicator ci-failure">&#10007; CI failed</span>`;
    case "pending":
      return `<span class="ci-indicator ci-pending">&#9679; CI pending</span>`;
    default:
      return "";
  }
}

function reviewStateBadge(state: ReviewEntry["state"]): string {
  const labels: Record<ReviewEntry["state"], { text: string; cls: string }> = {
    APPROVED: { text: "Approved", cls: "review-approved" },
    CHANGES_REQUESTED: { text: "Changes", cls: "review-changes" },
    COMMENTED: { text: "Comment", cls: "review-commented" },
    DISMISSED: { text: "Dismissed", cls: "review-dismissed" },
    PENDING: { text: "Pending", cls: "review-pending" },
  };
  const info = labels[state];
  return `<span class="review-state ${info.cls}">${info.text}</span>`;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderTooltipContent(data: PRData): string {
  const stateClass = data.isDraft ? "state-draft" : `state-${data.state}`;
  const stateText = data.isDraft ? "Draft" : data.state.charAt(0).toUpperCase() + data.state.slice(1);

  let html = `<div class="tooltip">`;

  // Header
  html += `<div class="tooltip-header">
    <span class="state-badge ${stateClass}">${stateText}</span>
    ${ciIcon(data.ciStatus)}
  </div>`;

  // Title
  html += `<div class="tooltip-title">${escapeHtml(data.title)} <span class="tooltip-number">#${data.number}</span></div>`;

  // Meta
  const fetchAge = Date.now() - data.fetchedAt;
  const fetchColor = fetchAge > 60 * 60 * 1000 ? "#bf8700" : "#8b949e";
  html += `<div class="tooltip-meta">
    <span>${escapeHtml(data.owner)}/${escapeHtml(data.repo)}</span>
    <span>by ${escapeHtml(data.author)}</span>
    <span>opened ${relativeTime(data.createdAt)}</span>
    <span>updated ${relativeTime(data.updatedAt)}</span>
    <span style="color:${fetchColor}">fetched ${relativeTimeFromTimestamp(data.fetchedAt)}</span>
  </div>`;

  // Reviews
  if (data.reviews.length > 0) {
    const latestByReviewer = latestReviewPerReviewer(data.reviews);
    html += `<div class="section">
      <div class="section-title">Reviews</div>`;
    for (const review of latestByReviewer) {
      const staleClass = review.isStale ? " review-stale" : "";
      const staleBadge = review.isStale ? ` <span class="stale-badge">stale</span>` : "";
      const time = review.submittedAt ? relativeTime(review.submittedAt) : "";
      html += `<div class="reviewer${staleClass}">
        <span>${escapeHtml(review.reviewer)}</span>
        ${reviewStateBadge(review.state)}${staleBadge}
        <span class="comment-time">${time}</span>
      </div>`;
    }
    html += `</div>`;
  }

  // Latest comment
  if (data.latestComment) {
    const c = data.latestComment;
    html += `<div class="section">
      <div class="section-title">Latest ${c.type === "review" ? "Review" : "Comment"}</div>
      <div class="comment-preview">
        <span class="comment-author">${escapeHtml(c.author)}</span>
        <span class="comment-time">${relativeTime(c.createdAt)}</span>
        <div class="comment-body">${escapeHtml(c.bodyPreview)}</div>
      </div>
    </div>`;
  }

  html += `</div>`;
  return html;
}

function positionTooltip(host: HTMLElement, anchorRect: DOMRect): void {
  const padding = 8;
  const tooltipWidth = 420;
  const tooltipHeight = 300;

  let left: number;
  let top: number;

  const spaceRight = window.innerWidth - anchorRect.right;
  const spaceLeft = anchorRect.left;

  if (spaceRight >= tooltipWidth + padding) {
    left = anchorRect.right + padding;
    top = anchorRect.top;
  } else if (spaceLeft >= tooltipWidth + padding) {
    left = anchorRect.left - tooltipWidth - padding;
    top = anchorRect.top;
  } else {
    left = anchorRect.left;
    top = anchorRect.bottom + padding;

    if (left + tooltipWidth > window.innerWidth) {
      left = window.innerWidth - tooltipWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    if (top + tooltipHeight > window.innerHeight) {
      top = anchorRect.top - tooltipHeight - padding;
    }
  }

  if (top + tooltipHeight > window.innerHeight) {
    top = window.innerHeight - tooltipHeight - padding;
  }
  if (top < padding) {
    top = padding;
  }

  host.style.left = `${left}px`;
  host.style.top = `${top}px`;
}

export function createTooltip(data: PRData, anchor: HTMLElement): HTMLElement {
  hideActiveTooltip();

  const host = document.createElement("div");
  host.className = TOOLTIP_CLASS;
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = TOOLTIP_STYLES;
  shadow.appendChild(style);

  const content = document.createElement("div");
  content.innerHTML = renderTooltipContent(data);
  shadow.appendChild(content);

  document.body.appendChild(host);

  const rect = anchor.getBoundingClientRect();
  positionTooltip(host, rect);

  host.addEventListener("mouseenter", () => hideActiveTooltip());

  activeTooltip = host;
  return host;
}

export function updateTooltipContent(data: PRData): void {
  if (!activeTooltip) return;
  const shadow = activeTooltip.shadowRoot;
  if (!shadow) return;

  const content = shadow.querySelector("div:not(style)") as HTMLDivElement;
  if (content) {
    content.innerHTML = renderTooltipContent(data);
  }
}

export function hideActiveTooltip(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}

export function scheduleHide(): void {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => hideActiveTooltip(), HIDE_DELAY);
}

export function cancelHide(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

export function isTooltipVisible(): boolean {
  return activeTooltip !== null;
}

export type TooltipState =
  | { type: "data"; data: PRData }
  | { type: "loading" }
  | { type: "no-token" }
  | { type: "error"; message: string };

function renderMessageContent(message: string, detail?: string): string {
  let html = `<div class="tooltip"><div class="tooltip-meta" style="margin-bottom:0">${escapeHtml(message)}</div>`;
  if (detail) {
    html += `<div class="tooltip-meta" style="margin-bottom:0;margin-top:4px">${escapeHtml(detail)}</div>`;
  }
  html += `</div>`;
  return html;
}

export function createMessageTooltip(state: TooltipState, anchor: HTMLElement): HTMLElement {
  if (state.type === "data") {
    return createTooltip(state.data, anchor);
  }

  hideActiveTooltip();

  const host = document.createElement("div");
  host.className = TOOLTIP_CLASS;
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = TOOLTIP_STYLES;
  shadow.appendChild(style);

  const content = document.createElement("div");
  if (state.type === "no-token") {
    content.innerHTML = renderMessageContent(
      "GitHub token required",
      "Click the Sensible GitHub extension icon to add your token."
    );
  } else if (state.type === "loading") {
    content.innerHTML = renderMessageContent("Loading PR data...");
  } else {
    content.innerHTML = renderMessageContent("Failed to load PR data", state.message);
  }
  shadow.appendChild(content);

  document.body.appendChild(host);
  const rect = anchor.getBoundingClientRect();
  positionTooltip(host, rect);

  host.addEventListener("mouseenter", () => hideActiveTooltip());

  activeTooltip = host;
  return host;
}

export function setupTooltipListeners(
  anchor: HTMLAnchorElement,
  getState: () => TooltipState,
  onHover?: () => void
): void {
  anchor.addEventListener("mouseenter", () => {
    if (anchor.isContentEditable) return;
    cancelHide();
    const state = getState();
    createMessageTooltip(state, anchor);
    onHover?.();
  });

  anchor.addEventListener("mouseleave", () => {
    scheduleHide();
  });
}
