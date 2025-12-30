"use client";

import { useState } from "react";
import { PatientTable } from "@/components/patients/PatientTable";
import { PatientFormModal } from "@/components/patients/PatientFormModal";
import { Patient } from "@/types";
import { Activity } from "lucide-react";

/**
 * Patients Page - New App Router Route
 * Replaces the legacy #patients hash-based section
 *
 * Features:
 * - Uses React Query for data fetching (no Redux!)
 * - Proper Next.js routing with direct URLs
 * - Zero duplicate API calls
 */
export default function PatientsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const handleAddPatient = () => {
    setEditingPatient(null);
    setShowModal(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPatient(null);
  };

  return (
    <div className="mt-6 grid gap-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Patients</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage patient records and information
            </p>
          </div>
          <button
            onClick={handleAddPatient}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
          >
            <Activity className="h-4 w-4" />
            Add Patient
          </button>
        </div>

        <div className="mt-4">
          <PatientTable
            onPatientClick={(id) => {
              // Will implement patient detail route later
              console.log('View patient:', id);
            }}
            onEditClick={handleEditPatient}
          />
        </div>
      </div>

      <PatientFormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        defaultValues={editingPatient ?? undefined}
      />
    </div>
  );
}
