import type { PRData } from "@/services/github/types";

const ICON_CLASS = "prinfo-icon-host";

const STATE_COLORS: Record<PRData["state"], string> = {
  open: "#1a7f37",
  merged: "#8250df",
  closed: "#cf222e",
};

const STATE_LABELS: Record<PRData["state"], string> = {
  open: "Open",
  merged: "Merged",
  closed: "Closed",
};

function createSvgIcon(state: PRData["state"], isDraft: boolean): string {
  const color = isDraft ? "#656d76" : STATE_COLORS[state];
  const label = isDraft ? "Draft" : STATE_LABELS[state];

  // Official GitHub Octicons (primer/octicons)
  if (isDraft) {
    return `<svg aria-label="${label}" width="16" height="16" viewBox="0 0 16 16" fill="${color}" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.251 2.251 0 0 1 3.25 1Zm9.5 14a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5ZM2.5 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM3.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm9.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM14 7.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm0-4.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z"/>
    </svg>`;
  }

  if (state === "merged") {
    return `<svg aria-label="${label}" width="16" height="16" viewBox="0 0 16 16" fill="${color}" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0 0 .005V3.25Z"/>
    </svg>`;
  }

  if (state === "closed") {
    return `<svg aria-label="${label}" width="16" height="16" viewBox="0 0 16 16" fill="${color}" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.251 2.251 0 0 1 3.25 1Zm9.5 5.5a.75.75 0 0 1 .75.75v3.378a2.251 2.251 0 1 1-1.5 0V7.25a.75.75 0 0 1 .75-.75Zm-2.03-5.273a.75.75 0 0 1 1.06 0l.97.97.97-.97a.748.748 0 0 1 1.265.332.75.75 0 0 1-.205.729l-.97.97.97.97a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-.97-.97-.97.97a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l.97-.97-.97-.97a.75.75 0 0 1 0-1.06ZM2.5 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM3.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm9.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"/>
    </svg>`;
  }

  // open
  return `<svg aria-label="${label}" width="16" height="16" viewBox="0 0 16 16" fill="${color}" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"/>
  </svg>`;
}

function createLoadingPlaceholder(): string {
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#656d76;opacity:0.5;"></span>`;
}

const ICON_STYLES = `
  :host {
    display: inline-flex;
    align-items: center;
    margin-right: 4px;
    vertical-align: middle;
    line-height: 0;
  }
  .prinfo-icon {
    display: inline-flex;
    align-items: center;
    cursor: default;
  }
`;

export function injectLoadingIcon(anchor: HTMLAnchorElement): HTMLElement {
  const existingId = anchor.dataset.prinfoIconId;
  if (existingId) {
    const existing = document.getElementById(existingId);
    if (existing) return existing;
  }

  const host = document.createElement("span");
  const hostId = `prinfo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  host.id = hostId;
  anchor.dataset.prinfoIconId = hostId;
  host.className = ICON_CLASS;
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = ICON_STYLES;
  shadow.appendChild(style);

  const container = document.createElement("span");
  container.className = "prinfo-icon";
  container.innerHTML = createLoadingPlaceholder();
  shadow.appendChild(container);

  anchor.prepend(host);
  return host;
}

export function updateIcon(host: HTMLElement, data: PRData): void {
  const shadow = host.shadowRoot;
  if (!shadow) return;

  const container = shadow.querySelector(".prinfo-icon");
  if (!container) return;

  container.innerHTML = createSvgIcon(data.state, data.isDraft);
}

export function removeIcon(host: HTMLElement): void {
  host.remove();
}

export function getIconHost(anchor: HTMLAnchorElement): HTMLElement | null {
  const existingId = anchor.dataset.prinfoIconId;
  if (existingId) {
    return document.getElementById(existingId);
  }
  return null;
}

export function hasExistingNearbyIcon(anchor: HTMLAnchorElement): boolean {
  // Check if this anchor already contains an icon (e.g. from a nested child anchor being processed first)
  if (anchor.querySelector(`.${ICON_CLASS}`)) {
    return true;
  }
  // Check previous siblings at the same DOM level
  let el = anchor.previousElementSibling;
  while (el) {
    if (el.classList.contains(ICON_CLASS)) {
      return true;
    }
    el = el.previousElementSibling;
  }
  // Check ancestor boundary containers (e.g. Jira web link list items)
  const boundary = anchor.closest("li, tr, article, [role='listitem']");
  if (boundary?.querySelector(`.${ICON_CLASS}`)) {
    return true;
  }
  return false;
}

export function cleanupOrphanedIcons(root: Element): void {
  root.querySelectorAll<HTMLAnchorElement>("[data-prinfo-icon-id]").forEach((anchor) => {
    const iconId = anchor.dataset.prinfoIconId!;
    const icon = document.getElementById(iconId);
    if (icon) icon.remove();
    delete anchor.dataset.prinfoIconId;
  });
}

export function removeAllIcons(): void {
  document.querySelectorAll(`.${ICON_CLASS}`).forEach((el) => el.remove());
}
