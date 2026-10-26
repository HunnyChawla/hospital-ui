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

// General text fields: letters, digits, underscore, whitespace, - . , ' /
const SAFE_TEXT_REGEX = /^[\p{L}\p{N}_\s\-.,'/]+$/u;

// Address fields: also allow # ( ) : &
const SAFE_ADDRESS_REGEX = /^[\p{L}\p{N}_\s\-.,'/()#:&]+$/u;

// Phone number pattern: allows +, digits, spaces, -, (, ), .
const SAFE_PHONE_REGEX = /^[+\d\s\-().]{3,30}$/;

// Safe URL / website pattern: http/https or domain, path, query, hash without < > { } [ ] " ' ` \ |
const SAFE_URL_REGEX = /^(https?:\/\/|\/)?[a-zA-Z0-9/]([a-zA-Z0-9\-._~:/?#&=%+@,;]*)$/i;

// ISO datetime and time formats
const ISO_DATE_TIME_REGEX =
  /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const TIME_REGEX = /^\d{1,2}:\d{2}(:\d{2})?$/;

// Dangerous characters strictly forbidden even in free-text fields (notes, description, remarks)
const DANGEROUS_CHARS_REGEX = /[<>{}[\]]/;

// Fields that should skip validation entirely (passwords, tokens, base64)
const EXCLUDED_FIELDS = new Set([
  "password",
  "new_password",
  "current_password",
  "confirm_password",
  "hashed_password",
  "email",
  "session_key",
  "token",
  "otp",
  "refresh_token",
  "access_token",
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

const PHONE_FIELDS = new Set([
  "phone",
  "phone_no",
  "phone_number",
  "mobile",
  "mobile_no",
  "mobile_number",
  "contact",
  "contact_no",
  "contact_number",
  "emergency_contact",
  "patient_mobile",
  "user_mobile",
  "occupied_by_patient_mobile",
  "guardian_mobile",
  "whatsapp",
  "whatsapp_no",
  "telephone",
  "tel",
  "fax",
  "destination",
]);

const PHONE_SUFFIXES = [
  "_phone",
  "_phone_no",
  "_mobile",
  "_mobile_no",
  "_contact",
  "_tel",
];

const URL_FIELDS = new Set([
  "website",
  "url",
  "link",
  "web_url",
  "portal_url",
  "logo_url",
  "redirect_url",
  "callback_url",
  "domain",
  "subdomain",
  "logo",
  "download_url",
  "image_url",
  "voice_recording_url",
  "discharge_summary_pdf_url",
  "qr_url",
  "qr_image_url",
]);

const URL_SUFFIXES = [
  "_url",
  "_link",
  "_website",
];

const EXCLUDED_SUFFIXES = [
  "_id",
  "_url",
  "_key",
  "_hash",
  "_code",
  "_base64",
  "_token",
  "_type",
  "_status",
];

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
  return EXCLUDED_SUFFIXES.some(
    (suffix) => clean.endsWith(suffix) || fieldName.toLowerCase().endsWith(suffix)
  );
}

function isPhoneField(fieldName: string): boolean {
  if (!fieldName) return false;
  const clean = getCleanFieldName(fieldName);
  if (PHONE_FIELDS.has(clean) || PHONE_FIELDS.has(fieldName.toLowerCase())) return true;
  return PHONE_SUFFIXES.some(
    (suffix) => clean.endsWith(suffix) || fieldName.toLowerCase().endsWith(suffix)
  );
}

function isValidPhoneNumber(value: string): boolean {
  if (!SAFE_PHONE_REGEX.test(value)) return false;
  const digits = (value.match(/\d/g) || []).length;
  return digits >= 3;
}

function isUrlField(fieldName: string): boolean {
  if (!fieldName) return false;
  const clean = getCleanFieldName(fieldName);
  if (URL_FIELDS.has(clean) || URL_FIELDS.has(fieldName.toLowerCase())) return true;
  return URL_SUFFIXES.some(
    (suffix) => clean.endsWith(suffix) || fieldName.toLowerCase().endsWith(suffix)
  );
}

function isDateOrTime(value: string): boolean {
  return ISO_DATE_TIME_REGEX.test(value) || TIME_REGEX.test(value);
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

  // Allow ISO datetimes and time strings
  if (isDateOrTime(value)) return null;

  const clean = getCleanFieldName(fieldName);

  // Free-text fields: strictly block < > { } [ ]
  if (FREE_TEXT_FIELDS.has(clean) || FREE_TEXT_FIELDS.has(fieldName.toLowerCase())) {
    if (DANGEROUS_CHARS_REGEX.test(value)) {
      return "Special characters like < > { } [ ] are not allowed";
    }
    return null;
  }

  // Phone fields: allow +, digits, spaces, -, (, ), .
  if (isPhoneField(fieldName)) {
    if (!isValidPhoneNumber(value)) {
      return "Special characters are not allowed in phone number";
    }
    return null;
  }

  // URL / website fields: allow http/https, domains, paths, query params
  if (isUrlField(fieldName)) {
    if (!SAFE_URL_REGEX.test(value)) {
      return "Special characters like < > { } [ ] are not allowed in URL";
    }
    return null;
  }

  const pattern =
    ADDRESS_FIELDS.has(clean) || ADDRESS_FIELDS.has(fieldName.toLowerCase())
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
