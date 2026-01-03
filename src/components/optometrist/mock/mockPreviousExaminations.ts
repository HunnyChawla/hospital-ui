// Mock previous examination data for copy functionality

export interface MockRefractionRecord {
  id: string;
  eye: "OD" | "OS";
  sphere: number;
  cylinder: number | null;
  axis: number | null;
  add_power: number | null;
  visual_acuity_uncorrected: string;
  visual_acuity_corrected: string;
  recorded_at: string;
  notes: string | null;
}

export interface MockARDataRecord {
  id: string;
  eye: "OD" | "OS";
  sphere: number;
  cylinder: number | null;
  axis: number | null;
  visual_acuity: string | null;
  pupillary_distance: number | null;
  recorded_at: string;
  notes: string | null;
}

export interface MockIOPRecord {
  id: string;
  od_pressure: number;
  os_pressure: number;
  measurement_method: string;
  recorded_at: string;
  notes: string | null;
}

export interface MockComplaintRecord {
  id: string;
  complaint_text: string;
  duration: string;
  severity: "mild" | "moderate" | "severe";
  recorded_at: string;
}

export interface MockMedicalHistory {
  diabetes: boolean;
  hypertension: boolean;
  heart_disease: boolean;
  thyroid_disorder: boolean;
  asthma: boolean;
  tuberculosis: boolean;
  kidney_disease: boolean;
  liver_disease: boolean;
  cancer: boolean;
  hiv_aids: boolean;
  other_conditions: string | null;
  current_medications: string | null;
  family_history: string | null;
}

export interface MockPreviousExamination {
  visit_id: string;
  visit_date: string;
  optometrist_name: string;
  refraction: {
    od: MockRefractionRecord | null;
    os: MockRefractionRecord | null;
  };
  ar_data: {
    od: MockARDataRecord | null;
    os: MockARDataRecord | null;
  };
  iop: MockIOPRecord | null;
  complaints: MockComplaintRecord[];
  medical_history: MockMedicalHistory | null;
}

export interface MockPatientExaminationHistory {
  patient_id: string;
  patient_name: string;
  examinations: MockPreviousExamination[];
}

// Sample previous examination data for different patients
export const mockPreviousExaminations: Record<string, MockPatientExaminationHistory> = {
  // Patient with myopia - returning patient
  "patient_001": {
    patient_id: "patient_001",
    patient_name: "John Smith",
    examinations: [
      {
        visit_id: "visit_001_prev",
        visit_date: "2025-06-15",
        optometrist_name: "Dr. Emily Chen",
        refraction: {
          od: {
            id: "ref_od_001",
            eye: "OD",
            sphere: -2.00,
            cylinder: -0.50,
            axis: 90,
            add_power: null,
            visual_acuity_uncorrected: "6/36",
            visual_acuity_corrected: "6/6",
            recorded_at: "2025-06-15T10:30:00Z",
            notes: "Stable myopia",
          },
          os: {
            id: "ref_os_001",
            eye: "OS",
            sphere: -2.25,
            cylinder: -0.75,
            axis: 85,
            add_power: null,
            visual_acuity_uncorrected: "6/36",
            visual_acuity_corrected: "6/6",
            recorded_at: "2025-06-15T10:32:00Z",
            notes: "Stable myopia",
          },
        },
        ar_data: {
          od: {
            id: "ar_od_001",
            eye: "OD",
            sphere: -2.25,
            cylinder: -0.50,
            axis: 88,
            visual_acuity: "6/36",
            pupillary_distance: 32,
            recorded_at: "2025-06-15T10:15:00Z",
            notes: null,
          },
          os: {
            id: "ar_os_001",
            eye: "OS",
            sphere: -2.50,
            cylinder: -0.75,
            axis: 82,
            visual_acuity: "6/36",
            pupillary_distance: 31,
            recorded_at: "2025-06-15T10:15:00Z",
            notes: null,
          },
        },
        iop: {
          id: "iop_001",
          od_pressure: 16,
          os_pressure: 15,
          measurement_method: "NCT",
          recorded_at: "2025-06-15T10:20:00Z",
          notes: "Normal IOP",
        },
        complaints: [
          {
            id: "comp_001",
            complaint_text: "Blurred distance vision",
            duration: "6_months",
            severity: "moderate",
            recorded_at: "2025-06-15T10:00:00Z",
          },
        ],
        medical_history: {
          diabetes: false,
          hypertension: false,
          heart_disease: false,
          thyroid_disorder: false,
          asthma: false,
          tuberculosis: false,
          kidney_disease: false,
          liver_disease: false,
          cancer: false,
          hiv_aids: false,
          other_conditions: null,
          current_medications: null,
          family_history: "Father - glaucoma",
        },
      },
    ],
  },

  // Patient with presbyopia - older returning patient
  "patient_002": {
    patient_id: "patient_002",
    patient_name: "Mary Johnson",
    examinations: [
      {
        visit_id: "visit_002_prev",
        visit_date: "2025-03-20",
        optometrist_name: "Dr. Emily Chen",
        refraction: {
          od: {
            id: "ref_od_002",
            eye: "OD",
            sphere: 0.50,
            cylinder: null,
            axis: null,
            add_power: 2.00,
            visual_acuity_uncorrected: "6/9",
            visual_acuity_corrected: "6/6",
            recorded_at: "2025-03-20T14:30:00Z",
            notes: "Mild hyperopia with presbyopia",
          },
          os: {
            id: "ref_os_002",
            eye: "OS",
            sphere: 0.75,
            cylinder: null,
            axis: null,
            add_power: 2.00,
            visual_acuity_uncorrected: "6/12",
            visual_acuity_corrected: "6/6",
            recorded_at: "2025-03-20T14:32:00Z",
            notes: "Mild hyperopia with presbyopia",
          },
        },
        ar_data: {
          od: {
            id: "ar_od_002",
            eye: "OD",
            sphere: 0.75,
            cylinder: -0.25,
            axis: 90,
            visual_acuity: "6/9",
            pupillary_distance: 30,
            recorded_at: "2025-03-20T14:15:00Z",
            notes: null,
          },
          os: {
            id: "ar_os_002",
            eye: "OS",
            sphere: 1.00,
            cylinder: -0.25,
            axis: 90,
            visual_acuity: "6/12",
            pupillary_distance: 30,
            recorded_at: "2025-03-20T14:15:00Z",
            notes: null,
          },
        },
        iop: {
          id: "iop_002",
          od_pressure: 18,
          os_pressure: 17,
          measurement_method: "NCT",
          recorded_at: "2025-03-20T14:20:00Z",
          notes: null,
        },
        complaints: [
          {
            id: "comp_002",
            complaint_text: "Difficulty reading small print",
            duration: "1_year",
            severity: "moderate",
            recorded_at: "2025-03-20T14:00:00Z",
          },
          {
            id: "comp_003",
            complaint_text: "Eye strain with near work",
            duration: "6_months",
            severity: "mild",
            recorded_at: "2025-03-20T14:00:00Z",
          },
        ],
        medical_history: {
          diabetes: true,
          hypertension: true,
          heart_disease: false,
          thyroid_disorder: false,
          asthma: false,
          tuberculosis: false,
          kidney_disease: false,
          liver_disease: false,
          cancer: false,
          hiv_aids: false,
          other_conditions: "Controlled Type 2 DM for 5 years",
          current_medications: "Metformin 500mg BD, Amlodipine 5mg OD",
          family_history: "Mother - diabetes, Father - hypertension",
        },
      },
    ],
  },

  // New patient - no previous history
  "patient_003": {
    patient_id: "patient_003",
    patient_name: "Robert Williams",
    examinations: [],
  },

  // Patient with high myopia
  "patient_004": {
    patient_id: "patient_004",
    patient_name: "Sarah Davis",
    examinations: [
      {
        visit_id: "visit_004_prev",
        visit_date: "2025-01-10",
        optometrist_name: "Dr. Michael Wong",
        refraction: {
          od: {
            id: "ref_od_004",
            eye: "OD",
            sphere: -7.50,
            cylinder: -1.25,
            axis: 175,
            add_power: null,
            visual_acuity_uncorrected: "6/60",
            visual_acuity_corrected: "6/6",
            recorded_at: "2025-01-10T11:30:00Z",
            notes: "High myopia - annual monitoring for retinal changes",
          },
          os: {
            id: "ref_os_004",
            eye: "OS",
            sphere: -8.00,
            cylinder: -1.50,
            axis: 180,
            add_power: null,
            visual_acuity_uncorrected: "6/60",
            visual_acuity_corrected: "6/9",
            recorded_at: "2025-01-10T11:32:00Z",
            notes: "High myopia - slight amblyopia OS",
          },
        },
        ar_data: {
          od: {
            id: "ar_od_004",
            eye: "OD",
            sphere: -7.75,
            cylinder: -1.25,
            axis: 172,
            visual_acuity: "6/60",
            pupillary_distance: 33,
            recorded_at: "2025-01-10T11:15:00Z",
            notes: null,
          },
          os: {
            id: "ar_os_004",
            eye: "OS",
            sphere: -8.25,
            cylinder: -1.50,
            axis: 178,
            visual_acuity: "6/60",
            pupillary_distance: 32,
            recorded_at: "2025-01-10T11:15:00Z",
            notes: null,
          },
        },
        iop: {
          id: "iop_004",
          od_pressure: 14,
          os_pressure: 14,
          measurement_method: "NCT",
          recorded_at: "2025-01-10T11:20:00Z",
          notes: "Low-normal IOP",
        },
        complaints: [
          {
            id: "comp_004",
            complaint_text: "Glasses prescription check",
            duration: "today",
            severity: "mild",
            recorded_at: "2025-01-10T11:00:00Z",
          },
          {
            id: "comp_005",
            complaint_text: "Occasional floaters",
            duration: "1_month",
            severity: "mild",
            recorded_at: "2025-01-10T11:00:00Z",
          },
        ],
        medical_history: {
          diabetes: false,
          hypertension: false,
          heart_disease: false,
          thyroid_disorder: false,
          asthma: true,
          tuberculosis: false,
          kidney_disease: false,
          liver_disease: false,
          cancer: false,
          hiv_aids: false,
          other_conditions: "Childhood asthma - well controlled",
          current_medications: "Salbutamol inhaler PRN",
          family_history: "Brother - high myopia",
        },
      },
    ],
  },
};

// Helper function to get previous examination for a patient
export function getPreviousExamination(
  patientId: string
): MockPreviousExamination | null {
  const history = mockPreviousExaminations[patientId];
  if (!history || history.examinations.length === 0) {
    return null;
  }
  // Return most recent examination
  return history.examinations[0];
}

// Helper function to check if patient has previous history
export function hasPreviousHistory(patientId: string): boolean {
  const history = mockPreviousExaminations[patientId];
  return history !== undefined && history.examinations.length > 0;
}

// Helper function to get all patient IDs with history
export function getPatientsWithHistory(): string[] {
  return Object.keys(mockPreviousExaminations).filter(
    (id) => mockPreviousExaminations[id].examinations.length > 0
  );
}
