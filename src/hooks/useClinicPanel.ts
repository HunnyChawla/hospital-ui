import { useEffect, useCallback, useState, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  selectClinicPatient,
  setActiveComponentKey,
  setClinicPanelMode,
  resetClinicPanel,
  type ClinicPanelMode,
} from "@/redux/clinicPanelSlice";
import {
  examinerMappingsApi,
  type ExaminerDoctorMapping,
} from "@/services/examinerMappingsApi";
import { getTenantIdForApi } from "@/utils/auth";
import { handleError } from "@/utils/errorHandler";
import { playNotificationSound } from "@/utils/sound";
import type { ClinicQueuePatient } from "@/utils/clinicQueueFilters";

export type ClinicPanelRole = "examiner" | "doctor";

/**
 * Identity + doctor/examiner mapping resolution + selected patient state
 * for the clinic panel. Mirror of useOptometristPanel with the examiner in
 * the optometrist's seat: an examiner works one mapped doctor's queue at a
 * time (selectable when mapped to several); a doctor is their own doctor.
 */
export const useClinicPanel = () => {
  const dispatch = useAppDispatch();

  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const rawRole = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const userRole = rawRole ? rawRole.toLowerCase() : null;
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

  const panelRole: ClinicPanelRole = userRole === "examiner" ? "examiner" : "doctor";
  const isDoctor = panelRole === "doctor";

  const [doctorMappings, setDoctorMappings] = useState<ExaminerDoctorMapping[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [mappingsError, setMappingsError] = useState<string | null>(null);

  const { selectedPatientId, selectedVisitId, activeComponentKey, mode } = useAppSelector(
    (state) => state.clinicPanel
  );
  const { list: doctorsList } = useAppSelector((state) => state.doctors);

  // The doctor whose queue is being worked. Doctors are their own doctor;
  // examiners pick among their mapped doctors.
  const selectedDoctor = useMemo(() => {
    if (isDoctor && userId) {
      const myDoctor = doctorsList.find((d) => d.user_id === userId);
      return myDoctor
        ? ({
            doctor_id: myDoctor.id,
            doctor_name: myDoctor.user_name || "Me",
            is_active: true,
          } as ExaminerDoctorMapping)
        : null;
    }

    if (selectedDoctorId) {
      return (
        doctorMappings.find((m) => m.doctor_id === selectedDoctorId) ||
        doctorMappings[0] ||
        null
      );
    }

    return doctorMappings.find((m) => m.is_active) || doctorMappings[0] || null;
  }, [isDoctor, userId, selectedDoctorId, doctorMappings, doctorsList]);

  // Auto-select saved doctor when mappings load
  useEffect(() => {
    if (doctorMappings.length > 0 && !selectedDoctorId) {
      const savedDoctorId = userId
        ? localStorage.getItem(`clinic_selected_doctor_${userId}`)
        : null;
      const hasSavedDoctor =
        savedDoctorId && doctorMappings.some((m) => m.doctor_id === savedDoctorId);

      if (hasSavedDoctor) {
        setSelectedDoctorId(savedDoctorId);
      } else {
        const defaultDoctor = doctorMappings.find((m) => m.is_active) || doctorMappings[0];
        if (defaultDoctor) {
          setSelectedDoctorId(defaultDoctor.doctor_id);
        }
      }
    }
  }, [doctorMappings, selectedDoctorId, userId]);

  const handleSetSelectedDoctor = useCallback(
    (doctorId: string) => {
      setSelectedDoctorId(doctorId);
      if (userId) {
        localStorage.setItem(`clinic_selected_doctor_${userId}`, doctorId);
      }
    },
    [userId]
  );

  // Verify authorization and fetch mappings (examiners only)
  useEffect(() => {
    if (!userId || !["examiner", "doctor"].includes(userRole || "")) {
      setMappingsError("User is not authorized");
      return;
    }

    if (userRole === "doctor") {
      setDoctorMappings([]);
      setMappingsLoading(false);
      return;
    }

    const fetchMappings = async () => {
      setMappingsLoading(true);
      setMappingsError(null);
      try {
        const apiTenantId = getTenantIdForApi(tenantId ?? undefined);
        const mappings = await examinerMappingsApi.getExaminerDoctors(userId, apiTenantId);
        setDoctorMappings(mappings);
      } catch (err: unknown) {
        const errorMessage = handleError(err, {
          defaultMessage: "Failed to fetch doctor mappings",
          showToast: false,
          logError: true,
        });
        setMappingsError(errorMessage);
      } finally {
        setMappingsLoading(false);
      }
    };

    fetchMappings();
  }, [userId, userRole, tenantId]);

  // Notification sound when a patient is assigned to this examiner
  const prevStatusesRef = useRef<Record<string, string>>({});
  const notifyOnQueueChange = useCallback(
    (patients: ClinicQueuePatient[]) => {
      let shouldPlaySound = false;
      patients.forEach((patient) => {
        const prevStatus = prevStatusesRef.current[patient.visit_id];
        prevStatusesRef.current[patient.visit_id] = patient.status;
        if (
          prevStatus &&
          prevStatus !== patient.status &&
          patient.status === "examiner_assigned" &&
          patient.examiner_id === userId
        ) {
          shouldPlaySound = true;
        }
      });
      if (shouldPlaySound) {
        playNotificationSound();
      }
    },
    [userId]
  );

  const handleSelectPatient = useCallback(
    (patientId: string | null, visitId: string | null) => {
      dispatch(selectClinicPatient({ patientId, visitId }));
    },
    [dispatch]
  );

  const handleSetActiveComponentKey = useCallback(
    (key: string) => {
      dispatch(setActiveComponentKey(key));
    },
    [dispatch]
  );

  const handleSetMode = useCallback(
    (nextMode: ClinicPanelMode) => {
      dispatch(setClinicPanelMode(nextMode));
    },
    [dispatch]
  );

  const handleReset = useCallback(() => {
    dispatch(resetClinicPanel());
  }, [dispatch]);

  return {
    userId,
    userRole,
    panelRole,
    isDoctor,

    doctorMappings,
    selectedDoctor,
    mappingsLoading,
    mappingsError,

    selectedPatientId,
    selectedVisitId,
    activeComponentKey,
    mode,

    selectPatient: handleSelectPatient,
    setActiveComponentKey: handleSetActiveComponentKey,
    setMode: handleSetMode,
    setSelectedDoctor: handleSetSelectedDoctor,
    notifyOnQueueChange,
    reset: handleReset,
  };
};
