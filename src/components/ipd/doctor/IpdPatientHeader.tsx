"use client";

import React from "react";
import {
  BedDouble,
  Calendar,
  Clock,
  FileText,
  HeartPulse,
  RefreshCw,
  Stethoscope,
  User,
  ShieldAlert,
} from "lucide-react";
import { IpdPatientChart } from "@/types/ipdDoctor";

interface IpdPatientHeaderProps {
  chart: IpdPatientChart;
  onRefresh: () => void;
  onOpenDischargeSummary: () => void;
  loading?: boolean;
}

export function IpdPatientHeader({
  chart,
  onRefresh,
  onOpenDischargeSummary,
  loading = false,
}: IpdPatientHeaderProps) {
  const { admission, patient } = chart;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm">
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
        {/* Patient Identity & Demographics */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 text-base sm:text-lg font-bold text-white shadow-md">
            {patient.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">{patient.name}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                UHID: {patient.uhid}
              </span>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                {admission.admission_number}
              </span>
              {admission.status === "discharge_initiated" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 animate-pulse">
                  Discharge Initiated
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {patient.age !== undefined && patient.age !== null && (
                <span>
                  {patient.age} yrs • {patient.gender || "N/A"}
                </span>
              )}
              {patient.blood_group && (
                <span className="font-semibold text-rose-600">
                  Blood: {patient.blood_group}
                </span>
              )}
              {patient.mobile && <span>📱 {patient.mobile}</span>}
              {admission.ward_name && admission.bed_number && (
                <span className="font-semibold text-slate-800">
                  🛏️ {admission.ward_name} / Bed {admission.bed_number}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Refresh patient chart"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onOpenDischargeSummary}
            className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 px-3.5 sm:px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:from-sky-700 hover:to-teal-700 hover:shadow cursor-pointer"
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span>Discharge Summary</span>
          </button>
        </div>
      </div>

      {/* Clinical Highlights Strip */}
      <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs sm:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-xl bg-slate-50 p-2">
          <div className="flex items-center gap-1 text-slate-500">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px]">Admitted Date</span>
          </div>
          <p className="mt-1 font-semibold text-slate-800 text-xs">
            {new Date(admission.admission_date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-2">
          <div className="flex items-center gap-1 text-slate-500">
            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px]">Stay Duration</span>
          </div>
          <p className="mt-1 font-bold text-sky-700 text-xs">
            Day {admission.days_admitted + 1} ({admission.days_admitted}{" "}
            {admission.days_admitted === 1 ? "day" : "days"})
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-2">
          <div className="flex items-center gap-1 text-slate-500">
            <Stethoscope className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px]">Attending Doctor</span>
          </div>
          <p className="mt-1 font-semibold text-slate-800 truncate text-xs" title={admission.doctor_name}>
            {admission.doctor_name || "Doctor"}
          </p>
        </div>

        <div className="col-span-2 rounded-xl bg-slate-50 p-2 sm:col-span-1 lg:col-span-2">
          <div className="flex items-center gap-1 text-slate-500">
            <HeartPulse className="h-3.5 w-3.5 text-teal-500 shrink-0" />
            <span className="text-[11px]">Primary Diagnosis</span>
          </div>
          <p className="mt-1 font-semibold text-slate-900 truncate text-xs" title={admission.diagnosis || admission.reason_for_admission || "None specified"}>
            {admission.diagnosis || admission.reason_for_admission || "None specified"}
          </p>
        </div>
      </div>
    </div>
  );
}
