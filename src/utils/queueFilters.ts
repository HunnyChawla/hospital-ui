import { List, Clock, LucideIcon } from "lucide-react";
import type { QueueFilter } from "@/hooks/useDoctorPanelPreferences";

export interface QueuePatient {
  patient_id: string;
  patient_name: string;
  token_number: string | number;
  status: string;
  visit_type?: "walk_in" | "appointment" | "emergency";
  item_id: string;
  time: string;
}

export interface FilterConfig {
  label: string;
  statuses: string[];
  icon: LucideIcon;
  color: string;
}

export const QUEUE_FILTERS: Record<QueueFilter, FilterConfig> = {
  all: {
    label: "All",
    statuses: ["scheduled", "checked_in", "in_consultation", "completed"],
    icon: List,
    color: "slate",
  },
  pending: {
    label: "Pending",
    statuses: ["checked_in"],
    icon: Clock,
    color: "amber",
  },
};

export function filterQueuePatients(
  patients: QueuePatient[],
  filter: QueueFilter
): QueuePatient[] {
  const filterConfig = QUEUE_FILTERS[filter];
  if (!filterConfig) return patients;

  return patients.filter((patient) =>
    filterConfig.statuses.includes(patient.status)
  );
}

export function getQueueCounts(patients: QueuePatient[]): Record<QueueFilter, number> {
  const counts: Record<QueueFilter, number> = {
    all: patients.length,
    pending: 0,
  };

  patients.forEach((patient) => {
    if (QUEUE_FILTERS.pending.statuses.includes(patient.status)) {
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
