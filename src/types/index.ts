export type Patient = {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  mobile: string;
  healthId: string;
  doctor: string;
  lastVisit: string;
  outstanding: number;
  status: "Active" | "Admitted" | "Discharged";
  wardType?: "ICU" | "General" | "Private";
  bedNumber?: string;
  admissionDate?: string;
};

export type Admission = {
  id: string;
  patientId: string;
  doctor: string;
  reason: string;
  wardType: "ICU" | "General" | "Private";
  bedNumber: string;
  admittedAt: string;
  dischargeAt?: string;
  summary?: string;
  billingEstimate?: number;
};

export type OpdSlip = {
  id: string;
  patientId: string;
  doctor: string;
  symptoms: string;
  visitReason: string;
  createdAt: string;
};

export type BedStatus = {
  ward: "ICU" | "General" | "Private";
  total: number;
  occupied: number;
};

export type BillingItem = {
  id: string;
  label: string;
  amount: number;
  category: "Consultation" | "Test" | "Medicine" | "Bed" | "Other";
};

export type BillingRecord = {
  id: string;
  patientId: string;
  items: BillingItem[];
  total: number;
  status: "Pending" | "Paid";
  updatedAt: string;
};

export type TestOrder = {
  id: string;
  patientName: string;
  testName: string;
  status: "Pending" | "In Progress" | "Completed";
  orderedBy: string;
};

export type QueueEntry = {
  token: number;
  patientName: string;
  status: "Waiting" | "In Consultation" | "Completed";
  etaMinutes: number;
  visitId?: string; // For OPD visits
  appointmentId?: string; // For appointments
  visit_type?: "walk_in" | "appointment" | "emergency"; // Visit type for emergency highlighting
};

// Doctor Panel - Vital Signs
export type VitalSigns = {
  id: string;
  patient_id: string;
  recorded_at: string; // ISO datetime
  recorded_by: string; // user_id
  systolic_bp: number | null;
  diastolic_bp: number | null;
  pulse_rate: number | null;
  temperature: number | null; // in Fahrenheit
  spo2: number | null; // percentage
  respiratory_rate: number | null;
  weight: number | null; // in kg
  height: number | null; // in cm
  bmi: number | null; // calculated
  notes: string | null;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
};

export type VitalSignsTrend = {
  date: string;
  systolic_bp?: number;
  diastolic_bp?: number;
  pulse_rate?: number;
  temperature?: number;
  spo2?: number;
  weight?: number;
};

// Doctor Panel - Clinical Notes
export type ClinicalNote = {
  id: string;
  patient_id: string;
  doctor_id: string;
  visit_id: string | null;
  appointment_id?: string | null;
  note_type: "soap" | "quick" | "voice" | "follow_up";
  content: string;
  voice_recording_url: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  tenant_id?: string;
};

// Doctor Panel - Patient History
export type PatientHistoryEvent = {
  event_type: "visit" | "vital_sign" | "lab_test" | "admission" | "prescription";
  event_id: string;
  timestamp: string;
  title: string;
  description: string | null;
  doctor_name: string | null;
  visit_id: string | null;
  metadata: any; // Type-specific data
};

export type PatientHistoryTimeline = {
  patient_id: string;
  start_date: string | null;
  end_date: string | null;
  event_type: string;
  events: PatientHistoryEvent[];
  total_events: number;
};

// Doctor Panel - Doctor Schedule
export type DoctorScheduleSlot = {
  time: string; // HH:MM
  type: "appointment" | "walk_in" | "emergency";
  item_id: string; // appointment_id or visit_id
  patient_id: string;
  patient_name: string;
  status: string;
  duration_minutes: number;
  token_number?: string | number;
};

export type DoctorSchedule = {
  date: string;
  total_appointments: number;
  total_opd_visits: number;
  slots: DoctorScheduleSlot[];
};

// Doctor Panel - Lab Results
export type LabTestParameter = {
  id: string;
  booking_item_id: string;
  parameter_id: string;
  parameter_name: string;
  parameter_code: string;
  unit: string;
  result_value: string;
  result_numeric: number | null;
  is_abnormal: boolean;
  normal_min: number | null;
  normal_max: number | null;
  normal_text: string | null;
  notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type LabTestResultItem = {
  booking_item_id: string;
  lab_test_id: string;
  test_code: string;
  test_name: string;
  results: LabTestParameter[];
};

export type LabResultsResponse = LabTestResultItem[];

// Legacy type for backward compatibility (deprecated)
export type LabResult = {
  test_id: string;
  test_name: string;
  result_value: string | number;
  unit: string;
  normal_range_min: number | null;
  normal_range_max: number | null;
  is_abnormal: boolean;
  reference_text: string | null;
};

// Doctor Panel - Stats
export type DoctorStats = {
  todayTotal: number;
  todayPending: number;
  todayInProgress: number;
  todayCompleted: number;
};

// ============================================
// OPTOMETRY PANEL TYPES
// ============================================

// Optometrist Panel - Schedule & Stats
export type OptometristScheduleSlot = {
  time: string;
  type: "appointment" | "walk_in" | "emergency";
  visit_id: string;
  patient_id: string;
  patient_name: string;
  patient_uhid: string | null;
  status: string;
  duration_minutes: number;
  token_number?: string | number;
};

export type OptometristSchedule = {
  date: string;
  total_appointments: number;
  total_opd_visits: number;
  slots: OptometristScheduleSlot[];
};

export type OptometristStats = {
  todayTotal: number;
  todayPending: number;
  todayInProgress: number;
  todayCompleted: number;
};

// Refraction Records
export type RefractionRecord = {
  id: string;
  patient_id: string;
  optometrist_id: string;
  optometrist_name: string;
  visit_id: string;
  eye: "OD" | "OS";
  sphere: number;
  cylinder: number | null;
  axis: number | null;
  visual_acuity_uncorrected: string;
  visual_acuity_corrected: string;
  add_power: number | null;
  notes: string | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
};

// IOP (Intraocular Pressure) Records
export type IOPRecord = {
  id: string;
  patient_id: string;
  optometrist_id: string;
  optometrist_name: string;
  visit_id: string | null;
  eye: "OD" | "OS";
  pressure: number;
  measurement_method: string;
  notes: string | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
};

export type IOPTrend = {
  date: string;
  od_pressure: number | null;
  os_pressure: number | null;
};

// AR (Auto-Refraction) Data Records
export type ARDataRecord = {
  id: string;
  patient_id: string;
  optometrist_id: string;
  optometrist_name: string;
  visit_id: string;
  eye: "OD" | "OS";
  sphere: number;
  cylinder: number | null;
  axis: number | null;
  visual_acuity: string | null;
  pupillary_distance: number | null;
  notes: string | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
};

// Complaints Records
export type ComplaintRecord = {
  id: string;
  tenant_id: string;
  patient_id: string;
  visit_id: string;
  complaint: string;
  severity: "mild" | "moderate" | "severe" | null;
  duration: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

// Medical History (Legacy - keeping for backward compatibility)
export type MedicalHistoryRecord = {
  id: string;
  patient_id: string;
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
  lifestyle_notes: string | null;
  updated_by: string | null;
  created_by: string | null;
  updated_at: string;
  created_at: string;
  tenant_id: string;
};

// Optometry Medical Condition (New API - one record per condition)
export type MedicalConditionRecord = {
  id: string;
  patient_id: string;
  optometrist_id: string;
  visit_id: string | null;
  condition_name: string; // e.g., "diabetes", "hypertension", etc.
  status?: boolean; // true if patient has this condition
  duration: string | null; // "less_than_1", "1_to_5", "5_to_10", "more_than_10"
  on_medication: boolean | null; // true if on medication
  is_controlled: boolean | null; // true if well controlled
  remarks: string | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  created_by?: string;
  updated_by?: string;
};

// Ophthalmic Surgery History
export type OphthalmicSurgeryRecord = {
  id: string;
  patient_id: string;
  surgery_name: string;
  eye: "OD" | "OS" | "OU";
  surgery_date: string;
  hospital_name: string | null;
  surgeon_name: string | null;
  complications: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  created_by?: string | null;
  updated_by?: string | null;
};

// Drug Allergies
export type DrugAllergyRecord = {
  id: string;
  patient_id: string;
  drug_name: string;
  reaction: string;
  severity: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tenant_id: string;
};

// Optometry Prescriptions
export type OptometryPrescriptionItem = {
  eye: "OD" | "OS";
  sphere: number;
  cylinder: number | null;
  axis: number | null;
  add_power: number | null;
  prism: string | null;
  lens_type: string | null;
};

export type OptometryPrescription = {
  id: string;
  tenant_id: string;
  patient_id: string;
  patient_name: string;
  optometrist_id: string;
  optometrist_name: string;
  visit_id: string;
  prescription_number: string;
  status: "draft" | "finalized";
  diagnosis: string | null;
  notes: string | null;
  items: OptometryPrescriptionItem[];
  pupillary_distance: number | null;
  frame_fitting_notes: string | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
};

// Patient Optometry History
export type PatientOptometryEvent = {
  event_type: "visit" | "refraction" | "iop" | "prescription" | "ar_data";
  event_id: string;
  timestamp: string;
  title: string;
  description: string | null;
  optometrist_name: string | null;
  visit_id: string | null;
  metadata: any;
};

export type PatientOptometryTimeline = {
  patient_id: string;
  start_date: string | null;
  end_date: string | null;
  events: PatientOptometryEvent[];
  total_events: number;
};

