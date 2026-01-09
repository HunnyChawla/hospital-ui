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
            dosage: "1-2 drops",
            frequency: "Four times daily",
            duration: "1 month",
            instructions: "Both Eyes, As needed",
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
            dosage: "1 drop",
            frequency: "Twice daily",
            duration: "2 weeks",
            instructions: "Both Eyes",
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
            dosage: "1 drop",
            frequency: "Four times daily",
            duration: "7 days",
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
            dosage: "1 drop",
            frequency: "Four times daily",
            duration: "7 days",
            instructions: "Affected Eye",
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
            dosage: "1 drop",
            frequency: "Four times daily",
            duration: "5 days",
            instructions: "Affected Eye, Taper as advised",
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
    category: "test" | "lifestyle" | "referral";
    advice: Omit<AdviceItem, "id">;
}

export const QUICK_ADVICE: QuickAdviceTemplate[] = [
    {
        id: "fundus",
        label: "Fundus Exam",
        category: "test",
        advice: {
            advice_type: "Investigation",
            description: "Dilated Fundus Examination",
            notes: "After dilation",
        },
    },
    {
        id: "oct",
        label: "OCT",
        category: "test",
        advice: {
            advice_type: "Investigation",
            description: "OCT Macula + RNFL",
            notes: "",
        },
    },
    {
        id: "visual_field",
        label: "Visual Field",
        category: "test",
        advice: {
            advice_type: "Investigation",
            description: "Automated Perimetry (Visual Field Test)",
            notes: "",
        },
    },
    {
        id: "blood_sugar",
        label: "Blood Sugar",
        category: "test",
        advice: {
            advice_type: "Lab Test",
            description: "Fasting Blood Sugar / HbA1c",
            notes: "For diabetic screening",
        },
    },
    {
        id: "screen_time",
        label: "Screen Time",
        category: "lifestyle",
        advice: {
            advice_type: "Lifestyle",
            description: "Reduce screen time, follow 20-20-20 rule",
            notes: "Every 20 mins, look 20 feet away for 20 seconds",
        },
    },
    {
        id: "glasses_wear",
        label: "Wear Glasses",
        category: "lifestyle",
        advice: {
            advice_type: "Advice",
            description: "Wear prescribed glasses regularly",
            notes: "For distance/near as prescribed",
        },
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
