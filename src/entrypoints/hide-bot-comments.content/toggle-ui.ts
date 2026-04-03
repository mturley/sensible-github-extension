const TOGGLE_ID = "sensible-bot-toggle";

const TOGGLE_STYLES = `
  :host {
    display: block;
  }
  :host(.standalone) {
    margin: 8px 0 16px 0;
  }
  :host(.toolbar) {
    margin: 0;
    margin-left: 8px;
    display: flex;
    align-items: center;
  }
  .toggle-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 13px;
  }
  :host(.toolbar) .toggle-bar {
    padding: 4px 8px;
    font-size: 12px;
  }
  .toggle-bar.light {
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    color: #1f2328;
  }
  :host(.toolbar) .toggle-bar.light {
    background: transparent;
    border: none;
  }
  .toggle-bar.dark {
    background: #161b22;
    border: 1px solid #30363d;
    color: #e6edf3;
  }
  :host(.toolbar) .toggle-bar.dark {
    background: transparent;
    border: none;
  }
  .toggle-label {
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .toggle-switch {
    position: relative;
    width: 34px;
    height: 18px;
    flex-shrink: 0;
  }
  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  }
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: #656d76;
    border-radius: 9px;
    transition: background-color 0.2s;
  }
  .slider::before {
    position: absolute;
    content: "";
    height: 12px;
    width: 12px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }
  .toggle-switch input:checked + .slider {
    background-color: #1a7f37;
  }
  .toggle-switch input:checked + .slider::before {
    transform: translateX(16px);
  }
  .count {
    font-size: 12px;
    opacity: 0.7;
  }
`;

function getTheme(): "light" | "dark" {
  const mode = document.documentElement.getAttribute("data-color-mode");
  if (mode === "dark") return "dark";
  if (mode === "auto") {
    const scheme = document.documentElement.getAttribute("data-dark-theme");
    if (scheme && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  }
  return "light";
}

export interface ToggleElements {
  host: HTMLElement;
  checkbox: HTMLInputElement;
  countSpan: HTMLSpanElement;
}

type ToggleMode = "standalone" | "toolbar";

function createToggleHost(
  mode: ToggleMode,
  initialState: boolean,
  onToggle: (enabled: boolean) => void,
): { host: HTMLElement; checkbox: HTMLInputElement; countSpan: HTMLSpanElement } {
  const host = document.createElement("div");
  host.id = TOGGLE_ID;
  host.className = mode;
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = TOGGLE_STYLES;
  shadow.appendChild(style);

  const theme = getTheme();

  const bar = document.createElement("div");
  bar.className = `toggle-bar ${theme}`;

  const label = document.createElement("label");
  label.className = "toggle-label";

  const switchContainer = document.createElement("span");
  switchContainer.className = "toggle-switch";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = initialState;

  const slider = document.createElement("span");
  slider.className = "slider";

  switchContainer.appendChild(checkbox);
  switchContainer.appendChild(slider);

  const labelText = document.createElement("span");
  labelText.textContent = "Show human comments only";

  label.appendChild(switchContainer);
  label.appendChild(labelText);

  const countSpan = document.createElement("span");
  countSpan.className = "count";

  bar.appendChild(label);
  bar.appendChild(countSpan);
  shadow.appendChild(bar);

  checkbox.addEventListener("change", () => {
    onToggle(checkbox.checked);
  });

  return { host, checkbox, countSpan };
}

/**
 * Inject toggle after the PR description on the conversation tab.
 * The description is in the first rails-partial child of .js-discussion;
 * the comments timeline is in the second.
 */
export function injectConversationToggle(
  initialState: boolean,
  onToggle: (enabled: boolean) => void,
): ToggleElements | null {
  const existing = document.getElementById(TOGGLE_ID);
  if (existing) existing.remove();

  const discussion = document.querySelector(".js-discussion");
  if (!discussion) return null;

  // The first direct child contains the PR body, comments follow after it
  const firstChild = discussion.children[0];
  if (!firstChild) return null;

  const { host, checkbox, countSpan } = createToggleHost("standalone", initialState, onToggle);

  // Insert after the PR description (first child), before the comments
  firstChild.after(host);

  return { host, checkbox, countSpan };
}

/**
 * Inject toggle into the sticky toolbar on the Files Changed tab.
 * Supports three modes:
 * - Classic (logged out): .pr-toolbar with .pr-review-tools (may be empty)
 * - Classic (logged in): .pr-toolbar with .pr-review-tools containing "viewed" counter
 * - New experience: <section> with PullRequestFilesToolbar-module__toolbar class
 * Places toggle before the "viewed" counter / review tools area.
 */
export function injectFilesChangedToggle(
  initialState: boolean,
  onToggle: (enabled: boolean) => void,
): ToggleElements | null {
  const existing = document.getElementById(TOGGLE_ID);
  if (existing) existing.remove();

  const { host, checkbox, countSpan } = createToggleHost("toolbar", initialState, onToggle);

  // New experience: insert before the file-controls div (contains "X / Y viewed")
  const newToolbar = document.querySelector<HTMLElement>(
    "section[class*='PullRequestFilesToolbar-module__toolbar']",
  );
  if (newToolbar) {
    const fileControls = newToolbar.querySelector<HTMLElement>("[class*='file-controls']");
    if (fileControls) {
      fileControls.before(host);
    } else {
      // Fallback: append to the right-side stack (last child div)
      const rightStack = newToolbar.children[newToolbar.children.length - 1];
      if (rightStack) {
        rightStack.prepend(host);
      } else {
        newToolbar.appendChild(host);
      }
    }
    return { host, checkbox, countSpan };
  }

  // Classic: insert before .pr-review-tools (contains "viewed" counter + review button)
  const reviewTools = document.querySelector(".pr-toolbar .pr-review-tools");
  if (reviewTools) {
    reviewTools.before(host);
    return { host, checkbox, countSpan };
  }

  // Fallback: append to the diffbar
  const diffbar = document.querySelector(".pr-toolbar .diffbar");
  if (diffbar) {
    diffbar.appendChild(host);
    return { host, checkbox, countSpan };
  }

  return null;
}

export function updateToggleCount(countSpan: HTMLSpanElement, count: number): void {
  countSpan.textContent = count > 0 ? `(${count} hidden)` : "";
}

export function removeToggle(): void {
  const existing = document.getElementById(TOGGLE_ID);
  if (existing) existing.remove();
}
