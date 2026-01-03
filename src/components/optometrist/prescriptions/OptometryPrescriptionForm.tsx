"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Eye, Save, FileText, Printer, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import type { OptometryPrescription, RefractionRecord } from "@/types";

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
      if (existingPrescription.diagnosis) setValue("diagnosis", existingPrescription.diagnosis);
      if (existingPrescription.notes) setValue("notes", existingPrescription.notes);
      if (existingPrescription.frame_fitting_notes) {
        setValue("frame_fitting_notes", existingPrescription.frame_fitting_notes);
      }

      setStatus(existingPrescription.status);
    }
  }, [existingPrescription, setValue]);

  const onSubmit = async (data: PrescriptionFormData, action: "save" | "finalize" | "print") => {
    try {
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
        diagnosis: data.diagnosis || null,
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
      toast.error(`Failed to ${action} prescription`);
      console.error(`${action} prescription error:`, error);
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

            {/* Diagnosis */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Diagnosis
              </label>
              <input
                type="text"
                disabled={status === "finalized"}
                {...register("diagnosis")}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                placeholder="e.g., Myopia OU, Presbyopia"
              />
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

            {/* Notes */}
            <div className="md:col-span-2">
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
