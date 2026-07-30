export type DayCareStatus =
  | "scheduled"
  | "checked_in"
  | "pre_assessment_completed"
  | "ready_for_ot"
  | "in_ot"
  | "recovery"
  | "discharged"
  | "cancelled"
  | "postponed"
  | "no_show";

export type AnaesthesiaType = "local" | "topical" | "general" | "sedation";

export interface DayCareTimelineEntry {
  step: number;
  label: string;
  status: DayCareStatus;
  timestamp: string | null;
  completed: boolean;
}

export interface DayCareVisit {
  id: string;
  tenant_id: string;
  planned_surgery_id: string;
  patient_id: string;
  patient_name?: string;
  patient_gender?: string;
  patient_age?: number;
  patient_mobile?: string;
  patient_uhid?: string;
  surgeon_id: string;
  surgeon_name?: string;
  surgery_name: string;
  visit_date: string;
  status: DayCareStatus;
  check_in_at: string | null;
  pre_assessment_at: string | null;
  ready_for_ot_at: string | null;
  in_ot_at: string | null;
  recovery_at: string | null;
  discharged_at: string | null;
  invoice_id: string | null;
  invoice_number?: string | null;
  payment_id: string | null;
  cancellation_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  timeline?: DayCareTimelineEntry[];
  anatomy_site_name?: string | null;
  eye?: string | null;
}

export interface CreateDayCareVisitRequest {
  planned_surgery_id: string;
  visit_date?: string;
}

export interface TransitionStatusRequest {
  to_status: DayCareStatus;
  notes?: string;
  cancellation_reason?: string;
}

export interface DayCareClinicalAssessment {
  id: string;
  visit_id: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  pulse: number | null;
  temperature: number | null;
  spo2: number | null;
  weight: number | null;
  has_diabetes: boolean | null;
  has_hypertension: boolean | null;
  has_cardiac_history: boolean | null;
  rbs: string | null;
  hcv_status: string | null;
  hiv_status: string | null;
  allergies: string | null;
  current_medications: string | null;
  risk_assessment_notes: string | null;
  documents?: { name: string; url: string; type: string }[];
}

export interface DayCarePreparationChecklist {
  id: string;
  visit_id: string;
  identity_verified: boolean;
  consent_signed: boolean;
  payment_cleared: boolean;
  site_marked: boolean;
  investigations_reviewed: boolean;
  npo_status_verified: boolean;
  right_eye_details?: { dilated: boolean; corneal_thickness: string; iol_details: string } | null;
  left_eye_details?: { dilated: boolean; corneal_thickness: string; iol_details: string } | null;
  checklist_notes: string | null;
}

export interface ConsumableItem {
  item: string;
  quantity: number;
  unit_price: number;
}

export interface DayCareOTRecord {
  id: string;
  visit_id: string;
  procedure_name: string | null;
  procedure_start_time: string | null;
  procedure_end_time: string | null;
  surgeon_id: string | null;
  assistant_name: string | null;
  scrub_nurse_name: string | null;
  anaesthetist_name: string | null;
  anaesthesia_type: AnaesthesiaType | null;
  reason_for_gvp: string | null;
  consumables?: ConsumableItem[] | null;
  findings: string | null;
  procedure_notes: string | null;
  complications: string | null;
  attachments?: { name: string; url: string; type: string }[];
}

export interface MonitoringEntry {
  time: string;
  bp_systolic: number;
  bp_diastolic: number;
  pulse: number;
  spo2: number;
}

export interface DayCareRecoveryRecord {
  id: string;
  visit_id: string;
  monitoring_records: MonitoringEntry[];
  recovery_notes: string | null;
  medication_given: string | null;
  stable_vitals: boolean;
  is_conscious: boolean;
  pain_controlled: boolean;
  no_active_bleeding: boolean;
  can_walk: boolean;
  attendant_present: boolean;
}

export interface DischargeMedicationItem {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface DayCareDischargeRecord {
  id: string;
  visit_id: string;
  diagnosis: string | null;
  procedure_performed: string | null;
  discharge_summary: string | null;
  medications?: DischargeMedicationItem[] | null;
  follow_up_date: string | null;
  follow_up_instructions: string | null;
  discharge_summary_pdf_url: string | null;
}
export type DayCareTimelineStep = {
  step: number;
  label: string;
  status: DayCareStatus;
  timestamp: string | null;
  completed: boolean;
};

export interface HospitalPrintInfo {
  name: string | null;
  address: string | null;
  contact_number: string | null;
}

export interface PatientPrintInfo {
  name: string | null;
  age: string | null;
  gender: string | null;
  uhid: string | null;
  mobile: string | null;
}

export interface AdmissionPrintInfo {
  admission_date: string | null;
  discharge_date: string | null;
  category: string | null;
  consultant_name: string | null;
}

export interface SystemicHistoryPrintInfo {
  rbs: string | null;
  bp: string | null;
  hcv: string | null;
  hiv: string | null;
}

export interface ClinicalDetailsPrintInfo {
  diagnosis: string | null;
  chief_complaints: string | null;
  systemic_history: SystemicHistoryPrintInfo;
  reason_for_admission: string | null;
}

export interface ProcedureDetailsPrintInfo {
  procedure_name: string | null;
  reason_for_gvp: string | null;
  condition_on_discharge: string | null;
  hospital_stay: string | null;
  medicine_administered: string | null;
}

export interface DischargeSummaryPrintResponse {
  hospital_info: HospitalPrintInfo;
  patient_info: PatientPrintInfo;
  admission_info: AdmissionPrintInfo;
  clinical_details: ClinicalDetailsPrintInfo;
  procedure_details: ProcedureDetailsPrintInfo;
  medications: any[];
  right_eye_details?: any | null;
  left_eye_details?: any | null;
}
