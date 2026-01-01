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
  Plus,
  X,
  Loader2,
  History,
  BookmarkPlus,
  FileText,
  ChevronDown,
  ChevronRight,
  Copy,
  Trash2,
  Clock,
  User,
  Stethoscope,
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
  const [expandedPrevRx, setExpandedPrevRx] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"history" | "templates">("history");
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  const medicineSearchRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>();
  const { templates, saveTemplate, deleteTemplate } = usePrescriptionTemplates();

  const diagnosis = watch("diagnosis");
  const notes = watch("notes");

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
      if (
        medicineSearchRef.current &&
        !medicineSearchRef.current.contains(event.target as Node)
      ) {
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

  const handleMedicineChange = (
    tempId: string,
    field: keyof MedicineFormData,
    value: string
  ) => {
    setMedicines(
      medicines.map((m) => (m.tempId === tempId ? { ...m, [field]: value } : m))
    );
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
    if (prescription.diagnosis) {
      setValue("diagnosis", prescription.diagnosis);
    }
    if (prescription.notes) {
      setValue("notes", prescription.notes);
    }
    toast.success("Previous prescription loaded");
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
    if (template.diagnosis) {
      setValue("diagnosis", template.diagnosis);
    }
    toast.success(`Template "${template.name}" loaded`);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (medicines.length === 0) {
      toast.error("Please add at least one medicine to save as template");
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

    toast.success("Template saved successfully");
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

      await prescriptionsApi.create(prescriptionData);
      toast.success("Prescription saved as draft");

      setMedicines([]);
      reset();
      onSuccess?.();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to save prescription");
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

      const prescription = await prescriptionsApi.create(prescriptionData);
      await prescriptionsApi.finalize(prescription.id);

      toast.success("Prescription finalized successfully");

      setMedicines([]);
      reset();
      onSuccess?.();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to finalize prescription");
    } finally {
      setLoading(false);
    }
  };

  // Calculate patient age
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

  return (
    <div className="flex h-[75vh] gap-4">
      {/* Sidebar - Previous Prescriptions & Templates */}
      <div className="w-72 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {/* Sidebar Tabs */}
        <div className="flex border-b border-slate-200 bg-white">
          <button
            onClick={() => setSidebarTab("history")}
            className={`flex-1 px-3 py-2 text-xs font-medium transition ${
              sidebarTab === "history"
                ? "border-b-2 border-sky-500 text-sky-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <History className="mr-1 inline-block h-3.5 w-3.5" />
            History
          </button>
          <button
            onClick={() => setSidebarTab("templates")}
            className={`flex-1 px-3 py-2 text-xs font-medium transition ${
              sidebarTab === "templates"
                ? "border-b-2 border-sky-500 text-sky-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText className="mr-1 inline-block h-3.5 w-3.5" />
            Templates
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="h-[calc(100%-41px)] overflow-y-auto p-3">
          {sidebarTab === "history" ? (
            <div className="space-y-2">
              {loadingPrevious ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : previousPrescriptions.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">
                  No previous prescriptions
                </p>
              ) : (
                previousPrescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="rounded-lg border border-slate-200 bg-white transition hover:border-sky-200"
                  >
                    <button
                      onClick={() =>
                        setExpandedPrevRx(expandedPrevRx === rx.id ? null : rx.id)
                      }
                      className="flex w-full items-center justify-between p-2.5 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-900">
                          {rx.prescription_number || `Rx #${rx.id.slice(0, 8)}`}
                        </p>
                        <p className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock className="h-3 w-3" />
                          {formatDate(rx.created_at)}
                        </p>
                      </div>
                      {expandedPrevRx === rx.id ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                    {expandedPrevRx === rx.id && (
                      <div className="border-t border-slate-100 p-2.5">
                        <div className="mb-2 space-y-1">
                          {rx.items.slice(0, 3).map((item, idx) => (
                            <p key={idx} className="truncate text-[10px] text-slate-600">
                              {item.medicine_name}
                            </p>
                          ))}
                          {rx.items.length > 3 && (
                            <p className="text-[10px] text-slate-400">
                              +{rx.items.length - 3} more
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleLoadPreviousPrescription(rx)}
                          className="flex w-full items-center justify-center gap-1 rounded-md bg-sky-50 px-2 py-1.5 text-[10px] font-medium text-sky-600 transition hover:bg-sky-100"
                        >
                          <Copy className="h-3 w-3" />
                          Load into form
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Save Template Button */}
              <button
                onClick={() => setShowSaveTemplateModal(true)}
                disabled={medicines.length === 0}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-sky-400 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                Save current as template
              </button>

              {templates.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">
                  No saved templates
                </p>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className="group rounded-lg border border-slate-200 bg-white p-2.5 transition hover:border-sky-200"
                  >
                    <div className="mb-1.5 flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-900">
                          {template.name}
                        </p>
                        {template.description && (
                          <p className="truncate text-[10px] text-slate-500">
                            {template.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="ml-2 rounded p-1 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="mb-2 text-[10px] text-slate-500">
                      {template.items.length} medicine(s)
                    </p>
                    <button
                      onClick={() => handleLoadTemplate(template)}
                      className="flex w-full items-center justify-center gap-1 rounded-md bg-sky-50 px-2 py-1.5 text-[10px] font-medium text-sky-600 transition hover:bg-sky-100"
                    >
                      <Copy className="h-3 w-3" />
                      Load template
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Form */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          {/* Patient and Doctor Info Card */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                  <User className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Patient</p>
                  <p className="font-semibold text-slate-900">
                    {patient
                      ? `${patient.first_name} ${patient.last_name || ""}`.trim()
                      : "Loading..."}
                  </p>
                  <div className="flex gap-2 text-xs text-slate-500">
                    {patient?.date_of_birth && (
                      <span>{calculateAge(patient.date_of_birth)} yrs</span>
                    )}
                    {patient?.gender && (
                      <span className="capitalize">• {patient.gender}</span>
                    )}
                    {patient?.uhid && <span>• {patient.uhid}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
                  <Stethoscope className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Doctor</p>
                  <p className="font-semibold text-slate-900">
                    {doctor?.user_name || doctor?.name || "Loading..."}
                  </p>
                  {doctor?.specialization && (
                    <p className="text-xs text-slate-500">{doctor.specialization}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {/* Medicine Search */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Add Medicine</label>
              <div className="relative" ref={medicineSearchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={medicineSearchTerm}
                    onChange={(e) => {
                      setMedicineSearchTerm(e.target.value);
                      setShowMedicineDropdown(true);
                    }}
                    onFocus={() => {
                      if (availableMedicines.length > 0) {
                        setShowMedicineDropdown(true);
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    placeholder="Search medicines by name..."
                  />
                  {loadingMedicines && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    </div>
                  )}
                </div>
                {showMedicineDropdown && availableMedicines.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {availableMedicines.map((medicine) => (
                      <div
                        key={medicine.id}
                        onClick={() => handleAddMedicine(medicine)}
                        className="cursor-pointer border-b border-slate-50 px-4 py-3 transition last:border-0 hover:bg-sky-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{medicine.name}</p>
                            {medicine.generic_name && (
                              <p className="text-xs text-slate-500">{medicine.generic_name}</p>
                            )}
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              {medicine.strength && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5">
                                  {medicine.strength}
                                </span>
                              )}
                              {medicine.dosage_form && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5">
                                  {medicine.dosage_form}
                                </span>
                              )}
                              {medicine.manufacturer && (
                                <span className="text-slate-400">{medicine.manufacturer}</span>
                              )}
                            </div>
                          </div>
                          <Plus className="h-5 w-5 text-sky-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Medicines List */}
            {medicines.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">
                    Prescribed Medicines ({medicines.length})
                  </label>
                </div>
                <div className="grid gap-3">
                  {medicines.map((medicine) => (
                    <div
                      key={medicine.tempId}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">
                            {medicine.medicine_name}
                          </p>
                          {medicine.generic_name && (
                            <p className="text-xs text-slate-500">{medicine.generic_name}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicine(medicine.tempId)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">Dosage</label>
                          <input
                            type="text"
                            value={medicine.dosage || ""}
                            onChange={(e) =>
                              handleMedicineChange(medicine.tempId, "dosage", e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400"
                            placeholder="e.g., 500mg"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">Frequency</label>
                          <input
                            type="text"
                            value={medicine.frequency || ""}
                            onChange={(e) =>
                              handleMedicineChange(medicine.tempId, "frequency", e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400"
                            placeholder="e.g., Twice daily"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">Duration</label>
                          <input
                            type="text"
                            value={medicine.duration || ""}
                            onChange={(e) =>
                              handleMedicineChange(medicine.tempId, "duration", e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400"
                            placeholder="e.g., 5 days"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">Instructions</label>
                          <input
                            type="text"
                            value={medicine.instructions || ""}
                            onChange={(e) =>
                              handleMedicineChange(medicine.tempId, "instructions", e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400"
                            placeholder="e.g., After meals"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diagnosis and Notes */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Diagnosis</label>
                <textarea
                  {...register("diagnosis")}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  placeholder="Enter diagnosis..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Notes</label>
                <textarea
                  {...register("notes")}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  placeholder="Additional notes or instructions..."
                />
              </div>
            </div>
          </div>

          {/* Actions - Fixed at bottom */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={loading || medicines.length === 0}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                onClick={handleSubmit(handleFinalize)}
                disabled={loading || medicines.length === 0}
                className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Finalizing..." : "Finalize Prescription"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Save as Template</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                  placeholder="e.g., Common Cold Treatment"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                  placeholder="Brief description of this template"
                />
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-600">
                  This template will include:
                </p>
                <ul className="mt-1 text-xs text-slate-500">
                  <li>• {medicines.length} medicine(s)</li>
                  {diagnosis && <li>• Diagnosis: {diagnosis.slice(0, 30)}...</li>}
                </ul>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSaveTemplateModal(false);
                  setTemplateName("");
                  setTemplateDescription("");
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
