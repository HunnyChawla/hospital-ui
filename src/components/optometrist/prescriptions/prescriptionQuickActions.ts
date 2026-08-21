/**
 * Quick action data for one-click prescription workflow
 * Provides common diagnoses, medicines, and follow-up options
 */

import type { MedicineItem, AdviceItem } from "@/types";

// Common ophthalmic diagnoses for quick selection
export const QUICK_DIAGNOSES = [
    { label: "Myopia", value: "Myopia", category: "refractive" },
    { label: "Hypermetropia", value: "Hypermetropia", category: "refractive" },
    { label: "Astigmatism", value: "Astigmatism", category: "refractive" },
    { label: "Presbyopia", value: "Presbyopia", category: "refractive" },
    { label: "Dry Eye", value: "Dry Eye Syndrome", category: "surface" },
    { label: "Allergic Conj.", value: "Allergic Conjunctivitis", category: "surface" },
    { label: "Computer Vision", value: "Computer Vision Syndrome", category: "surface" },
    { label: "Early Cataract", value: "Immature Cataract", category: "lens" },
    { label: "Glaucoma Suspect", value: "Glaucoma Suspect", category: "other" },
    { label: "Diabetic Screening", value: "Diabetic Retinopathy Screening", category: "other" },
] as const;

// Quick medicine templates with pre-filled dosage info
export interface QuickMedicineTemplate {
    id: string;
    label: string;
    icon: "droplets" | "pill" | "eye";
    color: "sky" | "purple" | "emerald" | "amber" | "rose";
    medicine: Omit<MedicineItem, "medicine_id">;
}

export const QUICK_MEDICINES: QuickMedicineTemplate[] = [
    {
        id: "lubricant",
        label: "Lubricants",
        icon: "droplets",
        color: "sky",
        medicine: {
            medicine_name: "Carboxymethylcellulose 0.5%",
            generic_name: "Carboxymethylcellulose",
            brand: "Refresh Tears",
            form: "Eye drops",
            strength: "0.5%",
            route: "Ophthalmic",
            dose: "1-2 drops",
            frequency: "1-1-1-1",
            frequency_structure: { morning: 1, afternoon: 1, evening: 1, night: 1 },
            timing: "As advised",
            duration: "1 month",
            quantity: "1 bottle",
            is_prn: false,
            dosage: "1-2 drops",
            instructions: "Both Eyes, As needed",
            special_instructions: "Instill into conjunctival sac",
        },
    },
    {
        id: "antiallergy",
        label: "Anti-allergy",
        icon: "eye",
        color: "purple",
        medicine: {
            medicine_name: "Olopatadine 0.1%",
            generic_name: "Olopatadine",
            brand: "Pataday",
            form: "Eye drops",
            strength: "0.1%",
            route: "Ophthalmic",
            dose: "1 drop",
            frequency: "1-0-1",
            frequency_structure: { morning: 1, afternoon: 0, evening: 1, night: 0 },
            timing: "As advised",
            duration: "2 weeks",
            quantity: "1 bottle",
            is_prn: false,
            dosage: "1 drop",
            instructions: "Both Eyes",
            special_instructions: "Shake well before use",
        },
    },
    {
        id: "antiinflammatory",
        label: "Anti-inflam.",
        icon: "droplets",
        color: "amber",
        medicine: {
            medicine_name: "Flurbiprofen 0.03%",
            generic_name: "Flurbiprofen",
            brand: "Ocufen",
            form: "Eye drops",
            strength: "0.03%",
            route: "Ophthalmic",
            dose: "1 drop",
            frequency: "1-1-1-1",
            frequency_structure: { morning: 1, afternoon: 1, evening: 1, night: 1 },
            timing: "After food",
            duration: "7 days",
            quantity: "1 bottle",
            is_prn: false,
            dosage: "1 drop",
            instructions: "Affected Eye",
        },
    },
    {
        id: "antibiotic",
        label: "Antibiotic",
        icon: "droplets",
        color: "rose",
        medicine: {
            medicine_name: "Moxifloxacin 0.5%",
            generic_name: "Moxifloxacin",
            brand: "Vigamox",
            form: "Eye drops",
            strength: "0.5%",
            route: "Ophthalmic",
            dose: "1 drop",
            frequency: "1-1-1-1",
            frequency_structure: { morning: 1, afternoon: 1, evening: 1, night: 1 },
            timing: "As advised",
            duration: "7 days",
            quantity: "1 bottle",
            is_prn: false,
            dosage: "1 drop",
            instructions: "Affected Eye",
            special_instructions: "Complete the full 7-day course",
        },
    },
    {
        id: "steroid_combo",
        label: "Steroid+Antibiotic",
        icon: "pill",
        color: "emerald",
        medicine: {
            medicine_name: "Tobramycin + Dexamethasone",
            generic_name: "Tobramycin/Dexamethasone",
            brand: "Tobradex",
            form: "Eye drops",
            strength: "0.3% / 0.1%",
            route: "Ophthalmic",
            dose: "1 drop",
            frequency: "Refer steps",
            frequency_structure: null,
            timing: "As advised",
            duration: "3 weeks",
            quantity: "1 bottle",
            is_prn: false,
            dosage: "Refer steps",
            instructions: "Affected Eye, Taper as advised",
            special_instructions: "Taper dosage strictly as advised by doctor",
            tapering_steps: [
                { sequence: 1, dosage: "1 drop", frequency: "3 times daily", duration: "7 days", instructions: "Affected Eye" },
                { sequence: 2, dosage: "1 drop", frequency: "2 times daily", duration: "7 days", instructions: "Affected Eye" },
                { sequence: 3, dosage: "1 drop", frequency: "1 time daily", duration: "7 days", instructions: "Affected Eye" },
            ],
        },
    },
];

// Quick follow-up options (in days)
export interface QuickFollowupOption {
    label: string;
    days: number;
    display: string;
}

export const QUICK_FOLLOWUPS: QuickFollowupOption[] = [
    { label: "1W", days: 7, display: "1 Week" },
    { label: "2W", days: 14, display: "2 Weeks" },
    { label: "1M", days: 30, display: "1 Month" },
    { label: "3M", days: 90, display: "3 Months" },
    { label: "6M", days: 180, display: "6 Months" },
    { label: "1Y", days: 365, display: "1 Year" },
];

// Quick advice templates
export interface QuickAdviceTemplate {
    id: string;
    label: string;
    value: string;
    category: "General" | "Post-Op" | "Pre-Op" | "Infection" | "Allergy";
}

export const QUICK_ADVICE: QuickAdviceTemplate[] = [
    {
        id: "fundus",
        label: "Fundus Exam",
        value: "Dilated Fundus Examination",
        category: "General",
    },
    {
        id: "oct",
        label: "OCT",
        value: "OCT Macula + RNFL",
        category: "General",
    },
    {
        id: "visual_field",
        label: "Visual Field",
        value: "Automated Perimetry (Visual Field Test)",
        category: "General",
    },
    {
        id: "blood_sugar",
        label: "Blood Sugar",
        value: "Fasting Blood Sugar / HbA1c",
        category: "General",
    },
    {
        id: "screen_time",
        label: "Screen Time",
        value: "Reduce screen time, follow 20-20-20 rule",
        category: "General",
    },
    {
        id: "glasses_wear",
        label: "Wear Glasses",
        value: "Wear prescribed glasses regularly",
        category: "General", // "General" is the safest fallback for "lifestyle" items if not strictly mapped
    },
];

// Helper to calculate follow-up date from days
export function getFollowupDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
}

// Helper to format diagnosis from selected values
export function formatDiagnosis(selectedDiagnoses: string[], customDiagnosis?: string): string {
    const all = [...selectedDiagnoses];
    if (customDiagnosis?.trim()) {
        all.push(customDiagnosis.trim());
    }
    return all.join(", ");
}
