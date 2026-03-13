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
