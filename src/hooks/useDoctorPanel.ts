import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchTodaySchedule,
  selectPatient,
  setActiveTab,
  resetDoctorPanel,
} from "@/redux/doctorPanelSlice";
import { fetchDoctors } from "@/redux/doctorsSlice";

export const useDoctorPanel = () => {
  const dispatch = useAppDispatch();

  // Get current doctor from localStorage and Redux
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const doctors = useAppSelector((state) => state.doctors.list);
  const currentDoctor = doctors.find((d) => d.user_id === userId);

  // Doctor panel state
  const {
    selectedPatientId,
    activeTab,
    todaySchedule,
    todayStats,
    loading,
    error,
  } = useAppSelector((state) => state.doctorPanel);

  // Fetch doctors on mount if not already loaded
  useEffect(() => {
    if (doctors.length === 0) {
      dispatch(fetchDoctors());
    }
  }, [dispatch, doctors.length]);

  // Fetch today's schedule when doctor is identified
  useEffect(() => {
    if (currentDoctor?.id) {
      const today = new Date().toISOString().split("T")[0];
      dispatch(
        fetchTodaySchedule({
          doctor_id: currentDoctor.id,
          date: today,
        })
      );
    }
  }, [currentDoctor?.id, dispatch]);

  // Handlers
  const handleSelectPatient = (patientId: string | null) => {
    dispatch(selectPatient(patientId));
  };

  const handleSetActiveTab = (tab: "history" | "vitals" | "labs" | "notes" | "ipd") => {
    dispatch(setActiveTab(tab));
  };

  const handleRefreshSchedule = () => {
    if (currentDoctor?.id) {
      const today = new Date().toISOString().split("T")[0];
      dispatch(
        fetchTodaySchedule({
          doctor_id: currentDoctor.id,
          date: today,
        })
      );
    }
  };

  const handleReset = () => {
    dispatch(resetDoctorPanel());
  };

  return {
    // Doctor info
    currentDoctor,
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
