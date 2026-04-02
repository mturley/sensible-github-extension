import {
  getConfig,
  saveConfig,
  isSiteEnabled,
  setSiteEnabled,
  getTokenError,
  setTokenError,
} from "@/services/storage";

const siteNameEl = document.getElementById("siteName") as HTMLDivElement;
const siteToggle = document.getElementById("siteToggle") as HTMLInputElement;
const tokenRequired = document.getElementById("tokenRequired") as HTMLDivElement;
const tokenWarning = document.getElementById("tokenWarning") as HTMLDivElement;
const patInput = document.getElementById("patInput") as HTMLInputElement;
const savePatBtn = document.getElementById("savePat") as HTMLButtonElement;
const clearPatBtn = document.getElementById("clearPat") as HTMLButtonElement;
const patStatus = document.getElementById("patStatus") as HTMLDivElement;
const notAvailable = document.getElementById("notAvailable") as HTMLDivElement;

let currentHostname: string | null = null;

function updateTokenState(hasPat: boolean, hasError: boolean) {
  tokenRequired.classList.toggle("visible", !hasPat);
  tokenWarning.classList.toggle("visible", hasPat && hasError);
}

async function init() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url;

  if (!url || url.startsWith("chrome://") || url.startsWith("about:")) {
    notAvailable.style.display = "block";
    siteToggle.parentElement!.parentElement!.parentElement!.style.display = "none";
    return;
  }

  try {
    const parsed = new URL(url);
    currentHostname = parsed.hostname;
    siteNameEl.textContent = currentHostname;
  } catch {
    notAvailable.style.display = "block";
    return;
  }

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
    patStatus.textContent = "Token cleared — Sensible GitHub is disabled without a token";
    patStatus.className = "pat-status error";
    updateTokenState(false, false);

    browser.runtime.sendMessage({ type: "configChanged" });
  });
}

init();
