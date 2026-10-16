/**
 * Input sanitization utilities to prevent special character injection.
 *
 * Allowed characters for general text fields:
 * - Letters (Latin, Devanagari, etc. via Unicode \p{L})
 * - Digits (\p{N})
 * - Spaces, hyphens, periods, commas, apostrophes, forward slashes
 *
 * BLOCKED characters include: < > { } [ ] ! @ $ % ^ * + ? | ~ ; = \ " `
 *
 * Address fields additionally allow: # ( ) : &
 */

// General text fields: letters, digits, whitespace, - . , ' /
const SAFE_TEXT_REGEX = /^[\p{L}\p{N}\s\-.,'/]+$/u;

// Address fields: also allow # ( ) : &
const SAFE_ADDRESS_REGEX = /^[\p{L}\p{N}\s\-.,'/()#:&]+$/u;

// Dangerous characters strictly forbidden even in free-text fields (notes, description, remarks)
const DANGEROUS_CHARS_REGEX = /[<>{}[\]]/;

// Fields that should skip validation entirely (passwords, tokens, base64)
const EXCLUDED_FIELDS = new Set([
  "password",
  "email",
  "session_key",
  "token",
  "otp",
  "photo_base64",
  "signature_base64",
]);

// Free-text fields that allow clinical punctuation (+, %, ?, newlines) but strictly block < > { } [ ]
const FREE_TEXT_FIELDS = new Set([
  "description",
  "notes",
  "remarks",
  "instructions",
  "clinical_notes",
  "history",
  "chief_complaint",
  "advice",
  "diagnosis",
  "reason",
  "summary",
]);

const EXCLUDED_SUFFIXES = ["_id", "_url", "_key", "_hash", "_code", "_base64", "_token"];

const ADDRESS_FIELDS = new Set([
  "address",
  "street",
  "landmark",
  "line1",
  "line2",
  "address_line_1",
  "address_line_2",
]);

function getCleanFieldName(fieldName: string): string {
  if (!fieldName) return "";
  const name = fieldName.toLowerCase().trim();
  const parts = name.split(".");
  return parts[parts.length - 1].split("[")[0];
}

function isExcludedField(fieldName: string): boolean {
  if (!fieldName) return false;
  const clean = getCleanFieldName(fieldName);
  if (EXCLUDED_FIELDS.has(clean) || EXCLUDED_FIELDS.has(fieldName.toLowerCase())) return true;
  return EXCLUDED_SUFFIXES.some((suffix) => clean.endsWith(suffix) || fieldName.toLowerCase().endsWith(suffix));
}

/**
 * Validates a single text field value against special characters.
 * Returns an error message string if invalid, or `null` if valid.
 */
export function validateNoSpecialChars(
  value: string | null | undefined,
  fieldName: string = ""
): string | null {
  if (!value || typeof value !== "string" || !value.trim()) return null;
  if (isExcludedField(fieldName)) return null;

  const clean = getCleanFieldName(fieldName);

  // Free-text fields: strictly block < > { } [ ]
  if (FREE_TEXT_FIELDS.has(clean) || FREE_TEXT_FIELDS.has(fieldName.toLowerCase())) {
    if (DANGEROUS_CHARS_REGEX.test(value)) {
      return "Special characters like < > { } [ ] are not allowed";
    }
    return null;
  }

  const pattern = ADDRESS_FIELDS.has(clean) || ADDRESS_FIELDS.has(fieldName.toLowerCase())
    ? SAFE_ADDRESS_REGEX
    : SAFE_TEXT_REGEX;

  if (!pattern.test(value)) {
    return "Special characters are not allowed";
  }

  return null;
}

/**
 * React Hook Form compatible validation rule.
 * Use in the `validate` option of `register()`.
 *
 * @example
 * register("first_name", {
 *   required: "First name is required",
 *   validate: noSpecialCharsRule("first_name"),
 * })
 */
export function noSpecialCharsRule(fieldName: string = "") {
  return (value?: string | null) => validateNoSpecialChars(value, fieldName) || true;
}

/**
 * Scans a request payload object for special characters.
 * Returns an array of field paths that contain violations.
 */
export function scanPayloadForSpecialChars(
  data: Record<string, unknown>,
  parentPath: string = ""
): string[] {
  const violations: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    const fieldPath = parentPath ? `${parentPath}.${key}` : key;

    if (isExcludedField(key)) continue;

    if (typeof value === "string" && value.trim()) {
      const error = validateNoSpecialChars(value, key);
      if (error) violations.push(fieldPath);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      violations.push(
        ...scanPayloadForSpecialChars(value as Record<string, unknown>, fieldPath)
      );
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === "string" && item.trim()) {
          const error = validateNoSpecialChars(item, key);
          if (error) violations.push(`${fieldPath}[${i}]`);
        } else if (item && typeof item === "object") {
          violations.push(
            ...scanPayloadForSpecialChars(
              item as Record<string, unknown>,
              `${fieldPath}[${i}]`
            )
          );
        }
      });
    }
  }

  return violations;
}
