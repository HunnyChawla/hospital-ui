import type { StructuredFrequency } from "@/services/prescriptionsApi";

export type FrequencyDisplayFormat = "numeric" | "descriptive" | "both";

export interface FrequencyPresetOption {
  label: string;
  numeric: string;
  descriptive: string;
  sub: string;
  struct: StructuredFrequency;
  freq: string;
  isPrn?: boolean;
}

export const FREQUENCY_PRESET_OPTIONS: FrequencyPresetOption[] = [
  {
    label: "1-0-1",
    numeric: "1-0-1",
    descriptive: "Twice daily",
    sub: "Twice daily (Morning & Night)",
    struct: { morning: 1, afternoon: 0, evening: 1, night: 0 },
    freq: "1-0-1",
  },
  {
    label: "1-0-0",
    numeric: "1-0-0",
    descriptive: "Once daily (Morning)",
    sub: "Morning only",
    struct: { morning: 1, afternoon: 0, evening: 0, night: 0 },
    freq: "1-0-0",
  },
  {
    label: "1-1-1",
    numeric: "1-1-1",
    descriptive: "Three times a day",
    sub: "Thrice daily (Morning, Noon, Night)",
    struct: { morning: 1, afternoon: 1, evening: 1, night: 0 },
    freq: "1-1-1",
  },
  {
    label: "0-0-1",
    numeric: "0-0-1",
    descriptive: "At bedtime",
    sub: "Bedtime only (Night)",
    struct: { morning: 0, afternoon: 0, evening: 0, night: 1 },
    freq: "0-0-1",
  },
  {
    label: "1-1-1-1",
    numeric: "1-1-1-1",
    descriptive: "Four times a day",
    sub: "4 times daily (QID)",
    struct: { morning: 1, afternoon: 1, evening: 1, night: 1 },
    freq: "1-1-1-1",
  },
  {
    label: "0-1-0",
    numeric: "0-1-0",
    descriptive: "Once daily (Afternoon)",
    sub: "Afternoon only",
    struct: { morning: 0, afternoon: 1, evening: 0, night: 0 },
    freq: "0-1-0",
  },
  {
    label: "1-0-1-1",
    numeric: "1-0-1-1",
    descriptive: "Three times (M, E, N)",
    sub: "Morning, Evening, Night",
    struct: { morning: 1, afternoon: 0, evening: 1, night: 1 },
    freq: "1-0-1-1",
  },
  {
    label: "SOS",
    numeric: "SOS",
    descriptive: "As needed (SOS)",
    sub: "Take only when required",
    struct: { morning: 0, afternoon: 0, evening: 0, night: 0 },
    freq: "SOS",
    isPrn: true,
  },
];

export const FREQUENCY_MAPPING: Record<string, { numeric: string; descriptive: string }> = {
  "1-0-1": { numeric: "1-0-1", descriptive: "Twice daily" },
  "1-0-0": { numeric: "1-0-0", descriptive: "Once daily (Morning)" },
  "1-1-1": { numeric: "1-1-1", descriptive: "Three times a day" },
  "0-0-1": { numeric: "0-0-1", descriptive: "At bedtime" },
  "1-1-1-1": { numeric: "1-1-1-1", descriptive: "Four times a day" },
  "0-1-0": { numeric: "0-1-0", descriptive: "Once daily (Afternoon)" },
  "1-0-1-1": { numeric: "1-0-1-1", descriptive: "Three times (M, E, N)" },
  "0-1-1": { numeric: "0-1-1", descriptive: "Twice daily (Noon, Night)" },
  "1-1-0": { numeric: "1-1-0", descriptive: "Twice daily (Morning, Noon)" },
  "SOS": { numeric: "SOS", descriptive: "As needed (SOS)" },
  "1 time daily": { numeric: "1-0-0", descriptive: "Once daily" },
  "2 times daily": { numeric: "1-0-1", descriptive: "Twice daily" },
  "3 times daily": { numeric: "1-1-1", descriptive: "Three times a day" },
  "4 times daily": { numeric: "1-1-1-1", descriptive: "Four times a day" },
  "8 times daily": { numeric: "8x daily", descriptive: "8 times daily" },
  "Every 2 hours": { numeric: "Q2H", descriptive: "Every 2 hours" },
  "Every 4 hours": { numeric: "Q4H", descriptive: "Every 4 hours" },
  "Every 6 hours": { numeric: "Q6H", descriptive: "Every 6 hours" },
  "Every 8 hours": { numeric: "Q8H", descriptive: "Every 8 hours" },
  "At bedtime": { numeric: "0-0-1", descriptive: "At bedtime" },
  "As needed": { numeric: "SOS", descriptive: "As needed (SOS)" },
  "Refer steps": { numeric: "Refer steps", descriptive: "Refer steps" },
};

/**
 * Formats a medication frequency according to the user's display format preference.
 */
export function formatFrequencyByPreference(
  struct?: StructuredFrequency | null,
  rawFreq?: string | null,
  isPrn?: boolean | null,
  format: FrequencyDisplayFormat = "numeric"
): string {
  if (isPrn || rawFreq?.toUpperCase() === "SOS") {
    if (format === "descriptive") return "As needed (SOS)";
    if (format === "both") return "SOS (As needed)";
    return "SOS";
  }

  if (rawFreq === "Refer steps") return "Refer steps";

  // Derive numeric string from struct if available
  let numeric = "";
  if (struct && (struct.morning || struct.afternoon || struct.evening || struct.night)) {
    const m = struct.morning ?? 0;
    const a = struct.afternoon ?? 0;
    const e = struct.evening ?? 0;
    const n = struct.night ?? 0;
    if (Number(n) > 0) {
      numeric = `${m}-${a}-${e}-${n}`;
    } else {
      numeric = `${m}-${a}-${e}`;
    }
  } else if (rawFreq) {
    numeric = rawFreq.trim();
  }

  if (!numeric && !rawFreq) return "";

  // Check dictionary
  const mapped = FREQUENCY_MAPPING[numeric] || (rawFreq ? FREQUENCY_MAPPING[rawFreq.trim()] : null);

  let descriptive = "";
  if (mapped) {
    descriptive = mapped.descriptive;
    numeric = mapped.numeric;
  } else if (numeric && /^[\d.]+-[\d.]+-[\d.]+(-[\d.]+)?$/.test(numeric)) {
    const parts = numeric.split("-").map((p) => parseFloat(p) || 0);
    const sum = parts.reduce((a, b) => a + b, 0);
    if (sum === 1) descriptive = "Once daily";
    else if (sum === 2) descriptive = "Twice daily";
    else if (sum === 3) descriptive = "Three times a day";
    else if (sum === 4) descriptive = "Four times a day";
    else descriptive = `${sum} times a day`;
  } else {
    descriptive = numeric || rawFreq || "";
  }

  if (format === "descriptive") {
    return descriptive || numeric;
  }
  if (format === "both") {
    if (numeric && descriptive && numeric !== descriptive) {
      return `${numeric} (${descriptive})`;
    }
    return numeric || descriptive;
  }
  return numeric || descriptive;
}

/**
 * Returns the button/chip label for a frequency preset based on user preference.
 */
export function getFrequencyPillLabel(
  option: FrequencyPresetOption,
  format: FrequencyDisplayFormat = "numeric"
): string {
  if (option.isPrn) return "SOS";
  if (format === "descriptive") return option.descriptive;
  if (format === "both") return `${option.numeric} (${option.descriptive})`;
  return option.numeric;
}

/**
 * Returns tapering frequency dropdown options according to user preference.
 */
export function getTaperingFrequencyOptions(format: FrequencyDisplayFormat = "numeric"): string[] {
  if (format === "descriptive") {
    return [
      "Four times a day",
      "Three times a day",
      "Twice daily",
      "Once daily",
      "Every 2 hours",
      "Every 4 hours",
      "Every 6 hours",
      "Every 8 hours",
      "At bedtime",
      "As needed",
    ];
  }
  if (format === "both") {
    return [
      "1-1-1-1 (Four times a day)",
      "1-1-1 (Three times a day)",
      "1-0-1 (Twice daily)",
      "1-0-0 (Once daily)",
      "0-0-1 (At bedtime)",
      "Every 2 hours",
      "Every 4 hours",
      "Every 6 hours",
      "Every 8 hours",
      "SOS (As needed)",
    ];
  }
  return [
    "1-1-1-1",
    "1-1-1",
    "1-0-1",
    "1-0-0",
    "0-0-1",
    "4 times daily",
    "3 times daily",
    "2 times daily",
    "1 time daily",
    "Every 2 hours",
    "Every 4 hours",
    "Every 6 hours",
    "Every 8 hours",
    "At bedtime",
    "SOS",
  ];
}

/**
 * Generates default 3-step tapering schedule with frequencies matching the selected display format.
 */
export function getDefaultTaperingSteps(
  format: FrequencyDisplayFormat = "numeric",
  dose: string = "1 drop",
  instructions: string = ""
) {
  const stepFrequencies = [
    formatFrequencyByPreference(null, "3 times daily", false, format),
    formatFrequencyByPreference(null, "2 times daily", false, format),
    formatFrequencyByPreference(null, "1 time daily", false, format),
  ];

  return [
    { sequence: 1, dosage: dose, frequency: stepFrequencies[0] || "3 times daily", duration: "7 days", instructions },
    { sequence: 2, dosage: dose, frequency: stepFrequencies[1] || "2 times daily", duration: "7 days", instructions },
    { sequence: 3, dosage: dose, frequency: stepFrequencies[2] || "1 time daily", duration: "7 days", instructions },
  ];
}

