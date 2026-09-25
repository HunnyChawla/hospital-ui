"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PatientTable } from "@/components/patients/PatientTable";
import { PatientFormModal } from "@/components/patients/PatientFormModal";
import { PatientDetailView } from "@/components/patients/PatientDetailView";
import { AbhaEnrollmentModal } from "@/components/abha";
import { useAbhaFlags } from "@/hooks/useFeatureFlags";
import { Patient } from "@/types";
import { Activity, ShieldCheck } from "lucide-react";

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
  const { enabled: abhaEnabled } = useAbhaFlags();
  const [showModal, setShowModal] = useState(false);
  const [isAbhaEnrollModalOpen, setIsAbhaEnrollModalOpen] = useState(false);
  const [abhaEnrollData, setAbhaEnrollData] = useState<{
    profile: any;
    sessionKey: string;
    aadhaarNumber?: string;
  } | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Handle query parameters for opening modals
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "add") {
      setEditingPatient(null);
      setAbhaEnrollData(null);
      setShowModal(true);
    } else if (action === "add-abha") {
      setEditingPatient(null);
      setAbhaEnrollData(null);
      setIsAbhaEnrollModalOpen(true);
    }
  }, [searchParams]);

  const handleAddPatient = () => {
    setEditingPatient(null);
    setAbhaEnrollData(null);
    setShowModal(true);
  };

  const handleAddPatientUsingAbha = () => {
    setEditingPatient(null);
    setAbhaEnrollData(null);
    setIsAbhaEnrollModalOpen(true);
  };

  const handleAbhaEnrollSuccess = (profile: any, sessionKey: string, aadhaarNumber?: string) => {
    setAbhaEnrollData({ profile, sessionKey, aadhaarNumber });
    setIsAbhaEnrollModalOpen(false);
    setEditingPatient(null);
    setShowModal(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setAbhaEnrollData(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPatient(null);
    setAbhaEnrollData(null);
  };

  const handlePatientClick = (patientId: string) => {
    setSelectedPatientId(patientId);
  };

  const handleCloseDetailView = () => {
    setSelectedPatientId(null);
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {abhaEnabled && (
              <button
                type="button"
                onClick={handleAddPatientUsingAbha}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-100 hover:border-sky-300 sm:w-auto cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4 text-sky-600" />
                Add Patient using ABHA
              </button>
            )}
            <button
              type="button"
              onClick={handleAddPatient}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md sm:w-auto cursor-pointer"
            >
              <Activity className="h-4 w-4" />
              Add Patient
            </button>
          </div>
        </div>

        <div className="mt-4">
          <PatientTable
            onPatientClick={handlePatientClick}
            onEditClick={handleEditPatient}
          />
        </div>
      </div>

      <PatientFormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        defaultValues={editingPatient ?? undefined}
        initialAbhaData={abhaEnrollData}
      />

      <AbhaEnrollmentModal
        isOpen={isAbhaEnrollModalOpen}
        onClose={() => setIsAbhaEnrollModalOpen(false)}
        onSuccess={handleAbhaEnrollSuccess}
      />

      {selectedPatientId && (
        <PatientDetailView
          patientId={selectedPatientId}
          onClose={handleCloseDetailView}
        />
      )}
    </div>
  );
}
