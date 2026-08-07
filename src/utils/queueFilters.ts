import { List, Clock, Stethoscope, CheckCircle2, AlertTriangle, LucideIcon } from "lucide-react";
import type { QueueFilter } from "@/hooks/useDoctorPanelPreferences";
import type { StageBucket } from "@/services/pathwaysApi";
import { bucketForStatus, type StageIndex } from "@/utils/stageBuckets";

export interface QueuePatient {
  patient_id: string;
  patient_name: string;
  token_number: string | number;
  status: string;
  /** The pathway's wording for the stage. Falls back to the status if absent. */
  stage_label?: string;
  /** Who currently holds this patient, for the release action. */
  assignments?: { role: string; user_id: string; user_name: string | null }[];
  visit_type?: "walk_in" | "appointment" | "emergency";
  item_id: string;
  time: string;
}

export interface FilterConfig {
  label: string;
  /**
   * Buckets rather than status codes.
   *
   * These filters used to list statuses by name, and the list was four long:
   * scheduled, checked_in, in_consultation, completed. Anything else — most
   * importantly `doctor_assigned`, which is where a patient lands the moment
   * they are called — matched no filter at all, including "All", so calling a
   * patient made them disappear from the queue.
   *
   * Buckets are computed from the pathway server-side, so every stage of every
   * pathway lands in exactly one of them and nothing can fall through.
   */
  buckets: StageBucket[];
  icon: LucideIcon;
  color: string;
}

export const QUEUE_FILTERS: Record<QueueFilter, FilterConfig> = {
  all: {
    label: "All",
    buckets: [
      "pending_assistant",
      "with_assistant",
      "pending_doctor",
      "with_doctor",
      "completed",
      "not_attended",
    ],
    icon: List,
    color: "slate",
  },
  pending: {
    label: "Waiting",
    buckets: ["pending_assistant", "with_assistant", "pending_doctor"],
    icon: Clock,
    color: "amber",
  },
  in_progress: {
    label: "With me",
    buckets: ["with_doctor"],
    icon: Stethoscope,
    color: "blue",
  },
  completed: {
    label: "Done",
    buckets: ["completed"],
    icon: CheckCircle2,
    color: "emerald",
  },
  no_show: {
    label: "No show",
    buckets: ["not_attended"],
    icon: AlertTriangle,
    color: "rose",
  },
};

export function filterQueuePatients(
  patients: QueuePatient[],
  filter: QueueFilter,
  stages: StageIndex
): QueuePatient[] {
  const filterConfig = QUEUE_FILTERS[filter];
  if (!filterConfig) return patients;

  return patients.filter((patient) =>
    filterConfig.buckets.includes(bucketForStatus(patient.status, stages))
  );
}

export function getQueueCounts(
  patients: QueuePatient[],
  stages: StageIndex
): Record<QueueFilter, number> {
  const counts = {
    all: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    no_show: 0,
  } as Record<QueueFilter, number>;

  for (const patient of patients) {
    const bucket = bucketForStatus(patient.status, stages);
    for (const key of Object.keys(QUEUE_FILTERS) as QueueFilter[]) {
      if (QUEUE_FILTERS[key].buckets.includes(bucket)) counts[key]++;
    }
  }

  return counts;
}

/**
 * The colour for a stage's chip.
 *
 * Keyed on the bucket, not on the status string. The old version switched over
 * four hard-coded statuses and returned grey for everything else, so a hospital
 * whose pathway used any other stage code got an unstyled queue.
 */
const BUCKET_COLOURS: Record<StageBucket, string> = {
  pending_assistant: "bg-amber-100 text-amber-700 border-amber-300",
  with_assistant: "bg-purple-100 text-purple-700 border-purple-300",
  pending_doctor: "bg-sky-100 text-sky-700 border-sky-300",
  with_doctor: "bg-blue-100 text-blue-700 border-blue-300",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-300",
  not_attended: "bg-rose-100 text-rose-700 border-rose-300",
};

export function getStatusColor(status: string, stages: StageIndex): string {
  return BUCKET_COLOURS[bucketForStatus(status, stages)];
}
