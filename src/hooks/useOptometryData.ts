import { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchRefractionData,
  fetchIOPRecords,
  fetchIOPTrends,
  fetchARData,
  fetchComplaints,
  fetchMedicalHistory,
  fetchOphthalmicHistory,
  fetchDrugAllergies,
  fetchMedicalConditions,
} from "@/redux/optometryDataSlice";
import {
  fetchPatientOptometryHistory,
} from "@/redux/optometristPanelSlice";

interface UseOptometryDataOptions {
  patientId: string | null;
  autoFetch?: boolean;
}

export const useOptometryData = ({
  patientId,
  autoFetch = true,
}: UseOptometryDataOptions) => {
  const dispatch = useAppDispatch();

  // Get current optometrist ID
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const doctors = useAppSelector((state) => state.doctors.list);
  const currentOptometrist = doctors.find((d) => d.user_id === userId);

  // Get optometry data from Redux
  const {
    refractionRecords,
    iopRecords,
    iopTrends,
    arDataRecords,
    complaints,
    medicalHistory,
    ophthalmicHistory,
    drugAllergies,
    loading,
    error,
  } = useAppSelector((state) => state.optometryData);

  const patientOptometryHistory = useAppSelector((state) => state.optometristPanel.patientOptometryHistory);

  // Fetch all optometry data when patientId changes
  useEffect(() => {
    if (patientId && autoFetch) {
      // Fetch patient optometry history timeline
      dispatch(
        fetchPatientOptometryHistory({
          patient_id: patientId,
          page: 1,
          page_size: 50,
        })
      );

      // Fetch refraction data
      dispatch(
        fetchRefractionData({
          patient_id: patientId,
        })
      );

      // Fetch IOP records and trends (last 6 months)
      dispatch(
        fetchIOPRecords({
          patient_id: patientId,
          days: 180,
        })
      );

      dispatch(
        fetchIOPTrends({
          patient_id: patientId,
          days: 180,
        })
      );

      // Fetch AR data
      dispatch(
        fetchARData({
          patient_id: patientId,
        })
      );

      // Fetch complaints (all for this patient)
      dispatch(
        fetchComplaints({
          patient_id: patientId,
        })
      );

      // Fetch medical history
      // dispatch(
      //   fetchMedicalHistory({
      //     patient_id: patientId,
      //   })
      // );

      // Fetch ophthalmic surgery history
      dispatch(
        fetchOphthalmicHistory({
          patient_id: patientId,
        })
      );

      // Fetch drug allergies
      dispatch(
        fetchDrugAllergies({
          patient_id: patientId,
        })
      );
    }
  }, [patientId, autoFetch, dispatch]);

  // Memoized refresh functions to prevent unnecessary re-renders
  const refreshHistory = useCallback(() => {
    if (patientId) {
      dispatch(
        fetchPatientOptometryHistory({
          patient_id: patientId,
          page: 1,
          page_size: 50,
        })
      );
    }
  }, [patientId, dispatch]);

  const refreshRefraction = useCallback(() => {
    if (patientId) {
      dispatch(
        fetchRefractionData({
          patient_id: patientId,
        })
      );
    }
  }, [patientId, dispatch]);

  const refreshIOP = useCallback(() => {
    if (patientId) {
      dispatch(
        fetchIOPRecords({
          patient_id: patientId,
          days: 180,
        })
      );
      dispatch(
        fetchIOPTrends({
          patient_id: patientId,
          days: 180,
        })
      );
    }
  }, [patientId, dispatch]);

  const refreshARData = useCallback(() => {
    if (patientId) {
      dispatch(
        fetchARData({
          patient_id: patientId,
        })
      );
    }
  }, [patientId, dispatch]);

  const refreshComplaints = useCallback(() => {
    if (patientId) {
      dispatch(
        fetchComplaints({
          patient_id: patientId,
        })
      );
    }
  }, [patientId, dispatch]);

  const refreshMedicalConditions = useCallback(() => {
    if (patientId) {
      dispatch(
        fetchMedicalConditions({
          patient_id: patientId,
        })
      );
    }
  }, [patientId, dispatch]);

  const refreshOphthalmicHistory = useCallback(() => {
    if (patientId) {
      dispatch(
        fetchOphthalmicHistory({
          patient_id: patientId,
        })
      );
    }
  }, [patientId, dispatch]);

  const refreshDrugAllergies = useCallback(() => {
    if (patientId) {
      dispatch(
        fetchDrugAllergies({
          patient_id: patientId,
        })
      );
    }
  }, [patientId, dispatch]);

  return {
    // Data
    refractionRecords,
    iopRecords,
    iopTrends,
    arDataRecords,
    complaints,
    medicalHistory,
    ophthalmicHistory,
    drugAllergies,
    patientOptometryHistory,

    // Loading states
    loading,

    // Error state
    error,

    // Refresh functions
    refreshHistory,
    refreshRefraction,
    refreshIOP,
    refreshARData,
    refreshComplaints,
    refreshMedicalHistory: refreshMedicalConditions,
    refreshOphthalmicHistory,
    refreshDrugAllergies,
  };
};
