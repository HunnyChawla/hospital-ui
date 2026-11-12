export const IMPERSONATION_TAB_FLAG = "cura_impersonation_tab";
export const IMPERSONATION_META_KEY = "cura_impersonation_meta";

export const AUTH_SESSION_KEYS = new Set<string>([
  "auth_token",
  "user_id",
  "tenant_id",
  "role",
  "user_role",
  "must_change_password",
  "consent_required",
  "feature_flags",
  "user_permissions",
  "tenant_labels",
  "cura_sidebar_groups",
  "hospital_id",
  IMPERSONATION_META_KEY,
]);

export const AUTH_SESSION_KEY_PREFIXES = ["panel_config_"] as const;

export function isIsolatedAuthKey(key: string): boolean {
  if (AUTH_SESSION_KEYS.has(key)) return true;
  return AUTH_SESSION_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export interface ImpersonationSessionMeta {
  targetUserId: string;
  targetName: string;
  targetEmail?: string | null;
  targetRole: string;
  tenantId: string;
  tenantName: string;
  tenantSubdomain?: string | null;
  impersonatedByUserId: string;
  impersonatedByName?: string | null;
  startedAt: string;
}

let _storageInstalled = false;

/**
 * Check whether the current browser tab is an isolated impersonation tab.
 */
export function isImpersonationSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(IMPERSONATION_TAB_FLAG) === "1";
  } catch {
    return false;
  }
}

/**
 * Redirect auth/session keys on window.localStorage to window.sessionStorage
 * when running inside an impersonation tab so the original tab's Platform Owner
 * session on the same host is never overwritten.
 */
export function installTabIsolatedAuthStorage(): void {
  if (typeof window === "undefined" || _storageInstalled) return;
  _storageInstalled = true;

  try {
    const proto = Storage.prototype;
    const origGet = proto.getItem;
    const origSet = proto.setItem;
    const origRemove = proto.removeItem;

    const shouldIsolate = (target: Storage, key: string): boolean => {
      if (target !== window.localStorage) return false;
      if (!isIsolatedAuthKey(key)) return false;
      return origGet.call(window.sessionStorage, IMPERSONATION_TAB_FLAG) === "1";
    };

    proto.getItem = function (this: Storage, key: string): string | null {
      if (shouldIsolate(this, key)) {
        return origGet.call(window.sessionStorage, key);
      }
      return origGet.call(this, key);
    };

    proto.setItem = function (this: Storage, key: string, value: string): void {
      if (shouldIsolate(this, key)) {
        origSet.call(window.sessionStorage, key, value);
        return;
      }
      origSet.call(this, key, value);
    };

    proto.removeItem = function (this: Storage, key: string): void {
      if (shouldIsolate(this, key)) {
        origRemove.call(window.sessionStorage, key);
        return;
      }
      origRemove.call(this, key);
    };
  } catch {
    // Ignore storage prototype lock errors in restricted environments
  }
}

/**
 * Mark this tab as an isolated impersonation session backed by sessionStorage.
 */
export function activateImpersonationTabStorage(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(IMPERSONATION_TAB_FLAG, "1");
  installTabIsolatedAuthStorage();
}

export function setImpersonationMeta(meta: ImpersonationSessionMeta): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(IMPERSONATION_META_KEY, JSON.stringify(meta));
}

export function getImpersonationMeta(): ImpersonationSessionMeta | null {
  if (typeof window === "undefined" || !isImpersonationSession()) return null;
  try {
    const raw = window.sessionStorage.getItem(IMPERSONATION_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ImpersonationSessionMeta;
  } catch {
    return null;
  }
}

export function clearImpersonationTabStorage(): void {
  if (typeof window === "undefined") return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < window.sessionStorage.length; i += 1) {
    const key = window.sessionStorage.key(i);
    if (key && (key === IMPERSONATION_TAB_FLAG || isIsolatedAuthKey(key))) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    window.sessionStorage.removeItem(key);
  }
}

if (typeof window !== "undefined") {
  installTabIsolatedAuthStorage();
}
