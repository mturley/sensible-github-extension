import type { UserConfig } from "@/services/github/types";
import { encrypt, decrypt } from "@/utils/crypto";

const CONFIG_KEY = "prinfo_config";
const SITES_KEY = "prinfo_sites";
const TOKEN_ERROR_KEY = "prinfo_token_error";

export async function getConfig(): Promise<UserConfig> {
  const result = await storage.getItem<string>(`local:${CONFIG_KEY}`);
  if (!result) return { pat: null, globalEnabled: true };
  try {
    const config = JSON.parse(result) as {
      encryptedPat?: string;
      globalEnabled?: boolean;
    };
    let pat: string | null = null;
    if (config.encryptedPat) {
      pat = await decrypt(config.encryptedPat);
    }
    return { pat, globalEnabled: config.globalEnabled ?? true };
  } catch {
    return { pat: null, globalEnabled: true };
  }
}

export async function saveConfig(config: UserConfig): Promise<void> {
  let encryptedPat: string | undefined;
  if (config.pat) {
    encryptedPat = await encrypt(config.pat);
  }
  await storage.setItem(
    `local:${CONFIG_KEY}`,
    JSON.stringify({
      encryptedPat,
      globalEnabled: config.globalEnabled,
    })
  );
}

export async function getSitePreferences(): Promise<Record<string, boolean>> {
  const result = await storage.getItem<string>(`local:${SITES_KEY}`);
  if (!result) return {};
  try {
    return JSON.parse(result);
  } catch {
    return {};
  }
}

export async function setSiteEnabled(
  hostname: string,
  enabled: boolean
): Promise<void> {
  const prefs = await getSitePreferences();
  prefs[hostname] = enabled;
  await storage.setItem(`local:${SITES_KEY}`, JSON.stringify(prefs));
}

export async function isSiteEnabled(hostname: string): Promise<boolean> {
  const prefs = await getSitePreferences();
  return prefs[hostname] ?? true;
}

export async function setTokenError(hasError: boolean): Promise<void> {
  await storage.setItem(`local:${TOKEN_ERROR_KEY}`, JSON.stringify(hasError));
}

export async function getTokenError(): Promise<boolean> {
  const result = await storage.getItem<string>(`local:${TOKEN_ERROR_KEY}`);
  if (!result) return false;
  try {
    return JSON.parse(result);
  } catch {
    return false;
  }
}

// --- Hide bot comments ---

const HIDE_BOTS_KEY = "sensible_hide_bots";
const HIDE_BOTS_DEFAULT_KEY = "sensible_hide_bots_default";

export async function getHideBotsEnabled(): Promise<boolean> {
  const result = await storage.getItem<string>(`local:${HIDE_BOTS_KEY}`);
  if (!result) return true; // default enabled
  try {
    return JSON.parse(result);
  } catch {
    return true;
  }
}

export async function setHideBotsEnabled(enabled: boolean): Promise<void> {
  await storage.setItem(`local:${HIDE_BOTS_KEY}`, JSON.stringify(enabled));
}

export async function getHideBotsDefault(): Promise<boolean> {
  const result = await storage.getItem<string>(`local:${HIDE_BOTS_DEFAULT_KEY}`);
  if (!result) return false;
  try {
    return JSON.parse(result);
  } catch {
    return false;
  }
}

export async function setHideBotsDefault(enabled: boolean): Promise<void> {
  await storage.setItem(`local:${HIDE_BOTS_DEFAULT_KEY}`, JSON.stringify(enabled));
}

// --- Feature toggles ---

const PR_TOOLTIPS_KEY = "sensible_pr_tooltips_enabled";
const PR_TAB_TITLE_KEY = "sensible_pr_tab_title_enabled";

export async function getPrTooltipsEnabled(): Promise<boolean> {
  const result = await storage.getItem<string>(`local:${PR_TOOLTIPS_KEY}`);
  if (!result) return true; // default enabled
  try {
    return JSON.parse(result);
  } catch {
    return true;
  }
}

export async function setPrTooltipsEnabled(enabled: boolean): Promise<void> {
  await storage.setItem(`local:${PR_TOOLTIPS_KEY}`, JSON.stringify(enabled));
}

export async function getPrTabTitleEnabled(): Promise<boolean> {
  const result = await storage.getItem<string>(`local:${PR_TAB_TITLE_KEY}`);
  if (!result) return true; // default enabled
  try {
    return JSON.parse(result);
  } catch {
    return true;
  }
}

export async function setPrTabTitleEnabled(enabled: boolean): Promise<void> {
  await storage.setItem(`local:${PR_TAB_TITLE_KEY}`, JSON.stringify(enabled));
}

const COPY_LINK_KEY = "sensible_copy_link_enabled";

export async function getCopyLinkEnabled(): Promise<boolean> {
  const result = await storage.getItem<string>(`local:${COPY_LINK_KEY}`);
  if (!result) return true; // default enabled
  try {
    return JSON.parse(result);
  } catch {
    return true;
  }
}

export async function setCopyLinkEnabled(enabled: boolean): Promise<void> {
  await storage.setItem(`local:${COPY_LINK_KEY}`, JSON.stringify(enabled));
}
