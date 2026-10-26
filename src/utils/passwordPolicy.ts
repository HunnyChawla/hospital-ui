/**
 * Password Policy & Validation for CWE-521 Remediation.
 * Enforces a 12-character minimum length, character diversity, and blocks
 * commonly used, predictable, compromised, and contextual passwords.
 */

export interface PasswordRuleStatuses {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  specialChar: boolean;
  notRepeating: boolean;
  notSequential: boolean;
  notCommon: boolean;
  notContextual: boolean;
}

export type PasswordStrength = "weak" | "fair" | "good" | "strong";

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  ruleStatuses: PasswordRuleStatuses;
  strength: PasswordStrength;
  strengthPercentage: number;
}

export interface PasswordContext {
  email?: string;
  name?: string;
  hospitalId?: string;
}

// Leetspeak normalization map
const LEET_MAP: Record<string, string> = {
  "@": "a",
  "4": "a",
  "8": "b",
  "(": "c",
  "3": "e",
  "9": "g",
  "!": "i",
  "1": "i",
  "|": "l",
  "0": "o",
  "$": "s",
  "5": "s",
  "+": "t",
  "7": "t",
};

// Common compromised base words
const COMMON_PASSWORDS = new Set<string>([
  "password",
  "passwords",
  "password123",
  "password1234",
  "password12345",
  "changeme",
  "changeme123",
  "changeme1234",
  "changeme12345",
  "welcome",
  "welcome123",
  "welcome1234",
  "welcome12345",
  "welcome123456",
  "letmein",
  "letmein123",
  "letmein1234",
  "letmein12345",
  "iloveyou",
  "iloveyou123",
  "iloveyou1234",
  "iloveyou12345",
  "trustnoone",
  "monkey",
  "dragon",
  "football",
  "superman",
  "batman",
  "sunshine",
  "princess",
  "master",
  "shadow",
  "hunter",
  "hunter2",
  "starwars",
  "admin",
  "administrator",
  "admin123",
  "admin1234",
  "admin12345",
  "admin123456",
  "sysadmin",
  "root",
  "rootadmin",
  "superuser",
  "operator",
  "manager",
  "moderator",
  "user",
  "default",
  "secret",
  "hospital",
  "hospital123",
  "hospital1234",
  "hospital12345",
  "doctor",
  "doctor123",
  "doctor1234",
  "doctor12345",
  "patient",
  "medical",
  "clinic",
  "pharmacy",
  "nurse",
  "optometry",
  "curahms",
  "curahospital",
  "qwerty",
  "qwertyuiop",
  "qwertyuiop12",
  "qwerty123456",
  "asdfghjkl",
  "zxcvbnm",
  "1234567890",
  "123456789012",
  "abcdefghijkl",
]);

const SEQUENCES = [
  "01234567890",
  "98765432109",
  "abcdefghijklmnopqrstuvwxyz",
  "zyxwvutsrqponmlkjihgfedcba",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
];

const SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?~/\\`'"]/;

export function normalizeLeetspeak(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    result += LEET_MAP[ch] || ch.toLowerCase();
  }
  return result;
}

export function hasRepeatingChars(text: string, maxConsecutive: number = 4): boolean {
  const pattern = new RegExp(`(.)\\1{${maxConsecutive - 1},}`, "i");
  return pattern.test(text);
}

export function hasSequentialPattern(text: string, minPatternLen: number = 4): boolean {
  const lower = text.toLowerCase();
  for (const seq of SEQUENCES) {
    for (let i = 0; i <= seq.length - minPatternLen; i++) {
      const sub = seq.substring(i, i + minPatternLen);
      if (lower.includes(sub)) {
        return true;
      }
    }
  }
  return false;
}

export function isCommonPassword(password: string): boolean {
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return true;

  const normalized = normalizeLeetspeak(password);
  if (COMMON_PASSWORDS.has(normalized)) return true;

  for (const word of COMMON_PASSWORDS) {
    if (word.length >= 6 && (lower.includes(word) || normalized.includes(word))) {
      if (word.length >= password.length * 0.5) {
        return true;
      }
    }
  }
  return false;
}

export function checkContextualSimilarity(
  password: string,
  context?: PasswordContext
): string | null {
  if (!context) return null;

  const lowerPw = password.toLowerCase();
  const normPw = normalizeLeetspeak(password);

  // Email local-part tokens
  if (context.email && context.email.includes("@")) {
    const localPart = context.email.split("@")[0].toLowerCase();
    const tokens = localPart.split(/[._\-+]+/).filter((t) => t.length >= 3);
    tokens.push(localPart);
    for (const token of tokens) {
      if (token.length >= 3 && (lowerPw.includes(token) || normPw.includes(token))) {
        return "Password cannot contain parts of your email address.";
      }
    }
  }

  // Name tokens
  if (context.name) {
    const nameTokens = context.name
      .toLowerCase()
      .split(/[\s._\-]+/)
      .filter((t) => t.length >= 3);
    for (const token of nameTokens) {
      if (lowerPw.includes(token) || normPw.includes(token)) {
        return "Password cannot contain parts of your name.";
      }
    }
  }

  // Hospital ID
  if (context.hospitalId && context.hospitalId.length >= 3) {
    const hosp = context.hospitalId.toLowerCase();
    if (lowerPw.includes(hosp) || normPw.includes(hosp)) {
      return "Password cannot contain the hospital or organization name.";
    }
  }

  return null;
}

export function validatePassword(
  password: string,
  context?: PasswordContext
): PasswordValidationResult {
  const errors: string[] = [];

  const minLength = (password || "").length >= 12;
  const uppercase = /[A-Z]/.test(password || "");
  const lowercase = /[a-z]/.test(password || "");
  const number = /[0-9]/.test(password || "");
  const specialChar = SPECIAL_CHARS_REGEX.test(password || "");
  const notRepeating = !hasRepeatingChars(password || "", 4);
  const notSequential = !hasSequentialPattern(password || "", 4);
  const notCommon = !isCommonPassword(password || "");

  const contextualErr = checkContextualSimilarity(password || "", context);
  const notContextual = contextualErr === null;

  if (!minLength) {
    errors.push("Password must be at least 12 characters long.");
  }
  if (!uppercase) {
    errors.push("Password must contain at least one uppercase letter (A-Z).");
  }
  if (!lowercase) {
    errors.push("Password must contain at least one lowercase letter (a-z).");
  }
  if (!number) {
    errors.push("Password must contain at least one number (0-9).");
  }
  if (!specialChar) {
    errors.push("Password must contain at least one special character (!@#$%^&*...).");
  }
  if (!notRepeating) {
    errors.push("Password cannot contain 4 or more repetitive characters in a row.");
  }
  if (!notSequential) {
    errors.push("Password cannot contain sequential sequences (e.g., '1234', 'abcd').");
  }
  if (!notCommon) {
    errors.push("Password is too common or easily guessable. Please choose a more secure password.");
  }
  if (!notContextual && contextualErr) {
    errors.push(contextualErr);
  }

  const ruleStatuses: PasswordRuleStatuses = {
    minLength,
    uppercase,
    lowercase,
    number,
    specialChar,
    notRepeating,
    notSequential,
    notCommon,
    notContextual,
  };

  // Calculate strength score
  let score = 0;
  if (minLength) score += 25;
  if (password.length >= 16) score += 10;
  if (uppercase) score += 15;
  if (lowercase) score += 15;
  if (number) score += 15;
  if (specialChar) score += 20;
  if (!notRepeating || !notSequential || !notCommon || !notContextual) {
    score = Math.min(score, 40);
  }

  let strength: PasswordStrength = "weak";
  if (score >= 80 && errors.length === 0) {
    strength = "strong";
  } else if (score >= 60 && errors.length <= 1) {
    strength = "good";
  } else if (score >= 40) {
    strength = "fair";
  }

  return {
    isValid: errors.length === 0,
    errors,
    ruleStatuses,
    strength,
    strengthPercentage: Math.min(100, Math.max(0, score)),
  };
}
