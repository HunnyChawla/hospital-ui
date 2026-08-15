"use client";

import { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/common/Modal";
import { Appointment } from "@/services/appointmentsApi";
import { CreateVisitRequest } from "@/services/opdVisitsApi";
import { useCreateOpdVisit } from "@/hooks/queries/useOpdVisits";
import { doctorsApi, ConsultationFeeCalculation } from "@/services/doctorsApi";
import { toast } from "sonner";
import { currency } from "@/utils/format";
import { Stethoscope, User, IndianRupee, CreditCard, Banknote, Smartphone, FileText, CheckCircle, Plus } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  doctor?: any | null;
  onCreated?: (visitId: string) => void;
}

export function CreateOpdFromAppointmentModal({ isOpen, onClose, appointment, doctor, onCreated }: Props) {
  const createOpdVisit = useCreateOpdVisit();
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "cheque">("cash");
  const [paymentReference, setPaymentReference] = useState("");
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

    const parsedOverride = feeOverride !== "" && feeOverride !== null && !isNaN(Number(feeOverride)) && Number(feeOverride) >= 0
      ? Number(feeOverride)
      : null;

    const feeAmount = parsedOverride !== null
      ? parsedOverride
      : (consultationFee ? parseFloat(consultationFee) : 0);

    if (feeAmount > 0 && (paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && !paymentReference.trim()) {
      toast.error(`Please enter payment reference for ${paymentMethod.toUpperCase()}`);
      return;
    }

    try {
      const visitRequest: CreateVisitRequest = {
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        visit_type: "appointment",
        appointment_id: appointment.id,
        chief_complaint: appointment.notes || null,
        notes: `Created from appointment #${appointment.token_number}`,
        payment_method: (feeAmount === 0 && !paymentMethod) ? "cash" : (paymentMethod as any),
        payment_reference: paymentReference.trim() || null,
        consultation_fee: consultationFee ? parseFloat(consultationFee) : null,
        consultation_fee_override: parsedOverride,
      };

      // Use React Query mutation - automatic cache invalidation!
      const visit = await createOpdVisit.mutateAsync(visitRequest);
      // Toast is shown by the mutation's onSuccess callback
      if (onCreated) onCreated(visit.id);
      onClose();
    } catch (error: any) {
      // Error handles in mutation
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create OPD from Appointment" size="md">
      {!appointment ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-500">
          <Stethoscope className="h-12 w-12 text-slate-200 mb-3" />
          <p className="text-sm">No appointment selected</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Patient Info */}
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700 shadow-sm">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 leading-tight">
                  {appointment.patient_name || appointment.patient_id}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-sky-700">
                  <span className="font-medium">Appointment Token #{appointment.token_number}</span>
                  <span>•</span>
                  <span>{appointment.appointment_date}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Doctor Select (Read-only view matching form style) */}
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Stethoscope className="h-4 w-4 text-teal-600" />
                Doctor
              </span>
              <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {doctor ? (doctor.name || `Dr. ${doctor.specialization}`) : "—"}
              </div>
            </div>

            {/* Consultation Fee Section */}
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <IndianRupee className="h-4 w-4 text-teal-600" />
                Consultation Fee
              </span>
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {isCalculatingFee ? (
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"></div>
                        <span className="text-xs text-slate-500">Calculating...</span>
                      </div>
                    ) : consultationFee ? (
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-slate-900 leading-none">{currency(parseFloat(consultationFee))}</span>
                        {feeCalculation && (
                          <span className="mt-1 text-[10px] text-slate-500 truncate">
                            {feeCalculation.patient_category_used || "General"} • {feeCalculation.patient_type_used} • {feeCalculation.shift}
                            {feeCalculation.is_revisit && <span className="ml-1 font-bold text-emerald-600">Revisit</span>}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Not calculated</span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={feeOverride}
                    onChange={(e) => setFeeOverride(e.target.value)}
                    placeholder="Override"
                    className="w-20 rounded border border-slate-200 bg-white px-1.5 py-1 text-xs outline-none focus:border-sky-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {feeOverride !== "" && !isNaN(Number(feeOverride)) && Number(feeOverride) >= 0 && (
            <div className="flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
              <span className="text-xs font-semibold text-teal-800">
                Applied Override: {currency(Number(feeOverride))}
              </span>
              <button onClick={() => setFeeOverride("")} className="text-teal-600 hover:text-teal-800 text-lg leading-none">×</button>
            </div>
          )}

          {/* Payment Section */}
          {(() => {
            const feeAmount = feeOverride && parseFloat(feeOverride) >= 0
              ? parseFloat(feeOverride)
              : (consultationFee ? parseFloat(consultationFee) : 0);

            if (feeAmount === 0) return null;

            return (
              <div className="space-y-2 pt-2">
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  Payment Method <span className="text-rose-500">*</span>
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: "cash", label: "Cash", icon: Banknote, color: "emerald" },
                    { id: "upi", label: "UPI", icon: Smartphone, color: "violet" },
                    { id: "card", label: "Card", icon: CreditCard, color: "blue" },
                    { id: "cheque", label: "Cheque", icon: FileText, color: "amber" }
                  ].map((method) => (
                    <label
                      key={method.id}
                      className={`
                        flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition-all
                        ${paymentMethod === method.id
                          ? `border-${method.color}-500 bg-${method.color}-50 ring-2 ring-${method.color}-100`
                          : "border-slate-200 bg-white hover:bg-slate-50"
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={paymentMethod === method.id}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="sr-only"
                      />
                      <method.icon className={`h-5 w-5 ${paymentMethod === method.id ? `text-${method.color}-600` : "text-slate-400"}`} />
                      <span className={`text-[11px] font-semibold ${paymentMethod === method.id ? `text-${method.color}-700` : "text-slate-600"}`}>
                        {method.label}
                      </span>
                    </label>
                  ))}
                </div>

                {(paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 placeholder:text-slate-300"
                      placeholder={
                        paymentMethod === "upi" ? "Enter UPI transaction ID" : paymentMethod === "card" ? "Enter card transaction ID" : "Enter cheque number"
                      }
                      required
                    />
                  </div>
                )}
              </div>
            );
          })()}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={createOpdVisit.isPending}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              {createOpdVisit.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Creating Visit...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Confirm & Create OPD</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
