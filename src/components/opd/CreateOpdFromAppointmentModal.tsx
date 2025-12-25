"use client";

import { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/common/Modal";
import { Appointment } from "@/services/appointmentsApi";
import { opdVisitsApi, CreateVisitRequest } from "@/services/opdVisitsApi";
import { doctorsApi, ConsultationFeeCalculation } from "@/services/doctorsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { currency } from "@/utils/format";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  doctor?: any | null;
  onCreated?: (visitId: string) => void;
}

export function CreateOpdFromAppointmentModal({ isOpen, onClose, appointment, doctor, onCreated }: Props) {
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "cheque">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [consultationFee, setConsultationFee] = useState<string | null>(null);
  const [feeCalculation, setFeeCalculation] = useState<ConsultationFeeCalculation | null>(null);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [feeOverride, setFeeOverride] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Calculate consultation fee when appointment or doctor changes
  useEffect(() => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const calculateFee = async () => {
      if (!appointment || !doctor) {
        setConsultationFee(null);
        setFeeCalculation(null);
        setIsCalculatingFee(false);
        return;
      }

      // Create new AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsCalculatingFee(true);
      try {
        // Always pass false for isEmergency since emergency is not applicable for appointment OPD
        const calculation = await doctorsApi.calculateConsultationFee(
          appointment.doctor_id,
          appointment.patient_id,
          false,
          undefined,
          abortController.signal
        );
        
        // Only update state if request wasn't aborted and this is still the current request
        if (!abortController.signal.aborted && abortControllerRef.current === abortController) {
          setFeeCalculation(calculation);
          setConsultationFee(calculation.consultation_fee);
          setIsCalculatingFee(false);
        }
      } catch (error: any) {
        // Ignore aborted requests
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
          return;
        }
        console.error("Failed to calculate consultation fee:", error);
        
        // Only update state if request wasn't aborted and this is still the current request
        if (!abortController.signal.aborted && abortControllerRef.current === abortController) {
          setConsultationFee(null);
          setFeeCalculation(null);
          setIsCalculatingFee(false);
        }
      }
    };

    // Debounce the calculation
    const timeoutId = setTimeout(calculateFee, 300);
    return () => {
      clearTimeout(timeoutId);
      // Abort request on cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsCalculatingFee(false);
      }
    };
  }, [appointment, doctor]);

  const handleConfirm = async () => {
    if (!appointment) return;

    if ((paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && !paymentReference.trim()) {
      toast.error("Please enter payment reference");
      return;
    }

    setIsCreating(true);
    try {
      const visitRequest: CreateVisitRequest = {
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        visit_type: "appointment",
        appointment_id: appointment.id,
        chief_complaint: appointment.notes || null,
        notes: `Created from appointment #${appointment.token_number}`,
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim() || null,
        consultation_fee: feeOverride && parseFloat(feeOverride) > 0 ? parseFloat(feeOverride) : (consultationFee ? parseFloat(consultationFee) : null),
        consultation_fee_override: feeOverride && parseFloat(feeOverride) > 0 ? parseFloat(feeOverride) : null,
      };

      const visit = await opdVisitsApi.create(visitRequest);
      toast.success(`OPD visit created #${visit.visit_number}`);
      if (onCreated) onCreated(visit.id);
      onClose();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create OPD from Appointment" size="md">
      {!appointment ? (
        <p className="text-sm text-slate-600">No appointment selected</p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="font-semibold">Patient</p>
            <p className="text-sm text-slate-600">{appointment.patient_name || appointment.patient_id}</p>
          </div>

          <div>
            <p className="font-semibold">Doctor</p>
            <p className="text-sm text-slate-600">{doctor ? (doctor.name || `Dr. ${doctor.specialization}`) : "—"}</p>
          </div>

          <div>
            <span className="text-slate-600 text-xs">Consultation Fee</span>
            <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              {isCalculatingFee ? (
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"></div>
                  <span className="text-xs text-slate-500">Calculating...</span>
                </div>
              ) : consultationFee ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">{currency(parseFloat(consultationFee))}</span>
                  {feeCalculation && (
                    <span className="text-xs text-slate-500">
                      {feeCalculation.patient_type_used} • {feeCalculation.shift}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-500">—</span>
              )}
            </div>
          </div>

          {doctor && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={feeOverride}
                onChange={(e) => setFeeOverride(e.target.value)}
                placeholder="Override (optional)"
                className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-sky-400"
              />
              {feeOverride && (
                <button
                  type="button"
                  onClick={() => setFeeOverride("")}
                  className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-50"
                  title="Clear override"
                >
                  ×
                </button>
              )}
            </div>
          )}
          {feeOverride && parseFloat(feeOverride) > 0 && (
            <div className="rounded bg-teal-50 border border-teal-200 px-2 py-1">
              <span className="text-xs font-semibold text-teal-700">
                Override: {currency(parseFloat(feeOverride))}
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-700">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {(paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && (
            <div>
              <label className="block text-sm text-slate-700">Payment Reference</label>
              <input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                placeholder={paymentMethod === "upi" ? "UPI transaction ID" : paymentMethod === "card" ? "Card transaction ID" : "Cheque number"}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isCreating}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create OPD"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
