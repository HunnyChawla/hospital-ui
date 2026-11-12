"use client";

import { Modal } from "@/components/common/Modal";
import { ConsultationFeeForm } from "./ConsultationFeeForm";
import { Doctor } from "@/services/doctorsApi";
import { Stethoscope } from "lucide-react";

interface ConsultationFeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  doctor?: Doctor;
}

export function ConsultationFeeFormModal({
  isOpen,
  onClose,
  doctorId,
  doctor,
}: ConsultationFeeFormModalProps) {
  const doctorName =
    doctor?.name ||
    doctor?.user?.name ||
    (doctor?.specialization ? `Dr. ${doctor.specialization}` : "Doctor");

  const modalTitle = (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-teal-500 text-white shadow-sm">
        <Stethoscope className="h-5 w-5" />
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold text-slate-900 md:text-lg">
            Configure Consultation Fees
          </h2>
          {doctor && (
            <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 border border-sky-100">
              {doctorName}
            </span>
          )}
        </div>
        {doctor && (
          <p className="text-xs text-slate-500">
            {[
              doctor.specialization,
              doctor.qualification,
              doctor.registration_number ? `Reg: ${doctor.registration_number}` : null,
            ]
              .filter(Boolean)
              .join(" • ")}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="2xl"
    >
      <ConsultationFeeForm
        doctorId={doctorId}
        doctor={doctor}
        onSuccess={() => {
          onClose();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
}
