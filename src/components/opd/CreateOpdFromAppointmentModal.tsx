"use client";

import { useState, useMemo } from "react";
import { Modal } from "@/components/common/Modal";
import { Appointment } from "@/services/appointmentsApi";
import { opdVisitsApi, CreateVisitRequest } from "@/services/opdVisitsApi";
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

  const consultationFee = useMemo(() => {
    if (!doctor) return null;
    return doctor.consultation_fee != null ? Number(doctor.consultation_fee) : null;
  }, [doctor]);

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
        consultation_fee: consultationFee,
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
            <p className="font-semibold">Consultation Fee</p>
            <p className="text-sm text-slate-600">{consultationFee != null ? currency(consultationFee) : "—"}</p>
          </div>

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
