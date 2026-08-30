export type OrderCategory =
  | "medication"
  | "lab"
  | "radiology"
  | "procedure"
  | "diet"
  | "nursing_instruction"
  | "other";

export type OrderPriority = "routine" | "urgent" | "stat";
export type OrderStatus = "active" | "completed" | "discontinued" | "cancelled";
export type MedicationStatus = "active" | "discontinued" | "completed";
export type MarStatus = "given" | "missed" | "refused" | "held";

export interface IpdOrder {
  id: string;
  tenant_id: string;
  admission_id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name?: string | null;
  order_number: string;
  order_category: OrderCategory | string;
  order_title: string;
  instructions?: string | null;
  priority: OrderPriority | string;
  status: OrderStatus | string;
  lab_test_id?: string | null;
  booking_id?: string | null;
  booking_number?: string | null;
  booking_status?: string | null;
  has_results?: boolean;
  ordered_at: string;
  discontinued_at?: string | null;
  discontinue_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IpdMedicationOrder {
  id: string;
  tenant_id: string;
  order_id?: string | null;
  admission_id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name?: string | null;
  medicine_id?: string | null;
  medicine_name: string;
  generic_name?: string | null;
  dose: string;
  route: string;
  frequency: string;
  start_date_time: string;
  stop_date_time?: string | null;
  is_sos: boolean;
  sos_condition?: string | null;
  instructions?: string | null;
  status: MedicationStatus | string;
  discontinued_at?: string | null;
  discontinue_reason?: string | null;
  last_administered_at?: string | null;
  total_doses_given: number;
  created_at: string;
  updated_at: string;
}

export interface IpdProgressNote {
  id: string;
  tenant_id: string;
  admission_id: string;
  patient_id: string;
  doctor_id?: string | null;
  author_name?: string | null;
  note_date: string;
  note_time: string;
  note_type: "doctor_daily" | "nursing_shift" | "consultant_round" | string;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicationAdministration {
  id: string;
  tenant_id: string;
  admission_id: string;
  medication_order_id: string;
  patient_id: string;
  medicine_name?: string | null;
  dose?: string | null;
  route?: string | null;
  frequency?: string | null;
  administered_by_user_id?: string | null;
  administered_by_name: string;
  administered_at: string;
  status: MarStatus | string;
  dose_given: string;
  notes?: string | null;
  created_at: string;
}

export interface IpdAdmittedPatient {
  admission_id: string;
  admission_number: string;
  patient_id: string;
  patient_name: string;
  uhid: string;
  age?: number | null;
  gender?: string | null;
  mobile?: string | null;
  bed_id?: string | null;
  bed_number?: string | null;
  ward_id?: string | null;
  ward_name?: string | null;
  doctor_id: string;
  doctor_name: string;
  admission_date: string;
  admission_time: string;
  admission_type: string;
  status: string;
  diagnosis?: string | null;
  reason_for_admission?: string | null;
  days_admitted: number;
  active_medications_count: number;
  active_orders_count: number;
  latest_vitals?: {
    systolic_bp?: number | null;
    diastolic_bp?: number | null;
    pulse_rate?: number | null;
    temperature?: number | null;
    spo2?: number | null;
    respiratory_rate?: number | null;
    recorded_at?: string | null;
  } | null;
}

export interface IpdPatientChart {
  admission: {
    id: string;
    admission_number: string;
    admission_date: string;
    admission_time: string;
    admission_type: string;
    status: string;
    diagnosis?: string | null;
    reason_for_admission?: string | null;
    doctor_id: string;
    doctor_name: string;
    ward_name?: string | null;
    bed_number?: string | null;
    days_admitted: number;
    discharge_date?: string | null;
    discharge_summary?: string | null;
    discharge_instructions?: string | null;
    final_diagnosis?: string | null;
  };
  patient: {
    id: string;
    name: string;
    uhid: string;
    age?: number | null;
    gender?: string | null;
    mobile?: string | null;
    blood_group?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  };
  active_medications: IpdMedicationOrder[];
  discontinued_medications: IpdMedicationOrder[];
  orders: IpdOrder[];
  mar_timeline: MedicationAdministration[];
  progress_notes: IpdProgressNote[];
  vitals: any[];
  lab_bookings: any[];
}

export interface DischargeMedicationItem {
  medicine_name: string;
  generic_name?: string | null;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  timing?: string | null;
  instructions?: string | null;
}

export interface AutoFillDischargeSummary {
  admission_id: string;
  admission_number: string;
  patient_id: string;
  patient_name: string;
  uhid: string;
  age?: number | null;
  gender?: string | null;
  mobile?: string | null;
  address?: string | null;
  doctor_id: string;
  doctor_name: string;
  ward_name?: string | null;
  bed_number?: string | null;
  admission_date: string;
  admission_time: string;
  discharge_date: string;
  discharge_time: string;
  length_of_stay_days: number;
  discharge_type: string;
  condition_at_discharge: string;
  provisional_diagnosis?: string | null;
  final_diagnosis: string;
  chief_complaints?: string | null;
  clinical_course: string;
  admission_vitals_summary?: string | null;
  discharge_vitals_summary?: string | null;
  investigations_summary?: string | null;
  hospital_treatment_summary?: string | null;
  discharge_medications: DischargeMedicationItem[];
  discharge_advice?: string | null;
  diet_advice?: string | null;
  activity_advice?: string | null;
  emergency_warning_signs?: string | null;
  followup_date?: string | null;
  followup_instructions?: string | null;
}

export interface SaveDischargeSummaryRequest {
  discharge_date: string;
  discharge_time?: string | null;
  discharge_type: string;
  condition_at_discharge: string;
  provisional_diagnosis?: string | null;
  final_diagnosis: string;
  chief_complaints?: string | null;
  clinical_course?: string | null;
  admission_vitals_summary?: string | null;
  discharge_vitals_summary?: string | null;
  investigations_summary?: string | null;
  hospital_treatment_summary?: string | null;
  discharge_medications?: DischargeMedicationItem[] | null;
  discharge_advice?: string | null;
  diet_advice?: string | null;
  activity_advice?: string | null;
  emergency_warning_signs?: string | null;
  followup_date?: string | null;
  followup_instructions?: string | null;
}

export interface IpdDischargeSummaryResponse {
  id: string;
  tenant_id: string;
  admission_id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name?: string | null;
  admission_date: string;
  discharge_date: string;
  discharge_type: string;
  condition_at_discharge: string;
  provisional_diagnosis?: string | null;
  final_diagnosis: string;
  chief_complaints?: string | null;
  clinical_course?: string | null;
  admission_vitals_summary?: string | null;
  discharge_vitals_summary?: string | null;
  investigations_summary?: string | null;
  hospital_treatment_summary?: string | null;
  discharge_medications?: any[] | null;
  discharge_advice?: string | null;
  diet_advice?: string | null;
  activity_advice?: string | null;
  emergency_warning_signs?: string | null;
  followup_date?: string | null;
  followup_instructions?: string | null;
  is_finalized: boolean;
  created_at: string;
  updated_at: string;
}
