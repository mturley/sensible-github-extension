const COPY_CLASS = "prinfo-copy-host";

function createLinkSvg(): string {
  // Octicons "link" icon
  return `<svg aria-label="Copy link" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="m7.775 3.275 1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0 .751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018 1.998 1.998 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042Zm-4.69 9.64a1.998 1.998 0 0 0 2.83 0l1.25-1.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0 .751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018 1.998 1.998 0 0 0-2.83 0l-2.5 2.5a1.998 1.998 0 0 0 0 2.83Z"/>
  </svg>`;
}

const COPY_STYLES = `
  :host {
    display: inline-flex;
    align-items: center;
    margin-left: 4px;
    vertical-align: middle;
    line-height: 0;
  }
  .copy-link-btn {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    color: #656d76;
    border: none;
    background: none;
    padding: 0;
    border-radius: 3px;
    transition: color 0.15s;
  }
  .copy-link-btn:hover {
    color: #0969da;
  }
  .copy-link-btn.copied {
    color: #1a7f37;
  }
`;

export function injectCopyLink(anchor: HTMLAnchorElement): HTMLElement | null {
  const existingId = anchor.dataset.prinfoCopyId;
  if (existingId) {
    const existing = document.getElementById(existingId);
    if (existing) return existing;
  }

  const host = document.createElement("span");
  const hostId = `prinfo-copy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  host.id = hostId;
  anchor.dataset.prinfoCopyId = hostId;
  host.className = COPY_CLASS;
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = COPY_STYLES;
  shadow.appendChild(style);

  const btn = document.createElement("button");
  btn.className = "copy-link-btn";
  btn.title = "Copy link";
  btn.innerHTML = createLinkSvg();
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(anchor.href).then(() => {
      btn.classList.add("copied");
      btn.title = "Copied!";
      setTimeout(() => {
        btn.classList.remove("copied");
        btn.title = "Copy link";
      }, 1500);
    });
  });
  shadow.appendChild(btn);

  // Insert after the anchor
  anchor.after(host);
  return host;
}

export function removeAllCopyLinks(): void {
  document.querySelectorAll(`.${COPY_CLASS}`).forEach((el) => el.remove());
}

export function cleanupOrphanedCopyLinks(root: Element): void {
  root.querySelectorAll<HTMLAnchorElement>("[data-prinfo-copy-id]").forEach((anchor) => {
    const copyId = anchor.dataset.prinfoCopyId!;
    const el = document.getElementById(copyId);
    if (el) el.remove();
    delete anchor.dataset.prinfoCopyId;
  });
}
