"use client";

import { useState } from "react";
import { admitPatient } from "@/redux/admissionsSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { Admission } from "@/types";
import { CreateAdmissionRequest, AdmissionType } from "@/services/admissionsApi";
import { toast } from "sonner";

export function AdmissionPanel() {
  const patients = useAppSelector((s) => s.patients.list);
  const doctors = useAppSelector((s) => s.doctors.list);
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({
    patientId: patients[0]?.id ?? "",
    doctorId: doctors[0]?.id ?? "",
    bedId: "",
    reason: "Observation",
    admissionType: "planned" as AdmissionType,
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.doctorId || !form.bedId) {
      toast.error("Please fill in all required fields");
      return;
    }
    const payload: CreateAdmissionRequest = {
      patient_id: form.patientId,
      doctor_id: form.doctorId,
      bed_id: form.bedId,
      admission_date: new Date().toISOString().split("T")[0],
      admission_type: form.admissionType,
      reason_for_admission: form.reason,
    };
    await dispatch(admitPatient(payload));
    toast.success("Patient admitted");
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3 text-sm">
      <label className="space-y-1">
        <span className="text-slate-600">Patient</span>
        <select
          value={form.patientId}
          onChange={(e) => setForm({ ...form, patientId: e.target.value })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} • {p.healthId}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-slate-600">Doctor</span>
        <select
          value={form.doctorId}
          onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
        >
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name || `Doctor ${d.id}`}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-slate-600">Admission Type</span>
        <select
          value={form.admissionType}
          onChange={(e) => setForm({ ...form, admissionType: e.target.value as AdmissionType })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
        >
          <option value="planned">Planned</option>
          <option value="emergency">Emergency</option>
          <option value="transfer">Transfer</option>
          <option value="day_care">Day Care</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-slate-600">Reason</span>
        <input
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
        />
      </label>
      <label className="space-y-1">
        <span className="text-slate-600">Bed ID</span>
        <input
          value={form.bedId}
          onChange={(e) => setForm({ ...form, bedId: e.target.value })}
          placeholder="Enter bed ID"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
        />
      </label>
      <div className="col-span-2 flex justify-end">
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm hover:shadow"
        >
          Admit patient
        </button>
      </div>
    </form>
  );
}

