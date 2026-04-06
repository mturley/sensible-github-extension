import {
  getConfig,
  saveConfig,
  isSiteEnabled,
  setSiteEnabled,
  getTokenError,
  setTokenError,
  getPrTooltipsEnabled,
  setPrTooltipsEnabled,
  getHideBotsEnabled,
  setHideBotsEnabled,
  getHideBotsDefault,
  setHideBotsDefault,
  getPrTabTitleEnabled,
  setPrTabTitleEnabled,
  getCopyLinkEnabled,
  setCopyLinkEnabled,
} from "@/services/storage";

// PR Tooltips elements
const prTooltipsToggle = document.getElementById("prTooltipsToggle") as HTMLInputElement;
const prTooltipsBody = document.getElementById("prTooltipsBody") as HTMLDivElement;
const siteNameEl = document.getElementById("siteName") as HTMLDivElement;
const siteToggle = document.getElementById("siteToggle") as HTMLInputElement;
const tokenRequired = document.getElementById("tokenRequired") as HTMLDivElement;
const tokenWarning = document.getElementById("tokenWarning") as HTMLDivElement;
const patInput = document.getElementById("patInput") as HTMLInputElement;
const savePatBtn = document.getElementById("savePat") as HTMLButtonElement;
const clearPatBtn = document.getElementById("clearPat") as HTMLButtonElement;
const patStatus = document.getElementById("patStatus") as HTMLDivElement;

// Hide Bot Comments elements
const hideBotToggle = document.getElementById("hideBotToggle") as HTMLInputElement;
const hideBotBody = document.getElementById("hideBotBody") as HTMLDivElement;
const hideBotDefaultToggle = document.getElementById("hideBotDefaultToggle") as HTMLInputElement;

// Copy PR Link elements
const copyLinkToggle = document.getElementById("copyLinkToggle") as HTMLInputElement;

// PR Tab Title elements
const prTabTitleToggle = document.getElementById("prTabTitleToggle") as HTMLInputElement;

const siteToggleRow = document.getElementById("siteToggleRow") as HTMLLabelElement;

let currentHostname: string | null = null;

function updateTokenState(hasPat: boolean, hasError: boolean) {
  tokenRequired.classList.toggle("visible", !hasPat);
  tokenWarning.classList.toggle("visible", hasPat && hasError);
}

function updateFeatureBody(toggle: HTMLInputElement, body: HTMLDivElement) {
  body.hidden = !toggle.checked;
}

async function init() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url;
  let siteAvailable = false;

  if (url && !url.startsWith("chrome://") && !url.startsWith("about:")) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname !== "github.com" && parsed.hostname !== "localhost") {
        currentHostname = parsed.hostname;
        siteNameEl.textContent = currentHostname;
        siteAvailable = true;
      }
    } catch {
      // not a valid URL, leave site toggle disabled
    }
  }

  if (!siteAvailable) {
    siteToggleRow.style.display = "none";
  }

  // --- Feature toggles ---

  const prTooltipsEnabled = await getPrTooltipsEnabled();
  prTooltipsToggle.checked = prTooltipsEnabled;
  updateFeatureBody(prTooltipsToggle, prTooltipsBody);

  prTooltipsToggle.addEventListener("change", async () => {
    await setPrTooltipsEnabled(prTooltipsToggle.checked);
    updateFeatureBody(prTooltipsToggle, prTooltipsBody);
    browser.runtime.sendMessage({ type: "configChanged" });
  });

  const hideBotsEnabled = await getHideBotsEnabled();
  hideBotToggle.checked = hideBotsEnabled;
  updateFeatureBody(hideBotToggle, hideBotBody);

  hideBotToggle.addEventListener("change", async () => {
    await setHideBotsEnabled(hideBotToggle.checked);
    updateFeatureBody(hideBotToggle, hideBotBody);
  });

  const hideBotsDefault = await getHideBotsDefault();
  hideBotDefaultToggle.checked = hideBotsDefault;

  hideBotDefaultToggle.addEventListener("change", async () => {
    await setHideBotsDefault(hideBotDefaultToggle.checked);
  });

  const copyLinkEnabled = await getCopyLinkEnabled();
  copyLinkToggle.checked = copyLinkEnabled;

  copyLinkToggle.addEventListener("change", async () => {
    await setCopyLinkEnabled(copyLinkToggle.checked);
    browser.runtime.sendMessage({ type: "configChanged" });
  });

  const prTabTitleEnabled = await getPrTabTitleEnabled();
  prTabTitleToggle.checked = prTabTitleEnabled;

  prTabTitleToggle.addEventListener("change", async () => {
    await setPrTabTitleEnabled(prTabTitleToggle.checked);
  });

  // --- Site toggle (PR Tooltips) ---

  if (siteAvailable && currentHostname) {
    const enabled = await isSiteEnabled(currentHostname);
    siteToggle.checked = enabled;

    siteToggle.addEventListener("change", async () => {
      if (!currentHostname) return;
      await setSiteEnabled(currentHostname, siteToggle.checked);

      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id) {
        browser.tabs.sendMessage(activeTab.id, {
          type: siteToggle.checked ? "siteEnabled" : "siteDisabled",
        });
      }
    });
  }

  // --- GitHub Token ---

  const config = await getConfig();
  const hasTokenError = await getTokenError();
  updateTokenState(!!config.pat, hasTokenError);

  if (config.pat) {
    patInput.placeholder = "Token saved";
  }

  savePatBtn.addEventListener("click", async () => {
    const token = patInput.value.trim();
    if (!token) {
      patStatus.textContent = "Please enter a token";
      patStatus.className = "pat-status error";
      return;
    }

    patStatus.textContent = "Validating...";
    patStatus.className = "pat-status";

    try {
      const response = await fetch("https://api.github.com/user", {
        headers: { Authorization: `bearer ${token}` },
      });

      if (response.ok) {
        const currentConfig = await getConfig();
        await saveConfig({ ...currentConfig, pat: token });
        await setTokenError(false);
        patInput.value = "";
        patInput.placeholder = "Token saved";
        patStatus.textContent = "Token saved and validated";
        patStatus.className = "pat-status success";
        updateTokenState(true, false);

        browser.runtime.sendMessage({ type: "configChanged" });
      } else {
        patStatus.textContent = `Invalid token (${response.status})`;
        patStatus.className = "pat-status error";
      }
    } catch {
      patStatus.textContent = "Failed to validate token";
      patStatus.className = "pat-status error";
    }
  });

  clearPatBtn.addEventListener("click", async () => {
    const currentConfig = await getConfig();
    await saveConfig({ ...currentConfig, pat: null });
    await setTokenError(false);
    patInput.value = "";
    patInput.placeholder = "ghp_...";
    patStatus.textContent = "Token cleared";
    patStatus.className = "pat-status error";
    updateTokenState(false, false);

    browser.runtime.sendMessage({ type: "configChanged" });
  });

}

init();
