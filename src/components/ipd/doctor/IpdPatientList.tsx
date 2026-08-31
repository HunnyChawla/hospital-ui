"use client";

import React, { useState } from "react";
import {
  BedDouble,
  Search,
  Users,
  UserCheck,
  Building2,
  Activity,
  Pill,
  ChevronRight,
} from "lucide-react";
import { IpdAdmittedPatient } from "@/types/ipdDoctor";

interface IpdPatientListProps {
  patients: IpdAdmittedPatient[];
  selectedAdmissionId: string | null;
  onSelectPatient: (admissionId: string) => void;
  currentDoctorId?: string | null;
  loading?: boolean;
}

export function IpdPatientList({
  patients,
  selectedAdmissionId,
  onSelectPatient,
  currentDoctorId,
  loading = false,
}: IpdPatientListProps) {
  const [filterMode, setFilterMode] = useState<"my" | "all">("my");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWard, setSelectedWard] = useState<string>("all");

  // Get distinct wards
  const wards = Array.from(
    new Set(patients.map((p) => p.ward_name).filter(Boolean))
  ) as string[];

  // Filter patients
  const filteredPatients = patients.filter((patient) => {
    // Doctor filter
    if (filterMode === "my" && currentDoctorId && patient.doctor_id !== currentDoctorId) {
      return false;
    }

    // Ward filter
    if (selectedWard !== "all" && patient.ward_name !== selectedWard) {
      return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const nameMatch = patient.patient_name.toLowerCase().includes(term);
      const uhidMatch = patient.uhid.toLowerCase().includes(term);
      const admMatch = patient.admission_number.toLowerCase().includes(term);
      const bedMatch = (patient.bed_number || "").toLowerCase().includes(term);
      return nameMatch || uhidMatch || admMatch || bedMatch;
    }

    return true;
  });

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-sm">
      {/* Header & Tabs */}
      <div className="space-y-2.5 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-sky-600 shrink-0" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Admitted Patients</h3>
          </div>
          <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800 shrink-0">
            {filteredPatients.length} active
          </span>
        </div>

        {/* Filter Mode Toggle */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setFilterMode("my")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
              filterMode === "my"
                ? "bg-white text-sky-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>My Patients</span>
          </button>
          <button
            onClick={() => setFilterMode("all")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
              filterMode === "all"
                ? "bg-white text-sky-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>All IPD</span>
          </button>
        </div>

        {/* Search & Ward Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, UHID, bed..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none"
            />
          </div>

          {wards.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              <button
                onClick={() => setSelectedWard("all")}
                className={`rounded-lg px-2.5 py-1 font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedWard === "all"
                    ? "bg-slate-800 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Wards
              </button>
              {wards.map((ward) => (
                <button
                  key={ward}
                  onClick={() => setSelectedWard(ward)}
                  className={`rounded-lg px-2.5 py-1 font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedWard === ward
                      ? "bg-sky-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {ward}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Patient List Items */}
      <div className="mt-2.5 flex-1 space-y-2 overflow-y-auto pr-0.5 max-h-[65vh] sm:max-h-[calc(100vh-280px)]">
        {loading ? (
          <div className="space-y-3 py-8 text-center">
            <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-slate-200 border-t-sky-600" />
            <p className="text-xs text-slate-500">Loading admitted patients...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <BedDouble className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-xs font-semibold">No admitted patients found</p>
            {filterMode === "my" && (
              <button
                onClick={() => setFilterMode("all")}
                className="mt-2 text-xs font-bold text-sky-600 hover:underline cursor-pointer"
              >
                View all IPD patients
              </button>
            )}
          </div>
        ) : (
          filteredPatients.map((patient) => {
            const isSelected = patient.admission_id === selectedAdmissionId;
            return (
              <div
                key={patient.admission_id}
                onClick={() => onSelectPatient(patient.admission_id)}
                className={`group relative cursor-pointer rounded-xl border p-3 transition active:scale-[0.99] ${
                  isSelected
                    ? "border-sky-500 bg-sky-50/80 shadow-sm ring-1 ring-sky-400"
                    : "border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50/80 active:bg-slate-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 group-hover:text-sky-700 truncate text-xs sm:text-sm">
                        {patient.patient_name}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate">
                      {patient.uhid} • {patient.age ? `${patient.age}y` : ""} {patient.gender || ""}
                    </p>
                  </div>

                  {/* Ward & Bed Badge */}
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center rounded-lg bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-800 border border-teal-200">
                      🛏️ {patient.ward_name ? `${patient.ward_name}/` : ""}{patient.bed_number || "No Bed"}
                    </span>
                  </div>
                </div>

                {/* Stay & Diagnosis */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 gap-2">
                  <span className="font-semibold text-sky-700 shrink-0">
                    Day {patient.days_admitted + 1}
                  </span>
                  <span className="truncate text-right text-slate-500 flex-1" title={patient.diagnosis || "No diagnosis"}>
                    {patient.diagnosis || patient.reason_for_admission || "Admitted"}
                  </span>
                </div>

                {/* Badges strip: Active Meds, Attending Doctor, Mobile arrow */}
                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Pill className="h-3 w-3 text-emerald-600" />
                    <span>{patient.active_medications_count} Meds</span>
                  </span>
                  <div className="flex items-center gap-1 truncate max-w-[140px]">
                    <span className="truncate" title={patient.doctor_name}>
                      {patient.doctor_name || "Doctor"}
                    </span>
                    <ChevronRight className="h-3 w-3 text-slate-400 group-hover:text-sky-600 shrink-0" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
