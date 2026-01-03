import { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchTodayOptometrySchedule,
  selectPatient,
  setActiveTab,
  resetOptometristPanel,
} from "@/redux/optometristPanelSlice";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { getTodayDateLocal } from "@/utils/format";

type ActiveTab =
  | "complaints"
  | "medical_history"
  | "ophthalmic_history"
  | "allergies"
  | "ar_data"
  | "refraction"
  | "iop"
  | "previous_history"
  | "diagnosis";

export const useOptometristPanel = () => {
  const dispatch = useAppDispatch();

  // Get current optometrist from localStorage and Redux
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const doctors = useAppSelector((state) => state.doctors.list);

  // Find optometrist (doctor with specialization="Optometry" or role-based)
  const currentOptometrist = doctors.find((d) => d.user_id === userId);

  // Optometrist panel state
  const {
    selectedPatientId,
    activeTab,
    todaySchedule,
    todayStats,
    loading,
    error,
  } = useAppSelector((state) => state.optometristPanel);

  // Fetch doctors on mount if not already loaded
  useEffect(() => {
    if (doctors.length === 0) {
      dispatch(fetchDoctors());
    }
  }, [dispatch, doctors.length]);

  // Fetch today's schedule when optometrist is identified
  useEffect(() => {
    if (currentOptometrist?.id) {
      const today = getTodayDateLocal();
      dispatch(
        fetchTodayOptometrySchedule({
          optometrist_id: currentOptometrist.id,
          start_date: today,
          end_date: today,
        })
      );
    }
  }, [currentOptometrist?.id, dispatch]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleSelectPatient = useCallback((patientId: string | null) => {
    dispatch(selectPatient(patientId));
  }, [dispatch]);

  const handleSetActiveTab = useCallback((tab: ActiveTab) => {
    dispatch(setActiveTab(tab));
  }, [dispatch]);

  const handleRefreshSchedule = useCallback(() => {
    if (currentOptometrist?.id) {
      const today = getTodayDateLocal();
      dispatch(
        fetchTodayOptometrySchedule({
          optometrist_id: currentOptometrist.id,
          start_date: today,
          end_date: today,
        })
      );
    }
  }, [currentOptometrist?.id, dispatch]);

  const handleReset = useCallback(() => {
    dispatch(resetOptometristPanel());
  }, [dispatch]);

  return {
    // Optometrist info
    currentOptometrist,
    userId,

    // Schedule and stats
    todaySchedule,
    todayStats,

    // Selected patient and tab
    selectedPatientId,
    activeTab,

    // Loading and error states
    loading,
    error,

    // Actions
    selectPatient: handleSelectPatient,
    setActiveTab: handleSetActiveTab,
    refreshSchedule: handleRefreshSchedule,
    reset: handleReset,
  };
};
