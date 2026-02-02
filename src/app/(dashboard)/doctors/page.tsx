"use client";

import { useState } from "react";
import { DoctorTable } from "@/components/doctors/DoctorTable";
import { DoctorFormModal } from "@/components/doctors/DoctorFormModal";
import { ConsultationFeeFormModal } from "@/components/doctors/ConsultationFeeFormModal";
import { Doctor } from "@/services/doctorsApi";

export default function DoctorsPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | undefined>(undefined);
  const [showFeesModal, setShowFeesModal] = useState(false);
  const [selectedDoctorForFees, setSelectedDoctorForFees] = useState<string | null>(null);

  const handleAddDoctor = () => {
    setSelectedDoctor(undefined);
    setShowModal(true);
  };

  const handleEditDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDoctor(undefined);
  };

  const handleConfigureFees = (doctor: Doctor) => {
    setSelectedDoctorForFees(doctor.id);
    setShowFeesModal(true);
  };

  const handleCloseFeesModal = () => {
    setShowFeesModal(false);
    setSelectedDoctorForFees(null);
  };

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-slate-900">Doctors</p>
          <button
            onClick={handleAddDoctor}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
          >
            Add Doctor
          </button>
        </div>
        <DoctorTable
          onEditClick={handleEditDoctor}
          onConfigureFeesClick={handleConfigureFees}
        />
      </div>

      <DoctorFormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        defaultValues={selectedDoctor}
      />

      {selectedDoctorForFees && (
        <ConsultationFeeFormModal
          isOpen={showFeesModal}
          onClose={handleCloseFeesModal}
          doctorId={selectedDoctorForFees}
        />
      )}
    </div>
  );
}
