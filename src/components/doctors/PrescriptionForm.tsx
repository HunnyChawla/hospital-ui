"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { medicinesApi, Medicine } from "@/services/medicinesApi";
import type { AdviceItemRequest } from "@/services/prescriptionsApi";
import { AdviceSection } from "./AdviceSection";
import {
  prescriptionsApi,
  PrescriptionItemRequest,
  PrescriptionResponse,
  StructuredFrequency,
} from "@/services/prescriptionsApi";
import { patientsApi, PatientApiResponse, formatPatientName } from "@/services/patientsApi";
import { doctorsApi, Doctor } from "@/services/doctorsApi";
import { diagnosesApi } from "@/services/diagnosesApi";
import { quickPresetsApi } from "@/services/quickPresetsApi";
import { MedicineQuickChips, DiagnosisChips, SelectedDiagnoses } from "../optometrist/prescriptions/QuickSelectChips";
import { SearchableDropdown } from "../optometrist/prescriptions/SearchableDropdown";
import { QuickPresetsSettingsModal } from "../optometrist/prescriptions/settings/QuickPresetsSettingsModal";
import { PlannedSurgerySection } from "../optometrist/prescriptions/PlannedSurgerySection";
import { PrescriptionPrintPreviewModal } from "./PrescriptionPrintPreviewModal";
import {
  usePrescriptionTemplates,
  PrescriptionTemplate,
  PrescriptionTemplateItem,
} from "@/hooks/usePrescriptionTemplates";
import { usePrescriptionSettings } from "@/hooks/usePrescriptionSettings";
import {
  formatFrequencyByPreference,
  getFrequencyPillLabel,
  getTaperingFrequencyOptions,
  getDefaultTaperingSteps,
  FREQUENCY_PRESET_OPTIONS,
  type FrequencyDisplayFormat,
} from "@/utils/frequencyDisplay";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import {
  Search,
  X,
  Loader2,
  History,
  Clock,
  BookmarkPlus,
  Trash2,
  Activity,
  Plus,
  Minus,
  TrendingDown,
  Sparkles,
  Settings,
  Eye,
  Pill,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
  Info,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { formatDate } from "@/utils/format";
import { usePrescriptionPermissions } from "@/hooks/useFeatureFlags";

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

interface PrescriptionFormProps {
  visitId: string;
  patientId: string;
  doctorId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface MedicineFormData extends PrescriptionItemRequest {
  tempId: string;
  medicine_name: string;
  generic_name?: string;
  brand?: string | null;
  form?: string | null;
  strength?: string | null;
  route?: string | null;
  dose?: string | null;
  frequency_structure?: StructuredFrequency | null;
  timing?: string | null;
  quantity?: string | null;
  is_prn?: boolean | null;
  prn_reason?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  special_instructions?: string | null;
}

interface FormData {
  diagnosis: string;
  notes: string;
  plan_of_action: string;
  remarks: string;
}

const FREQUENCY_OPTIONS = [
  { value: "", label: "Select frequency" },
  { value: "1-0-1", label: "1-0-1 (Twice daily)" },
  { value: "1-0-0", label: "1-0-0 (Once daily - Morning)" },
  { value: "1-1-1", label: "1-1-1 (Thrice daily)" },
  { value: "0-0-1", label: "0-0-1 (Night / Bedtime)" },
  { value: "1-1-1-1", label: "1-1-1-1 (4 times daily)" },
  { value: "0-1-0", label: "0-1-0 (Afternoon)" },
  { value: "SOS", label: "SOS (As needed / PRN)" },
  { value: "1 time daily", label: "1 time daily" },
  { value: "2 times daily", label: "2 times daily" },
  { value: "3 times daily", label: "3 times daily" },
  { value: "4 times daily", label: "4 times daily" },
  { value: "8 times daily", label: "8 times daily" },
  { value: "Every 4 hours", label: "Q4H - Every 4 hours" },
  { value: "Every 6 hours", label: "Q6H - Every 6 hours" },
  { value: "Every 8 hours", label: "Q8H - Every 8 hours" },
];

export function PrescriptionForm({
  visitId,
  patientId,
  doctorId,
  onSuccess,
  onCancel,
}: PrescriptionFormProps) {
  // State
  const [medicines, setMedicines] = useState<MedicineFormData[]>([]);
  const [availableMedicines, setAvailableMedicines] = useState<Medicine[]>([]);
  const [medicineSearchTerm, setMedicineSearchTerm] = useState("");
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [patient, setPatient] = useState<PatientApiResponse | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(false);
  const [previousPrescriptions, setPreviousPrescriptions] = useState<PrescriptionResponse[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [historyTab, setHistoryTab] = useState<"history" | "templates">("history");
  // Advice and follow-up. Kept outside react-hook-form because the advice list
  // is a repeated structure the form library would only make harder to edit.
  const [adviceItems, setAdviceItems] = useState<AdviceItemRequest[]>([]);
  const [followupDate, setFollowupDate] = useState<string | null>(null);

  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [draftPrescriptionId, setDraftPrescriptionId] = useState<string | null>(null);
  const [prescriptionStatus, setPrescriptionStatus] = useState<string | null>(null);

  // Quick Presets and Print Preview state
  const [medicinesOptions, setMedicinesOptions] = useState<any[]>([]);
  const [addedMedicineIds, setAddedMedicineIds] = useState<string[]>([]);
  const [diagnosesOptions, setDiagnosesOptions] = useState<any[]>([]);
  const [addedDiagnosisIds, setAddedDiagnosisIds] = useState<string[]>([]);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [diagnosisSearchQuery, setDiagnosisSearchQuery] = useState("");
  const [diagnosisSearchResults, setDiagnosisSearchResults] = useState<any[]>([]);
  const [searchingDiagnoses, setSearchingDiagnoses] = useState(false);
  const [showDiagnosisDropdown, setShowDiagnosisDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [savedPrescription, setSavedPrescription] = useState<PrescriptionResponse | null>(null);
  const [doctorSignature, setDoctorSignature] = useState<string | null>(null);
  const [expandedMedIds, setExpandedMedIds] = useState<Record<string, boolean>>({});
  const [customFrequencyMedIds, setCustomFrequencyMedIds] = useState<Record<string, boolean>>({});

  const toggleExpandMed = (tempId: string) => {
    setExpandedMedIds((prev) => ({ ...prev, [tempId]: !prev[tempId] }));
  };

  const toggleCustomFrequency = (tempId: string) => {
    setCustomFrequencyMedIds((prev) => ({ ...prev, [tempId]: !prev[tempId] }));
  };

  useEffect(() => {
    if (doctorId) {
      doctorsApi.getSignature(doctorId)
        .then((res) => {
          if (res?.signature) {
            setDoctorSignature(res.signature);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch doctor signature:", err);
        });
    }
  }, [doctorId]);

  const { canEdit, isFinalized } = usePrescriptionPermissions({
    prescriptionStatus: prescriptionStatus || null,
  });

  const medicineSearchRef = useRef<HTMLDivElement>(null);
  const diagnosisSearchRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>();
  const { templates, saveTemplate, deleteTemplate } = usePrescriptionTemplates();
  const { frequencyFormat, setFrequencyFormat } = usePrescriptionSettings(doctorId);

  const diagnosis = watch("diagnosis");

  // Load patient and doctor details
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientData, doctorData] = await Promise.all([
          patientsApi.getById(patientId),
          doctorsApi.getById(doctorId),
        ]);
        setPatient(patientData);
        setDoctor(doctorData);
      } catch (error) {
        console.error("Failed to fetch patient/doctor:", error);
        toast.error("Failed to load patient or doctor details");
      }
    };
    fetchData();
  }, [patientId, doctorId]);

  // Load presets on Doctor ID change
  useEffect(() => {
    if (doctorId) {
      loadPresets();
    }
  }, [doctorId]);

  const loadPresets = async () => {
    if (!doctorId) return;
    try {
      const [dx, meds] = await Promise.all([
        quickPresetsApi.getDiagnoses(doctorId),
        quickPresetsApi.getMedicines(doctorId)
      ]);
      setDiagnosesOptions(dx);
      setMedicinesOptions(meds.map(m => ({
        id: m.id || Math.random().toString(),
        label: m.label,
        icon: m.icon,
        color: m.color,
        medicine: {
          medicine_name: m.medicine_name,
          generic_name: m.generic_name,
          brand: m.brand,
          form: m.form,
          strength: m.strength,
          route: m.route,
          dose: m.dose,
          frequency_structure: m.frequency_structure,
          timing: m.timing,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          quantity: m.quantity,
          is_prn: m.is_prn,
          prn_reason: m.prn_reason,
          instructions: m.instructions,
          special_instructions: m.special_instructions,
          tapering_steps: m.tapering_steps,
        }
      })));
    } catch (error) {
      console.error("Failed to fetch presets:", error);
    }
  };

  // Sync added medicine presets
  useEffect(() => {
    const added = medicinesOptions
      .filter(opt => medicines.some(m => m.medicine_name.toLowerCase() === opt.medicine.medicine_name.toLowerCase()))
      .map(opt => opt.id);
    setAddedMedicineIds(added);
  }, [medicines, medicinesOptions]);

  // Synchronize medicines and tapering steps frequency display when frequencyFormat changes
  useEffect(() => {
    setMedicines((prev) =>
      prev.map((m) => {
        const updatedSteps = m.tapering_steps?.map((s) => ({
          ...s,
          frequency: formatFrequencyByPreference(null, s.frequency, false, frequencyFormat) || s.frequency,
        }));
        const updatedFreq = m.is_prn
          ? "SOS"
          : m.frequency === "Refer steps"
          ? "Refer steps"
          : m.frequency_structure
          ? formatFrequencyByPreference(m.frequency_structure, m.frequency, false, frequencyFormat)
          : m.frequency
          ? formatFrequencyByPreference(null, m.frequency, false, frequencyFormat)
          : m.frequency;

        return {
          ...m,
          frequency: updatedFreq || m.frequency,
          tapering_steps: updatedSteps,
        };
      })
    );
  }, [frequencyFormat]);

  // Sync diagnosis textarea with selectedDiagnoses chips
  useEffect(() => {
    if (selectedDiagnoses.length > 0) {
      setValue("diagnosis", selectedDiagnoses.join(", "));
    } else {
      setValue("diagnosis", "");
    }
  }, [selectedDiagnoses, setValue]);

  // Sync added diagnosis presets
  useEffect(() => {
    const added = diagnosesOptions
      .filter(opt => selectedDiagnoses.some(d => d.toLowerCase() === opt.value.toLowerCase()))
      .map(opt => opt.id || opt.value);
    setAddedDiagnosisIds(added);
  }, [selectedDiagnoses, diagnosesOptions]);

  // Load previous prescriptions
  useEffect(() => {
    const fetchPreviousPrescriptions = async () => {
      setLoadingPrevious(true);
      try {
        const response = await prescriptionsApi.getByPatient(patientId, {
          page_size: 10,
        });
        setPreviousPrescriptions(response.items || []);
      } catch (error) {
        console.error("Failed to fetch previous prescriptions:", error);
      } finally {
        setLoadingPrevious(false);
      }
    };
    fetchPreviousPrescriptions();
  }, [patientId]);

  // Load existing prescription (draft or finalized)
  useEffect(() => {
    const fetchPrescription = async () => {
      try {
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const response = await prescriptionsApi.list({
          visit_id: visitId,
          page_size: 1,
          tenant_id: tenantId || undefined,
        });

        if (response.items.length > 0) {
          const rx = response.items[0];
          setDraftPrescriptionId(rx.id);
          setPrescriptionStatus(rx.status);
          setSavedPrescription(rx);

          if (rx.diagnosis) {
            setValue("diagnosis", rx.diagnosis);
            setSelectedDiagnoses(rx.diagnosis.split(",").map((d: string) => d.trim()).filter(Boolean));
          }
          if (rx.notes) setValue("notes", rx.notes);
          if (rx.plan_of_action) setValue("plan_of_action", rx.plan_of_action);
          if (rx.remarks) setValue("remarks", rx.remarks);
          setAdviceItems(
            (rx.advice_items ?? []).map((a) => ({
              advice_type: ((a.advice_type as string) === "test" ? "lab-test" : a.advice_type) as "lab-test" | "instruction",
              description: a.description,
              notes: a.notes,
              lab_test_id: a.lab_test_id,
            }))
          );
          setFollowupDate(rx.followup_date ?? null);

          if (rx.items && rx.items.length > 0) {
            const loadedMedicines: MedicineFormData[] = rx.items.map((item, index) => ({
              tempId: `draft-${index}-${Date.now()}`,
              medicine_id: item.medicine_id,
              medicine_name: item.medicine_name,
              generic_name: item.generic_name || undefined,
              brand: item.brand,
              form: item.form || "Tablet",
              strength: item.strength || "",
              route: item.route || "Oral",
              dose: item.dose || item.dosage || "",
              frequency_structure: item.frequency_structure || parseFrequencyToStructure(item.frequency),
              frequency: item.frequency || "",
              timing: item.timing || "After food",
              duration: item.duration || "",
              quantity: item.quantity || "",
              is_prn: Boolean(item.is_prn),
              prn_reason: item.prn_reason || "",
              start_date: item.start_date || getTodayDateStr(),
              end_date: item.end_date || "",
              instructions: item.instructions || "",
              special_instructions: item.special_instructions || "",
              tapering_steps: item.tapering_steps || undefined,
            }));
            setMedicines(loadedMedicines);
          }
        }
      } catch (error) {
        console.error("Failed to fetch prescription:", error);
      }
    };
    fetchPrescription();
  }, [visitId, setValue]);

  // Search medicines with debounce
  useEffect(() => {
    if (medicineSearchTerm.trim().length >= 2) {
      const timeoutId = setTimeout(async () => {
        setLoadingMedicines(true);
        try {
          const response = await medicinesApi.search({
            q: medicineSearchTerm.trim(),
            page_size: 20,
            is_active: true,
          });
          setAvailableMedicines(response.items);
          setShowMedicineDropdown(response.items.length > 0);
        } catch (error) {
          console.error("Failed to search medicines:", error);
          setAvailableMedicines([]);
          setShowMedicineDropdown(false);
        } finally {
          setLoadingMedicines(false);
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setAvailableMedicines([]);
      setShowMedicineDropdown(false);
    }
  }, [medicineSearchTerm]);

  // Search diagnoses with debounce
  useEffect(() => {
    if (diagnosisSearchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(async () => {
        setSearchingDiagnoses(true);
        try {
          const response = await diagnosesApi.list({
            search: diagnosisSearchQuery.trim(),
            page_size: 10,
          });
          setDiagnosisSearchResults(response.items.map(d => ({
            id: d.id,
            label: d.diagnosis_name,
            value: d.diagnosis_name,
            category: d.category || 'other'
          })));
          setShowDiagnosisDropdown(response.items.length > 0);
        } catch (error) {
          console.error("Failed to search diagnoses:", error);
          setDiagnosisSearchResults([]);
          setShowDiagnosisDropdown(false);
        } finally {
          setSearchingDiagnoses(false);
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setDiagnosisSearchResults([]);
      setShowDiagnosisDropdown(false);
    }
  }, [diagnosisSearchQuery]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (medicineSearchRef.current && !medicineSearchRef.current.contains(event.target as Node)) {
        setShowMedicineDropdown(false);
      }
      if (diagnosisSearchRef.current && !diagnosisSearchRef.current.contains(event.target as Node)) {
        setShowDiagnosisDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddMedicine = (medicine: Medicine) => {
    if (medicines.some((m) => m.medicine_id === medicine.id || m.medicine_name.toLowerCase() === medicine.name.toLowerCase())) {
      toast.error("Medicine already added");
      return;
    }

    const today = getTodayDateStr();
    const defaultDuration = medicine.default_duration || "5 days";
    const defaultForm = medicine.dosage_form || "Tablet";
    const defaultDose = medicine.default_dosage || `1 ${defaultForm.toLowerCase()}`;
    const defaultFreq = medicine.default_frequency || "1-0-1";
    const freqStruct = parseFrequencyToStructure(defaultFreq);
    const initialEndDate = calculateEndDate(today, defaultDuration);
    const initialQty = calculateQuantity(freqStruct, defaultDuration, defaultDose, defaultForm);

    const newMedicine: MedicineFormData = {
      tempId: Math.random().toString(36).substring(7),
      medicine_id: medicine.id,
      medicine_name: medicine.name,
      generic_name: medicine.generic_name || undefined,
      brand: medicine.manufacturer || undefined,
      form: defaultForm,
      strength: medicine.strength || "",
      route: (medicine as any).route || "Oral",
      dose: defaultDose,
      frequency_structure: freqStruct,
      frequency: defaultFreq,
      timing: "After food",
      duration: defaultDuration,
      start_date: today,
      end_date: initialEndDate,
      quantity: initialQty,
      is_prn: false,
      prn_reason: "",
      instructions: medicine.default_instructions || "Take with water",
      special_instructions: "",
    };

    setMedicines([...medicines, newMedicine]);
    setMedicineSearchTerm("");
    setShowMedicineDropdown(false);
  };

  const handleQuickMedicineAdd = async (id: string) => {
    const preset = medicinesOptions.find((m) => m.id === id);
    if (preset) {
      if (medicines.some((m) => m.medicine_name.toLowerCase() === preset.medicine.medicine_name.toLowerCase())) {
        toast.error("Medicine already added");
        return;
      }

      let resolvedId = "";
      let catalogMatch: Medicine | null = null;
      try {
        const res = await medicinesApi.search({ q: preset.medicine.medicine_name.trim(), page_size: 5 });
        const match = res.items.find(m => m.name.toLowerCase() === preset.medicine.medicine_name.toLowerCase());
        if (match) {
          resolvedId = match.id;
          catalogMatch = match;
        } else if (res.items.length > 0) {
          resolvedId = res.items[0].id;
          catalogMatch = res.items[0];
        }
      } catch (error) {
        console.error("Failed to resolve medicine ID for preset:", error);
      }

      if (!resolvedId) {
        toast.error(`Could not find medicine "${preset.medicine.medicine_name}" in the catalog. Prescribing this requires a catalog match.`);
        return;
      }

      const hasTapering = Boolean(preset.medicine.tapering_steps && preset.medicine.tapering_steps.length > 0);
      const today = getTodayDateStr();
      const defaultForm = preset.medicine.form || catalogMatch?.dosage_form || "Tablet";
      const defaultDose = preset.medicine.dose || preset.medicine.dosage || (hasTapering ? "1 drop" : `1 ${defaultForm.toLowerCase()}`);
      const steps = preset.medicine.tapering_steps ? JSON.parse(JSON.stringify(preset.medicine.tapering_steps)) : undefined;

      let initialDuration = preset.medicine.duration || "5 days";
      let initialEndDate = calculateEndDate(today, initialDuration);
      let initialQty = "1";
      let initialFreq = preset.medicine.frequency || "1-0-1";
      let freqStruct: StructuredFrequency | null = null;
      let isPrn = false;

      if (hasTapering && steps) {
        const totalDays = steps.reduce((sum: number, s: any) => sum + (parseDurationToDays(s.duration) || 7), 0);
        initialDuration = totalDays >= 7 && totalDays % 7 === 0 ? `${totalDays / 7} weeks` : `${totalDays} days`;
        initialEndDate = calculateEndDate(today, `${totalDays} days`);
        initialQty = preset.medicine.quantity || calculateTaperingQuantity(steps, defaultForm);
        initialFreq = "Refer steps";
      } else {
        initialFreq = preset.medicine.frequency || "1-0-1";
        isPrn = Boolean(
          preset.medicine.is_prn ??
            (initialFreq.toUpperCase() === "SOS" || initialFreq.toLowerCase().includes("as needed"))
        );
        freqStruct = isPrn ? { morning: 0, afternoon: 0, evening: 0, night: 0 } : (preset.medicine.frequency_structure || parseFrequencyToStructure(initialFreq));
        initialEndDate = calculateEndDate(today, initialDuration);
        initialQty = isPrn
          ? "As needed"
          : preset.medicine.quantity || calculateQuantity(freqStruct, initialDuration, defaultDose, defaultForm);
      }

      const tempId = Math.random().toString(36).substring(7);
      const newMed: MedicineFormData = {
        tempId,
        medicine_id: resolvedId,
        medicine_name: preset.medicine.medicine_name,
        generic_name: preset.medicine.generic_name || catalogMatch?.generic_name || undefined,
        brand: preset.medicine.brand || catalogMatch?.manufacturer || undefined,
        form: defaultForm,
        strength: preset.medicine.strength || catalogMatch?.strength || "",
        route: preset.medicine.route || (catalogMatch as any)?.route || (hasTapering ? "Ophthalmic" : "Oral"),
        dose: defaultDose,
        frequency_structure: freqStruct,
        frequency: isPrn ? "SOS" : initialFreq,
        timing: preset.medicine.timing || "As advised",
        duration: initialDuration,
        start_date: today,
        end_date: initialEndDate,
        quantity: initialQty,
        is_prn: isPrn,
        prn_reason: isPrn ? (preset.medicine.prn_reason || "Fever / Pain") : "",
        instructions: preset.medicine.instructions || (hasTapering ? "Taper as advised" : "Take with water"),
        special_instructions: preset.medicine.special_instructions || "",
        tapering_steps: steps,
      };
      setMedicines([...medicines, newMed]);
      toast.success(`Added preset: ${preset.label}`);
    }
  };

  const handleRemoveMedicine = (tempId: string) => {
    setMedicines(medicines.filter((m) => m.tempId !== tempId));
  };

  const handleMedicineChange = (tempId: string, field: keyof MedicineFormData, value: any) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.tempId !== tempId) return m;
        const updated = { ...m, [field]: value };

        if (field === "duration" || field === "start_date") {
          const sDate = field === "start_date" ? value : m.start_date;
          const dur = field === "duration" ? value : m.duration;
          updated.end_date = calculateEndDate(sDate, dur);
          if (!m.is_prn && !m.tapering_steps?.length) {
            updated.quantity = calculateQuantity(m.frequency_structure, dur, m.dose, m.form) || m.quantity;
          }
        }

        if ((field === "dose" || field === "form") && !m.is_prn && !m.tapering_steps?.length) {
          const dose = field === "dose" ? value : m.dose;
          const form = field === "form" ? value : m.form;
          updated.quantity = calculateQuantity(m.frequency_structure, m.duration, dose, form) || m.quantity;
        }

        return updated;
      })
    );
  };

  const handleFrequencySlotChange = (
    tempId: string,
    slot: keyof StructuredFrequency,
    val: number | string
  ) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.tempId !== tempId) return m;
        const numVal = Math.max(0, parseFloat(val as string) || 0);
        const newStruct: StructuredFrequency = {
          morning: slot === "morning" ? numVal : (Number(m.frequency_structure?.morning) || 0),
          afternoon: slot === "afternoon" ? numVal : (Number(m.frequency_structure?.afternoon) || 0),
          evening: slot === "evening" ? numVal : (Number(m.frequency_structure?.evening) || 0),
          night: slot === "night" ? numVal : (Number(m.frequency_structure?.night) || 0),
        };
        const newQty = calculateQuantity(newStruct, m.duration, m.dose, m.form);
        return {
          ...m,
          frequency_structure: newStruct,
          frequency: formatFrequencyString(newStruct),
          is_prn: false,
          quantity: newQty || m.quantity,
        };
      })
    );
  };

  const handleApplyQuickFrequency = (tempId: string, preset: (typeof QUICK_FREQUENCY_PRESETS)[number]) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.tempId !== tempId) return m;
        const newStruct = { ...preset.struct };
        const isPrn = Boolean((preset as any).isPrn);
        const newQty = calculateQuantity(newStruct, m.duration, m.dose, m.form);
        const formattedFreq = formatFrequencyByPreference(newStruct, preset.freq, isPrn, frequencyFormat);
        return {
          ...m,
          frequency_structure: newStruct,
          frequency: formattedFreq || preset.freq,
          is_prn: isPrn,
          quantity: isPrn ? "As needed" : (newQty || m.quantity),
        };
      })
    );
  };

  const handleTaperingStepsChange = (tempId: string, steps: any[] | undefined) => {
    setMedicines(
      medicines.map((m) => {
        if (m.tempId !== tempId) return m;

        if (steps && steps.length > 0) {
          const totalDays = steps.reduce((sum, s) => sum + (parseDurationToDays(s.duration) || 7), 0);
          const totalCourseDuration = totalDays >= 7 && totalDays % 7 === 0 ? `${totalDays / 7} weeks` : `${totalDays} days`;
          const newEndDate = calculateEndDate(m.start_date || getTodayDateStr(), `${totalDays} days`);
          const newQty = calculateTaperingQuantity(steps, m.form);

          return {
            ...m,
            tapering_steps: steps,
            frequency: "Refer steps",
            frequency_structure: null,
            duration: totalCourseDuration,
            end_date: newEndDate,
            quantity: newQty,
            instructions: m.instructions || "Taper as advised",
          };
        } else {
          // Reverting to fixed frequency
          const defaultDuration = "5 days";
          const defaultStruct: StructuredFrequency = { morning: 1, afternoon: 0, evening: 0, night: 1 };
          const newEndDate = calculateEndDate(m.start_date || getTodayDateStr(), defaultDuration);
          const newQty = calculateQuantity(defaultStruct, defaultDuration, m.dose, m.form);

          return {
            ...m,
            tapering_steps: undefined,
            frequency: "1-0-1",
            frequency_structure: defaultStruct,
            duration: defaultDuration,
            end_date: newEndDate,
            quantity: newQty,
            instructions: m.instructions === "Taper as advised" ? "Take with water" : m.instructions,
          };
        }
      })
    );
  };

  const handleDiagnosisToggle = (value: string) => {
    if (selectedDiagnoses.includes(value)) {
      setSelectedDiagnoses(selectedDiagnoses.filter((d) => d !== value));
    } else {
      setSelectedDiagnoses([...selectedDiagnoses, value]);
    }
  };

  const handleSelectDiagnosisFromSearch = (item: any) => {
    if (selectedDiagnoses.some(d => d.toLowerCase() === item.value.toLowerCase())) {
      toast.error("Diagnosis already added");
      return;
    }
    setSelectedDiagnoses([...selectedDiagnoses, item.value]);
    setDiagnosisSearchQuery("");
    setShowDiagnosisDropdown(false);
  };

  const handleLoadPreviousPrescription = (prescription: PrescriptionResponse) => {
    const newMedicines: MedicineFormData[] = prescription.items.map((item) => ({
      tempId: Math.random().toString(36).substring(7),
      medicine_id: item.medicine_id,
      medicine_name: item.medicine_name,
      generic_name: item.generic_name || undefined,
      brand: item.brand,
      form: item.form || "Tablet",
      strength: item.strength || "",
      route: item.route || "Oral",
      dose: item.dose || item.dosage || "",
      frequency_structure: item.frequency_structure || parseFrequencyToStructure(item.frequency),
      frequency: item.frequency || "",
      timing: item.timing || "After food",
      duration: item.duration || "",
      quantity: item.quantity || "",
      is_prn: Boolean(item.is_prn),
      prn_reason: item.prn_reason || "",
      start_date: item.start_date || getTodayDateStr(),
      end_date: item.end_date || "",
      instructions: item.instructions || "",
      special_instructions: item.special_instructions || "",
      tapering_steps: item.tapering_steps || undefined,
    }));

    setMedicines(newMedicines);
    if (prescription.diagnosis) {
      setValue("diagnosis", prescription.diagnosis);
      setSelectedDiagnoses(prescription.diagnosis.split(",").map(d => d.trim()).filter(Boolean));
    } else {
      setSelectedDiagnoses([]);
    }
    if (prescription.notes) setValue("notes", prescription.notes);
    if (prescription.plan_of_action) setValue("plan_of_action", prescription.plan_of_action);
    if (prescription.remarks) setValue("remarks", prescription.remarks);
    setAdviceItems(
      (prescription.advice_items ?? []).map((a) => ({
        advice_type: ((a.advice_type as string) === "test" ? "lab-test" : a.advice_type) as "lab-test" | "instruction",
        description: a.description,
        notes: a.notes,
        lab_test_id: a.lab_test_id,
      }))
    );
    setFollowupDate(prescription.followup_date ?? null);
    setShowHistoryPanel(false);
    toast.success("Prescription loaded");
  };

  const handleLoadTemplate = (template: PrescriptionTemplate) => {
    const today = getTodayDateStr();
    const newMedicines: MedicineFormData[] = template.items.map((item) => {
      const freq = item.frequency || "1-0-1";
      const freqStruct = parseFrequencyToStructure(freq);
      const duration = item.duration || "5 days";
      const dose = item.dosage || "1 tablet";
      return {
        tempId: Math.random().toString(36).substring(7),
        medicine_id: item.medicine_id,
        medicine_name: item.medicine_name,
        generic_name: item.generic_name,
        brand: (item as any).brand || undefined,
        form: (item as any).form || "Tablet",
        strength: (item as any).strength || "",
        route: (item as any).route || "Oral",
        dose: dose,
        frequency_structure: freqStruct,
        frequency: freq,
        timing: (item as any).timing || "After food",
        duration: duration,
        start_date: today,
        end_date: calculateEndDate(today, duration),
        quantity: calculateQuantity(freqStruct, duration, dose, "Tablet"),
        is_prn: false,
        prn_reason: "",
        instructions: item.instructions || "",
        special_instructions: (item as any).special_instructions || "",
        tapering_steps: item.tapering_steps || undefined,
      };
    });

    setMedicines(newMedicines);
    if (template.diagnosis) {
      setValue("diagnosis", template.diagnosis);
      setSelectedDiagnoses(template.diagnosis.split(",").map(d => d.trim()).filter(Boolean));
    } else {
      setSelectedDiagnoses([]);
    }
    setShowHistoryPanel(false);
    toast.success(`Template "${template.name}" loaded`);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (medicines.length === 0) {
      toast.error("Please add at least one medicine");
      return;
    }

    const templateItems: PrescriptionTemplateItem[] = medicines.map((med) => {
      const hasTapering = med.tapering_steps && med.tapering_steps.length > 0;
      return {
        medicine_id: med.medicine_id,
        medicine_name: med.medicine_name,
        generic_name: med.generic_name,
        dosage: hasTapering ? "Refer steps" : (med.dose || med.dosage || ""),
        frequency: hasTapering ? "Refer steps" : (med.frequency || ""),
        duration: hasTapering ? "Refer steps" : (med.duration || ""),
        instructions: hasTapering ? "Refer steps" : (med.instructions || ""),
        tapering_steps: med.tapering_steps,
      };
    });

    saveTemplate({
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      diagnosis: diagnosis || undefined,
      items: templateItems,
    });

    toast.success("Template saved");
    setShowSaveTemplateModal(false);
    setTemplateName("");
    setTemplateDescription("");
  };

  const buildPrescriptionPayload = (data: FormData) => {
    return {
      visit_id: visitId,
      patient_id: patientId,
      doctor_id: doctorId,
      items: medicines.map((med) => {
        const hasTapering = med.tapering_steps && med.tapering_steps.length > 0;
        return {
          medicine_id: med.medicine_id?.trim() || null,
          medicine_name: med.medicine_name,
          generic_name: med.generic_name || undefined,
          dosage: hasTapering ? "Refer steps" : (med.dose || med.dosage || undefined),
          frequency: hasTapering ? "Refer steps" : (med.frequency || undefined),
          duration: hasTapering ? "Refer steps" : (med.duration || undefined),
          instructions: hasTapering ? "Refer steps" : (med.instructions || undefined),
          tapering_steps: med.tapering_steps || undefined,
          brand: med.brand || undefined,
          form: med.form || undefined,
          strength: med.strength || undefined,
          route: med.route || undefined,
          dose: med.dose || undefined,
          frequency_structure: med.frequency_structure || undefined,
          timing: med.timing || undefined,
          quantity: med.quantity || undefined,
          is_prn: Boolean(med.is_prn),
          prn_reason: med.is_prn ? med.prn_reason || undefined : undefined,
          start_date: med.start_date || undefined,
          end_date: med.end_date || undefined,
          special_instructions: med.special_instructions || undefined,
        };
      }),
      diagnosis: data.diagnosis?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      advice_items: adviceItems,
      followup_date: followupDate,
      plan_of_action: data.plan_of_action?.trim() || null,
      remarks: data.remarks?.trim() || null,
    };
  };

  const onSubmit = async (data: FormData) => {
    if (medicines.length === 0) {
      toast.error("Please add at least one medicine");
      return;
    }

    setLoading(true);
    try {
      const prescriptionData = buildPrescriptionPayload(data);

      let result: PrescriptionResponse;
      if (draftPrescriptionId) {
        result = await prescriptionsApi.update(draftPrescriptionId, prescriptionData);
        toast.success("Draft updated");
      } else {
        result = await prescriptionsApi.create(prescriptionData);
        setDraftPrescriptionId(result.id);
        toast.success("Draft saved");
      }

      setSavedPrescription(result);
      setPrescriptionStatus(result.status);
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async (data: FormData) => {
    if (medicines.length === 0) {
      toast.error("Please add at least one medicine");
      return;
    }

    setLoading(true);
    try {
      const prescriptionData = buildPrescriptionPayload(data);

      let prescriptionId: string;
      if (draftPrescriptionId) {
        await prescriptionsApi.update(draftPrescriptionId, prescriptionData);
        prescriptionId = draftPrescriptionId;
      } else {
        const prescription = await prescriptionsApi.create(prescriptionData);
        prescriptionId = prescription.id;
      }

      const rx = await prescriptionsApi.finalize(prescriptionId);
      setPrescriptionStatus("finalized");
      setSavedPrescription(rx);
      toast.success("Prescription finalized");
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Failed to finalize");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintClick = async (data: FormData) => {
    if (!canEdit && savedPrescription) {
      setShowPrintPreview(true);
      return;
    }

    if (medicines.length === 0) {
      toast.error("Please add at least one medicine");
      return;
    }

    setLoading(true);
    try {
      const prescriptionData = buildPrescriptionPayload(data);

      let result: PrescriptionResponse;
      if (draftPrescriptionId) {
        result = await prescriptionsApi.update(draftPrescriptionId, prescriptionData);
      } else {
        result = await prescriptionsApi.create(prescriptionData);
        setDraftPrescriptionId(result.id);
      }
      setSavedPrescription(result);
      setPrescriptionStatus(result.status);
      setShowPrintPreview(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Failed to save draft for print");
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const patientInfo = patient
    ? formatPatientName(patient) +
      (patient.date_of_birth ? ` (${calculateAge(patient.date_of_birth)}${patient.gender ? patient.gender.charAt(0).toUpperCase() : ""})` : "") +
      (patient.uhid ? ` • ${patient.uhid}` : "")
    : "Loading...";

  const doctorInfo = doctor?.user_name || doctor?.name || "Loading...";

  return (
    <div className="flex h-[75vh] flex-col">
      {/* Header Section */}
      <div className="mb-5 rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient & Doctor</h3>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm">
            <span className="font-semibold text-slate-900">{patientInfo}</span>
            <span className="mx-3 text-slate-300">|</span>
            <span className="text-slate-600">{doctorInfo}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowHistoryPanel(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <History className="h-3.5 w-3.5" />
            History
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-5 overflow-y-auto pr-1">

          {/* SECTION 1: Medicines */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Medicines {medicines.length > 0 && <span className="ml-1 text-sky-600">({medicines.length})</span>}
                </h3>
                {/* Frequency Display Format Quick Switcher */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 px-1 uppercase tracking-wider">Freq:</span>
                  {(["numeric", "descriptive", "both"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFrequencyFormat(fmt)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                        frequencyFormat === fmt
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                      title={`Display frequencies as ${
                        fmt === "numeric"
                          ? "Numeric Codes (1-0-1)"
                          : fmt === "descriptive"
                          ? "Descriptive Words (Three times a day)"
                          : "Both Combined (1-0-1 (Three times a day))"
                      }`}
                    >
                      {fmt === "numeric" ? "1-0-1" : fmt === "descriptive" ? "Words" : "Both"}
                    </button>
                  ))}
                </div>
              </div>
              {doctorId && (
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition flex items-center gap-1 text-xs"
                  title="Configure Presets & Frequency Format"
                >
                  <Settings className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="p-4">
              {/* Medicine Quick Presets */}
              {medicinesOptions.length > 0 && (
                <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2 text-slate-500">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Quick Presets</span>
                  </div>
                  <MedicineQuickChips
                    options={medicinesOptions}
                    addedIds={addedMedicineIds}
                    onAdd={handleQuickMedicineAdd}
                    className="flex flex-wrap gap-2"
                  />
                </div>
              )}

              {/* Medicine Search */}
              <div ref={medicineSearchRef} className="relative mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={medicineSearchTerm}
                    onChange={(e) => {
                      setMedicineSearchTerm(e.target.value);
                      setShowMedicineDropdown(true);
                    }}
                    onFocus={() => availableMedicines.length > 0 && setShowMedicineDropdown(true)}
                    disabled={!canEdit}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder={canEdit ? "Type to search medicines..." : "Prescription is finalized (editing disabled)"}
                  />
                  {loadingMedicines && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                  )}
                </div>

                {/* Search Dropdown */}
                {showMedicineDropdown && availableMedicines.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {availableMedicines.map((medicine) => (
                      <div
                        key={medicine.id}
                        onClick={() => handleAddMedicine(medicine)}
                        className="cursor-pointer border-b border-slate-100 px-4 py-2.5 text-sm hover:bg-sky-50 last:border-0"
                      >
                        <div className="font-medium text-slate-900">{medicine.name}</div>
                        <div className="text-xs text-slate-500">
                          {[medicine.generic_name, medicine.strength, medicine.dosage_form]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Medicine List */}
              {medicines.length > 0 ? (
                <div className="space-y-3">
                  {medicines.map((medicine, index) => {
                    const taperingSteps = medicine.tapering_steps;
                    const hasTapering = taperingSteps && taperingSteps.length > 0;
                    const freqStruct = medicine.frequency_structure || parseFrequencyToStructure(medicine.frequency);
                    const isExpanded = Boolean(expandedMedIds[medicine.tempId]);
                    const showCustomFrequency = Boolean(customFrequencyMedIds[medicine.tempId]);

                    return (
                      <div
                        key={medicine.tempId}
                        className="group rounded-xl border border-slate-200 bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-sm"
                      >
                        {/* Header Row: Number + Name + Key Badges + Right Controls */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-3.5 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-[11px] font-bold text-white shadow-2xs">
                              {index + 1}
                            </span>
                            <span className="font-bold text-slate-900 text-sm tracking-tight">
                              {medicine.medicine_name}
                            </span>
                            {medicine.form && (
                              <span className="text-[11px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {medicine.form}
                              </span>
                            )}
                            {medicine.strength && (
                              <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {medicine.strength}
                              </span>
                            )}
                            {medicine.generic_name && (
                              <span className="text-[11px] text-slate-500 italic hidden sm:inline">
                                ({medicine.generic_name})
                              </span>
                            )}
                            {medicine.brand && (
                              <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                                Brand: {medicine.brand}
                              </span>
                            )}
                            {hasTapering && (
                              <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                                <TrendingDown className="h-3 w-3" /> Tapering
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => toggleExpandMed(medicine.tempId)}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
                              title={isExpanded ? "Hide advanced fields" : "Show advanced fields"}
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                              <span>{isExpanded ? "Fewer details" : "More details"}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                              )}
                            </button>

                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMedicine(medicine.tempId)}
                                className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                title="Remove medication"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Main Primary View (Fast, Clean, OPD-ready) */}
                        <div className="p-3.5 space-y-3">
                          {hasTapering ? (
                            /* Tapering Regimen View (Active Tapering Schedule) */
                            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3.5 space-y-3 animate-in fade-in">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white shadow-xs">
                                    <TrendingDown className="h-3.5 w-3.5" />
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                                        Tapering Dose Schedule ({(taperingSteps || []).length} Steps)
                                      </h5>
                                      <span className="rounded bg-purple-200/70 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                                        {medicine.duration || `${(taperingSteps || []).length * 7} days course`}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-purple-700 font-medium">
                                      Graduated dose reduction regimen active for this medicine.
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 ml-auto">
                                  {/* Timing dropdown */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                      Timing:
                                    </span>
                                    <select
                                      value={medicine.timing || "As advised"}
                                      onChange={(e) => handleMedicineChange(medicine.tempId, "timing", e.target.value)}
                                      disabled={!canEdit}
                                      className="rounded-lg border border-purple-200 bg-white px-2.5 py-1 text-xs text-slate-800 font-medium focus:border-purple-500 focus:outline-none"
                                    >
                                      {MEDICATION_TIMINGS.map((timing) => (
                                        <option key={timing} value={timing}>
                                          {timing}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {canEdit && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentSteps = taperingSteps || [];
                                          const lastStep = currentSteps[currentSteps.length - 1];
                                          const defaultNextFreq = currentSteps.length === 0
                                            ? formatFrequencyByPreference(null, "3 times daily", false, frequencyFormat)
                                            : currentSteps.length === 1
                                            ? formatFrequencyByPreference(null, "2 times daily", false, frequencyFormat)
                                            : formatFrequencyByPreference(null, "1 time daily", false, frequencyFormat);
                                          const newSteps = [
                                            ...currentSteps,
                                            {
                                              sequence: currentSteps.length + 1,
                                              dosage: lastStep?.dosage || medicine.dose || "1 drop",
                                              frequency: lastStep?.frequency || defaultNextFreq,
                                              duration: lastStep?.duration || "7 days",
                                              instructions: lastStep?.instructions || medicine.instructions || "",
                                            },
                                          ];
                                          handleTaperingStepsChange(medicine.tempId, newSteps);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-purple-700 transition-colors shadow-xs"
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add Step
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleTaperingStepsChange(medicine.tempId, undefined)}
                                        className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors shadow-2xs"
                                        title="Remove tapering schedule and revert to standard frequency"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Remove Tapering
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2">
                                {(taperingSteps || []).map((step, stepIndex) => (
                                  <div key={stepIndex} className="flex flex-col sm:flex-row gap-2 items-end sm:items-center bg-white p-2.5 rounded-lg border border-purple-200/80 shadow-2xs">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-800">
                                      {stepIndex + 1}
                                    </span>
                                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                                      <div>
                                        <label className="text-[9px] font-bold text-purple-950/80 mb-0.5 block uppercase tracking-wide">
                                          Step {stepIndex + 1} Dose
                                        </label>
                                        <SearchableDropdown
                                          value={step.dosage || ""}
                                          onChange={(val) => {
                                            const newSteps = [...taperingSteps];
                                            newSteps[stepIndex] = { ...newSteps[stepIndex], dosage: val };
                                            handleTaperingStepsChange(medicine.tempId, newSteps);
                                          }}
                                          options={TAPERING_DOSAGES}
                                          placeholder="e.g. 1 drop"
                                          disabled={!canEdit}
                                          inputClassName="w-full rounded border border-purple-200 bg-white px-2 py-1 text-xs text-slate-900 font-medium focus:border-purple-500 focus:outline-none shadow-2xs"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold text-purple-950/80 mb-0.5 block uppercase tracking-wide">
                                          Frequency
                                        </label>
                                        <SearchableDropdown
                                          value={formatFrequencyByPreference(null, step.frequency, false, frequencyFormat) || step.frequency || ""}
                                          onChange={(val) => {
                                            const newSteps = [...taperingSteps];
                                            newSteps[stepIndex] = { ...newSteps[stepIndex], frequency: val };
                                            handleTaperingStepsChange(medicine.tempId, newSteps);
                                          }}
                                          options={getTaperingFrequencyOptions(frequencyFormat)}
                                          placeholder={frequencyFormat === "descriptive" ? "e.g. Three times a day" : frequencyFormat === "both" ? "e.g. 1-1-1 (Three times a day)" : "e.g. 1-1-1"}
                                          disabled={!canEdit}
                                          inputClassName="w-full rounded border border-purple-200 bg-white px-2 py-1 text-xs text-slate-900 font-medium focus:border-purple-500 focus:outline-none shadow-2xs"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold text-purple-950/80 mb-0.5 block uppercase tracking-wide">
                                          Duration
                                        </label>
                                        <SearchableDropdown
                                          value={step.duration || ""}
                                          onChange={(val) => {
                                            const newSteps = [...taperingSteps];
                                            newSteps[stepIndex] = { ...newSteps[stepIndex], duration: val };
                                            handleTaperingStepsChange(medicine.tempId, newSteps);
                                          }}
                                          options={TAPERING_DURATIONS}
                                          placeholder="e.g. 7 days"
                                          disabled={!canEdit}
                                          inputClassName="w-full rounded border border-purple-200 bg-white px-2 py-1 text-xs text-slate-900 font-medium focus:border-purple-500 focus:outline-none shadow-2xs"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold text-purple-950/80 mb-0.5 block uppercase tracking-wide">
                                          Instructions
                                        </label>
                                        <SearchableDropdown
                                          value={step.instructions || ""}
                                          onChange={(val) => {
                                            const newSteps = [...taperingSteps];
                                            newSteps[stepIndex] = { ...newSteps[stepIndex], instructions: val };
                                            handleTaperingStepsChange(medicine.tempId, newSteps);
                                          }}
                                          options={TAPERING_INSTRUCTIONS}
                                          placeholder="e.g. Affected Eye"
                                          disabled={!canEdit}
                                          inputClassName="w-full rounded border border-purple-200 bg-white px-2 py-1 text-xs text-slate-900 font-medium focus:border-purple-500 focus:outline-none shadow-2xs"
                                        />
                                      </div>
                                    </div>
                                    {taperingSteps.length > 1 && canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newSteps = taperingSteps.filter((_, sIdx) => sIdx !== stepIndex)
                                            .map((s, newIdx) => ({ ...s, sequence: newIdx + 1 }));
                                          handleTaperingStepsChange(medicine.tempId, newSteps);
                                        }}
                                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                        title="Remove step"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            /* Standard Fixed Frequency & Duration View */
                            <>
                              {/* Line 1: Quick Frequency Presets + Custom Toggle + Tapering Quick Button + Timing */}
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                                    Frequency:
                                  </span>
                                  {QUICK_FREQUENCY_PRESETS.map((p) => {
                                    const isActive =
                                      (p.isPrn && medicine.is_prn) ||
                                      (!medicine.is_prn && (medicine.frequency === p.freq || medicine.frequency === p.numeric || medicine.frequency === p.descriptive));

                                    return (
                                      <button
                                        key={p.label}
                                        type="button"
                                        onClick={() => handleApplyQuickFrequency(medicine.tempId, p)}
                                        disabled={!canEdit}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                          isActive
                                            ? "bg-sky-600 text-white shadow-xs"
                                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                        title={`${p.numeric} • ${p.sub}`}
                                      >
                                        {getFrequencyPillLabel(p, frequencyFormat)}
                                      </button>
                                    );
                                  })}

                                  <button
                                    type="button"
                                    onClick={() => toggleCustomFrequency(medicine.tempId)}
                                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold border transition-all ${
                                      showCustomFrequency
                                        ? "border-sky-300 bg-sky-50 text-sky-700"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
                                    title="Customize individual morning/afternoon/evening/night doses"
                                  >
                                    {showCustomFrequency ? "Hide Custom Slots" : "Custom Slots ▾"}
                                  </button>

                                  {/* Tapering Quick Action Button */}
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleTaperingStepsChange(
                                          medicine.tempId,
                                          getDefaultTaperingSteps(frequencyFormat, medicine.dose || "1 drop", medicine.instructions || "")
                                        );
                                      }}
                                      className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors shadow-2xs"
                                      title="Enable gradual tapering dose schedule for this medicine"
                                    >
                                      <TrendingDown className="h-3.5 w-3.5 text-purple-600" />
                                      Enable Tapering
                                    </button>
                                  )}
                                </div>

                                {/* Timing dropdown */}
                                <div className="flex items-center gap-1.5 ml-auto">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    Timing:
                                  </span>
                                  <select
                                    value={medicine.timing || "After food"}
                                    onChange={(e) => handleMedicineChange(medicine.tempId, "timing", e.target.value)}
                                    disabled={!canEdit}
                                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 font-medium focus:border-sky-500 focus:outline-none"
                                  >
                                    {MEDICATION_TIMINGS.map((timing) => (
                                      <option key={timing} value={timing}>
                                        {timing}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Custom 4-Slot Dosage Counters (Shown only when toggled) */}
                              {showCustomFrequency && (
                                <div className="rounded-lg border border-sky-100 bg-sky-50/40 p-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {/* Morning */}
                                    <div className="flex items-center justify-between bg-white rounded border border-slate-200 px-2 py-1">
                                      <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                                        <Sunrise className="h-3.5 w-3.5" /> M
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {canEdit && (
                                          <button
                                            type="button"
                                            onClick={() => handleFrequencySlotChange(medicine.tempId, "morning", Math.max(0, (Number(freqStruct.morning) || 0) - 0.5))}
                                            className="h-5 w-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                                          >
                                            -
                                          </button>
                                        )}
                                        <input
                                          type="number"
                                          step="0.5"
                                          min="0"
                                          value={freqStruct?.morning ?? 0}
                                          onChange={(e) => handleFrequencySlotChange(medicine.tempId, "morning", e.target.value)}
                                          disabled={!canEdit}
                                          className="w-8 text-center text-xs font-bold text-slate-900 border-0 p-0 focus:outline-none"
                                        />
                                        {canEdit && (
                                          <button
                                            type="button"
                                            onClick={() => handleFrequencySlotChange(medicine.tempId, "morning", (Number(freqStruct?.morning) || 0) + 1)}
                                            className="h-5 w-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                                          >
                                            +
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Afternoon */}
                                    <div className="flex items-center justify-between bg-white rounded border border-slate-200 px-2 py-1">
                                      <span className="text-[11px] font-bold text-orange-600 flex items-center gap-1">
                                        <Sun className="h-3.5 w-3.5" /> A
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {canEdit && (
                                          <button
                                            type="button"
                                            onClick={() => handleFrequencySlotChange(medicine.tempId, "afternoon", Math.max(0, (Number(freqStruct?.afternoon) || 0) - 0.5))}
                                            className="h-5 w-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                                          >
                                            -
                                          </button>
                                        )}
                                        <input
                                          type="number"
                                          step="0.5"
                                          min="0"
                                          value={freqStruct?.afternoon ?? 0}
                                          onChange={(e) => handleFrequencySlotChange(medicine.tempId, "afternoon", e.target.value)}
                                          disabled={!canEdit}
                                          className="w-8 text-center text-xs font-bold text-slate-900 border-0 p-0 focus:outline-none"
                                        />
                                        {canEdit && (
                                          <button
                                            type="button"
                                            onClick={() => handleFrequencySlotChange(medicine.tempId, "afternoon", (Number(freqStruct?.afternoon) || 0) + 1)}
                                            className="h-5 w-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                                          >
                                            +
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Evening */}
                                    <div className="flex items-center justify-between bg-white rounded border border-slate-200 px-2 py-1">
                                      <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                                        <Sunset className="h-3.5 w-3.5" /> E
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {canEdit && (
                                          <button
                                            type="button"
                                            onClick={() => handleFrequencySlotChange(medicine.tempId, "evening", Math.max(0, (Number(freqStruct?.evening) || 0) - 0.5))}
                                            className="h-5 w-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                                          >
                                            -
                                          </button>
                                        )}
                                        <input
                                          type="number"
                                          step="0.5"
                                          min="0"
                                          value={freqStruct?.evening ?? 0}
                                          onChange={(e) => handleFrequencySlotChange(medicine.tempId, "evening", e.target.value)}
                                          disabled={!canEdit}
                                          className="w-8 text-center text-xs font-bold text-slate-900 border-0 p-0 focus:outline-none"
                                        />
                                        {canEdit && (
                                          <button
                                            type="button"
                                            onClick={() => handleFrequencySlotChange(medicine.tempId, "evening", (Number(freqStruct?.evening) || 0) + 1)}
                                            className="h-5 w-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                                          >
                                            +
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Night */}
                                    <div className="flex items-center justify-between bg-white rounded border border-slate-200 px-2 py-1">
                                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                        <Moon className="h-3.5 w-3.5" /> N
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {canEdit && (
                                          <button
                                            type="button"
                                            onClick={() => handleFrequencySlotChange(medicine.tempId, "night", Math.max(0, (Number(freqStruct?.night) || 0) - 0.5))}
                                            className="h-5 w-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                                          >
                                            -
                                          </button>
                                        )}
                                        <input
                                          type="number"
                                          step="0.5"
                                          min="0"
                                          value={freqStruct?.night ?? 0}
                                          onChange={(e) => handleFrequencySlotChange(medicine.tempId, "night", e.target.value)}
                                          disabled={!canEdit}
                                          className="w-8 text-center text-xs font-bold text-slate-900 border-0 p-0 focus:outline-none"
                                        />
                                        {canEdit && (
                                          <button
                                            type="button"
                                            onClick={() => handleFrequencySlotChange(medicine.tempId, "night", (Number(freqStruct?.night) || 0) + 1)}
                                            className="h-5 w-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                                          >
                                            +
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Line 2: Duration + Instructions in a sleek 2-column flex */}
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                                {/* Duration (5 cols) */}
                                <div className="sm:col-span-5 flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                      Duration:
                                    </span>
                                    <input
                                      type="text"
                                      value={medicine.duration || ""}
                                      onChange={(e) => handleMedicineChange(medicine.tempId, "duration", e.target.value)}
                                      disabled={!canEdit}
                                      placeholder="e.g. 5 days"
                                      className="w-28 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 font-semibold focus:border-sky-500 focus:outline-none"
                                    />
                                    {canEdit && (
                                      <div className="flex items-center gap-1">
                                        {COMMON_DURATIONS.slice(0, 4).map((dur) => (
                                          <button
                                            key={dur}
                                            type="button"
                                            onClick={() => handleMedicineChange(medicine.tempId, "duration", dur)}
                                            className="rounded bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700 font-medium transition-colors"
                                          >
                                            {dur.replace(" days", "d")}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Instructions (7 cols) */}
                                <div className="sm:col-span-7 flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                      Instructions:
                                    </span>
                                    <input
                                      type="text"
                                      value={medicine.instructions || ""}
                                      onChange={(e) => handleMedicineChange(medicine.tempId, "instructions", e.target.value)}
                                      disabled={!canEdit}
                                      placeholder="e.g. Take with water"
                                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            </>
                          )}

                          {/* Smart Summary Footer */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
                            <div className="flex flex-wrap items-center gap-3">
                              <span>
                                <strong className="text-slate-700">Frequency:</strong>{" "}
                                <span className="font-semibold text-slate-800">
                                  {medicine.is_prn
                                    ? "PRN / SOS"
                                    : hasTapering
                                    ? "Tapering Regimen"
                                    : (formatFrequencyByPreference(
                                        medicine.frequency_structure,
                                        medicine.frequency,
                                        medicine.is_prn,
                                        frequencyFormat
                                      ) || medicine.frequency || "—")}
                                </span>
                              </span>
                              <span>•</span>
                              <span>
                                <strong className="text-slate-700">Quantity:</strong> {medicine.quantity || "—"}
                              </span>
                              <span>•</span>
                              <span>
                                <strong className="text-slate-700">Route:</strong> {medicine.route || "Oral"}
                              </span>
                              {medicine.start_date && (
                                <>
                                  <span>•</span>
                                  <span>
                                    <strong className="text-slate-700">Dates:</strong> {medicine.start_date} {medicine.end_date ? `to ${medicine.end_date}` : ""}
                                  </span>
                                </>
                              )}
                              {medicine.is_prn && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                    PRN ({medicine.prn_reason || "As needed"})
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* EXPANDABLE "MORE DETAILS" ACCORDION */}
                          {isExpanded && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3.5 mt-2 animate-in fade-in slide-in-from-top-2 duration-150">
                              <div className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-1.5 flex items-center justify-between">
                                <span>Advanced Medication Details</span>
                                <span className="text-[10px] text-slate-400 font-normal">Optional clinical specifications</span>
                              </div>

                              {/* Grid 1: Clinical Information */}
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                                {/* Generic Name */}
                                <div className="col-span-2 sm:col-span-1 lg:col-span-2">
                                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    Generic Name
                                  </label>
                                  <input
                                    type="text"
                                    value={medicine.generic_name || ""}
                                    onChange={(e) => handleMedicineChange(medicine.tempId, "generic_name", e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="e.g. Paracetamol"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                                  />
                                </div>

                                {/* Brand */}
                                <div>
                                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    Brand
                                  </label>
                                  <input
                                    type="text"
                                    value={medicine.brand || ""}
                                    onChange={(e) => handleMedicineChange(medicine.tempId, "brand", e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="e.g. Crocin"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                                  />
                                </div>

                                {/* Form (17 options) */}
                                <div>
                                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    Form / Type
                                  </label>
                                  <select
                                    value={medicine.form || "Tablet"}
                                    onChange={(e) => handleMedicineChange(medicine.tempId, "form", e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                                  >
                                    {MEDICATION_FORMS.map((form) => (
                                      <option key={form} value={form}>
                                        {form}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Strength */}
                                <div>
                                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    Strength
                                  </label>
                                  <input
                                    type="text"
                                    value={medicine.strength || ""}
                                    onChange={(e) => handleMedicineChange(medicine.tempId, "strength", e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="e.g. 500 mg"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                                  />
                                </div>

                                {/* Route (12 options) */}
                                <div>
                                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    Route
                                  </label>
                                  <select
                                    value={medicine.route || "Oral"}
                                    onChange={(e) => handleMedicineChange(medicine.tempId, "route", e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                                  >
                                    {MEDICATION_ROUTES.map((route) => (
                                      <option key={route} value={route}>
                                        {route}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Dose */}
                                <div className="col-span-2 sm:col-span-1 lg:col-span-1">
                                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    Dose per intake
                                  </label>
                                  <input
                                    type="text"
                                    value={medicine.dose || medicine.dosage || ""}
                                    onChange={(e) => {
                                      handleMedicineChange(medicine.tempId, "dose", e.target.value);
                                      handleMedicineChange(medicine.tempId, "dosage", e.target.value);
                                    }}
                                    disabled={!canEdit}
                                    placeholder="e.g. 1 tablet"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                                  />
                                </div>
                              </div>

                              {/* Grid 2: Schedule & Quantity */}
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {/* Start Date */}
                                <div>
                                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    Start Date
                                  </label>
                                  <input
                                    type="date"
                                    value={medicine.start_date || getTodayDateStr()}
                                    onChange={(e) => handleMedicineChange(medicine.tempId, "start_date", e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                                  />
                                </div>

                                {/* End Date */}
                                <div>
                                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    End Date
                                  </label>
                                  <input
                                    type="date"
                                    value={medicine.end_date || ""}
                                    onChange={(e) => handleMedicineChange(medicine.tempId, "end_date", e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                                  />
                                </div>

                                {/* Total Quantity */}
                                <div>
                                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    Total Quantity
                                  </label>
                                  <input
                                    type="text"
                                    value={medicine.quantity || ""}
                                    onChange={(e) => handleMedicineChange(medicine.tempId, "quantity", e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="e.g. 10 tablets"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:border-sky-500 focus:outline-none"
                                  />
                                </div>
                              </div>

                              {/* Grid 3: PRN & Special Instructions */}
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {/* PRN Toggle & Reason */}
                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(medicine.is_prn)}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        handleMedicineChange(medicine.tempId, "is_prn", checked);
                                        if (checked) {
                                          handleMedicineChange(medicine.tempId, "frequency", "SOS");
                                          if (!medicine.prn_reason) {
                                            handleMedicineChange(medicine.tempId, "prn_reason", "Fever > 100°F / Pain");
                                          }
                                        } else {
                                          handleMedicineChange(medicine.tempId, "frequency", formatFrequencyString(freqStruct));
                                        }
                                      }}
                                      disabled={!canEdit}
                                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                    />
                                    <span className="text-xs font-bold text-slate-800">
                                      PRN / SOS (Take only as needed)
                                    </span>
                                  </label>

                                  {medicine.is_prn && (
                                    <div className="mt-2">
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                                        PRN Reason / Condition
                                      </label>
                                      <input
                                        type="text"
                                        value={medicine.prn_reason || ""}
                                        onChange={(e) => handleMedicineChange(medicine.tempId, "prn_reason", e.target.value)}
                                        disabled={!canEdit}
                                        placeholder="e.g. Fever > 100°F"
                                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Special Instructions */}
                                <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
                                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    Special Instructions / Precautions
                                  </label>
                                  <input
                                    type="text"
                                    value={medicine.special_instructions || ""}
                                    onChange={(e) => handleMedicineChange(medicine.tempId, "special_instructions", e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="e.g. Avoid taking with other paracetamol products"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                                  />
                                  {canEdit && (
                                    <div className="flex flex-wrap gap-1">
                                      {COMMON_SPECIAL_INSTRUCTIONS.slice(0, 3).map((sInst) => (
                                        <button
                                          key={sInst}
                                          type="button"
                                          onClick={() => handleMedicineChange(medicine.tempId, "special_instructions", sInst)}
                                          className="rounded bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 text-[9.5px] text-slate-600 truncate max-w-[150px]"
                                          title={sInst}
                                        >
                                          {sInst}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Section 4: Enable Tapering Schedule (if not already active) */}
                              {!hasTapering && canEdit && (
                                <div className="border-t border-slate-200 pt-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleTaperingStepsChange(medicine.tempId, [
                                        {
                                          sequence: 1,
                                          dosage: medicine.dose || medicine.dosage || "1 drop",
                                          frequency: "3 times daily",
                                          duration: "7 days",
                                          instructions: medicine.instructions || "",
                                        },
                                        {
                                          sequence: 2,
                                          dosage: medicine.dose || medicine.dosage || "1 drop",
                                          frequency: "2 times daily",
                                          duration: "7 days",
                                          instructions: medicine.instructions || "",
                                        },
                                        {
                                          sequence: 3,
                                          dosage: medicine.dose || medicine.dosage || "1 drop",
                                          frequency: "1 time daily",
                                          duration: "7 days",
                                          instructions: medicine.instructions || "",
                                        },
                                      ]);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold transition-all shadow-2xs"
                                  >
                                    <Activity className="h-3.5 w-3.5 text-purple-600" />
                                    Enable Tapering Dose Schedule
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
                  <p className="text-sm text-slate-400">No medicines added yet</p>
                  <p className="mt-1 text-xs text-slate-400">Use the search box above to add medicines</p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: Diagnosis & Notes */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diagnosis & Notes</h3>
              {doctorId && (
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                  title="Configure Presets"
                >
                  <Settings className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-3">
                {/* Hidden input to keep form state bound */}
                <input type="hidden" {...register("diagnosis")} />

                <label className="block text-sm font-medium text-slate-700">
                  Diagnosis <span className="font-normal text-slate-400">(select from presets or search catalog)</span>
                </label>

                {/* Diagnosis presets */}
                {doctorId && diagnosesOptions.length > 0 && (
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex items-center gap-1.5 mb-2 text-slate-500">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Quick Presets</span>
                    </div>
                    <DiagnosisChips
                      options={diagnosesOptions.map(d => ({ label: d.label, value: d.value, category: d.category }))}
                      selected={selectedDiagnoses}
                      onToggle={handleDiagnosisToggle}
                    />
                  </div>
                )}

                {/* Diagnosis Autocomplete Search */}
                <div ref={diagnosisSearchRef} className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={diagnosisSearchQuery}
                      onChange={(e) => {
                        setDiagnosisSearchQuery(e.target.value);
                        setShowDiagnosisDropdown(true);
                      }}
                      onFocus={() => diagnosisSearchResults.length > 0 && setShowDiagnosisDropdown(true)}
                      disabled={!canEdit}
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500"
                      placeholder="Search diagnosis catalog..."
                    />
                    {searchingDiagnoses && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                    )}
                  </div>

                  {showDiagnosisDropdown && diagnosisSearchResults.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                      {diagnosisSearchResults.map((dx) => (
                        <div
                          key={dx.id}
                          onClick={() => handleSelectDiagnosisFromSearch(dx)}
                          className="cursor-pointer border-b border-slate-100 px-4 py-2.5 text-sm hover:bg-sky-50 last:border-0"
                        >
                          <div className="font-semibold text-slate-900">{dx.label}</div>
                          {dx.category && (
                            <div className="text-xs text-slate-400 capitalize">{dx.category}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected diagnoses list chips */}
                {selectedDiagnoses.length > 0 && (
                  <div className="rounded-lg border border-sky-100 bg-sky-50/20 p-3">
                    <p className="text-[10px] font-bold text-sky-800 uppercase tracking-wider mb-2">Selected Diagnoses:</p>
                    <SelectedDiagnoses
                      diagnoses={selectedDiagnoses}
                      onRemove={handleDiagnosisToggle}
                    />
                  </div>
                )}
              </div>

              {/* Notes, Plan of action, Remarks Row */}
              <div className="grid gap-4 lg:grid-cols-3 border-t border-slate-100 pt-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Notes <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    {...register("notes")}
                    rows={3}
                    disabled={!canEdit}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="Additional notes or instructions..."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Plan of Action <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    {...register("plan_of_action")}
                    rows={3}
                    disabled={!canEdit}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="e.g. Review after CBC report..."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Remarks <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    {...register("remarks")}
                    rows={3}
                    disabled={!canEdit}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="Clinical remarks..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Planned Surgery Section */}
          <PlannedSurgerySection
            patientId={patientId}
            surgeonId={doctorId}
            visitId={visitId}
          />

          <AdviceSection
            value={adviceItems}
            onChange={setAdviceItems}
            followupDate={followupDate}
            onFollowupDateChange={setFollowupDate}
            doctorId={doctorId}
            disabled={!canEdit}
          />
        </div>

        {/* Action Bar */}
        <div className="mt-4 rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-sm text-slate-500">
              {medicines.length > 0 ? (
                <span><span className="font-semibold text-slate-700">{medicines.length}</span> medicine{medicines.length !== 1 ? "s" : ""} added</span>
              ) : (
                <span className="text-slate-400">No medicines added</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!canEdit ? (
                <>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit(handlePrintClick)}
                    className="flex items-center gap-2 rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-900 transition shadow-sm"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Preview &amp; Print</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  {isFinalized ? (
                    <button
                      type="button"
                      onClick={handleSubmit(onSubmit)}
                      disabled={loading || medicines.length === 0}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit(onSubmit)}
                      disabled={loading || medicines.length === 0}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "Saving..." : draftPrescriptionId ? "Update Draft" : "Save Draft"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSubmit(handlePrintClick)}
                    disabled={loading || medicines.length === 0}
                    className="flex items-center gap-2 rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-900 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Preview &amp; Print</span>
                  </button>
                  {!isFinalized && (
                    <button
                      type="button"
                      onClick={handleSubmit(handleFinalize)}
                      disabled={loading || medicines.length === 0}
                      className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 font-semibold shadow-xs"
                    >
                      {loading ? "Finalizing..." : "Finalize Prescription"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Slide-out History Panel */}
      {showHistoryPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setShowHistoryPanel(false)}
          />
          {/* Panel */}
          <div className="fixed right-0 top-0 z-50 h-full w-80 bg-white shadow-xl">
            <div className="flex h-full flex-col">
              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h3 className="font-semibold text-slate-900">History & Templates</h3>
                <button
                  onClick={() => setShowHistoryPanel(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setHistoryTab("history")}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium ${
                    historyTab === "history"
                      ? "border-b-2 border-sky-500 text-sky-600"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  History
                </button>
                <button
                  onClick={() => setHistoryTab("templates")}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium ${
                    historyTab === "templates"
                      ? "border-b-2 border-sky-500 text-sky-600"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Templates
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {historyTab === "history" ? (
                  <div className="space-y-2">
                    {loadingPrevious ? (
                      <div className="py-8 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
                      </div>
                    ) : previousPrescriptions.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-500">No previous prescriptions</p>
                    ) : (
                      previousPrescriptions.map((rx) => (
                        <div
                          key={rx.id}
                          className="rounded-lg border border-slate-200 bg-white p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-900">
                              {rx.prescription_number || `Rx #${rx.id.slice(0, 8)}`}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="h-3 w-3" />
                              {formatDate(rx.created_at)}
                            </span>
                          </div>
                          <p className="mb-2 text-xs text-slate-500">
                            {rx.items.length} medicine(s)
                          </p>
                          <button
                            onClick={() => handleLoadPreviousPrescription(rx)}
                            className="w-full rounded bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                          >
                            Load
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowSaveTemplateModal(true)}
                      disabled={medicines.length === 0}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-600 disabled:opacity-50"
                    >
                      <BookmarkPlus className="h-4 w-4" />
                      Save as template
                    </button>

                    {templates.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-500">No saved templates</p>
                    ) : (
                      templates.map((template) => (
                        <div
                          key={template.id}
                          className="rounded-lg border border-slate-200 bg-white p-3"
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{template.name}</p>
                              {template.description && (
                                <p className="text-xs text-slate-500">{template.description}</p>
                              )}
                            </div>
                            <button
                              onClick={() => deleteTemplate(template.id)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="mb-2 text-xs text-slate-500">
                            {template.items.length} medicine(s)
                          </p>
                          <button
                            onClick={() => handleLoadTemplate(template)}
                            className="w-full rounded bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                          >
                            Load
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Save Template</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                  placeholder="Template name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <input
                  type="text"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSaveTemplateModal(false);
                  setTemplateName("");
                  setTemplateDescription("");
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal for Presets */}
      {showSettingsModal && doctorId && (
        <QuickPresetsSettingsModal
          isOpen={showSettingsModal}
          onClose={() => {
            setShowSettingsModal(false);
            loadPresets();
          }}
          doctorId={doctorId}
          onSaved={loadPresets}
        />
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && savedPrescription && (
        <PrescriptionPrintPreviewModal
          isOpen={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          prescription={savedPrescription}
          doctorSignature={doctorSignature}
          onFinalize={async (printAfter) => {
            const rx = await prescriptionsApi.finalize(savedPrescription.id);
            setPrescriptionStatus("finalized");
            setSavedPrescription(rx);
            if (!printAfter) {
              setShowPrintPreview(false);
            }
            onSuccess?.();
          }}
        />
      )}
    </div>
  );
}
