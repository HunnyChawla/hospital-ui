import { useEffect, useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchTodayOptometrySchedule,
  selectPatient,
  setActiveTab,
  resetOptometristPanel,
} from "@/redux/optometristPanelSlice";
import { optometristMappingsApi, type OptometristDoctorMapping } from "@/services/optometristMappingsApi";
import { getTodayDateLocal } from "@/utils/format";
import { getTenantIdForApi } from "@/utils/auth";
import { handleError } from "@/utils/errorHandler";

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

  // Get current optometrist user from localStorage
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const userRole = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

  // State for optometrist-doctor mappings
  const [doctorMappings, setDoctorMappings] = useState<OptometristDoctorMapping[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [mappingsError, setMappingsError] = useState<string | null>(null);

  // Get selected doctor from mappings - defaults to first active or first doctor
  const selectedDoctor = selectedDoctorId
    ? doctorMappings.find(m => m.doctor_id === selectedDoctorId) || doctorMappings[0] || null
    : doctorMappings.find(m => m.is_active) || doctorMappings[0] || null;

  // Auto-select first doctor when mappings load
  useEffect(() => {
    if (doctorMappings.length > 0 && !selectedDoctorId) {
      const defaultDoctor = doctorMappings.find(m => m.is_active) || doctorMappings[0];
      if (defaultDoctor) {
        setSelectedDoctorId(defaultDoctor.doctor_id);
      }
    }
  }, [doctorMappings, selectedDoctorId]);

  // Handler to change selected doctor
  const handleSetSelectedDoctor = useCallback((doctorId: string) => {
    setSelectedDoctorId(doctorId);
  }, []);

  // Optometrist panel state
  const {
    selectedPatientId,
    activeTab,
    todaySchedule,
    todayStats,
    loading,
    error,
  } = useAppSelector((state) => state.optometristPanel);

  // Verify user is optometrist and fetch doctor mappings
  useEffect(() => {
    if (!userId || userRole !== "optometrist") {
      setMappingsError("User is not an optometrist");
      return;
    }

    const fetchMappings = async () => {
      setMappingsLoading(true);
      setMappingsError(null);
      try {
        const apiTenantId = getTenantIdForApi(tenantId);
        const mappings = await optometristMappingsApi.getOptometristDoctors(userId, apiTenantId);
        setDoctorMappings(mappings);
      } catch (err: any) {
        const errorMessage = handleError(err, {
          defaultMessage: "Failed to fetch doctor mappings",
          showToast: false, // Don't show toast here, let the component handle it
          logError: true,
        });
        setMappingsError(errorMessage);
      } finally {
        setMappingsLoading(false);
      }
    };

    fetchMappings();
  }, [userId, userRole, tenantId]);

  // Fetch today's schedule when doctor is identified
  useEffect(() => {
    if (selectedDoctor?.doctor_id) {
      const today = getTodayDateLocal();
      dispatch(
        fetchTodayOptometrySchedule({
          optometrist_id: selectedDoctor.doctor_id, // API uses this as doctor_id internally
          start_date: today,
          end_date: today,
        })
      );
    }
  }, [selectedDoctor?.doctor_id, dispatch]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleSelectPatient = useCallback((patientId: string | null) => {
    dispatch(selectPatient(patientId));
  }, [dispatch]);

  const handleSetActiveTab = useCallback((tab: ActiveTab) => {
    dispatch(setActiveTab(tab));
  }, [dispatch]);

  const handleRefreshSchedule = useCallback(() => {
    if (selectedDoctor?.doctor_id) {
      const today = getTodayDateLocal();
      dispatch(
        fetchTodayOptometrySchedule({
          optometrist_id: selectedDoctor.doctor_id, // API uses this as doctor_id internally
          start_date: today,
          end_date: today,
        })
      );
    }
  }, [selectedDoctor?.doctor_id, dispatch]);

  const handleReset = useCallback(() => {
    dispatch(resetOptometristPanel());
  }, [dispatch]);

  return {
    // Optometrist user info
    userId,
    userRole,

    // Doctor mappings
    doctorMappings,
    selectedDoctor,
    mappingsLoading,
    mappingsError,

    // Schedule and stats
    todaySchedule,
    todayStats,

    // Selected patient and tab
    selectedPatientId,
    activeTab,

    // Loading and error states
    loading: loading || mappingsLoading,
    error: error || mappingsError,

    // Actions
    selectPatient: handleSelectPatient,
    setActiveTab: handleSetActiveTab,
    setSelectedDoctor: handleSetSelectedDoctor,
    refreshSchedule: handleRefreshSchedule,
    reset: handleReset,
  };
};
