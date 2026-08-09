import { Clock, CheckCircle, AlertTriangle, LucideIcon } from "lucide-react";

export interface ClinicQueuePatient {
  patient_id: string;
  patient_name: string;
  patient_uhid: string | null;
  patient_mobile?: string;
  patient_category?: string | null;
  token_number: string | number;
  status: string;
  visit_type?: "walk_in" | "appointment" | "emergency";
  visit_id: string;
  item_id: string;
  time: string;
  checked_in_at?: string;
  examiner_id?: string | null;
  examiner_name?: string | null;
  examiner_assigned_at?: string | null;
  examination_started_at?: string | null;
  examination_completed_at?: string | null;
  expected_next_status_time?: string | null;
  picked_by_doctor_id?: string | null;
  picked_by_doctor_name?: string | null;
  is_revisit?: boolean;
}

export interface FilterConfig {
  label: string;
  statuses: string[];
  icon: LucideIcon;
  color: string;
}

export type ClinicQueueFilter = "pending" | "completed" | "no_show";

export const CLINIC_QUEUE_FILTERS: Record<ClinicQueueFilter, FilterConfig> = {
  pending: {
    label: "Pending",
    statuses: ["awaiting_examiner", "examiner_assigned", "examination_in_progress"],
    icon: Clock,
    color: "amber",
  },
  completed: {
    label: "Completed",
    statuses: [
      "examination_completed",
      "awaiting_doctor",
      "doctor_assigned",
      "consultation_in_progress",
      "consultation_completed",
      "completed",
    ],
    icon: CheckCircle,
    color: "emerald",
  },
  no_show: {
    label: "No Show",
    statuses: ["no_show"],
    icon: AlertTriangle,
    color: "rose",
  },
};

/**
 * Default English labels for every status the clinic panel renders.
 * useTenantLabels() resolves through the tenant's overrides first and falls
 * back here, so this map is the shipped vocabulary, not the final word.
 */
export const DEFAULT_STATUS_LABELS: Record<string, string> = {
  checked_in: "Checked In",
  awaiting_examiner: "Awaiting Examiner",
  examiner_assigned: "Examiner Assigned",
  examination_in_progress: "Examination In Progress",
  examination_completed: "Examination Completed",
  awaiting_doctor: "Awaiting Doctor",
  doctor_assigned: "Doctor Assigned",
  consultation_in_progress: "Consultation In Progress",
  consultation_completed: "Consultation Completed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export function filterClinicQueuePatients(
  patients: ClinicQueuePatient[],
  filter: ClinicQueueFilter,
  currentExaminerId?: string | null,
  allowPickAny: boolean = false // only affects awaiting_examiner pick access, NOT isolation
): ClinicQueuePatient[] {
  const filterConfig = CLINIC_QUEUE_FILTERS[filter];
  if (!filterConfig) return patients;

  return patients.filter((patient) => {
    if (!filterConfig.statuses.includes(patient.status)) {
      return false;
    }

    // Isolation: patients already picked (examiner_assigned /
    // examination_in_progress) are ONLY visible to the examiner they are
    // assigned to. This applies regardless of allowPickAny — that flag only
    // controls picking from the awaiting_examiner pool, not visibility of
    // already-assigned patients.
    if (
      filter === "pending" &&
      (patient.status === "examiner_assigned" ||
        patient.status === "examination_in_progress") &&
      patient.examiner_id // patient is assigned to a specific examiner
    ) {
      if (!currentExaminerId || patient.examiner_id !== currentExaminerId) {
        return false;
      }
    }

    return true;
  });
}

export function getClinicQueueCounts(
  patients: ClinicQueuePatient[]
): Record<ClinicQueueFilter, number> {
  const counts: Record<ClinicQueueFilter, number> = {
    pending: 0,
    completed: 0,
    no_show: 0,
  };

  patients.forEach((patient) => {
    if (CLINIC_QUEUE_FILTERS.no_show.statuses.includes(patient.status)) {
      counts.no_show++;
    } else if (CLINIC_QUEUE_FILTERS.completed.statuses.includes(patient.status)) {
      counts.completed++;
    } else if (CLINIC_QUEUE_FILTERS.pending.statuses.includes(patient.status)) {
      counts.pending++;
    }
  });

  return counts;
}

export function getStatusColor(status: string): string {
  switch ((status || "").toLowerCase()) {
    // Pending statuses
    case "awaiting_examiner":
      return "bg-amber-100 text-amber-700 border-amber-300";
    case "examiner_assigned":
      return "bg-blue-100 text-blue-700 border-blue-300";
    case "examination_in_progress":
      return "bg-indigo-100 text-indigo-700 border-indigo-300";

    // Completed statuses
    case "examination_completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "awaiting_doctor":
      return "bg-purple-100 text-purple-700 border-purple-300";
    case "doctor_assigned":
      return "bg-cyan-100 text-cyan-700 border-cyan-300";
    case "consultation_in_progress":
      return "bg-blue-100 text-blue-700 border-blue-300";
    case "consultation_completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-300";

    // Legacy / shared statuses
    case "scheduled":
      return "bg-slate-100 text-slate-700 border-slate-300";
    case "waiting":
    case "checked_in":
      return "bg-amber-100 text-amber-700 border-amber-300";
    case "in_consultation":
    case "in consultation":
      return "bg-blue-100 text-blue-700 border-blue-300";
    case "completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-300";

    // No show status
    case "no_show":
      return "bg-rose-100 text-rose-700 border-rose-300";

    default:
      return "bg-slate-100 text-slate-700 border-slate-300";
  }
}
