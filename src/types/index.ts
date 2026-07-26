export type Patient = {
  id: string;
  title?: string;
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
  address?: string; // Street address
  city?: string;
  state?: string;
  pincode?: string;
  category?: string;
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
  section_name?: string | null;
  parameter_type?: "number" | "dropdown" | "text" | "image";
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
  pendingOptometrist: number;
  inProgressOptometrist: number;
  pendingDoctor: number;
  inProgressDoctor: number;
  todayCompleted: number;
  todayNoShow?: number;
  todayPending?: number;
  todayInProgress?: number;
};

// ============================================
// OPTOMETRY PANEL TYPES
// ============================================

// My Panel (Optometrist) - Schedule & Stats
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
  sentToDoctor?: number;
  todayCompleted: number;
  todayNoShow: number;
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
  distance_bcva: string | null;
  near_bcva: string | null;
  add_power: number | null;
  pupillary_distance: number | null;
  notes: string | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;

  // New DB fields
  od_prism?: string | null;
  os_prism?: string | null;
  od_dilated_sphere?: number | null;
  od_dilated_cylinder?: number | null;
  od_dilated_axis?: number | null;
  od_dilated_visual_acuity?: string | null;
  od_dilated_pinhole?: string | null;
  os_dilated_sphere?: number | null;
  os_dilated_cylinder?: number | null;
  os_dilated_axis?: number | null;
  os_dilated_visual_acuity?: string | null;
  os_dilated_pinhole?: string | null;
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

  // New DB fields
  od_wet_sphere?: number | null;
  od_wet_cylinder?: number | null;
  od_wet_axis?: number | null;
  os_wet_sphere?: number | null;
  os_wet_cylinder?: number | null;
  os_wet_axis?: number | null;
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
  surgery_date: string | null;
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
  id?: string;
  eye: "OD" | "OS";
  sphere: number;
  cylinder: number | null;
  axis: number | null;
  add_power: number | null;
  visual_acuity: string | null;
  prism: string | null;
  lens_type: string | null;
  created_at?: string;
};

export type TaperingStep = {
  sequence: number;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
};

// Medicine Item for Doctor Prescriptions
export type MedicineItem = {
  id?: string;
  prescription_id?: string;
  medicine_id?: string;
  medicine_name: string;
  generic_name?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  applicable_eye?: "LEFT" | "RIGHT" | "BOTH" | "NA" | null;
  created_at?: string;
  tapering_steps?: TaperingStep[];
};

// Advice Item for Doctor Prescriptions
export type AdviceItem = {
  id?: string;
  prescription_id?: string;
  advice_type: string;
  description: string;
  notes?: string;
  lab_test_id?: string | null;
  test_code?: string;
  prescription_metadata?: Record<string, any> | null;
  created_at?: string;
};

// Symptom Item for Prescriptions
export type PrescriptionSymptom = {
  id?: string;
  prescription_id?: string;
  symptom_id: string;
  symptom_name: string;
  diagnosis_id?: string;
  diagnosis_name?: string;
  is_primary?: boolean;
  severity?: string;
  duration?: string;
  notes?: string;
  created_at?: string;
  applicable_eye?: string | null;
};

export type OptometryPrescription = {
  id: string;
  tenant_id: string;
  patient_id: string;
  patient_name: string;
  optometrist_id: string;
  optometrist_name: string;
  visit_id: string;
  doctor_id?: string;
  doctor_name?: string;
  prescription_number: string;
  status: "draft" | "finalized";
  diagnosis: string | null;
  notes: string | null;
  items: OptometryPrescriptionItem[];
  pupillary_distance: number | null;
  frame_fitting_notes: string | null;
  // New doctor prescription fields
  followup_date?: string | null;
  plan_of_action?: string | null;
  remarks?: string | null;
  lens_type?: string | null;
  vision_type?: string | null;
  lens_material?: string | null;
  coatings?: string[] | null;
  medicine_items?: MedicineItem[];
  advice_items?: AdviceItem[];
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  symptoms?: PrescriptionSymptom[];
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

// ============================================
// SURGERY TYPES
// ============================================

export type Surgery = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category: string | null;
  categories?: string[];
  price?: number;
  base_price?: number;
  default_anatomy_site_id?: string | null;
  is_anatomy_specific?: boolean;
  applicable_anatomy_site_ids?: string[];
  packages?: SurgeryPackage[];
  service_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type CreateSurgeryRequest = {
  name: string;
  description?: string | null;
  category?: string | null;
  categories?: string[];
  price?: number;
  base_price?: number;
  default_anatomy_site_id?: string | null;
  is_anatomy_specific?: boolean;
  applicable_anatomy_site_ids?: string[];
  packages?: any[];
  is_active?: boolean;
};

export type UpdateSurgeryRequest = {
  name?: string | null;
  description?: string | null;
  category?: string | null;
  categories?: string[];
  price?: number | null;
  base_price?: number | null;
  default_anatomy_site_id?: string | null;
  is_anatomy_specific?: boolean | null;
  applicable_anatomy_site_ids?: string[] | null;
  packages?: any[] | null;
  is_active?: boolean | null;
};

// ============================================
// ANATOMY SITE & SURGERY PACKAGE TYPES
// ============================================

export type AnatomySite = {
  id: string;
  tenant_id?: string | null;
  name: string;
  short_code: string;
  department?: string | null;
  is_active: boolean;
  sort_order: number;
  is_global?: boolean;
  created_at: string;
  updated_at: string;
};

export type SurgeryPackage = {
  id: string;
  tenant_id: string;
  surgery_id: string;
  name: string;
  description?: string | null;
  price: number;
  anatomy_prices?: Record<string, number>;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

// ============================================
// PLANNED SURGERY & COUNSELLOR TYPES
// ============================================

export type PlannedSurgeryUrgency = "elective" | "urgent" | "emergency";

export type PlannedSurgeryStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "advised"
  | "counselling_in_progress"
  | "pending_patient_decision"
  | "pending_insurance"
  | "pending_investigations"
  | "pending_fitness"
  | "confirmed"
  | "in_ot_preparation"
  | "surgery_completed"
  | "postponed"
  | "cancelled_by_patient"
  | "cancelled_by_hospital"
  | "lost_to_followup";

export type PlannedSurgery = {
  id: string;
  tenant_id: string;
  patient_id: string;
  visit_id?: string | null;
  patient_name?: string | null;
  patient_uhid?: string | null;
  patient_mobile?: string | null;
  surgery_id: string;
  surgery_name: string;
  surgeon_id: string;
  surgeon_name?: string | null;
  anatomy_site_id?: string | null;
  anatomy_site_name?: string | null;
  anatomy_site_short_code?: string | null;
  eye?: "OD" | "OS" | "OU" | null;
  urgency: PlannedSurgeryUrgency;
  counsellor_id?: string | null;
  counsellor_name?: string | null;
  package_id?: string | null;
  package_name?: string | null;
  agreed_price?: number | null;
  planned_date: string | null;
  advised_date?: string | null;
  planned_time: string | null;
  hospital_name: string | null;
  notes: string | null;
  cancellation_reason?: string | null;
  postponement_reason?: string | null;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  status: PlannedSurgeryStatus;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type CreatePlannedSurgeryRequest = {
  patient_id: string;
  visit_id?: string | null;
  surgery_id: string;
  surgery_name?: string;
  surgeon_id: string;
  anatomy_site_id?: string | null;
  eye?: "OD" | "OS" | "OU" | null;
  urgency?: PlannedSurgeryUrgency;
  counsellor_id?: string | null;
  package_id?: string | null;
  planned_date?: string | null;
  advised_date?: string | null;
  planned_time?: string | null;
  hospital_name?: string | null;
  notes?: string | null;
  status?: PlannedSurgeryStatus;
};

export type UpdatePlannedSurgeryRequest = {
  surgery_id?: string;
  surgery_name?: string;
  surgeon_id?: string;
  anatomy_site_id?: string | null;
  eye?: "OD" | "OS" | "OU" | null;
  urgency?: PlannedSurgeryUrgency;
  counsellor_id?: string | null;
  package_id?: string | null;
  agreed_price?: number | null;
  planned_date?: string | null;
  advised_date?: string | null;
  planned_time?: string | null;
  hospital_name?: string | null;
  notes?: string | null;
  status?: PlannedSurgeryStatus;
};

export type ConfirmSurgeryRequest = {
  package_id: string;
  agreed_price: number;
  planned_date: string;
  planned_time?: string | null;
  notes?: string | null;
};

export type PostponeSurgeryRequest = {
  postponement_reason: string;
  new_planned_date?: string | null;
  notes?: string | null;
};

export type CancelSurgeryRequest = {
  cancelled_by: "patient" | "hospital";
  cancellation_reason: string;
  notes?: string | null;
};

export type LogInteractionRequest = {
  interaction_type: string;
  to_status?: PlannedSurgeryStatus | null;
  package_id?: string | null;
  payment_amount?: number | null;
  payment_reference?: string | null;
  notes: string;
};

export type CounsellorInteraction = {
  id: string;
  tenant_id: string;
  advice_id: string;
  counsellor_user_id?: string | null;
  counsellor_name?: string | null;
  interaction_at: string;
  interaction_type: string;
  from_status?: string | null;
  to_status?: string | null;
  package_id?: string | null;
  package_name?: string | null;
  payment_amount?: number | null;
  payment_reference?: string | null;
  notes: string;
  created_at: string;
};

export type SurgeryAdviceHistory = {
  id: string;
  tenant_id: string;
  advice_id: string;
  changed_by_user_id?: string | null;
  changed_by_name?: string | null;
  changed_at: string;
  action_type: string;
  field_name?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  reason?: string | null;
  notes?: string | null;
};

// ============================================
// VISION TYPES
// ============================================

export interface VisionRecord {
  id: string;
  tenant_id: string;
  patient_id: string;
  optometrist_id?: string;
  visit_id: string;

  // Right Eye (OD)
  od_ucva_distance?: string | null;
  od_ph_va?: string | null;
  od_va_with_current_specs?: string | null;
  od_near_ucva?: string | null;
  od_near_with_current_specs?: string | null;

  // Left Eye (OS)
  os_ucva_distance?: string | null;
  os_ph_va?: string | null;
  os_va_with_current_specs?: string | null;
  os_near_ucva?: string | null;
  os_near_with_current_specs?: string | null;

  notes?: string | null;

  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateVisionRequest {
  patient_id: string;
  optometrist_id: string;
  visit_id: string;

  // Right Eye (OD)
  od_ucva_distance?: string | null;
  od_ph_va?: string | null;
  od_va_with_current_specs?: string | null;
  od_near_ucva?: string | null;
  od_near_with_current_specs?: string | null;

  // Left Eye (OS)
  os_ucva_distance?: string | null;
  os_ph_va?: string | null;
  os_va_with_current_specs?: string | null;
  os_near_ucva?: string | null;
  os_near_with_current_specs?: string | null;

  notes?: string | null;
}

export type VisionResponse = VisionRecord;

// ============================================
// CURRENT SPECS TYPES
// ============================================

export type LensType = "SINGLE" | "BIFOCAL" | "PROGRESSIVE";
export type SpecsUsage = "DISTANCE" | "NEAR" | "BOTH";
export type MeasuredBy = "LENSOMETER" | "PATIENT_REPORTED" | "PRESCRIPTION";

export interface CurrentSpecsRecord {
  id: string;
  tenant_id: string;
  patient_id: string;
  optometrist_id: string;
  visit_id: string;

  // Right Eye (OD)
  od_sph?: string | null;
  od_cyl?: string | null;
  od_axis?: number | null;
  od_add?: string | null;

  // Left Eye (OS)
  os_sph?: string | null;
  os_cyl?: string | null;
  os_axis?: number | null;
  os_add?: string | null;

  // Additional fields
  lens_type?: LensType | null;
  usage?: SpecsUsage | null;
  measured_by?: MeasuredBy | null;
  is_comfortable?: boolean | null;
  remarks?: string | null;

  recorded_at: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

// ============================================
// RBAC PERMISSION TYPES
// ============================================

export type UserRole =
  | "admin"
  | "doctor"
  | "nurse"
  | "receptionist"
  | "optometrist"
  | "lab_technician"
  | "platform_owner";

export type ScreenDetail = {
  path: string;
  label: string;
  icon: string;
};

export type UserPermissions = {
  role: UserRole;
  allowed_screens: string[];
  screen_details: ScreenDetail[];
  default_screen?: string;
};

export type ScreenPermission = {
  screen_path: string;
  screen_label: string;
  is_enabled: boolean;
  is_default?: boolean;
};

export type RolePermissions = {
  role: string;
  permissions: ScreenPermission[];
};

export type UserSpecificPermissions = {
  user_id: string;
  user_name: string;
  role: string;
  role_screens: string[];
  additional_screens: string[];
  all_allowed_screens: string[];
};

export type UserPermissionSummary = {
  user_id: string;
  user_name: string;
  role: string;
  additional_screens_count: number;
};

export type AvailableScreen = {
  path: string;
  label: string;
  icon: string;
  category: "main" | "clinical" | "admin" | "reports";
  description?: string;
};

