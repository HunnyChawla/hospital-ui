/**
 * Telling a real ABHA number from whatever else ended up in the field.
 *
 * ⚠️ `abha_id` IS A LEGACY COLUMN AND IT CONTAINS UHIDs.
 *
 * Patients in the live database carry rows like:
 *
 *     uhid        = UHID-2025-00004
 *     abha_id     = UHID-2025-00004     <-- the hospital's own id
 *     abha_number = 91-6806-6252-7356   <-- the actual ABHA
 *
 * The UI read `abha_id` and displayed it as the patient's health ID, so the
 * badge next to a patient's name showed our own UHID while their real ABHA sat
 * unused one column over. It looks plausible — it is an identifier, in the
 * right place, formatted like an id — which is exactly why nobody noticed.
 *
 * So the value is validated by shape rather than trusted by column name. An
 * ABHA number is 14 digits, conventionally written `91-6806-6252-7356`.
 */

/** 14 digits, with or without the conventional hyphens. */
const ABHA_NUMBER_PATTERN = /^\d{14}$/;

export function isAbhaNumber(value?: string | null): boolean {
    if (!value) return false;
    return ABHA_NUMBER_PATTERN.test(value.replace(/[\s-]/g, ""));
}

/**
 * The patient's real ABHA number, or null.
 *
 * Prefers `abha_number`; falls back to the legacy `abha_id` only when that
 * actually holds an ABHA rather than a UHID.
 */
export function resolveAbhaNumber(
    abhaNumber?: string | null,
    legacyAbhaId?: string | null
): string | null {
    if (isAbhaNumber(abhaNumber)) return abhaNumber!;
    if (isAbhaNumber(legacyAbhaId)) return legacyAbhaId!;
    return null;
}

/**
 * `91-6806-6252-7356` → `XX-XXXX-XXXX-7356`.
 *
 * A registration desk is a public place. The last four digits are enough for a
 * patient to recognise their own account; the rest is theirs to keep, and
 * ABDM's own guidance masks the ABHA card the same way.
 */
export function maskAbhaNumber(value?: string | null): string | null {
    const digits = (value || "").replace(/\D/g, "");
    if (digits.length < 4) return null;
    return `XX-XXXX-XXXX-${digits.slice(-4)}`;
}

/** `91-6806-6252-7356` from `91680662527356`, for display. */
export function formatAbhaNumber(value?: string | null): string | null {
    const digits = (value || "").replace(/\D/g, "");
    if (digits.length !== 14) return value || null;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}-${digits.slice(10)}`;
}
