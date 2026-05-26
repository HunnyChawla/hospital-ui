"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Eye, Save, FileText, Printer, CheckCircle, Search, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { OptometryPrescription, RefractionRecord, PrescriptionSymptom } from "@/types";
import { diagnosesApi, Diagnosis } from "@/services/diagnosesApi";
import { symptomsApi, DiagnosisSymptomMap } from "@/services/symptomsApi";
import { handleError } from "@/utils/errorHandler";

interface OptometryPrescriptionFormProps {
  patientId: string;
  visitId: string;
  optometristId: string;
  latestRefractionOD?: RefractionRecord | null;
  latestRefractionOS?: RefractionRecord | null;
  onSave?: (prescription: any) => void;
  onFinalize?: (prescription: any) => void;
  onPrint?: (prescription: any) => void;
  existingPrescription?: OptometryPrescription | null;
}

interface PrescriptionFormData {
  // OD (Right Eye)
  od_sphere: string;
  od_cylinder: string;
  od_axis: string;
  od_add_power: string;
  od_prism: string;
  // OS (Left Eye)
  os_sphere: string;
  os_cylinder: string;
  os_axis: string;
  os_add_power: string;
  os_prism: string;
  // Common
  pupillary_distance: string;
  lens_type: string;
  diagnosis: string;
  notes: string;
  frame_fitting_notes: string;
  symptoms?: PrescriptionSymptom[];
}

export function OptometryPrescriptionForm({
  patientId,
  visitId,
  optometristId,
  latestRefractionOD,
  latestRefractionOS,
  onSave,
  onFinalize,
  onPrint,
  existingPrescription,
}: OptometryPrescriptionFormProps) {
  const [status, setStatus] = useState<"draft" | "finalized">("draft");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PrescriptionFormData>();

  const [selectedDiagnoses, setSelectedDiagnoses] = useState<Diagnosis[]>([]);
  const [diagnosisEyeMap, setDiagnosisEyeMap] = useState<Record<string, "OD" | "OS" | "OU" | "NA">>({});
  const [availableSymptoms, setAvailableSymptoms] = useState<Record<string, DiagnosisSymptomMap[]>>({});
  const [selectedSymptoms, setSelectedSymptoms] = useState<PrescriptionSymptom[]>([]);
  const [diagnosisSearch, setDiagnosisSearch] = useState("");
  const [diagnosisResults, setDiagnosisResults] = useState<Diagnosis[]>([]);
  const [isSearchingDiagnosis, setIsSearchingDiagnosis] = useState(false);
  const [showDiagnosisSearch, setShowDiagnosisSearch] = useState(false);

  // Search diagnoses
  useEffect(() => {
    const search = async () => {
      if (!diagnosisSearch || diagnosisSearch.length < 2) {
        setDiagnosisResults([]);
        return;
      }
      setIsSearchingDiagnosis(true);
      try {
        const res = await diagnosesApi.list({ search: diagnosisSearch, page_size: 10, status: 'active' });
        setDiagnosisResults(res.items);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearchingDiagnosis(false);
      }
    };
    const timeout = setTimeout(search, 300);
    return () => clearTimeout(timeout);
  }, [diagnosisSearch]);

  const addDiagnosis = async (diagnosis: Diagnosis) => {
    // FORCE DEBUG
    window.alert(`Diagnosis clicked: ${diagnosis.diagnosis_name}`);
    console.log("addDiagnosis called with:", diagnosis);
    if (selectedDiagnoses.find(d => d.id === diagnosis.id)) {
      console.log("Diagnosis already selected");
      setDiagnosisSearch("");
      setShowDiagnosisSearch(false);
      return;
    }
    const newSelected = [...selectedDiagnoses, diagnosis];
    setSelectedDiagnoses(newSelected);

    // Determine default eye from selected symptoms
    let defaultEye: "OD" | "OS" | "OU" | "NA" = "OU";
    const symptomEyes = selectedSymptoms
      .filter(s => s.applicable_eye)
      .map(s => s.applicable_eye);

    if (symptomEyes.length > 0) {
      // Use most common eye from symptoms
      const eyeCounts = symptomEyes.reduce((acc, eye) => {
        if (eye) acc[eye] = (acc[eye] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const mostCommon = Object.entries(eyeCounts).sort((a, b) => b[1] - a[1])[0];
      if (mostCommon) {
        const eye = mostCommon[0];
        if (eye === "LEFT") defaultEye = "OS";
        else if (eye === "RIGHT") defaultEye = "OD";
        else if (eye === "BOTH") defaultEye = "OU";
        else defaultEye = "NA";
      }
    }

    // Set default eye for this diagnosis
    setDiagnosisEyeMap(prev => ({ ...prev, [diagnosis.id]: defaultEye }));

    // Fetch symptoms
    try {
      console.log("Fetching symptoms for diagnosis ID:", diagnosis.id);
      const symptoms = await symptomsApi.getSymptomsByDiagnosis(diagnosis.id);
      console.log("Fetched symptoms response:", symptoms);
      setAvailableSymptoms(prev => ({ ...prev, [diagnosis.id]: symptoms }));
    } catch (err) {
      console.error("Error fetching symptoms:", err);
    }
    setDiagnosisSearch("");
    setShowDiagnosisSearch(false);
  };

  const removeDiagnosis = (id: string) => {
    setSelectedDiagnoses(prev => prev.filter(d => d.id !== id));
    setDiagnosisEyeMap(prev => {
      const newMap = { ...prev };
      delete newMap[id];
      return newMap;
    });
    // Remove associated symptoms
    setSelectedSymptoms(prev => prev.filter(s => s.diagnosis_id !== id));
  };

  const toggleSymptom = (symptom: DiagnosisSymptomMap, diagnosis: Diagnosis) => {
    const existingIndex = selectedSymptoms.findIndex(s => s.diagnosis_id === diagnosis.id && s.symptom_id === symptom.symptom_id);
    if (existingIndex >= 0) {
      // Remove
      setSelectedSymptoms(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      // Add
      const newSymptom: PrescriptionSymptom = {
        symptom_id: symptom.symptom_id,
        symptom_name: symptom.symptom_name,
        diagnosis_id: diagnosis.id,
        diagnosis_name: diagnosis.diagnosis_name,
        is_primary: symptom.is_key_symptom,
        severity: "Moderate", // Default
      };
      setSelectedSymptoms(prev => [...prev, newSymptom]);
    }
  };

  // Auto-populate from latest refraction
  useEffect(() => {
    if (latestRefractionOD && !existingPrescription) {
      setValue("od_sphere", latestRefractionOD.sphere.toString());
      if (latestRefractionOD.cylinder) setValue("od_cylinder", latestRefractionOD.cylinder.toString());
      if (latestRefractionOD.axis) setValue("od_axis", latestRefractionOD.axis.toString());
      if (latestRefractionOD.add_power) setValue("od_add_power", latestRefractionOD.add_power.toString());
    }
    if (latestRefractionOS && !existingPrescription) {
      setValue("os_sphere", latestRefractionOS.sphere.toString());
      if (latestRefractionOS.cylinder) setValue("os_cylinder", latestRefractionOS.cylinder.toString());
      if (latestRefractionOS.axis) setValue("os_axis", latestRefractionOS.axis.toString());
      if (latestRefractionOS.add_power) setValue("os_add_power", latestRefractionOS.add_power.toString());
    }
  }, [latestRefractionOD, latestRefractionOS, existingPrescription, setValue]);

  // Load existing prescription
  useEffect(() => {
    if (existingPrescription) {
      const odItem = existingPrescription.items.find((i) => i.eye === "OD");
      const osItem = existingPrescription.items.find((i) => i.eye === "OS");

      if (odItem) {
        setValue("od_sphere", odItem.sphere.toString());
        if (odItem.cylinder) setValue("od_cylinder", odItem.cylinder.toString());
        if (odItem.axis) setValue("od_axis", odItem.axis.toString());
        if (odItem.add_power) setValue("od_add_power", odItem.add_power.toString());
        if (odItem.prism) setValue("od_prism", odItem.prism);
      }

      if (osItem) {
        setValue("os_sphere", osItem.sphere.toString());
        if (osItem.cylinder) setValue("os_cylinder", osItem.cylinder.toString());
        if (osItem.axis) setValue("os_axis", osItem.axis.toString());
        if (osItem.add_power) setValue("os_add_power", osItem.add_power.toString());
        if (osItem.prism) setValue("os_prism", osItem.prism);
      }

      if (existingPrescription.pupillary_distance) {
        setValue("pupillary_distance", existingPrescription.pupillary_distance.toString());
      }
      if (existingPrescription.diagnosis) {
        setValue("diagnosis", existingPrescription.diagnosis);

        // Parse diagnosis text to extract eye information
        // Format: "Myopia (OD), Astigmatism (OS), Cataract (OU)"
        const diagnosisText = existingPrescription.diagnosis;
        const diagnosisPatternWithEye = /([^,()]+)\s*\((OD|OS|OU|NA)\)/g;
        const matches = [...diagnosisText.matchAll(diagnosisPatternWithEye)];

        if (matches.length > 0) {
          // Has formatted diagnoses with eyes
          matches.forEach(match => {
            const name = match[1].trim();
            const eye = match[2] as "OD" | "OS" | "OU" | "NA";

            // Try to find and add this diagnosis
            diagnosesApi.list({ search: name, page_size: 1, status: 'active' }).then(res => {
              if (res.items.length > 0 && res.items[0].diagnosis_name === name) {
                const d = res.items[0];
                setSelectedDiagnoses(prev => {
                  if (prev.find(p => p.id === d.id)) return prev;
                  return [...prev, d];
                });
                setDiagnosisEyeMap(prev => ({ ...prev, [d.id]: eye }));
              }
            }).catch(err => console.error("Failed to load diagnosis", err));
          });
        }
      }
      if (existingPrescription.notes) setValue("notes", existingPrescription.notes);
      if (existingPrescription.frame_fitting_notes) {
        setValue("frame_fitting_notes", existingPrescription.frame_fitting_notes);
      }

      if (existingPrescription.symptoms) {
        setSelectedSymptoms(existingPrescription.symptoms);

        // Reconstruct selected diagnoses from symptoms if possible
        const diagnosisIds = Array.from(new Set(existingPrescription.symptoms.map(s => s.diagnosis_id).filter(Boolean))) as string[];
        if (diagnosisIds.length > 0) {
          // Fetch these diagnoses details to show in UI
          diagnosisIds.forEach(async (id) => {
            try {
              // We need to fetch diagnosis details. api.getById
              const d = await diagnosesApi.getById(id);
              setSelectedDiagnoses(prev => {
                if (prev.find(p => p.id === d.id)) return prev;
                return [...prev, d];
              });
              // And fetch symptoms for them
              const symptoms = await symptomsApi.getSymptomsByDiagnosis(id);
              setAvailableSymptoms(prev => ({ ...prev, [id]: symptoms }));
            } catch (e) {
              console.error("Failed to load diagnosis details", e);
            }
          });
        }
      }

      setStatus(existingPrescription.status);
    }
  }, [existingPrescription, setValue]);

  // Sync eye selection to diagnosis input field in real-time
  useEffect(() => {
    if (selectedDiagnoses.length > 0) {
      const formattedDiagnosis = selectedDiagnoses.map(d => {
        const eye = diagnosisEyeMap[d.id] || "OU";
        return `${d.diagnosis_name} (${eye})`;
      }).join(", ");
      setValue("diagnosis", formattedDiagnosis);
    } else {
      // Don't clear if there are no chips, might be manual entry
      // But if there ARE chips and we removed the last one, we should clear
      // Actually, if selectedDiagnoses is empty, but diagnosis value has something, we might want to keep it
      // However, for consistency with the other form, let's clear if chips are used.
      // Or better: only clear if chips WERE present.
    }
  }, [selectedDiagnoses, diagnosisEyeMap, setValue]);


  const onSubmit = async (data: PrescriptionFormData, action: "save" | "finalize" | "print") => {
    if (action === "finalize") {
      if (!window.confirm("Are you sure you want to finalize this prescription? Once finalized cannot be updated.")) {
        return;
      }
    }
    try {
      // Format diagnosis text with eye labels
      const formatDiagnosisText = () => {
        if (selectedDiagnoses.length === 0) return data.diagnosis || null;
        return selectedDiagnoses.map(d => {
          const eye = diagnosisEyeMap[d.id] || "OU";
          return `${d.diagnosis_name} (${eye})`;
        }).join(", ");
      };

      const prescriptionData = {
        patient_id: patientId,
        visit_id: visitId,
        optometrist_id: optometristId,
        status: action === "finalize" ? "finalized" : "draft",
        items: [
          {
            eye: "OD" as const,
            sphere: parseFloat(data.od_sphere),
            cylinder: data.od_cylinder ? parseFloat(data.od_cylinder) : null,
            axis: data.od_axis ? parseInt(data.od_axis) : null,
            add_power: data.od_add_power ? parseFloat(data.od_add_power) : null,
            prism: data.od_prism || null,
            lens_type: data.lens_type || null,
          },
          {
            eye: "OS" as const,
            sphere: parseFloat(data.os_sphere),
            cylinder: data.os_cylinder ? parseFloat(data.os_cylinder) : null,
            axis: data.os_axis ? parseInt(data.os_axis) : null,
            add_power: data.os_add_power ? parseFloat(data.os_add_power) : null,
            prism: data.os_prism || null,
            lens_type: data.lens_type || null,
          },
        ],
        pupillary_distance: data.pupillary_distance ? parseFloat(data.pupillary_distance) : null,
        symptoms: selectedSymptoms,
        diagnosis: formatDiagnosisText(),
        notes: data.notes || null,
        frame_fitting_notes: data.frame_fitting_notes || null,
      };

      if (action === "save" && onSave) {
        await onSave(prescriptionData);
        toast.success("Prescription saved as draft");
        setStatus("draft");
      } else if (action === "finalize" && onFinalize) {
        await onFinalize(prescriptionData);
        toast.success("Prescription finalized successfully");
        setStatus("finalized");
      } else if (action === "print" && onPrint) {
        await onPrint(prescriptionData);
      }
    } catch (error) {
      handleError(error, {
        defaultMessage: `Failed to ${action} prescription`,
        logError: true,
      });
    }
  };

  const cylinderOD = watch("od_cylinder");
  const cylinderOS = watch("os_cylinder");

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {status === "finalized" && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
          <CheckCircle className="h-6 w-6 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-900">Prescription Finalized</p>
            <p className="text-sm text-emerald-700">
              This prescription has been finalized and cannot be edited.
            </p>
          </div>
        </div>
      )}

      <form className="space-y-6">
        {/* OD and OS Side-by-Side */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* OD (Right Eye) */}
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Eye className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">OD (Right Eye)</h3>
            </div>

            <div className="space-y-4">
              {/* Sphere */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Sphere (SPH) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.25"
                  disabled={status === "finalized"}
                  {...register("od_sphere", { required: "Sphere is required" })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="-2.00"
                />
                {errors.od_sphere && (
                  <p className="mt-1 text-sm text-red-600">{errors.od_sphere.message}</p>
                )}
              </div>

              {/* Cylinder */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Cylinder (CYL)
                </label>
                <input
                  type="number"
                  step="0.25"
                  disabled={status === "finalized"}
                  {...register("od_cylinder")}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="-0.50"
                />
              </div>

              {/* Axis */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Axis (°) {cylinderOD && parseFloat(cylinderOD) !== 0 && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  disabled={status === "finalized"}
                  {...register("od_axis")}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="90"
                />
              </div>

              {/* Add Power */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Add Power (Reading)
                </label>
                <input
                  type="number"
                  step="0.25"
                  disabled={status === "finalized"}
                  {...register("od_add_power")}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="+2.00"
                />
              </div>

              {/* Prism */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Prism (if applicable)
                </label>
                <input
                  type="text"
                  disabled={status === "finalized"}
                  {...register("od_prism")}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="e.g., 2∆ BI"
                />
              </div>
            </div>
          </div>

          {/* OS (Left Eye) */}
          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Eye className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-green-900">OS (Left Eye)</h3>
            </div>

            <div className="space-y-4">
              {/* Sphere */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Sphere (SPH) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.25"
                  disabled={status === "finalized"}
                  {...register("os_sphere", { required: "Sphere is required" })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="-2.00"
                />
                {errors.os_sphere && (
                  <p className="mt-1 text-sm text-red-600">{errors.os_sphere.message}</p>
                )}
              </div>

              {/* Cylinder */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Cylinder (CYL)
                </label>
                <input
                  type="number"
                  step="0.25"
                  disabled={status === "finalized"}
                  {...register("os_cylinder")}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="-0.50"
                />
              </div>

              {/* Axis */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Axis (°) {cylinderOS && parseFloat(cylinderOS) !== 0 && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  disabled={status === "finalized"}
                  {...register("os_axis")}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="90"
                />
              </div>

              {/* Add Power */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Add Power (Reading)
                </label>
                <input
                  type="number"
                  step="0.25"
                  disabled={status === "finalized"}
                  {...register("os_add_power")}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="+2.00"
                />
              </div>

              {/* Prism */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Prism (if applicable)
                </label>
                <input
                  type="text"
                  disabled={status === "finalized"}
                  {...register("os_prism")}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="e.g., 2∆ BI"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Common Fields */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Additional Details</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Pupillary Distance */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Pupillary Distance (PD) - mm
              </label>
              <input
                type="number"
                step="0.5"
                disabled={status === "finalized"}
                {...register("pupillary_distance")}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                placeholder="63.5"
              />
            </div>

            {/* Lens Type */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Lens Type
              </label>
              <select
                disabled={status === "finalized"}
                {...register("lens_type")}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="">Select lens type</option>
                <option value="Single Vision">Single Vision</option>
                <option value="Bifocal">Bifocal</option>
                <option value="Progressive">Progressive</option>
                <option value="Anti-Reflective">Anti-Reflective</option>
                <option value="Photochromic">Photochromic</option>
                <option value="Blue Light Filter">Blue Light Filter</option>
              </select>
            </div>



            {/* Frame Fitting Notes */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Frame Fitting Notes
              </label>
              <textarea
                disabled={status === "finalized"}
                {...register("frame_fitting_notes")}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                placeholder="Frame size, bridge width, temple length recommendations..."
              />
            </div>

            {/* Diagnosis Selection & Symptoms */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Diagnoses & Symptoms</label>
                <button
                  type="button"
                  onClick={() => setShowDiagnosisSearch(!showDiagnosisSearch)}
                  className="text-xs flex items-center gap-1 text-sky-600 hover:text-sky-700 font-medium"
                >
                  <Plus className="h-3 w-3" /> Add Diagnosis
                </button>
              </div>

              {/* Manual Text Input (Legacy/Fallback) */}
              <input
                type="text"
                disabled={status === "finalized"}
                {...register("diagnosis")}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                placeholder="Diagnoses (manual entry or select below)"
              />

              {/* Diagnosis Search Panel */}
              {showDiagnosisSearch && (
                <div className="relative z-[100] rounded-lg border border-slate-300 bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ring-4 ring-sky-500/10">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      autoFocus
                      type="text"
                      value={diagnosisSearch}
                      onChange={(e) => setDiagnosisSearch(e.target.value)}
                      className="w-full rounded-md border border-slate-300 pl-9 pr-4 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      placeholder="Search diagnoses..."
                    />
                  </div>
                  {isSearchingDiagnosis && (
                    <div className="mt-2 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" /> Searching...
                    </div>
                  )}
                  {!isSearchingDiagnosis && diagnosisResults.length > 0 && (
                    <ul className="mt-2 max-h-60 overflow-y-auto rounded-md border border-slate-100 divide-y divide-slate-100 bg-white shadow-sm">
                      {diagnosisResults.map((d) => (
                        <li key={d.id} className="block">
                          <button
                            type="button"
                            className="w-full text-left px-4 py-3 text-sm hover:bg-sky-50 transition-colors focus:bg-sky-50 focus:outline-none flex flex-col gap-0.5"
                            onMouseDown={(e) => {
                              console.log("onMouseDown on diagnosis:", d.diagnosis_name);
                              // Prevent any other blur events
                              addDiagnosis(d);
                            }}
                          >
                            <span className="font-semibold text-slate-900">{d.diagnosis_name}</span>
                            {d.diagnosis_code && <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1 rounded self-start">{d.diagnosis_code}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!isSearchingDiagnosis && diagnosisSearch.length >= 2 && diagnosisResults.length === 0 && (
                    <p className="mt-2 text-center text-xs text-slate-500">No diagnoses found.</p>
                  )}
                </div>
              )}

              {/* Selected Diagnoses & Symptoms */}
              {selectedDiagnoses.length > 0 && (
                <div className="grid gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
                  {selectedDiagnoses.map(diagnosis => (
                    <div key={diagnosis.id} className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="font-semibold text-slate-800">{diagnosis.diagnosis_name}</h4>
                        <button
                          type="button"
                          onClick={() => removeDiagnosis(diagnosis.id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Eye Selection Toggle Buttons */}
                      <div className="flex items-center gap-3 py-2">
                        <span className="text-xs font-medium text-slate-600">Applicable Eye:</span>
                        <div className="flex gap-2">
                          {(["OD", "OS", "OU", "NA"] as const).map((eye) => {
                            const isActive = diagnosisEyeMap[diagnosis.id] === eye;
                            return (
                              <button
                                key={eye}
                                type="button"
                                onClick={() => setDiagnosisEyeMap(prev => ({ ...prev, [diagnosis.id]: eye }))}
                                className={`
                                  px-3 py-1 text-xs font-medium rounded-md transition-all
                                  ${isActive
                                    ? 'bg-sky-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 border border-slate-300 hover:border-sky-400 hover:bg-sky-50'
                                  }
                                `}
                                title={
                                  eye === "OD" ? "Right Eye (Oculus Dexter)" :
                                    eye === "OS" ? "Left Eye (Oculus Sinister)" :
                                      eye === "OU" ? "Both Eyes (Oculus Uterque)" :
                                        "Not Applicable"
                                }
                              >
                                {eye}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pl-2">
                        <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Related Symptoms</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {availableSymptoms[diagnosis.id]?.map(symptom => {
                            const isSelected = selectedSymptoms.some(s => s.diagnosis_id === diagnosis.id && s.symptom_id === symptom.symptom_id);
                            return (
                              <label
                                key={symptom.id}
                                className={`
                                                        flex items-center gap-2 p-2 rounded border text-sm cursor-pointer transition-colors
                                                        ${isSelected ? 'bg-sky-50 border-sky-200 text-sky-800' : 'bg-white border-slate-200 hover:border-sky-200'}
                                                    `}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSymptom(symptom, diagnosis)}
                                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                />
                                <span className="truncate" title={symptom.symptom_name}>{symptom.symptom_name}</span>
                              </label>
                            );
                          })}
                          {(!availableSymptoms[diagnosis.id] || availableSymptoms[diagnosis.id].length === 0) && (
                            <p className="text-xs text-slate-400 italic">No linked symptoms found.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="md:col-span-2 pt-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Additional Notes
              </label>
              <textarea
                disabled={status === "finalized"}
                {...register("notes")}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                placeholder="Any additional notes or instructions..."
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {status !== "finalized" && (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleSubmit((data) => onSubmit(data, "save"))}
              disabled={isSubmitting || !isDirty}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </button>
            <button
              type="button"
              onClick={handleSubmit((data) => onSubmit(data, "finalize"))}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="h-4 w-4" />
              Finalize Prescription
            </button>
          </div>
        )}

        {status === "finalized" && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmit((data) => onSubmit(data, "print"))}
              className="flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition"
            >
              <Printer className="h-4 w-4" />
              Print Prescription
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
