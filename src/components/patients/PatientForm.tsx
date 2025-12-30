"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useCreatePatient, useUpdatePatient, usePatient } from "@/hooks/queries/usePatients";
import { Patient } from "@/types";
import { CreatePatientRequest } from "@/services/patientsApi";

interface PatientFormProps {
  defaultValues?: Patient;
  onSuccess?: () => void;
}

export function PatientForm({ defaultValues, onSuccess }: PatientFormProps) {
  // React Query mutations - automatic cache invalidation and optimistic updates!
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();

  // Fetch full patient details when editing (React Query auto-deduplicates this!)
  const { data: fullPatientData } = usePatient(defaultValues?.id || null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreatePatientRequest>({
    mode: "onChange",
    reValidateMode: "onChange",
  });

  // Populate form when full patient data is loaded
  useEffect(() => {
    if (fullPatientData && defaultValues?.id) {
      // React Query fetched the full data - no manual API call needed!
      reset({
        first_name: fullPatientData.name.split(/\s+/)[0] || "",
        last_name: fullPatientData.name.split(/\s+/).slice(1).join(" ") || "",
        mobile: fullPatientData.mobile,
        email: "",
        date_of_birth: "",
        gender: fullPatientData.gender.toLowerCase() as "male" | "female" | "other",
        abha_id: fullPatientData.healthId || "",
        address: "",
        city: "",
        state: "",
        pincode: "",
      });
    } else if (!defaultValues) {
      // Reset form for new patient
      reset({
        first_name: "",
        last_name: "",
        mobile: "",
        email: "",
        date_of_birth: "",
        gender: "male",
        abha_id: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
      });
    }
  }, [fullPatientData, defaultValues, reset]);

  const onSubmit = async (values: CreatePatientRequest) => {
    // Ensure gender is lowercase
    const gender = (values.gender || "male").toLowerCase() as "male" | "female" | "other";

    const patientData: CreatePatientRequest = {
      first_name: values.first_name,
      last_name: values.last_name || undefined,
      mobile: values.mobile,
      email: values.email || undefined,
      date_of_birth: values.date_of_birth,
      gender,
      abha_id: values.abha_id || undefined,
      address: values.address || undefined,
      city: values.city || undefined,
      state: values.state || undefined,
      pincode: values.pincode || undefined,
    };

    if (defaultValues) {
      // Update existing patient
      await updatePatient.mutateAsync({
        patientId: defaultValues.id,
        updates: patientData,
      });
      // React Query mutation already shows toast and invalidates cache!
      onSuccess?.();
    } else {
      // Create new patient
      await createPatient.mutateAsync(patientData);
      // React Query mutation already shows toast and invalidates cache!
      reset();
      onSuccess?.();
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-2 gap-3 text-sm"
    >
      {/* Required Fields */}
      <div className="col-span-2 grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-slate-600">
            First Name <span className="text-rose-500">*</span>
          </span>
          <input
            {...register("first_name", { required: "First name is required" })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="First name"
          />
          {errors.first_name && (
            <span className="text-xs text-rose-500">{errors.first_name.message}</span>
          )}
        </label>
        <label className="space-y-1">
          <span className="text-slate-600">Last Name</span>
          <input
            {...register("last_name")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="Last name (optional)"
          />
        </label>
        <label className="space-y-1">
          <span className="text-slate-600">
            Mobile <span className="text-rose-500">*</span>
          </span>
          <input
            type="tel"
            {...register("mobile", {
              required: "Mobile is required",
              minLength: { value: 10, message: "Mobile must be at least 10 digits" },
              maxLength: { value: 20, message: "Mobile must be at most 20 digits" },
              pattern: {
                // Allow optional +91 or leading 0, then 10 digits starting with 6-9 (India common rule)
                value: /^(\+91[\-\s]?|0)?[6-9]\d{9}$/, 
                message: "Enter a valid mobile number (10 digits, starting with 6-9)"
              }
            })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="e.g. 9876543210 or +919876543210"
          />
          {errors.mobile && (
            <span className="text-xs text-rose-500">{errors.mobile.message}</span>
          )}
        </label>
        <label className="space-y-1">
          <span className="text-slate-600">Email</span>
          <input
            type="email"
            {...register("email")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="Email (optional)"
          />
          {errors.email && (
            <span className="text-xs text-rose-500">{errors.email.message}</span>
          )}
        </label>
        <label className="space-y-1">
          <span className="text-slate-600">
            Date of Birth <span className="text-rose-500">*</span>
          </span>
          <input
            type="date"
            {...register("date_of_birth", { required: "Date of birth is required" })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          />
          {errors.date_of_birth && (
            <span className="text-xs text-rose-500">{errors.date_of_birth.message}</span>
          )}
        </label>
        <label className="space-y-1">
          <span className="text-slate-600">
            Gender <span className="text-rose-500">*</span>
          </span>
          <select
            {...register("gender", { required: "Gender is required" })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errors.gender && (
            <span className="text-xs text-rose-500">{errors.gender.message}</span>
          )}
        </label>
      </div>

      {/* Optional Fields */}
      <div className="col-span-2 mt-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
        <p className="mb-3 text-xs font-semibold text-slate-600">Optional Information</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-slate-600">ABHA/Health ID</span>
            <input
              {...register("abha_id")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="ABHA/NDHM ID (optional)"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-600">Address</span>
            <input
              {...register("address")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="Address (optional)"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-600">City</span>
            <input
              {...register("city")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="City (optional)"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-600">State</span>
            <input
              {...register("state")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="State (optional)"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-600">Pincode</span>
            <input
              {...register("pincode")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="Pincode (optional)"
            />
          </label>
        </div>
      </div>

      <div className="col-span-2 mt-2 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => reset()}
          disabled={createPatient.isPending || updatePatient.isPending}
          className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 transition hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={createPatient.isPending || updatePatient.isPending}
          className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createPatient.isPending || updatePatient.isPending
            ? "Saving..."
            : defaultValues
            ? "Save changes"
            : "Add patient"}
        </button>
      </div>
    </form>
  );
}

