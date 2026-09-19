"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  BedDouble,
  Calendar,
  Clock,
  FileText,
  HeartPulse,
  RefreshCw,
  Stethoscope,
  Activity,
  PlaneTakeoff,
  CreditCard,
  ArrowRightLeft,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { IpdPatientChart } from "@/types/ipdDoctor";
import { Admission, admissionsApi } from "@/services/admissionsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { AdmissionStatusBadge, PatientStatusBadge, CareStatusBadge } from "../StatusBadges";
import { UpdatePatientStatusModal } from "../UpdatePatientStatusModal";
import { UpdateCareStatusModal } from "../UpdateCareStatusModal";
import { TransferBedFormModal } from "../TransferBedFormModal";
import { IpdBillingDrawer } from "../billing/IpdBillingDrawer";

interface IpdPatientHeaderProps {
  chart: IpdPatientChart;
  onRefresh: () => void;
  onOpenDischargeSummary: () => void;
  loading?: boolean;
  isDoctor?: boolean;
}

function formatStatusLabel(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function IpdPatientHeader({
  chart,
  onRefresh,
  onOpenDischargeSummary,
  loading = false,
  isDoctor = true,
}: IpdPatientHeaderProps) {
  const { admission, patient } = chart;
  const isDischarged = ["DISCHARGED", "discharged", "CANCELLED", "cancelled"].includes(admission.status);
  const [showCareStatusModal, setShowCareStatusModal] = useState(false);
  const [showPatientStatusModal, setShowPatientStatusModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showBillingDrawer, setShowBillingDrawer] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Close actions menu when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowActionsMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Construct Admission object for status modals
  const admissionForModal: Admission = {
    id: admission.id,
    tenant_id: "",
    patient_id: patient.id,
    patient_name: patient.name,
    patient_mobile: patient.mobile || null,
    doctor_id: admission.doctor_id,
    doctor_name: admission.doctor_name,
    bed_id: "",
    bed_number: admission.bed_number || null,
    ward_name: admission.ward_name || null,
    admission_date: admission.admission_date,
    admission_time: admission.admission_time,
    admission_type: (admission.admission_type as any) || "planned",
    status: (admission.status as any) || "ACTIVE",
    patient_status: (admission.patient_status as any) || "IN_HOSPITAL",
    care_status: (admission.care_status as any) || "ADMITTED",
    admission_number: admission.admission_number,
    reason_for_admission: admission.reason_for_admission || null,
    diagnosis: admission.diagnosis || null,
    final_diagnosis: admission.final_diagnosis || null,
    discharge_date: admission.discharge_date || null,
    discharge_time: null,
    discharge_type: null,
    discharge_summary: admission.discharge_summary || null,
    discharge_instructions: admission.discharge_instructions || null,
    insurance_provider: null,
    insurance_policy_number: null,
    next_of_kin_name: null,
    next_of_kin_relation: null,
    next_of_kin_contact: null,
    advance_payment_amount: 0,
    invoice_id: null,
    payment_id: null,
    advance_invoice_id: null,
    visit_id: null,
    created_at: "",
    updated_at: "",
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col gap-3.5 2xl:flex-row 2xl:items-center 2xl:justify-between">
          {/* Patient Identity & Demographics */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 text-base sm:text-lg font-bold text-white shadow-md">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">{patient.name}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  UHID: {patient.uhid}
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800 font-mono">
                  {admission.admission_number}
                </span>

                {/* Clickable Status Badges */}
                <AdmissionStatusBadge status={admission.status} size="sm" />
                {["ACTIVE", "admitted", "DISCHARGE_INITIATED", "discharge_initiated"].includes(admission.status) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowPatientStatusModal(true)}
                      title="Click to update patient presence (leave, transfer, etc.)"
                      className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
                    >
                      <PatientStatusBadge status={admission.patient_status} size="sm" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCareStatusModal(true)}
                      title="Click to update clinical care stage"
                      className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
                    >
                      <CareStatusBadge status={admission.care_status} size="sm" />
                    </button>
                  </>
                ) : (
                  ["EXPIRED", "TRANSFERRED", "LAMA", "DAMA", "ABSCONDED"].includes((admission.patient_status || "").toUpperCase()) && (
                    <PatientStatusBadge status={admission.patient_status} size="sm" />
                  )
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

          {/* Action Controls - Responsive Layout */}
          <div className="flex flex-wrap items-center gap-2 pt-2.5 2xl:pt-0 border-t 2xl:border-t-0 border-slate-100 sm:justify-end shrink-0">
            {/* Refresh Chart Icon Button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 cursor-pointer shadow-2xs shrink-0"
              title="Refresh patient chart"
              aria-label="Refresh patient chart"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            </button>

            {/* Billing Drawer */}
            <button
              type="button"
              onClick={() => setShowBillingDrawer(true)}
              className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 px-3 text-xs font-semibold text-slate-700 transition shadow-2xs cursor-pointer shrink-0"
              title="Open IPD Running Billing Account"
            >
              <CreditCard className="h-3.5 w-3.5 text-slate-500" />
              <span>Billing</span>
            </button>

            {/* Patient & Bed Operations Menu */}
            {!isDischarged ? (
              <div className="relative" ref={actionsMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowActionsMenu((prev) => !prev)}
                  className={`inline-flex items-center justify-center gap-1.5 h-9 rounded-xl border px-3 text-xs font-semibold transition shadow-2xs cursor-pointer shrink-0 ${
                    showActionsMenu
                      ? "border-emerald-500 bg-emerald-50/60 text-emerald-900"
                      : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700"
                  }`}
                  title="Patient and bed management actions"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                  <span>Manage</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ${
                      showActionsMenu ? "rotate-180 text-emerald-600" : ""
                    }`}
                  />
                </button>

                {showActionsMenu && (
                  <div className="absolute right-0 top-full mt-1.5 z-40 w-64 sm:w-72 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Patient & Bed Operations
                    </div>

                    {/* Update Care Stage */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsMenu(false);
                        setShowCareStatusModal(true);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-slate-50 transition group cursor-pointer"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-100 transition">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800">Care Stage</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          Stage: <span className="font-medium text-sky-700">{formatStatusLabel(admission.care_status || "Admitted")}</span>
                        </p>
                      </div>
                    </button>

                    {/* Update Patient Presence */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsMenu(false);
                        setShowPatientStatusModal(true);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-slate-50 transition group cursor-pointer"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition">
                        <PlaneTakeoff className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800">Patient Presence</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          Status: <span className="font-medium text-teal-700">{formatStatusLabel(admission.patient_status || "In Hospital")}</span>
                        </p>
                      </div>
                    </button>

                    {/* Transfer Bed (if bed allocated) */}
                    {admission.bed_id && (
                      <>
                        <div className="my-1 border-t border-slate-100" />
                        <button
                          type="button"
                          onClick={() => {
                            setShowActionsMenu(false);
                            setShowTransferModal(true);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-amber-50/60 transition group cursor-pointer"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition">
                            <ArrowRightLeft className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800">Transfer Bed</p>
                            <p className="text-[11px] text-slate-400 truncate">
                              Current: <span className="font-medium text-amber-700">{admission.ward_name} / Bed {admission.bed_number}</span>
                            </p>
                          </div>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 shadow-2xs shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                <span>Discharged</span>
              </span>
            )}

            {/* Primary Action: Discharge Summary */}
            {(isDoctor || isDischarged) && (
              <button
                type="button"
                onClick={onOpenDischargeSummary}
                className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-3.5 sm:px-4 text-xs font-bold text-white shadow-xs transition hover:shadow cursor-pointer shrink-0"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span>Discharge Summary</span>
              </button>
            )}
          </div>
        </div>

        {/* Clinical Highlights Strip */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs sm:grid-cols-4 lg:grid-cols-5">
          <div className="rounded-xl bg-slate-50 p-2">
            <div className="flex items-center gap-1 text-slate-500">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-[11px]">{isDischarged ? "Stay Period" : "Admitted Date"}</span>
            </div>
            <p className="mt-1 font-semibold text-slate-800 text-xs">
              {new Date(admission.admission_date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {isDischarged && admission.discharge_date && (
                <> - {new Date(admission.discharge_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}</>
              )}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-2">
            <div className="flex items-center gap-1 text-slate-500">
              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-[11px]">Stay Duration</span>
            </div>
            <p className="mt-1 font-bold text-sky-700 text-xs">
              {isDischarged
                ? `${Math.max(1, admission.days_admitted)} ${Math.max(1, admission.days_admitted) === 1 ? "day" : "days"} (Discharged)`
                : `Day ${admission.days_admitted + 1} (${admission.days_admitted} ${admission.days_admitted === 1 ? "day" : "days"})`
              }
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

      {/* Mount Update Status Modals */}
      {showPatientStatusModal && (
        <UpdatePatientStatusModal
          isOpen={showPatientStatusModal}
          onClose={() => setShowPatientStatusModal(false)}
          admission={admissionForModal}
          onSuccess={() => {
            setShowPatientStatusModal(false);
            onRefresh();
          }}
        />
      )}

      {showCareStatusModal && (
        <UpdateCareStatusModal
          isOpen={showCareStatusModal}
          onClose={() => setShowCareStatusModal(false)}
          admission={admissionForModal}
          isDoctor={isDoctor}
          onSuccess={() => {
            setShowCareStatusModal(false);
            onRefresh();
          }}
        />
      )}

      {showTransferModal && admission.bed_id && (
        <TransferBedFormModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          admissionId={admission.id}
          currentBedId={admission.bed_id}
          onSubmit={async (admId, transferData) => {
            try {
              const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
              await admissionsApi.transferBed(admId, transferData, tenantId || undefined);
              toast.success("Bed transferred successfully!");
              setShowTransferModal(false);
              onRefresh();
            } catch (error: any) {
              const errorMessage = getErrorMessage(error);
              toast.error(errorMessage || "Failed to transfer bed");
              throw error;
            }
          }}
        />
      )}

      {showBillingDrawer && (
        <IpdBillingDrawer
          isOpen={showBillingDrawer}
          onClose={() => setShowBillingDrawer(false)}
          admissionId={admission.id}
          onAdmissionUpdated={onRefresh}
        />
      )}
    </>
  );
}
