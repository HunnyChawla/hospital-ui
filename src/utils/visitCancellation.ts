import type { VisitStatus } from "@/services/opdVisitsApi";

/**
 * OPD cancellation policy - mirrors the backend guards in
 * `hms/opd/domain/models.py` (NON_CANCELLABLE_VISIT_STATUSES /
 * ADMIN_ONLY_CANCELLABLE_VISIT_STATUSES). Keep the two in step: this file only
 * decides whether to *offer* the button, the backend is what actually enforces
 * the rule.
 *
 * Cancellation stays open for the whole encounter and closes once the
 * consultation is over, because at that point the consultation fee has been
 * earned. The backend additionally refuses to cancel any visit that already
 * has a finalized prescription, which the UI cannot cheaply check per row.
 */

/** Statuses a visit can no longer be cancelled from. */
const NON_CANCELLABLE_STATUSES: ReadonlySet<VisitStatus> = new Set<VisitStatus>([
  "consultation_completed",
  "completed",
  "cancelled",
]);

/** Statuses only an admin may cancel from - the doctor has already begun. */
const ADMIN_ONLY_STATUSES: ReadonlySet<VisitStatus> = new Set<VisitStatus>([
  "in_consultation",
  "consultation_in_progress",
  "dilation_in_progress",
  "dilation_completed",
]);

const ADMIN_ROLES: ReadonlySet<string> = new Set(["admin", "platform_owner"]);

/** Whether the Cancel action should be offered for this visit and user. */
export function canCancelVisit(status: VisitStatus, userRole?: string | null): boolean {
  if (NON_CANCELLABLE_STATUSES.has(status)) return false;
  if (ADMIN_ONLY_STATUSES.has(status)) return ADMIN_ROLES.has(userRole || "");
  return true;
}

/**
 * Whether cancelling from this status needs an explicit reason. Clinical work
 * has started, so "why" matters for the audit trail. The reason field is
 * required by the API in every case; this only drives extra UI emphasis.
 */
export function cancelRequiresReason(status: VisitStatus): boolean {
  return status !== "checked_in" && status !== "checked_in_opd";
}

/** Common cancellation reasons offered in the cancellation modal. */
export const VISIT_CANCELLATION_REASONS: readonly string[] = [
  "Patient left without consultation",
  "Patient requested cancellation",
  "Duplicate / wrong entry",
  "Doctor unavailable",
  "Referred to another facility",
  "Payment collected in error",
];
