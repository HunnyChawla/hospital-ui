"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { medicinesApi, Medicine } from "@/services/medicinesApi";
import { prescriptionsApi, CreatePrescriptionMedicine } from "@/services/prescriptionsApi";
import { patientsApi, PatientApiResponse } from "@/services/patientsApi";
import { doctorsApi, Doctor } from "@/services/doctorsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Search, Plus, X, Loader2 } from "lucide-react";

interface PrescriptionFormProps {
  visitId?: string | null;
  appointmentId?: string | null;
  patientId: string;
  doctorId: string;
  onSuccess?: () => void;
  defaultPrescription?: {
    medicines: CreatePrescriptionMedicine[];
    diagnosis?: string | null;
    notes?: string | null;
  };
}

interface MedicineFormData extends CreatePrescriptionMedicine {
  tempId: string; // Temporary ID for React key
  medicine_name?: string; // For display purposes
}

export function PrescriptionForm({
  visitId,
  appointmentId,
  patientId,
  doctorId,
  onSuccess,
  defaultPrescription,
}: PrescriptionFormProps) {
  const [medicines, setMedicines] = useState<MedicineFormData[]>([]);
  const [availableMedicines, setAvailableMedicines] = useState<Medicine[]>([]);
  const [medicineSearchTerm, setMedicineSearchTerm] = useState("");
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [patient, setPatient] = useState<PatientApiResponse | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(false);
  const medicineSearchRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, setValue, watch, reset } = useForm<{
    diagnosis: string;
    notes: string;
  }>();

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

  // Load default prescription if editing
  useEffect(() => {
    if (defaultPrescription) {
      setMedicines(
        defaultPrescription.medicines.map((med) => ({
          ...med,
          tempId: Math.random().toString(36).substring(7),
        }))
      );
      setValue("diagnosis", defaultPrescription.diagnosis || "");
      setValue("notes", defaultPrescription.notes || "");
    }
  }, [defaultPrescription, setValue]);

  // Search medicines
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
    // Check if medicine already added
    if (medicines.some((m) => m.medicine_id === medicine.id)) {
      toast.error("Medicine already added");
      return;
    }

    const newMedicine: MedicineFormData = {
      tempId: Math.random().toString(36).substring(7),
      medicine_id: medicine.id,
      medicine_name: medicine.name, // Store medicine name
      dosage: medicine.strength || "",
      frequency: "",
      duration: "",
      instructions: "",
      quantity: 1,
      unit: medicine.unit || "tablets",
    };

    setMedicines([...medicines, newMedicine]);
    setMedicineSearchTerm("");
    setShowMedicineDropdown(false);
  };

  const handleRemoveMedicine = (tempId: string) => {
    setMedicines(medicines.filter((m) => m.tempId !== tempId));
  };

  const handleMedicineChange = (tempId: string, field: keyof MedicineFormData, value: string | number) => {
    setMedicines(
      medicines.map((m) => (m.tempId === tempId ? { ...m, [field]: value } : m))
    );
  };

  const onSubmit = async (data: { diagnosis: string; notes: string }) => {
    if (medicines.length === 0) {
      toast.error("Please add at least one medicine");
      return;
    }

    // Validate all medicines have required fields
    for (const medicine of medicines) {
      if (!medicine.dosage.trim()) {
        toast.error(`Please enter dosage for ${medicine.medicine_name || "medicine"}`);
        return;
      }
      if (!medicine.frequency.trim()) {
        toast.error(`Please enter frequency for ${medicine.medicine_name || "medicine"}`);
        return;
      }
      if (!medicine.duration.trim()) {
        toast.error(`Please enter duration for ${medicine.medicine_name || "medicine"}`);
        return;
      }
      if (medicine.quantity <= 0) {
        toast.error(`Please enter valid quantity for ${medicine.medicine_name || "medicine"}`);
        return;
      }
    }

    setLoading(true);
    try {
      const prescriptionData = {
        visit_id: visitId || null,
        appointment_id: appointmentId || null,
        patient_id: patientId,
        doctor_id: doctorId,
        medicines: medicines.map(({ tempId, medicine_name, ...med }) => med),
        diagnosis: data.diagnosis.trim() || null,
        notes: data.notes.trim() || null,
      };

      await prescriptionsApi.create(prescriptionData);
      toast.success("Prescription saved successfully");
      
      // Reset form
      setMedicines([]);
      reset();
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to save prescription");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async (data: { diagnosis: string; notes: string }) => {
    if (medicines.length === 0) {
      toast.error("Please add at least one medicine");
      return;
    }

    // Validate all medicines
    for (const medicine of medicines) {
      if (!medicine.dosage.trim() || !medicine.frequency.trim() || !medicine.duration.trim()) {
        toast.error("Please fill all fields for all medicines");
        return;
      }
      if (medicine.quantity <= 0) {
        toast.error("Please enter valid quantity for all medicines");
        return;
      }
    }

    setLoading(true);
    try {
      // First create prescription
      const prescriptionData = {
        visit_id: visitId || null,
        appointment_id: appointmentId || null,
        patient_id: patientId,
        doctor_id: doctorId,
        medicines: medicines.map(({ tempId, medicine_name, ...med }) => med),
        diagnosis: data.diagnosis.trim() || null,
        notes: data.notes.trim() || null,
      };

      const prescription = await prescriptionsApi.create(prescriptionData);
      
      // Then finalize it
      await prescriptionsApi.finalize(prescription.id);
      
      toast.success("Prescription finalized successfully");
      
      // Reset form
      setMedicines([]);
      reset();
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to finalize prescription");
    } finally {
      setLoading(false);
    }
  };

  // Get medicine name for display
  const getMedicineName = (medicineId: string): string => {
    const med = availableMedicines.find((m) => m.id === medicineId);
    if (med) return med.name;
    // Try to find in current medicines list
    const currentMed = medicines.find((m) => m.medicine_id === medicineId);
    return currentMed?.medicine_name || "Unknown Medicine";
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Patient and Doctor Info */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-600">Patient</p>
            <p className="font-semibold text-slate-900">
              {patient ? `${patient.first_name} ${patient.last_name || ""}`.trim() : "Loading..."}
            </p>
            {patient?.mobile && (
              <p className="text-xs text-slate-500">{patient.mobile}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-600">Doctor</p>
            <p className="font-semibold text-slate-900">
              {doctor?.name || doctor?.user?.name || "Loading..."}
            </p>
            {doctor?.specialization && (
              <p className="text-xs text-slate-500">{doctor.specialization}</p>
            )}
          </div>
        </div>
      </div>

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
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400"
              placeholder="Search medicines..."
            />
            {loadingMedicines && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            )}
          </div>
          {showMedicineDropdown && availableMedicines.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {availableMedicines.map((medicine) => (
                <div
                  key={medicine.id}
                  onClick={() => handleAddMedicine(medicine)}
                  className="cursor-pointer px-4 py-2 text-sm hover:bg-sky-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{medicine.name}</p>
                      {medicine.generic_name && (
                        <p className="text-xs text-slate-500">{medicine.generic_name}</p>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                        {medicine.strength && <span>{medicine.strength}</span>}
                        {medicine.dosage_form && <span>• {medicine.dosage_form}</span>}
                        {medicine.manufacturer && <span>• {medicine.manufacturer}</span>}
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-sky-500" />
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
          <label className="text-sm font-semibold text-slate-700">Prescribed Medicines</label>
          {medicines.map((medicine) => {
            const medicineName = getMedicineName(medicine.medicine_id);
            return (
              <div
                key={medicine.tempId}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{medicineName}</p>
                    {availableMedicines.find((m) => m.id === medicine.medicine_id)?.generic_name && (
                      <p className="text-xs text-slate-500">
                        {availableMedicines.find((m) => m.id === medicine.medicine_id)?.generic_name}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMedicine(medicine.tempId)}
                    className="rounded-lg p-1 text-rose-500 transition hover:bg-rose-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-xs text-slate-600">Dosage</span>
                    <input
                      type="text"
                      value={medicine.dosage}
                      onChange={(e) =>
                        handleMedicineChange(medicine.tempId, "dosage", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      placeholder="e.g., 500mg, 1 tablet"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-600">Frequency</span>
                    <input
                      type="text"
                      value={medicine.frequency}
                      onChange={(e) =>
                        handleMedicineChange(medicine.tempId, "frequency", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      placeholder="e.g., Twice daily, After meals"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-600">Duration</span>
                    <input
                      type="text"
                      value={medicine.duration}
                      onChange={(e) =>
                        handleMedicineChange(medicine.tempId, "duration", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      placeholder="e.g., 5 days, 1 week"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-600">Quantity</span>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={medicine.quantity}
                        onChange={(e) =>
                          handleMedicineChange(
                            medicine.tempId,
                            "quantity",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      />
                      <input
                        type="text"
                        value={medicine.unit}
                        onChange={(e) =>
                          handleMedicineChange(medicine.tempId, "unit", e.target.value)
                        }
                        className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                        placeholder="unit"
                      />
                    </div>
                  </label>
                  <label className="col-span-2 space-y-1">
                    <span className="text-xs text-slate-600">Instructions (Optional)</span>
                    <input
                      type="text"
                      value={medicine.instructions || ""}
                      onChange={(e) =>
                        handleMedicineChange(medicine.tempId, "instructions", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      placeholder="e.g., After meals, Before sleep"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Diagnosis */}
      <label className="space-y-1">
        <span className="text-sm font-semibold text-slate-700">Diagnosis</span>
        <textarea
          {...register("diagnosis")}
          rows={2}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
          placeholder="Enter diagnosis..."
        />
      </label>

      {/* Notes */}
      <label className="space-y-1">
        <span className="text-sm font-semibold text-slate-700">Notes</span>
        <textarea
          {...register("notes")}
          rows={2}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
          placeholder="Additional notes..."
        />
      </label>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={loading || medicines.length === 0}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Draft"}
        </button>
        <button
          type="button"
          onClick={handleSubmit(handleFinalize)}
          disabled={loading || medicines.length === 0}
          className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Finalizing..." : "Finalize Prescription"}
        </button>
      </div>
    </form>
  );
}

