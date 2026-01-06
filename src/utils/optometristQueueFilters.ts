import { Clock, CheckCircle, LucideIcon } from "lucide-react";

export interface OptometristQueuePatient {
  patient_id: string;
  patient_name: string;
  patient_uhid: string | null;
  patient_mobile?: string;
  token_number: string | number;
  status: string;
  visit_type?: "walk_in" | "appointment" | "emergency";
  visit_id: string;
  item_id: string;
  time: string;
  checked_in_at?: string;
  optometrist_id?: string | null;
  optometrist_assigned_at?: string | null;
  optometrist_investigation_started_at?: string | null;
  optometrist_investigation_completed_at?: string | null;
  dilation_started_at?: string | null;
  dilation_duration_minutes?: number | null;
  dilation_completed_at?: string | null;
  expected_next_status_time?: string | null;
}

export interface FilterConfig {
  label: string;
  statuses: string[];
  icon: LucideIcon;
  color: string;
}

export const OPTOMETRIST_QUEUE_FILTERS: Record<"pending" | "completed", FilterConfig> = {
  pending: {
    label: "Pending",
    statuses: [
      "awaiting_optometrist",
      "optometrist_assigned",
      "optometrist_investigation_in_progress",
    ],
    icon: Clock,
    color: "amber",
  },
  completed: {
    label: "Completed",
    statuses: [
      "optometrist_investigation_completed",
      "awaiting_doctor",
      "doctor_assigned",
      "consultation_in_progress",
      "dilation_in_progress",
      "dilation_completed",
      "consultation_completed",
    ],
    icon: CheckCircle,
    color: "emerald",
  },
};

export function filterOptometristQueuePatients(
  patients: OptometristQueuePatient[],
  filter: "pending" | "completed"
): OptometristQueuePatient[] {
  const filterConfig = OPTOMETRIST_QUEUE_FILTERS[filter];
  if (!filterConfig) return patients;

  return patients.filter((patient) =>
    filterConfig.statuses.includes(patient.status)
  );
}

export function getOptometristQueueCounts(patients: OptometristQueuePatient[]): Record<"pending" | "completed", number> {
  const counts = {
    pending: 0,
    completed: 0,
  };

  const pendingStatuses = OPTOMETRIST_QUEUE_FILTERS.pending.statuses;
  const completedStatuses = OPTOMETRIST_QUEUE_FILTERS.completed.statuses;

  patients.forEach((patient) => {
    if (completedStatuses.includes(patient.status)) {
      counts.completed++;
    } else if (pendingStatuses.includes(patient.status)) {
      counts.pending++;
    }
  });

  return counts;
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    // Pending statuses
    case "awaiting_optometrist":
      return "bg-amber-100 text-amber-700 border-amber-300";
    case "optometrist_assigned":
      return "bg-blue-100 text-blue-700 border-blue-300";
    case "optometrist_investigation_in_progress":
      return "bg-indigo-100 text-indigo-700 border-indigo-300";
    
    // Completed statuses
    case "optometrist_investigation_completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "awaiting_doctor":
      return "bg-purple-100 text-purple-700 border-purple-300";
    case "doctor_assigned":
      return "bg-cyan-100 text-cyan-700 border-cyan-300";
    case "consultation_in_progress":
      return "bg-blue-100 text-blue-700 border-blue-300";
    case "dilation_in_progress":
      return "bg-orange-100 text-orange-700 border-orange-300";
    case "dilation_completed":
      return "bg-teal-100 text-teal-700 border-teal-300";
    case "consultation_completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-300";
    
    // Legacy statuses (for backward compatibility)
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
    
    default:
      return "bg-slate-100 text-slate-700 border-slate-300";
  }
}

export function getStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case "awaiting_optometrist":
      return "Awaiting Optometrist";
    case "optometrist_assigned":
      return "Assigned";
    case "optometrist_investigation_in_progress":
      return "Investigation In Progress";
    case "optometrist_investigation_completed":
      return "Investigation Completed";
    case "awaiting_doctor":
      return "Awaiting Doctor";
    case "doctor_assigned":
      return "Doctor Assigned";
    case "consultation_in_progress":
      return "Consultation In Progress";
    case "dilation_in_progress":
      return "Dilation In Progress";
    case "dilation_completed":
      return "Dilation Completed";
    case "consultation_completed":
      return "Consultation Completed";
    default:
      return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
}
