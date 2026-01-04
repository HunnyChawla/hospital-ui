import { Clock, CheckCircle, LucideIcon } from "lucide-react";

export interface OptometristQueuePatient {
  patient_id: string;
  patient_name: string;
  patient_uhid: string | null;
  token_number: string | number;
  status: string;
  visit_type?: "walk_in" | "appointment" | "emergency";
  visit_id: string;
  item_id: string;
  time: string;
  checked_in_at?: string;
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
    statuses: ["scheduled", "waiting", "checked_in", "in_consultation", "in consultation"],
    icon: Clock,
    color: "amber",
  },
  completed: {
    label: "Completed",
    statuses: ["completed"],
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

  patients.forEach((patient) => {
    if (patient.status === "completed") {
      counts.completed++;
    } else {
      counts.pending++;
    }
  });

  return counts;
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
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
