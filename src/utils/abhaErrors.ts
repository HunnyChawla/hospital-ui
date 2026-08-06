import { getErrorMessage } from "./errorHandler";

/**
 * Machine-readable prefixes the ABHA service puts on errors the UI has to branch on
 * (hms/abha/service/abha_service.py). They must never reach the user, so every ABHA error
 * should go through getAbhaError() rather than getErrorMessage() directly.
 */
const ABHA_ERROR_PREFIXES = ["ABHA_DUPLICATE", "ABHA_MISMATCH"] as const;

export type AbhaErrorCode = (typeof ABHA_ERROR_PREFIXES)[number] | "SESSION_EXPIRED" | null;

export interface AbhaError {
  code: AbhaErrorCode;
  /** Display-ready message with any machine prefix stripped. */
  message: string;
}

/**
 * Classify an ABHA API error and strip its machine prefix.
 *
 * - ABHA_DUPLICATE: this ABHA is already linked to a different patient.
 * - ABHA_MISMATCH:  the profile's DOB/gender don't match the target patient.
 * - SESSION_EXPIRED: the cached ABDM verification is gone; enrollment must restart.
 *   Matched on wording rather than an exact string because the backend raises several
 *   variants ("Session expired or invalid session_key", "session has expired").
 */
export function getAbhaError(error: unknown, defaultMessage?: string): AbhaError {
  const raw = getErrorMessage(error) || defaultMessage || "Something went wrong with ABHA.";

  for (const prefix of ABHA_ERROR_PREFIXES) {
    if (raw.startsWith(`${prefix}:`)) {
      return { code: prefix, message: raw.slice(prefix.length + 1).trim() };
    }
  }

  if (/session\b.*\bexpired|expired.*\bsession\b/i.test(raw)) {
    return { code: "SESSION_EXPIRED", message: raw };
  }

  return { code: null, message: raw };
}
