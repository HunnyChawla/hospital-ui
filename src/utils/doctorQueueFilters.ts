import { Clock, CheckCircle, AlertTriangle, LucideIcon } from "lucide-react";

export interface DoctorQueuePatient {
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
    optometrist_name?: string | null;
    doctor_id?: string | null;
    optometrist_investigation_completed_at?: string | null;
    consultation_started_at?: string | null;
    consultation_ended_at?: string | null;
    dilation_started_at?: string | null;
    dilation_duration_minutes?: number | null;
    dilation_completed_at?: string | null;
}

export interface FilterConfig {
    label: string;
    statuses: string[];
    icon: LucideIcon;
    color: string;
}

export type DoctorQueueFilter = "pending" | "completed" | "no_show";

export const DOCTOR_QUEUE_FILTERS: Record<DoctorQueueFilter, FilterConfig> = {
    pending: {
        label: "Pending",
        statuses: [
            "awaiting_doctor",
            "doctor_assigned",
            "consultation_in_progress",
            "dilation_in_progress",
        ],
        icon: Clock,
        color: "amber",
    },
    completed: {
        label: "Completed",
        statuses: [
            "dilation_completed",
            "consultation_completed",
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

export function filterDoctorQueuePatients(
    patients: DoctorQueuePatient[],
    filter: DoctorQueueFilter
): DoctorQueuePatient[] {
    const filterConfig = DOCTOR_QUEUE_FILTERS[filter];
    if (!filterConfig) return patients;

    return patients.filter((patient) =>
        filterConfig.statuses.includes(patient.status)
    );
}

export function getDoctorQueueCounts(patients: DoctorQueuePatient[]): Record<DoctorQueueFilter, number> {
    const counts: Record<DoctorQueueFilter, number> = {
        pending: 0,
        completed: 0,
        no_show: 0,
    };

    patients.forEach((patient) => {
        if (DOCTOR_QUEUE_FILTERS.no_show.statuses.includes(patient.status)) {
            counts.no_show++;
        } else if (DOCTOR_QUEUE_FILTERS.completed.statuses.includes(patient.status)) {
            counts.completed++;
        } else if (DOCTOR_QUEUE_FILTERS.pending.statuses.includes(patient.status)) {
            counts.pending++;
        }
    });

    return counts;
}

export function getDoctorStatusColor(status: string): string {
    switch (status.toLowerCase()) {
        // Doctor pending statuses
        case "awaiting_doctor":
            return "bg-purple-100 text-purple-700 border-purple-300";
        case "doctor_assigned":
            return "bg-cyan-100 text-cyan-700 border-cyan-300";
        case "consultation_in_progress":
            return "bg-blue-100 text-blue-700 border-blue-300";
        case "dilation_in_progress":
            return "bg-orange-100 text-orange-700 border-orange-300";

        // Completed statuses
        case "dilation_completed":
            return "bg-teal-100 text-teal-700 border-teal-300";
        case "consultation_completed":
            return "bg-emerald-100 text-emerald-700 border-emerald-300";

        // No show status
        case "no_show":
            return "bg-rose-100 text-rose-700 border-rose-300";

        default:
            return "bg-slate-100 text-slate-700 border-slate-300";
    }
}

export function getDoctorStatusLabel(status: string): string {
    switch (status.toLowerCase()) {
        case "awaiting_doctor":
            return "Awaiting Doctor";
        case "doctor_assigned":
            return "Doctor Assigned";
        case "consultation_in_progress":
            return "In Consultation";
        case "dilation_in_progress":
            return "Dilation In Progress";
        case "dilation_completed":
            return "Dilation Completed";
        case "consultation_completed":
            return "Completed";
        case "no_show":
            return "No Show";
        default:
            return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
}
