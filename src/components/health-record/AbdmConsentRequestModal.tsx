"use client";

import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { hiuConsentService } from "@/services/hiuConsentService";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import {
  Calendar,
  FileCheck,
  ShieldAlert,
  Stethoscope,
  Sparkles,
  Lock,
  Clock,
  CheckSquare,
  Square,
} from "lucide-react";

interface AbdmConsentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName: string;
  patientAbha: string;
  onSuccess?: () => void;
}

const AVAILABLE_HI_TYPES = [
  { id: "Prescription", label: "Prescriptions", desc: "Medications, dosages & instructions" },
  { id: "DiagnosticReport", label: "Diagnostic / Lab Reports", desc: "Blood tests, pathology, radiology findings" },
  { id: "OPConsultation", label: "OPD Consultation Notes", desc: "Clinical summaries, examination notes & vitals" },
  { id: "DischargeSummary", label: "Discharge Summaries", desc: "Hospitalization admission & discharge records" },
  { id: "ImmunizationRecord", label: "Immunizations", desc: "Vaccines and inoculation history" },
  { id: "HealthDocumentRecord", label: "Health Documents", desc: "Uploaded clinical PDFs & scanned certificates" },
  { id: "WellnessRecord", label: "Wellness Records", desc: "Vital trends, physical metrics & fitness logs" },
  { id: "Invoice", label: "Medical Invoices / Billing", desc: "Hospital charges, receipts & itemized bills" },
];

export function AbdmConsentRequestModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  patientAbha,
  onSuccess,
}: AbdmConsentRequestModalProps) {
  const [submitting, setSubmitting] = useState(false);

  // Default dates: Past 2 years to today, valid for 30 days
  const today = new Date();
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(today.getFullYear() - 2);

  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(today.getDate() + 30);

  const formatDateInput = (d: Date) => d.toISOString().split("T")[0];

  const [dateFrom, setDateFrom] = useState(formatDateInput(twoYearsAgo));
  const [dateTo, setDateTo] = useState(formatDateInput(today));
  const [expiryDate, setExpiryDate] = useState(formatDateInput(thirtyDaysLater));
  const [purposeCode, setPurposeCode] = useState("CAREMGT");
  const [selectedHiTypes, setSelectedHiTypes] = useState<string[]>([
    "Prescription",
    "DiagnosticReport",
    "OPConsultation",
    "DischargeSummary",
  ]);
  const [doctorName, setDoctorName] = useState("");
  const [doctorRegNo, setDoctorRegNo] = useState("");

  const toggleHiType = (typeId: string) => {
    setSelectedHiTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
  };

  const selectAllHiTypes = () => {
    setSelectedHiTypes(AVAILABLE_HI_TYPES.map((t) => t.id));
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientAbha) {
      toast.error("Patient must have a valid ABHA address to initiate consent");
      return;
    }
    if (selectedHiTypes.length === 0) {
      toast.error("Please select at least one health information type");
      return;
    }

    setSubmitting(true);
    try {
      const fromIso = new Date(`${dateFrom}T00:00:00.000Z`).toISOString();
      const selectedTo = new Date(`${dateTo}T23:59:59.000Z`);
      const now = new Date();
      const toIso = selectedTo > now ? now.toISOString() : selectedTo.toISOString();
      const expiryIso = new Date(`${expiryDate}T23:59:59.000Z`).toISOString();

      await hiuConsentService.createConsentRequest({
        patient_id: patientId || null,
        patient_abha: patientAbha,
        purpose_code: purposeCode,
        hi_types: selectedHiTypes,
        date_range_from: fromIso,
        date_range_to: toIso,
        expiry_at: expiryIso,
        requester_name: doctorName.trim() || undefined,
        requester_reg_no: doctorRegNo.trim() || undefined,
      });

      toast.success("Consent request dispatched to patient's ABHA app!");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to dispatch consent request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request External Health Records (ABDM)" size="lg">
      <form onSubmit={handleCreateRequest} className="space-y-6">
        {/* Patient & ABHA Banner */}
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-teal-50/50 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">
                Patient ABHA Target
              </p>
              <h4 className="text-base font-bold text-slate-900">{patientName}</h4>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700 shadow-sm">
              <Lock className="h-3.5 w-3.5 text-teal-600" />
              <span>{patientAbha}</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            A secure consent prompt will be sent directly to the patient&apos;s ABHA Mobile App (e.g. ABHA App, Aarogya Setu, Paytm, Eka Care).
          </p>
        </div>

        {/* Health Information Types */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Record Types to Request
            </label>
            <button
              type="button"
              onClick={selectAllHiTypes}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              Select All
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {AVAILABLE_HI_TYPES.map((t) => {
              const isChecked = selectedHiTypes.includes(t.id);
              return (
                <div
                  key={t.id}
                  onClick={() => toggleHiType(t.id)}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                    isChecked
                      ? "border-sky-300 bg-sky-50/70 shadow-sm"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/50"
                  }`}
                >
                  <div className="mt-0.5 text-sky-600">
                    {isChecked ? (
                      <CheckSquare className="h-4 w-4 text-sky-600" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${isChecked ? "text-sky-900" : "text-slate-700"}`}>
                      {t.label}
                    </p>
                    <p className="text-[11px] text-slate-500">{t.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Date Ranges */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Records From</label>
            <div className="relative">
              <input
                type="date"
                required
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Records To</label>
            <div className="relative">
              <input
                type="date"
                required
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Consent Erase Date</label>
            <div className="relative">
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Purpose & Doctor Info */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Consent Purpose</label>
            <select
              value={purposeCode}
              onChange={(e) => setPurposeCode(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
            >
              <option value="CAREMGT">Care Management (Clinical Consultation & Treatment)</option>
              <option value="PUBHLTH">Public Health Investigation</option>
              <option value="HPID">Healthcare Program Identification</option>
              <option value="DISASTER">Disaster Response</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Doctor Name <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Dr. Kamal Bhatia"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2 text-xs font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
          >
            {submitting ? (
              <span>Dispatching...</span>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Send Consent Request</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
