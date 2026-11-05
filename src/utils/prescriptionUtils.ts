import { FREQUENCY_PRESET_OPTIONS } from "@/utils/frequencyDisplay";
import type { StructuredFrequency } from "@/services/prescriptionsApi";

export const MEDICATION_FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Cream",
  "Ointment",
  "Gel",
  "Drops",
  "Eye drops",
  "Ear drops",
  "Nasal drops/spray",
  "Inhaler",
  "Powder",
  "Sachet",
  "Suspension",
  "Suppository",
  "IV fluids",
] as const;

export const MEDICATION_ROUTES = [
  "Oral",
  "Topical",
  "Intravenous (IV)",
  "Intramuscular (IM)",
  "Subcutaneous (SC)",
  "Inhalation",
  "Nasal",
  "Ophthalmic",
  "Otic",
  "Sublingual",
  "Rectal",
  "Transdermal",
] as const;

export const MEDICATION_TIMINGS = [
  "After food",
  "Before food",
  "With food",
  "Empty stomach",
  "At bedtime",
  "As advised",
] as const;

export const QUICK_FREQUENCY_PRESETS = FREQUENCY_PRESET_OPTIONS;

export const COMMON_DURATIONS = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "1 month",
];

export const COMMON_INSTRUCTIONS = [
  "Take with water",
  "After meals",
  "Before meals",
  "With warm water",
  "With milk",
  "Empty stomach",
  "Dissolve in water",
];

export const COMMON_SPECIAL_INSTRUCTIONS = [
  "Avoid taking with other paracetamol products",
  "Avoid alcohol while taking this medication",
  "Do not crush or chew the tablet",
  "Take with a full glass of water",
  "Avoid exposure to direct sunlight",
  "Complete the full course even if feeling better",
  "Avoid taking with dairy products or antacids",
];

export const TAPERING_DOSAGES = [
  "1 drop",
  "2 drops",
  "1 tablet",
  "0.5 tablet",
  "2 tablets",
  "1 capsule",
  "5 ml",
  "10 ml",
  "Apply locally",
];

export const TAPERING_FREQUENCIES = [
  "1 time daily",
  "2 times daily",
  "3 times daily",
  "4 times daily",
  "Every 2 hours",
  "Every 4 hours",
  "Every 6 hours",
  "Every 8 hours",
  "1-0-1",
  "1-0-0",
  "1-1-1",
  "1-1-1-1",
  "0-0-1",
  "At bedtime",
  "As needed",
];

export const TAPERING_DURATIONS = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "1 week",
  "2 weeks",
  "3 weeks",
  "4 weeks",
  "1 month",
];

export const TAPERING_INSTRUCTIONS = [
  "Affected Eye",
  "Both Eyes",
  "Right Eye",
  "Left Eye",
  "After food",
  "Before food",
  "With water",
  "At bedtime",
  "Instill 1 drop",
  "Instill 2 drops",
  "Apply locally",
  "Shake well before use",
];

export const getTodayDateStr = () => new Date().toISOString().split("T")[0];

export const parseFrequencyToStructure = (freq?: string | null): StructuredFrequency => {
  if (!freq) return { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const cleaned = freq.trim();

  if (/^[\d.]+-[\d.]+-[\d.]+(-[\d.]+)?$/.test(cleaned)) {
    const parts = cleaned.split("-").map((p) => parseFloat(p) || 0);
    if (parts.length === 3) {
      return { morning: parts[0], afternoon: parts[1], evening: parts[2], night: 0 };
    }
    if (parts.length >= 4) {
      return { morning: parts[0], afternoon: parts[1], evening: parts[2], night: parts[3] };
    }
  }

  const lower = cleaned.toLowerCase();
  if (lower.includes("once") || lower === "1 time daily" || lower === "od") {
    return { morning: 1, afternoon: 0, evening: 0, night: 0 };
  }
  if (lower.includes("twice") || lower === "2 times daily" || lower === "bid" || lower === "bd") {
    return { morning: 1, afternoon: 0, evening: 1, night: 0 };
  }
  if (lower.includes("thrice") || lower === "3 times daily" || lower === "tid" || lower === "tds") {
    return { morning: 1, afternoon: 1, evening: 1, night: 0 };
  }
  if (lower === "4 times daily" || lower === "qid" || lower.includes("four")) {
    return { morning: 1, afternoon: 1, evening: 1, night: 1 };
  }
  if (lower.includes("bedtime") || lower.includes("night") || lower === "hs") {
    return { morning: 0, afternoon: 0, evening: 0, night: 1 };
  }

  return { morning: 0, afternoon: 0, evening: 0, night: 0 };
};

export const formatFrequencyString = (
  struct?: StructuredFrequency | null,
  isPrn?: boolean | null
): string => {
  if (isPrn) return "SOS";
  if (!struct) return "";
  const m = struct.morning ?? 0;
  const a = struct.afternoon ?? 0;
  const e = struct.evening ?? 0;
  const n = struct.night ?? 0;

  if (Number(n) > 0) {
    return `${m}-${a}-${e}-${n}`;
  }
  return `${m}-${a}-${e}`;
};

export const calculateEndDate = (
  startDateStr?: string | null,
  durationStr?: string | null
): string => {
  if (!startDateStr) return "";
  const match = durationStr?.match(/(\d+)\s*(day|days|week|weeks|month|months)?/i);
  if (!match) return "";
  const count = parseInt(match[1], 10);
  const unit = (match[2] || "day").toLowerCase();
  let days = count;
  if (unit.startsWith("week")) days = count * 7;
  if (unit.startsWith("month")) days = count * 30;

  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return "";
  start.setDate(start.getDate() + days);
  return start.toISOString().split("T")[0];
};

export const parseDurationToDays = (durationStr?: string | null): number => {
  if (!durationStr) return 0;
  const match = durationStr.match(/(\d+)\s*(day|days|week|weeks|month|months|d|w|m)?/i);
  if (!match) return 0;
  const count = parseInt(match[1], 10);
  const unit = (match[2] || "day").toLowerCase();
  if (unit.startsWith("w")) return count * 7;
  if (unit.startsWith("m")) return count * 30;
  return count;
};

export const parseFrequencyToDailyCount = (freqStr?: string | null): number => {
  if (!freqStr) return 1;
  const lower = freqStr.toLowerCase().trim();
  if (lower.includes("4 times") || lower.includes("four times") || lower.includes("q4h") || lower.includes("qid") || lower.includes("1-1-1-1") || lower.includes("4x")) return 4;
  if (lower.includes("3 times") || lower.includes("three times") || lower.includes("thrice") || lower.includes("tid") || lower.includes("tds") || lower.includes("1-1-1") || lower.includes("3x")) return 3;
  if (lower.includes("2 times") || lower.includes("two times") || lower.includes("twice") || lower.includes("bid") || lower.includes("bd") || lower.includes("1-0-1") || lower.includes("1-1-0") || lower.includes("0-1-1") || lower.includes("2x")) return 2;
  if (lower.includes("1 time") || lower.includes("one time") || lower.includes("once") || lower.includes("od") || lower.includes("1-0-0") || lower.includes("0-1-0") || lower.includes("0-0-1") || lower.includes("1x")) return 1;
  if (lower.includes("6 times") || lower.includes("six times") || lower.includes("q2h")) return 6;
  if (lower.includes("8 times") || lower.includes("eight times")) return 8;

  const slotMatch = lower.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?/);
  if (slotMatch) {
    return (parseFloat(slotMatch[1]) || 0) + (parseFloat(slotMatch[2]) || 0) + (parseFloat(slotMatch[3]) || 0) + (parseFloat(slotMatch[4] || "0") || 0);
  }

  const numMatch = lower.match(/(\d+)\s*(?:times|x)/);
  if (numMatch) return parseInt(numMatch[1], 10);

  return 1;
};

export const calculateTaperingQuantity = (
  steps: any[] | undefined,
  formStr?: string | null
): string => {
  if (!steps || steps.length === 0) return "";

  let totalUnits = 0;
  for (const step of steps) {
    const days = parseDurationToDays(step.duration) || 7;
    const dailyDoses = parseFrequencyToDailyCount(step.frequency) || 1;

    let doseMultiplier = 1;
    const doseMatch = step.dosage?.match(/^(\d+(\.\d+)?)/);
    if (doseMatch) {
      doseMultiplier = parseFloat(doseMatch[1]) || 1;
    }

    totalUnits += Math.ceil(days * dailyDoses * doseMultiplier);
  }

  const isLiquidOrOphthalmic = formStr && /drop|eye|syrup|suspension|bottle|liquid|solution|spray|ointment|gel/i.test(formStr);

  if (isLiquidOrOphthalmic) {
    const bottles = Math.max(1, Math.ceil(totalUnits / 100));
    return `${bottles} bottle${bottles > 1 ? "s" : ""} (${totalUnits} drops)`;
  }

  const unitName = formStr ? `${formStr.toLowerCase()}${totalUnits > 1 ? "s" : ""}` : "units";
  return `${totalUnits} ${unitName}`;
};

export const calculateQuantity = (
  struct?: StructuredFrequency | null,
  durationStr?: string | null,
  doseStr?: string | null,
  formStr?: string | null
): string => {
  const match = durationStr?.match(/(\d+)\s*(day|days|week|weeks|month|months)?/i);
  if (!match) return "";
  const count = parseInt(match[1], 10);
  const unit = (match[2] || "day").toLowerCase();
  let days = count;
  if (unit.startsWith("week")) days = count * 7;
  if (unit.startsWith("month")) days = count * 30;

  const m = Number(struct?.morning) || 0;
  const a = Number(struct?.afternoon) || 0;
  const e = Number(struct?.evening) || 0;
  const n = Number(struct?.night) || 0;
  const dailyDoses = m + a + e + n;

  if (dailyDoses <= 0 || days <= 0) return "";

  let doseMultiplier = 1;
  const doseMatch = doseStr?.match(/^(\d+(\.\d+)?)/);
  if (doseMatch) {
    doseMultiplier = parseFloat(doseMatch[1]) || 1;
  }

  const totalUnits = Math.ceil(dailyDoses * days * doseMultiplier);
  const unitName = formStr ? `${formStr.toLowerCase()}${totalUnits > 1 ? "s" : ""}` : "units";
  return `${totalUnits} ${unitName}`;
};
