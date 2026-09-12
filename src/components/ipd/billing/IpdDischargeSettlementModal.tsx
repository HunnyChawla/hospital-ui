"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import {
  serviceChargesApi,
  IpdBillingAccountResponse,
} from "@/services/serviceChargesApi";
import { admissionsApi, InitiateDischargeRequest, Admission, DischargeType } from "@/services/admissionsApi";
import { formatCurrency, formatDate } from "@/utils/format";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Receipt,
  Bed,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Printer,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { getTenantIdForApi } from "@/utils/auth";

interface IpdDischargeSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  admissionId: string;
  onSuccess: (admission: Admission) => void;
}

export function IpdDischargeSettlementModal({
  isOpen,
  onClose,
  admissionId,
  onSuccess,
}: IpdDischargeSettlementModalProps) {
  const [account, setAccount] = useState<IpdBillingAccountResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // 1: Checklist & Room Accrual, 2: Final Invoice & Settlement
  const [submitting, setSubmitting] = useState(false);

  // Billing & Settlement Form state
  const [dischargeDate, setDischargeDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [dischargeType, setDischargeType] = useState<DischargeType>("normal");
  const [invoiceDiscount, setInvoiceDiscount] = useState<number | string>(0);
  const [gstNumber, setGstNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Room charge verification
  const [roomChargesCalculated, setRoomChargesCalculated] = useState(false);
  const [roomCalcLoading, setRoomCalcLoading] = useState(false);

  const fetchBillingAccount = async () => {
    setLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const data = await serviceChargesApi.getBillingAccount(admissionId, tenantId || undefined);
      setAccount(data);
      if (data.charges.some((c) => c.charge_type === "ROOM" && c.status === "ACTIVE")) {
        setRoomChargesCalculated(true);
      }
    } catch (error) {
      console.error("Failed to load billing account:", error);
      toast.error("Failed to load IPD billing account");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && admissionId) {
      setStep(1);
      setDischargeDate(new Date().toISOString().split("T")[0]);
      setDischargeType("normal");
      setInvoiceDiscount(0);
      setGstNumber("");
      setNotes("");
      fetchBillingAccount();
    }
  }, [isOpen, admissionId]);

  const handleApplyRoomCharges = async () => {
    setRoomCalcLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      await serviceChargesApi.calculateRoomCharges(
        admissionId,
        {
          through_date: dischargeDate,
          apply_to_account: true,
        },
        tenantId || undefined
      );
      toast.success("Bed occupancy room charges applied to ledger!");
      setRoomChargesCalculated(true);
      await fetchBillingAccount();
    } catch (error) {
      const err = getErrorMessage(error);
      toast.error(err || "Failed to calculate room charges");
    } finally {
      setRoomCalcLoading(false);
    }
  };

  const handleInitiateAndSettle = async () => {
    setSubmitting(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const payload: InitiateDischargeRequest = {
        discharge_date: dischargeDate,
        discharge_type: dischargeType,
        discount: Number(invoiceDiscount) || 0,
        gst_number: gstNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const admission = await admissionsApi.initiateDischarge(
        admissionId,
        payload,
        tenantId || undefined
      );

      toast.success("Discharge billing initiated and final tax invoice generated!");
      onSuccess(admission);
      onClose();
    } catch (error) {
      const err = getErrorMessage(error);
      toast.error(err || "Failed to initiate discharge");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !account) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Pre-Discharge Billing Review" size="lg">
        <div className="py-12 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600 mb-2" />
          <p className="text-xs font-semibold">Loading billing ledger and stay details...</p>
        </div>
      </Modal>
    );
  }

  const { summary } = account;
  const parsedExtraDisc = Number(invoiceDiscount) || 0;
  const finalNetBill = Math.max(0, summary.net_charges - parsedExtraDisc);
  const finalBalanceDue = finalNetBill - summary.total_paid;
  const isFinalRefund = finalBalanceDue < 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pre-Discharge Billing Review & Final Settlement" size="xl">
      <div className="space-y-4 -mx-6 -mb-6 px-6 pb-6 text-xs">
        {/* Step Indicator */}
        <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-200">
          <div
            className={`p-2.5 rounded-lg border text-center transition-all ${
              step === 1
                ? "bg-sky-50 border-sky-500 text-sky-900 font-bold shadow-2xs"
                : "bg-slate-50 border-slate-200 text-slate-500"
            }`}
          >
            1. Pre-Discharge Billing Clearance & Room Charges
          </div>
          <div
            className={`p-2.5 rounded-lg border text-center transition-all ${
              step === 2
                ? "bg-sky-50 border-sky-500 text-sky-900 font-bold shadow-2xs"
                : "bg-slate-50 border-slate-200 text-slate-500"
            }`}
          >
            2. Final Invoice & Financial Settlement
          </div>
        </div>

        {/* STEP 1: Checklist & Room Accrual */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Patient & Stay Header */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold text-sm text-slate-900">{account.patient_name}</p>
                <p className="text-slate-500">
                  IPD: <span className="font-mono font-semibold">{account.admission_number}</span> • Ward:{" "}
                  {account.ward_name} (Bed {account.bed_number})
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-500">Admitted On:</p>
                <p className="font-semibold text-slate-900">{formatDate(account.admission_date)}</p>
              </div>
            </div>

            {/* Discharge Date & Discharge Type Configuration */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-slate-200 rounded-lg">
              <div>
                <label className="font-semibold text-slate-700 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-sky-600" /> Discharge Date *
                </label>
                <input
                  type="date"
                  required
                  value={dischargeDate}
                  onChange={(e) => {
                    setDischargeDate(e.target.value);
                    setRoomChargesCalculated(false);
                  }}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Discharge Classification *</label>
                <select
                  value={dischargeType}
                  onChange={(e) => setDischargeType(e.target.value as DischargeType)}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:ring-1 focus:ring-sky-500"
                >
                  <option value="normal">Normal Medical Discharge</option>
                  <option value="ama">Against Medical Advice (AMA / LAMA)</option>
                  <option value="transfer">Transfer to Higher Facility</option>
                  <option value="deceased">Deceased / Expired</option>
                </select>
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                Pre-Discharge Billing Clearance Checklist
              </h3>

              {/* Room Charges Check */}
              <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      roomChargesCalculated
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    <Bed className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Bed Occupancy & Room Charges</p>
                    <p className="text-slate-500 text-[11px]">
                      {roomChargesCalculated
                        ? "Room charges accrued and verified for the stay."
                        : `Calculate bed days through discharge date (${dischargeDate}).`}
                    </p>
                  </div>
                </div>

                {!roomChargesCalculated ? (
                  <button
                    type="button"
                    onClick={handleApplyRoomCharges}
                    disabled={roomCalcLoading}
                    className="px-3 py-1.5 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 flex items-center gap-1 shadow-sm"
                  >
                    {roomCalcLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Apply Room Charges"
                    )}
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-700 font-bold text-xs">
                    <CheckCircle2 className="h-4 w-4" /> Accrued
                  </span>
                )}
              </div>

              {/* Clinical Orders Check */}
              <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Active Billable Charges</p>
                    <p className="text-slate-500 text-[11px]">
                      {account.charges.length} billable events recorded across {account.categories.length} departments.
                    </p>
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(Number(summary.gross_charges))}
                </span>
              </div>

              {/* TPA / Insurance Check */}
              {account.tpa && (
                <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">TPA / Insurance Coverage</p>
                      <p className="text-slate-500 text-[11px]">
                        {account.tpa.tpa_provider} • Pre-Auth: {account.tpa.tpa_pre_auth_status}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-blue-700">
                    {formatCurrency(Number(account.tpa.tpa_approved_amount || 0))}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 flex items-center gap-1.5 shadow-sm"
              >
                Proceed to Financial Settlement <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Financial Settlement & Invoice Generation */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Final Bill Breakdown Card */}
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-slate-700">
                <span>Gross Inpatient Charges:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(Number(summary.gross_charges))}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Line-Item Discounts:</span>
                <span className="font-mono font-medium text-amber-700">
                  - {formatCurrency(Number(summary.total_discounts))}
                </span>
              </div>

              {/* Extra Invoice Discount Input */}
              <div className="flex justify-between items-center pt-1">
                <span className="font-semibold text-slate-700">Additional Settlement Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={invoiceDiscount}
                  onChange={(e) => setInvoiceDiscount(e.target.value)}
                  className="w-28 px-2 py-1 border border-slate-300 rounded text-right font-mono font-bold text-slate-900"
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-300 font-bold text-sm">
                <span>Net Final Bill Amount:</span>
                <span className="font-mono text-slate-900">{formatCurrency(finalNetBill)}</span>
              </div>

              <div className="flex justify-between items-center text-emerald-700 font-semibold">
                <span>Total Advance Deposits Credited:</span>
                <span className="font-mono">- {formatCurrency(Number(summary.total_paid))}</span>
              </div>

              {/* Final Settlement Result */}
              <div
                className={`p-3 rounded-lg flex justify-between items-center text-sm font-extrabold border ${
                  isFinalRefund
                    ? "bg-amber-50 border-amber-300 text-amber-900"
                    : "bg-rose-50 border-rose-300 text-rose-900"
                }`}
              >
                <span>{isFinalRefund ? "Excess Advance to Refund:" : "Final Balance Payable:"}</span>
                <span className="font-mono text-base">{formatCurrency(Math.abs(finalBalanceDue))}</span>
              </div>
            </div>

            {/* GST Number / Notes (Optional) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700">Patient GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono uppercase"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Invoice Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Final settled inpatient bill"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Back to Checklist
              </button>
              <button
                type="button"
                onClick={handleInitiateAndSettle}
                disabled={submitting}
                className="px-6 py-2 bg-emerald-600 text-white font-extrabold rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 shadow-md text-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating Final Tax Invoice...
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4" /> Finalize Bill & Initiate Discharge
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
