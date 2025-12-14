"use client";

import { useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { addPatient, updatePatient } from "@/redux/patientsSlice";
import { Patient } from "@/types";
import { toast } from "sonner";

type FormPatient = Omit<Patient, "id" | "status" | "lastVisit"> & {
  id?: string;
};

interface PatientFormProps {
  defaultValues?: Patient;
  onSuccess?: () => void;
}

export function PatientForm({ defaultValues, onSuccess }: PatientFormProps) {
  const dispatch = useAppDispatch();
  const doctors = useAppSelector((s) => s.doctors.list);
  const { register, handleSubmit, reset } = useForm<FormPatient>({
    defaultValues,
  });

  const onSubmit = async (values: FormPatient) => {
    if (defaultValues) {
      await dispatch(
        updatePatient({ ...(defaultValues as Patient), ...values })
      );
      toast.success("Patient updated");
    } else {
      await dispatch(addPatient(values as FormPatient));
      toast.success("Patient created");
      reset();
    }
    onSuccess?.();
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-2 gap-3 text-sm"
    >
      <div className="col-span-2 grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-slate-600">Full name</span>
          <input
            {...register("name", { required: true })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="Patient name"
          />
        </label>
        <label className="space-y-1">
          <span className="text-slate-600">Mobile</span>
          <input
            {...register("mobile", { required: true })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="10-digit mobile"
          />
        </label>
        <label className="space-y-1">
          <span className="text-slate-600">Health ID</span>
          <input
            {...register("healthId", { required: true })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="National health ID"
          />
        </label>
        <label className="space-y-1">
          <span className="text-slate-600">Doctor</span>
          <select
            {...register("doctor", { required: true })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          >
            <option value="">Select a doctor</option>
            {doctors.map((doc) => {
              const doctorName = doc.name || doc.user?.name || `Dr. ${doc.specialization}`;
              return (
                <option key={doc.id} value={doctorName}>
                  {doctorName} - {doc.specialization}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      <label className="space-y-1">
        <span className="text-slate-600">Age</span>
        <input
          type="number"
          {...register("age", { required: true, valueAsNumber: true })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Age"
        />
      </label>
      <label className="space-y-1">
        <span className="text-slate-600">Gender</span>
        <select
          {...register("gender")}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
        >
          <option>Male</option>
          <option>Female</option>
          <option>Other</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-slate-600">Ward type</span>
        <select
          {...register("wardType")}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
        >
          <option value="">Not admitted</option>
          <option>General</option>
          <option>Private</option>
          <option>ICU</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-slate-600">Bed number</span>
        <input
          {...register("bedNumber")}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="e.g. ICU-04"
        />
      </label>
      <div className="col-span-2 mt-2 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 transition hover:border-slate-300"
        >
          Reset
        </button>
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-md transition hover:shadow-lg"
        >
          {defaultValues ? "Save changes" : "Add patient"}
        </button>
      </div>
    </form>
  );
}

