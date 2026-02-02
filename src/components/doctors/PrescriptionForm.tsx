"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { medicinesApi, Medicine } from "@/services/medicinesApi";
import {
  prescriptionsApi,
  PrescriptionItemRequest,
  PrescriptionResponse,
} from "@/services/prescriptionsApi";
import { patientsApi, PatientApiResponse } from "@/services/patientsApi";
import { doctorsApi, Doctor } from "@/services/doctorsApi";
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
} from "lucide-react";
import { formatDate } from "@/utils/format";

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
}

// Frequency options for dropdown
const FREQUENCY_OPTIONS = [
  { value: "", label: "Select frequency" },
  { value: "Once daily", label: "OD - Once daily" },
  { value: "Twice daily", label: "BD - Twice daily" },
  { value: "Thrice daily", label: "TDS - Three times daily" },
  { value: "Four times daily", label: "QID - Four times daily" },
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
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [draftPrescriptionId, setDraftPrescriptionId] = useState<string | null>(null);

  const medicineSearchRef = useRef<HTMLDivElement>(null);
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

  // Load existing draft prescription
  useEffect(() => {
    const fetchDraftPrescription = async () => {
      try {
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const response = await prescriptionsApi.list({
          visit_id: visitId,
          status: "draft",
          page_size: 1,
          tenant_id: tenantId || undefined,
        });

        if (response.items.length > 0) {
          const draft = response.items[0];
          setDraftPrescriptionId(draft.id);

          if (draft.diagnosis) setValue("diagnosis", draft.diagnosis);
          if (draft.notes) setValue("notes", draft.notes);

          if (draft.items && draft.items.length > 0) {
            const draftMedicines: MedicineFormData[] = draft.items.map((item, index) => ({
              tempId: `draft-${index}-${Date.now()}`,
              medicine_id: item.medicine_id,
              medicine_name: item.medicine_name,
              dosage: item.dosage || "",
              frequency: item.frequency || "",
              duration: item.duration || "",
              instructions: item.instructions || "",
            }));
            setMedicines(draftMedicines);
            toast.info("Draft prescription loaded");
          }
        }
      } catch (error) {
        console.error("Failed to fetch draft prescription:", error);
      }
    };
    fetchDraftPrescription();
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (medicineSearchRef.current && !medicineSearchRef.current.contains(event.target as Node)) {
        setShowMedicineDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddMedicine = (medicine: Medicine) => {
    if (medicines.some((m) => m.medicine_id === medicine.id)) {
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

  const handleRemoveMedicine = (tempId: string) => {
    setMedicines(medicines.filter((m) => m.tempId !== tempId));
  };

  const handleMedicineChange = (tempId: string, field: keyof MedicineFormData, value: string) => {
    setMedicines(medicines.map((m) => (m.tempId === tempId ? { ...m, [field]: value } : m)));
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
    }));

    setMedicines(newMedicines);
    if (prescription.diagnosis) setValue("diagnosis", prescription.diagnosis);
    if (prescription.notes) setValue("notes", prescription.notes);
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
    }));

    setMedicines(newMedicines);
    if (template.diagnosis) setValue("diagnosis", template.diagnosis);
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

    const templateItems: PrescriptionTemplateItem[] = medicines.map((med) => ({
      medicine_id: med.medicine_id,
      medicine_name: med.medicine_name,
      generic_name: med.generic_name,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
      instructions: med.instructions,
    }));

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
        items: medicines.map(({ tempId, medicine_name, generic_name, ...med }) => med),
        diagnosis: data.diagnosis?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      };

      if (draftPrescriptionId) {
        await prescriptionsApi.update(draftPrescriptionId, prescriptionData);
        toast.success("Draft updated");
      } else {
        const newPrescription = await prescriptionsApi.create(prescriptionData);
        setDraftPrescriptionId(newPrescription.id);
        toast.success("Draft saved");
      }

      setMedicines([]);
      reset();
      setDraftPrescriptionId(null);
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
        items: medicines.map(({ tempId, medicine_name, generic_name, ...med }) => med),
        diagnosis: data.diagnosis?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      };

      let prescriptionId: string;
      if (draftPrescriptionId) {
        await prescriptionsApi.update(draftPrescriptionId, prescriptionData);
        prescriptionId = draftPrescriptionId;
      } else {
        const prescription = await prescriptionsApi.create(prescriptionData);
        prescriptionId = prescription.id;
      }

      await prescriptionsApi.finalize(prescriptionId);
      toast.success("Prescription finalized");

      setMedicines([]);
      reset();
      setDraftPrescriptionId(null);
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Failed to finalize");
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
    ? `${patient.first_name} ${patient.last_name || ""}`.trim() +
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
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Medicines {medicines.length > 0 && <span className="ml-1 text-sky-600">({medicines.length})</span>}
              </h3>
            </div>
            <div className="p-4">
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
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    placeholder="Type to search medicines..."
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
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicine(medicine.tempId)}
                          className="rounded p-1 text-slate-400 hover:bg-red-100 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Medicine Fields - Grid */}
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">Dosage</label>
                          <input
                            type="text"
                            value={medicine.dosage || ""}
                            onChange={(e) => handleMedicineChange(medicine.tempId, "dosage", e.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-100"
                            placeholder="e.g., 500mg"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">Frequency</label>
                          <select
                            value={medicine.frequency || ""}
                            onChange={(e) => handleMedicineChange(medicine.tempId, "frequency", e.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-100"
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
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-100"
                            placeholder="e.g., 5 days"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">Instructions</label>
                          <input
                            type="text"
                            value={medicine.instructions || ""}
                            onChange={(e) => handleMedicineChange(medicine.tempId, "instructions", e.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-100"
                            placeholder="e.g., After meals"
                          />
                        </div>
                      </div>
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
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diagnosis & Notes</h3>
            </div>
            <div className="p-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Diagnosis <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    {...register("diagnosis")}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    placeholder="Enter diagnosis..."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Notes <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    {...register("notes")}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    placeholder="Additional notes or instructions..."
                  />
                </div>
              </div>
            </div>
          </div>
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
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={loading || medicines.length === 0}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                onClick={handleSubmit(handleFinalize)}
                disabled={loading || medicines.length === 0}
                className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Finalizing..." : "Finalize"}
              </button>
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
    </div>
  );
}
