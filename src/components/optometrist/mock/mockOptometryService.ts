// Mock optometry service for frontend testing
// Simulates API calls with realistic delays and error handling

import {
  refractionTemplates,
  complaintTemplates,
  diagnosisTemplates,
  medicalHistoryPatterns,
  type RefractionTemplate,
  type ComplaintTemplate,
  type DiagnosisTemplate,
  type MedicalHistoryPattern,
} from "./mockTemplates";

import {
  mockPreviousExaminations,
  getPreviousExamination,
  hasPreviousHistory,
  type MockPreviousExamination,
} from "./mockPreviousExaminations";

import {
  mockTodaySchedule,
  getMockPatientById,
  updateMockPatientStatus,
  type MockOptometristSchedule,
  type MockPatient,
} from "./mockPatients";

// Simulated network delay range (ms)
const MIN_DELAY = 200;
const MAX_DELAY = 800;

// Simulate network delay
const simulateDelay = (): Promise<void> => {
  const delay = Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY;
  return new Promise((resolve) => setTimeout(resolve, delay));
};

// Simulate occasional errors (5% chance)
const shouldSimulateError = (): boolean => Math.random() < 0.05;

// Mock Optometry Service
export const mockOptometryService = {
  // ============ Schedule ============

  /**
   * Get today's schedule for the optometrist
   */
  async getTodaySchedule(): Promise<MockOptometristSchedule> {
    await simulateDelay();

    if (shouldSimulateError()) {
      throw new Error("Failed to fetch schedule. Please try again.");
    }

    return { ...mockTodaySchedule };
  },

  /**
   * Get patient by ID
   */
  async getPatient(patientId: string): Promise<MockPatient | null> {
    await simulateDelay();

    const patient = getMockPatientById(patientId);
    return patient ? { ...patient } : null;
  },

  /**
   * Update patient status
   */
  async updatePatientStatus(
    patientId: string,
    status: "waiting" | "in_progress" | "completed"
  ): Promise<MockOptometristSchedule> {
    await simulateDelay();

    const schedule = updateMockPatientStatus(patientId, status);
    return { ...schedule };
  },

  // ============ Previous Examinations (Copy from Previous) ============

  /**
   * Check if patient has previous examination history
   */
  async checkPreviousHistory(patientId: string): Promise<boolean> {
    await simulateDelay();
    return hasPreviousHistory(patientId);
  },

  /**
   * Get previous examination data for a patient
   */
  async getPreviousExamination(
    patientId: string
  ): Promise<MockPreviousExamination | null> {
    await simulateDelay();

    if (shouldSimulateError()) {
      throw new Error("Failed to fetch previous examination data.");
    }

    const examination = getPreviousExamination(patientId);
    return examination ? { ...examination } : null;
  },

  /**
   * Get previous refraction data
   */
  async getPreviousRefraction(patientId: string): Promise<{
    od: { sphere: number; cylinder: number | null; axis: number | null; add_power: number | null } | null;
    os: { sphere: number; cylinder: number | null; axis: number | null; add_power: number | null } | null;
  } | null> {
    await simulateDelay();

    const examination = getPreviousExamination(patientId);
    if (!examination?.refraction.od && !examination?.refraction.os) {
      return null;
    }

    return {
      od: examination.refraction.od
        ? {
            sphere: examination.refraction.od.sphere,
            cylinder: examination.refraction.od.cylinder,
            axis: examination.refraction.od.axis,
            add_power: examination.refraction.od.add_power,
          }
        : null,
      os: examination.refraction.os
        ? {
            sphere: examination.refraction.os.sphere,
            cylinder: examination.refraction.os.cylinder,
            axis: examination.refraction.os.axis,
            add_power: examination.refraction.os.add_power,
          }
        : null,
    };
  },

  /**
   * Get previous AR data
   */
  async getPreviousARData(patientId: string): Promise<{
    od: { sphere: number; cylinder: number | null; axis: number | null; pupillary_distance: number | null } | null;
    os: { sphere: number; cylinder: number | null; axis: number | null; pupillary_distance: number | null } | null;
  } | null> {
    await simulateDelay();

    const examination = getPreviousExamination(patientId);
    if (!examination?.ar_data.od && !examination?.ar_data.os) {
      return null;
    }

    return {
      od: examination.ar_data.od
        ? {
            sphere: examination.ar_data.od.sphere,
            cylinder: examination.ar_data.od.cylinder,
            axis: examination.ar_data.od.axis,
            pupillary_distance: examination.ar_data.od.pupillary_distance,
          }
        : null,
      os: examination.ar_data.os
        ? {
            sphere: examination.ar_data.os.sphere,
            cylinder: examination.ar_data.os.cylinder,
            axis: examination.ar_data.os.axis,
            pupillary_distance: examination.ar_data.os.pupillary_distance,
          }
        : null,
    };
  },

  /**
   * Get previous IOP data
   */
  async getPreviousIOP(patientId: string): Promise<{
    od_pressure: number;
    os_pressure: number;
    measurement_method: string;
  } | null> {
    await simulateDelay();

    const examination = getPreviousExamination(patientId);
    if (!examination?.iop) {
      return null;
    }

    return {
      od_pressure: examination.iop.od_pressure,
      os_pressure: examination.iop.os_pressure,
      measurement_method: examination.iop.measurement_method,
    };
  },

  /**
   * Get previous complaints
   */
  async getPreviousComplaints(
    patientId: string
  ): Promise<Array<{ complaint_text: string; severity: string; duration: string }>> {
    await simulateDelay();

    const examination = getPreviousExamination(patientId);
    if (!examination?.complaints) {
      return [];
    }

    return examination.complaints.map((c) => ({
      complaint_text: c.complaint_text,
      severity: c.severity,
      duration: c.duration,
    }));
  },

  /**
   * Get previous medical history
   */
  async getPreviousMedicalHistory(patientId: string): Promise<{
    conditions: Record<string, boolean>;
    other_conditions: string | null;
    current_medications: string | null;
    family_history: string | null;
  } | null> {
    await simulateDelay();

    const examination = getPreviousExamination(patientId);
    if (!examination?.medical_history) {
      return null;
    }

    const {
      other_conditions,
      current_medications,
      family_history,
      ...conditions
    } = examination.medical_history;

    return {
      conditions: conditions as Record<string, boolean>,
      other_conditions,
      current_medications,
      family_history,
    };
  },

  // ============ Templates ============

  /**
   * Get all refraction templates
   */
  async getRefractionTemplates(): Promise<RefractionTemplate[]> {
    await simulateDelay();
    return [...refractionTemplates];
  },

  /**
   * Get refraction templates by category
   */
  async getRefractionTemplatesByCategory(
    category: RefractionTemplate["category"]
  ): Promise<RefractionTemplate[]> {
    await simulateDelay();
    return refractionTemplates.filter((t) => t.category === category);
  },

  /**
   * Get a specific refraction template
   */
  async getRefractionTemplate(
    templateId: string
  ): Promise<RefractionTemplate | null> {
    await simulateDelay();
    return refractionTemplates.find((t) => t.id === templateId) || null;
  },

  /**
   * Get all complaint templates
   */
  async getComplaintTemplates(): Promise<ComplaintTemplate[]> {
    await simulateDelay();
    return [...complaintTemplates];
  },

  /**
   * Get a specific complaint template
   */
  async getComplaintTemplate(
    templateId: string
  ): Promise<ComplaintTemplate | null> {
    await simulateDelay();
    return complaintTemplates.find((t) => t.id === templateId) || null;
  },

  /**
   * Get all diagnosis templates
   */
  async getDiagnosisTemplates(): Promise<DiagnosisTemplate[]> {
    await simulateDelay();
    return [...diagnosisTemplates];
  },

  /**
   * Get a specific diagnosis template
   */
  async getDiagnosisTemplate(
    templateId: string
  ): Promise<DiagnosisTemplate | null> {
    await simulateDelay();
    return diagnosisTemplates.find((t) => t.id === templateId) || null;
  },

  /**
   * Get medical history patterns
   */
  async getMedicalHistoryPatterns(): Promise<MedicalHistoryPattern[]> {
    await simulateDelay();
    return [...medicalHistoryPatterns];
  },

  /**
   * Get a specific medical history pattern
   */
  async getMedicalHistoryPattern(
    patternId: string
  ): Promise<MedicalHistoryPattern | null> {
    await simulateDelay();
    return medicalHistoryPatterns.find((p) => p.id === patternId) || null;
  },

  // ============ Mock Save Operations ============
  // These simulate saving data - in real app would hit API

  /**
   * Save refraction data (mock)
   */
  async saveRefraction(patientId: string, visitId: string, data: {
    od: { sphere: number; cylinder: number | null; axis: number | null; add_power: number | null; va_uncorrected: string; va_corrected: string };
    os: { sphere: number; cylinder: number | null; axis: number | null; add_power: number | null; va_uncorrected: string; va_corrected: string };
    notes?: string;
  }): Promise<{ success: boolean; message: string }> {
    await simulateDelay();

    if (shouldSimulateError()) {
      throw new Error("Failed to save refraction data. Please try again.");
    }

    console.log("Mock: Saving refraction data", { patientId, visitId, data });
    return { success: true, message: "Refraction data saved successfully" };
  },

  /**
   * Save AR data (mock)
   */
  async saveARData(patientId: string, visitId: string, data: {
    od: { sphere: number; cylinder: number | null; axis: number | null };
    os: { sphere: number; cylinder: number | null; axis: number | null };
    pupillary_distance?: number;
    notes?: string;
  }): Promise<{ success: boolean; message: string }> {
    await simulateDelay();

    if (shouldSimulateError()) {
      throw new Error("Failed to save AR data. Please try again.");
    }

    console.log("Mock: Saving AR data", { patientId, visitId, data });
    return { success: true, message: "AR data saved successfully" };
  },

  /**
   * Save IOP data (mock)
   */
  async saveIOP(patientId: string, visitId: string, data: {
    od_pressure: number;
    os_pressure: number;
    measurement_method: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string }> {
    await simulateDelay();

    if (shouldSimulateError()) {
      throw new Error("Failed to save IOP data. Please try again.");
    }

    console.log("Mock: Saving IOP data", { patientId, visitId, data });
    return { success: true, message: "IOP data saved successfully" };
  },

  /**
   * Save complaints (mock)
   */
  async saveComplaints(patientId: string, visitId: string, data: {
    complaints: Array<{ text: string; severity: string; duration: string }>;
    notes?: string;
  }): Promise<{ success: boolean; message: string }> {
    await simulateDelay();

    if (shouldSimulateError()) {
      throw new Error("Failed to save complaints. Please try again.");
    }

    console.log("Mock: Saving complaints", { patientId, visitId, data });
    return { success: true, message: "Complaints saved successfully" };
  },

  /**
   * Save medical history (mock)
   */
  async saveMedicalHistory(patientId: string, data: {
    conditions: Record<string, boolean>;
    other_conditions?: string;
    current_medications?: string;
    family_history?: string;
  }): Promise<{ success: boolean; message: string }> {
    await simulateDelay();

    if (shouldSimulateError()) {
      throw new Error("Failed to save medical history. Please try again.");
    }

    console.log("Mock: Saving medical history", { patientId, data });
    return { success: true, message: "Medical history saved successfully" };
  },

  /**
   * Save diagnosis (mock)
   */
  async saveDiagnosis(patientId: string, visitId: string, data: {
    diagnosis: string;
    treatment_plan?: string;
    follow_up?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string }> {
    await simulateDelay();

    if (shouldSimulateError()) {
      throw new Error("Failed to save diagnosis. Please try again.");
    }

    console.log("Mock: Saving diagnosis", { patientId, visitId, data });
    return { success: true, message: "Diagnosis saved successfully" };
  },
};

export default mockOptometryService;
