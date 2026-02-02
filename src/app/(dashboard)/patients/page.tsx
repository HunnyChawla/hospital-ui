"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Handle query parameters for opening modals
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "add") {
      setEditingPatient(null);
      setShowModal(true);
    }
  }, [searchParams]);

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
    <div className="grid gap-3">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Patients</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage patient records and information
            </p>
          </div>
          <button
            onClick={handleAddPatient}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md sm:w-auto"
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
