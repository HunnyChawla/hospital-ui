"use client";

import React, { useCallback, useEffect, useState } from "react";
import { LabResultsPanel } from "@/components/doctors/patient-details/LabResultsPanel";
import { labBookingsApi } from "@/services/labBookingsApi";

interface ClinicLabResultsTabProps {
  patientId: string;
}

/** Lab bookings and results for the patient (doctor's view). */
export function ClinicLabResultsTab({ patientId }: ClinicLabResultsTabProps) {
  const [labBookings, setLabBookings] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBookings = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const response = await labBookingsApi.list({ patient_id: patientId });
      setLabBookings(
        Array.isArray(response) ? response : ((response as { items?: unknown[] })?.items ?? [])
      );
    } catch {
      setLabBookings([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  return (
    <div className="h-full overflow-y-auto p-4">
      <LabResultsPanel
        patientId={patientId}
        labBookings={labBookings as never[]}
        loading={loading}
        onRefresh={loadBookings}
        onGetResults={(bookingId: string) => labBookingsApi.getResults(bookingId)}
      />
    </div>
  );
}
