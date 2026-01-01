import { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchVitalSignsForPatient,
  fetchVitalSignsTrends,
} from "@/redux/vitalSignsSlice";
import {
  fetchNotesForPatient,
} from "@/redux/clinicalNotesSlice";
import {
  fetchPatientHistory,
} from "@/redux/doctorPanelSlice";

interface UsePatientDetailsOptions {
  patientId: string | null;
  autoFetch?: boolean;
}

export const usePatientDetails = ({
  patientId,
  autoFetch = true,
}: UsePatientDetailsOptions) => {
  const dispatch = useAppDispatch();

  // Get current doctor ID
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const doctors = useAppSelector((state) => state.doctors.list);
  const currentDoctor = doctors.find((d) => d.user_id === userId);

  // Get patient details from Redux
  const patientHistory = useAppSelector((state) => state.doctorPanel.patientHistory);
  const vitalSigns = useAppSelector((state) => state.vitalSigns.currentPatientVitals);
  const vitalsTrends = useAppSelector((state) => state.vitalSigns.trends);
  const clinicalNotes = useAppSelector((state) => state.clinicalNotes.notes);

  // Loading states
  const historyLoading = useAppSelector((state) => state.doctorPanel.loading);
  const vitalsLoading = useAppSelector((state) => state.vitalSigns.loading);
  const notesLoading = useAppSelector((state) => state.clinicalNotes.loading);

  // Fetch patient data when patientId changes
  useEffect(() => {
    if (patientId && autoFetch) {
      // Fetch patient history
      dispatch(
        fetchPatientHistory({
          patient_id: patientId,
          type: "all",
          page: 1,
          page_size: 50,
        })
      );

      // Fetch vital signs
      dispatch(
        fetchVitalSignsForPatient({
          patient_id: patientId,
          page: 1,
          page_size: 10,
        })
      );

      // Fetch vital signs trends (last 30 days)
      dispatch(
        fetchVitalSignsTrends({
          patient_id: patientId,
          days: 30,
        })
      );

      // Fetch clinical notes
      if (currentDoctor?.id) {
        dispatch(
          fetchNotesForPatient({
            patient_id: patientId,
            doctor_id: currentDoctor.id,
            page: 1,
            page_size: 20,
          })
        );
      }
    }
  }, [patientId, autoFetch, dispatch, currentDoctor?.id]);

  // Memoized refresh functions to prevent unnecessary re-renders
  const refreshHistory = useCallback(() => {
    if (patientId) {
      dispatch(
        fetchPatientHistory({
          patient_id: patientId,
          type: "all",
          page: 1,
          page_size: 50,
        })
      );
    }
  }, [patientId, dispatch]);

  const refreshVitals = useCallback(() => {
    if (patientId) {
      dispatch(
        fetchVitalSignsForPatient({
          patient_id: patientId,
          page: 1,
          page_size: 10,
        })
      );
      dispatch(
        fetchVitalSignsTrends({
          patient_id: patientId,
          days: 30,
        })
      );
    }
  }, [patientId, dispatch]);

  const refreshNotes = useCallback(() => {
    if (patientId && currentDoctor?.id) {
      dispatch(
        fetchNotesForPatient({
          patient_id: patientId,
          doctor_id: currentDoctor.id,
          page: 1,
          page_size: 20,
        })
      );
    }
  }, [patientId, currentDoctor?.id, dispatch]);

  const refreshAll = useCallback(() => {
    refreshHistory();
    refreshVitals();
    refreshNotes();
  }, [refreshHistory, refreshVitals, refreshNotes]);

  return {
    // Data
    patientHistory,
    vitalSigns,
    vitalsTrends,
    clinicalNotes,

    // Loading states
    historyLoading,
    vitalsLoading,
    notesLoading,
    isLoading: historyLoading || vitalsLoading || notesLoading,

    // Refresh functions
    refreshHistory,
    refreshVitals,
    refreshNotes,
    refreshAll,
  };
};
