"use client";

import { useState } from "react";
import { admitPatient } from "@/redux/admissionsSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { Admission } from "@/types";
import { toast } from "sonner";
import { nanoid } from "@reduxjs/toolkit";

export function AdmissionPanel() {
  const patients = useAppSelector((s) => s.patients.list);
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({
    patientId: patients[0]?.id ?? "",
    doctor: "Dr. Mehta",
    reason: "Observation",
    wardType: "General" as Admission["wardType"],
    bedNumber: "G-102",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Admission = {
      id: nanoid(),
      admittedAt: new Date().toISOString(),
      ...form,
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
        <input
          value={form.doctor}
          onChange={(e) => setForm({ ...form, doctor: e.target.value })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
        />
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
        <span className="text-slate-600">Ward</span>
        <select
          value={form.wardType}
          onChange={(e) =>
            setForm({
              ...form,
              wardType: e.target.value as Admission["wardType"],
            })
          }
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
        >
          <option>General</option>
          <option>Private</option>
          <option>ICU</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-slate-600">Bed</span>
        <input
          value={form.bedNumber}
          onChange={(e) => setForm({ ...form, bedNumber: e.target.value })}
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

