"use client";

import React from "react";
import { PatientHistoryTimeline } from "@/components/doctors/patient-details/PatientHistoryTimeline";
import { usePatientDetails } from "@/hooks/usePatientDetails";

interface ClinicPreviousHistoryTabProps {
  patientId: string;
}

/** Prior visits, prescriptions, labs and admissions for the patient. */
export function ClinicPreviousHistoryTab({ patientId }: ClinicPreviousHistoryTabProps) {
  const { patientHistory, historyLoading, refreshHistory } = usePatientDetails({
    patientId,
    autoFetch: true,
  });

  return (
    <div className="h-full overflow-y-auto p-4">
      <PatientHistoryTimeline
        history={patientHistory}
        loading={historyLoading}
        onRefresh={refreshHistory}
      />
    </div>
  );
}
