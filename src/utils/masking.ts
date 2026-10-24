/**
 * Sensitive Data Masking Utilities
 *
 * Masks mobile numbers, ABHA numbers, and ABHA addresses to display only
 * the last 4 digits/characters while keeping the rest obscured for privacy.
 */

/**
 * Masks a mobile number to show only the last 4 digits.
 * e.g., "9876543210" -> "******3210"
 * e.g., "+91 9876543210" -> "+91 ******3210"
 */
export function maskMobileNumber(value?: string | null, maskChar = "*"): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  // Extract digits
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 4) {
    return maskChar.repeat(4);
  }

  const last4 = digits.slice(-4);
  const hasCountryCode = trimmed.startsWith("+91") || (digits.length === 12 && digits.startsWith("91"));

  if (hasCountryCode) {
    const hiddenCount = Math.max(0, digits.length - 2 - 4); // exclude '91' and last 4
    return `+91 ${maskChar.repeat(hiddenCount || 6)}${last4}`;
  }

  const hiddenCount = Math.max(0, digits.length - 4);
  return `${maskChar.repeat(hiddenCount || 6)}${last4}`;
}

/**
 * Standard ABDM Masking for 14-digit ABHA Number.
 * `91-6806-6252-7356` -> `XX-XXXX-XXXX-7356`
 */
export function maskAbhaNumber(value?: string | null): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) {
    return value.trim() ? "XX-XXXX-XXXX-XXXX" : "";
  }
  const last4 = digits.slice(-4);
  return `XX-XXXX-XXXX-${last4}`;
}

/**
 * Formats a raw or hypenated 14-digit ABHA number into standard ABDM format:
 * `91680662527356` -> `91-6806-6252-7356`
 */
export function formatAbhaNumber(value?: string | null): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) return value;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}-${digits.slice(10)}`;
}

/**
 * Masks an ABHA address username handle, showing only the last 4 characters
 * and preserving the `@domain` suffix.
 * e.g., "raghavendra@abdm" -> "*******ndra@abdm"
 * e.g., "john.doe@sbx" -> "****.doe@sbx"
 * e.g., "pat1234" -> "***1234"
 */
export function maskAbhaAddress(value?: string | null, maskChar = "*"): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (trimmed.includes("@")) {
    const parts = trimmed.split("@");
    const handle = parts[0];
    const domain = parts.slice(1).join("@");

    if (handle.length <= 4) {
      // Very short handle: mask first half
      const hideCount = Math.max(1, Math.floor(handle.length / 2));
      return `${maskChar.repeat(hideCount)}${handle.slice(hideCount)}@${domain}`;
    }

    const maskedHandle = `${maskChar.repeat(handle.length - 4)}${handle.slice(-4)}`;
    return `${maskedHandle}@${domain}`;
  }

  // Without domain
  if (trimmed.length <= 4) {
    return trimmed;
  }
  return `${maskChar.repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
}
