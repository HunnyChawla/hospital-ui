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
} from "@/services/prescriptionsApi";
import { patientsApi, PatientApiResponse, formatPatientName } from "@/services/patientsApi";
import { doctorsApi, Doctor } from "@/services/doctorsApi";
import { diagnosesApi } from "@/services/diagnosesApi";
import { quickPresetsApi } from "@/services/quickPresetsApi";
import { MedicineQuickChips, DiagnosisChips, SelectedDiagnoses } from "../optometrist/prescriptions/QuickSelectChips";
import { QuickPresetsSettingsModal } from "../optometrist/prescriptions/settings/QuickPresetsSettingsModal";
import { PlannedSurgerySection } from "../optometrist/prescriptions/PlannedSurgerySection";
import { PrescriptionPrintPreviewModal } from "./PrescriptionPrintPreviewModal";
import {
  usePrescriptionTemplates,
  PrescriptionTemplate,
  PrescriptionTemplateItem,
} from "@/hooks/usePrescriptionTemplates";
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
  TrendingDown,
  Sparkles,
  Settings,
  Eye,
} from "lucide-react";
import { formatDate } from "@/utils/format";
import { usePrescriptionPermissions } from "@/hooks/useFeatureFlags";

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
}

interface FormData {
  diagnosis: string;
  notes: string;
  plan_of_action: string;
  remarks: string;
}

// Frequency options for dropdown
const FREQUENCY_OPTIONS = [
  { value: "", label: "Select frequency" },
  { value: "1 time daily", label: "1 time daily" },
  { value: "2 times daily", label: "2 times daily" },
  { value: "3 times daily", label: "3 times daily" },
  { value: "4 times daily", label: "4 times daily" },
  { value: "8 times daily", label: "8 times daily" },
  { value: "As needed", label: "SOS - As needed" },
  { value: "At bedtime", label: "HS - At bedtime" },
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
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions,
          tapering_steps: m.tapering_steps
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
              advice_type: a.advice_type,
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
              dosage: item.dosage || "",
              frequency: item.frequency || "",
              duration: item.duration || "",
              instructions: item.instructions || "",
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

    const newMedicine: MedicineFormData = {
      tempId: Math.random().toString(36).substring(7),
      medicine_id: medicine.id,
      medicine_name: medicine.name,
      generic_name: medicine.generic_name || undefined,
      dosage: medicine.default_dosage || medicine.strength || "",
      frequency: medicine.default_frequency || "",
      duration: medicine.default_duration || "",
      instructions: medicine.default_instructions || "",
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
      try {
        const res = await medicinesApi.search({ q: preset.medicine.medicine_name.trim(), page_size: 5 });
        const match = res.items.find(m => m.name.toLowerCase() === preset.medicine.medicine_name.toLowerCase());
        if (match) {
          resolvedId = match.id;
        } else if (res.items.length > 0) {
          resolvedId = res.items[0].id;
        }
      } catch (error) {
        console.error("Failed to resolve medicine ID for preset:", error);
      }

      if (!resolvedId) {
        toast.error(`Could not find medicine "${preset.medicine.medicine_name}" in the catalog. Prescribing this requires a catalog match.`);
        return;
      }

      const newMed: MedicineFormData = {
        tempId: Math.random().toString(36).substring(7),
        medicine_id: resolvedId,
        medicine_name: preset.medicine.medicine_name,
        generic_name: preset.medicine.generic_name || undefined,
        dosage: preset.medicine.dosage || "",
        frequency: preset.medicine.frequency || "",
        duration: preset.medicine.duration || "",
        instructions: preset.medicine.instructions || "",
        tapering_steps: preset.medicine.tapering_steps || undefined,
      };
      setMedicines([...medicines, newMed]);
      toast.success(`Added preset: ${preset.label}`);
    }
  };

  const handleRemoveMedicine = (tempId: string) => {
    setMedicines(medicines.filter((m) => m.tempId !== tempId));
  };

  const handleMedicineChange = (tempId: string, field: keyof MedicineFormData, value: string) => {
    setMedicines(medicines.map((m) => (m.tempId === tempId ? { ...m, [field]: value } : m)));
  };

  const handleTaperingStepsChange = (tempId: string, steps: any[] | undefined) => {
    setMedicines(medicines.map((m) => (m.tempId === tempId ? { ...m, tapering_steps: steps } : m)));
  };

  const handleDiagnosisToggle = (value: string) => {
    if (selectedDiagnoses.includes(value)) {
      setSelectedDiagnoses(selectedDiagnoses.filter(d => d !== value));
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
      dosage: item.dosage || "",
      frequency: item.frequency || "",
      duration: item.duration || "",
      instructions: item.instructions || "",
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
        advice_type: a.advice_type,
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
    const newMedicines: MedicineFormData[] = template.items.map((item) => ({
      tempId: Math.random().toString(36).substring(7),
      medicine_id: item.medicine_id,
      medicine_name: item.medicine_name,
      generic_name: item.generic_name,
      dosage: item.dosage || "",
      frequency: item.frequency || "",
      duration: item.duration || "",
      instructions: item.instructions || "",
      tapering_steps: item.tapering_steps || undefined,
    }));

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
        dosage: hasTapering ? "Refer steps" : med.dosage,
        frequency: hasTapering ? "Refer steps" : med.frequency,
        duration: hasTapering ? "Refer steps" : med.duration,
        instructions: hasTapering ? "Refer steps" : med.instructions,
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

  const onSubmit = async (data: FormData) => {
    if (medicines.length === 0) {
      toast.error("Please add at least one medicine");
      return;
    }

    setLoading(true);
    try {
      const prescriptionData = {
        visit_id: visitId,
        patient_id: patientId,
        doctor_id: doctorId,
        items: medicines.map(({ tempId, generic_name, ...med }) => {
          const hasTapering = med.tapering_steps && med.tapering_steps.length > 0;
          return {
            ...med,
            medicine_id: med.medicine_id?.trim() || null,
            medicine_name: med.medicine_name,
            dosage: hasTapering ? "Refer steps" : med.dosage,
            frequency: hasTapering ? "Refer steps" : med.frequency,
            duration: hasTapering ? "Refer steps" : med.duration,
            instructions: hasTapering ? "Refer steps" : med.instructions || undefined,
          };
        }),
        diagnosis: data.diagnosis?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        advice_items: adviceItems,
        followup_date: followupDate,
        plan_of_action: data.plan_of_action?.trim() || null,
        remarks: data.remarks?.trim() || null,
      };

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
      const prescriptionData = {
        visit_id: visitId,
        patient_id: patientId,
        doctor_id: doctorId,
        items: medicines.map(({ tempId, generic_name, ...med }) => {
          const hasTapering = med.tapering_steps && med.tapering_steps.length > 0;
          return {
            ...med,
            medicine_id: med.medicine_id?.trim() || null,
            medicine_name: med.medicine_name,
            dosage: hasTapering ? "Refer steps" : med.dosage,
            frequency: hasTapering ? "Refer steps" : med.frequency,
            duration: hasTapering ? "Refer steps" : med.duration,
            instructions: hasTapering ? "Refer steps" : med.instructions || undefined,
          };
        }),
        diagnosis: data.diagnosis?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        advice_items: adviceItems,
        followup_date: followupDate,
        plan_of_action: data.plan_of_action?.trim() || null,
        remarks: data.remarks?.trim() || null,
      };

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
      const prescriptionData = {
        visit_id: visitId,
        patient_id: patientId,
        doctor_id: doctorId,
        items: medicines.map(({ tempId, generic_name, ...med }) => {
          const hasTapering = med.tapering_steps && med.tapering_steps.length > 0;
          return {
            ...med,
            medicine_id: med.medicine_id?.trim() || null,
            medicine_name: med.medicine_name,
            dosage: hasTapering ? "Refer steps" : med.dosage,
            frequency: hasTapering ? "Refer steps" : med.frequency,
            duration: hasTapering ? "Refer steps" : med.duration,
            instructions: hasTapering ? "Refer steps" : med.instructions || undefined,
          };
        }),
        diagnosis: data.diagnosis?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        advice_items: adviceItems,
        followup_date: followupDate,
        plan_of_action: data.plan_of_action?.trim() || null,
        remarks: data.remarks?.trim() || null,
      };

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
            <span className="text-slate-600">Dr. {doctorInfo}</span>
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
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Medicines {medicines.length > 0 && <span className="ml-1 text-sky-600">({medicines.length})</span>}
              </h3>
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
                  {medicines.map((medicine, index) => (
                    <div
                      key={medicine.tempId}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      {/* Medicine Name Row */}
                      <div className="mb-3 flex items-start justify-between border-b border-slate-200 pb-3">
                        <div>
                          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-sky-500 text-xs font-medium text-white">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-slate-900">{medicine.medicine_name}</span>
                          {medicine.generic_name && (
                            <span className="ml-2 text-sm text-slate-500">({medicine.generic_name})</span>
                          )}
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicine(medicine.tempId)}
                            className="rounded p-1 text-slate-400 hover:bg-red-100 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {(() => {
                        const taperingSteps = medicine.tapering_steps;
                        const hasTapering = taperingSteps && taperingSteps.length > 0;
                        return hasTapering ? (
                          <div className="flex justify-between items-center bg-purple-50/20 border border-purple-100 rounded-lg p-3.5">
                            <span className="text-xs font-bold text-purple-950 flex items-center gap-2">
                              <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-ping" />
                              Tapering Regimen Active
                            </span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleTaperingStepsChange(medicine.tempId, undefined)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-1.5 text-xs font-bold transition-all shadow-sm"
                              >
                                <Activity className="h-3.5 w-3.5" />
                                Disable Tapering Regimen
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-slate-600">Dosage</label>
                              <input
                                type="text"
                                value={medicine.dosage || ""}
                                onChange={(e) => handleMedicineChange(medicine.tempId, "dosage", e.target.value)}
                                disabled={!canEdit}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500"
                                placeholder="e.g., 500mg"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-slate-600">Frequency</label>
                              <select
                                value={medicine.frequency || ""}
                                onChange={(e) => handleMedicineChange(medicine.tempId, "frequency", e.target.value)}
                                disabled={!canEdit}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500"
                              >
                                {FREQUENCY_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-slate-600">Duration</label>
                              <input
                                type="text"
                                value={medicine.duration || ""}
                                onChange={(e) => handleMedicineChange(medicine.tempId, "duration", e.target.value)}
                                disabled={!canEdit}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500"
                                placeholder="e.g., 5 days"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-slate-600">Instructions</label>
                              <input
                                type="text"
                                value={medicine.instructions || ""}
                                onChange={(e) => handleMedicineChange(medicine.tempId, "instructions", e.target.value)}
                                disabled={!canEdit}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500"
                                placeholder="e.g., After meals"
                              />
                            </div>
                          </div>
                        );
                      })()}

                      {/* Tapering Regimen Builder */}
                      {(() => {
                        const taperingSteps = medicine.tapering_steps;
                        const hasTapering = taperingSteps && taperingSteps.length > 0;
                        return (
                          <div className="mt-4 border-t border-slate-200 pt-4 space-y-3">
                            {!hasTapering && canEdit && (
                              <div className="flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleTaperingStepsChange(medicine.tempId, [
                                      {
                                        sequence: 1,
                                        dosage: medicine.dosage || "",
                                        frequency: medicine.frequency || "",
                                        duration: medicine.duration || "",
                                        instructions: medicine.instructions || ""
                                      }
                                    ]);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 px-3 py-1.5 text-xs font-bold transition-all shadow-sm"
                                >
                                  <Activity className="h-3.5 w-3.5" />
                                  Enable Tapering Regimen
                                </button>
                              </div>
                            )}

                            {hasTapering && (
                              <div className="rounded-lg border border-purple-100 bg-purple-50/20 p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">


                                <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wide flex items-center gap-1.5">
                                    <TrendingDown className="h-3.5 w-3.5 text-purple-600" />
                                    Tapering Steps
                                  </span>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentSteps = taperingSteps || [];
                                        const lastStep = currentSteps[currentSteps.length - 1];
                                        handleTaperingStepsChange(medicine.tempId, [
                                          ...currentSteps,
                                          {
                                            sequence: currentSteps.length + 1,
                                            dosage: lastStep?.dosage || "",
                                            frequency: lastStep?.frequency || "",
                                            duration: lastStep?.duration || "",
                                            instructions: lastStep?.instructions || ""
                                          }
                                        ]);
                                      }}
                                      className="inline-flex items-center gap-1 rounded bg-purple-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-purple-700 shadow-sm"
                                    >
                                      <Plus className="h-3 w-3" />
                                      Add Step
                                    </button>
                                  )}
                                </div>

                                <div className="space-y-3">
                                  {(taperingSteps || []).map((step, stepIndex) => (
                                    <div key={stepIndex} className="flex flex-col sm:flex-row gap-3 items-end bg-white/70 p-3 rounded border border-purple-100/50 relative">
                                      <div className="flex-1 grid grid-cols-2 gap-3 sm:grid-cols-4 w-full">
                                        <div>
                                          <label className="text-[10px] font-bold text-purple-950/80 mb-1 block uppercase tracking-wide">
                                            Step {stepIndex + 1} Dosage
                                          </label>
                                          <input
                                            type="text"
                                            value={step.dosage || ""}
                                            onChange={(e) => {
                                              const newSteps = [...taperingSteps];
                                              newSteps[stepIndex].dosage = e.target.value;
                                              handleTaperingStepsChange(medicine.tempId, newSteps);
                                            }}
                                            disabled={!canEdit}
                                            placeholder="e.g. 1 drop"
                                            className="w-full rounded border border-purple-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-bold text-purple-950/80 mb-1 block uppercase tracking-wide">
                                            Frequency
                                          </label>
                                          <select
                                            value={step.frequency || ""}
                                            onChange={(e) => {
                                              const newSteps = [...taperingSteps];
                                              newSteps[stepIndex].frequency = e.target.value;
                                              handleTaperingStepsChange(medicine.tempId, newSteps);
                                            }}
                                            disabled={!canEdit}
                                            className="w-full rounded border border-purple-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-500"
                                          >
                                            {FREQUENCY_OPTIONS.map((opt) => (
                                              <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-bold text-purple-950/80 mb-1 block uppercase tracking-wide">
                                            Duration
                                          </label>
                                          <input
                                            type="text"
                                            value={step.duration || ""}
                                            onChange={(e) => {
                                              const newSteps = [...taperingSteps];
                                              newSteps[stepIndex].duration = e.target.value;
                                              handleTaperingStepsChange(medicine.tempId, newSteps);
                                            }}
                                            disabled={!canEdit}
                                            placeholder="e.g. 1 week"
                                            className="w-full rounded border border-purple-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-bold text-purple-950/80 mb-1 block uppercase tracking-wide">
                                            Instructions
                                          </label>
                                          <input
                                            type="text"
                                            value={step.instructions || ""}
                                            onChange={(e) => {
                                              const newSteps = [...taperingSteps];
                                              newSteps[stepIndex].instructions = e.target.value;
                                              handleTaperingStepsChange(medicine.tempId, newSteps);
                                            }}
                                            disabled={!canEdit}
                                            placeholder="e.g. Instill 1 drop"
                                            className="w-full rounded border border-purple-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-500"
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
                                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm self-center sm:self-end"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
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
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Diagnosis Search & Presets Column */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Diagnosis Selection <span className="font-normal text-slate-400">(optional)</span>
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

                {/* Final Formatted Diagnosis textarea (readOnly) */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Formatted Diagnosis Text <span className="text-xs text-slate-400">(Auto-filled from selection above)</span>
                  </label>
                  <textarea
                    {...register("diagnosis")}
                    rows={6}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-600 outline-none"
                    placeholder="Diagnoses will form a comma-separated list here..."
                  />
                </div>
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
