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

/**
 * ABDM M1 Certification (CRT_ABHA_112) ABHA Address Validation Rules:
 * 1. Minimum length - 8 characters
 * 2. Maximum length - 18 characters
 * 3. Special characters allowed - 1 dot (.) and/or 1 underscore (_)
 * 4. Special character dot and underscore should be in between. Special characters cannot be in the beginning or at the end
 * 5. Alphanumeric - only numbers, only letters or any combination of numbers and letters is allowed.
 */
export interface AbhaAddressValidationResult {
    isValid: boolean;
    error: string | null;
    ruleStatuses: {
        minLength: boolean;        // 1. Minimum length - 8 characters
        maxLength: boolean;        // 2. Maximum length - 18 characters
        specialCharCount: boolean; // 3. Special characters allowed - 1 dot (.) and/or 1 underscore (_)
        inBetween: boolean;        // 4. Dot and underscore should be in between (not at start or end, not adjacent)
        alphanumeric: boolean;     // 5. Alphanumeric - only numbers, only letters or any combination allowed
    };
}

export function validateAbhaAddress(input?: string | null): AbhaAddressValidationResult {
    const clean = (input || "").trim().toLowerCase().split("@")[0];

    if (!clean) {
        return {
            isValid: false,
            error: "ABHA address cannot be empty",
            ruleStatuses: {
                minLength: false,
                maxLength: true,
                specialCharCount: true,
                inBetween: false,
                alphanumeric: false,
            },
        };
    }

    // 1. Minimum length - 8 characters
    const minLength = clean.length >= 8;

    // 2. Maximum length - 18 characters
    const maxLength = clean.length <= 18;

    // 3. Special characters allowed - 1 dot (.) and/or 1 underscore (_)
    const dotCount = (clean.match(/\./g) || []).length;
    const underscoreCount = (clean.match(/_/g) || []).length;
    const specialCharCount = dotCount <= 1 && underscoreCount <= 1;

    // 4. Special character dot and underscore should be in between. Special characters cannot be in the beginning or at the end
    const notAtStart = !clean.startsWith(".") && !clean.startsWith("_");
    const notAtEnd = !clean.endsWith(".") && !clean.endsWith("_");
    const notAdjacent = !/\._|_\./.test(clean);
    const inBetween = notAtStart && notAtEnd && notAdjacent;

    // 5. Alphanumeric - only numbers, only letters or any combination of numbers and letters is allowed
    const onlyAllowedChars = /^[a-z0-9._]+$/.test(clean);
    const hasAlphanumeric = /[a-z0-9]/.test(clean);
    const alphanumeric = onlyAllowedChars && hasAlphanumeric;

    let error: string | null = null;
    if (!onlyAllowedChars) {
        error = "Only letters, numbers, dot (.), and underscore (_) are allowed";
    } else if (!notAtStart) {
        error = "ABHA address cannot start with a dot (.) or underscore (_)";
    } else if (!notAtEnd) {
        error = "ABHA address cannot end with a dot (.) or underscore (_)";
    } else if (!notAdjacent) {
        error = "Dot (.) and underscore (_) cannot be next to each other";
    } else if (dotCount > 1) {
        error = "Only 1 dot (.) is allowed in ABHA address";
    } else if (underscoreCount > 1) {
        error = "Only 1 underscore (_) is allowed in ABHA address";
    } else if (!minLength) {
        error = `ABHA address must be at least 8 characters (currently ${clean.length})`;
    } else if (!maxLength) {
        error = `ABHA address cannot exceed 18 characters (currently ${clean.length})`;
    }

    const isValid = minLength && maxLength && specialCharCount && inBetween && alphanumeric;

    return {
        isValid,
        error: isValid ? null : error,
        ruleStatuses: {
            minLength,
            maxLength,
            specialCharCount,
            inBetween,
            alphanumeric,
        },
    };
}

