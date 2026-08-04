import { Payment } from "@/services/paymentsApi";

/**
 * Restrict a list of payments to those dated within [startDate, endDate]
 * (ISO date string comparison, matching the backend's UTC-date semantics in
 * PaymentService._filter_payments_to_date_range). Returns `payments`
 * unchanged when no date filter is set. Shared by the Billing table view and
 * the printed report so both apply the exact same same-date-only rule.
 */
export function filterPaymentsToDateRange(payments: Payment[], startDate?: string, endDate?: string): Payment[] {
  if (!startDate && !endDate) return payments;
  return payments.filter((p) => {
    const d = p.payment_date.slice(0, 10);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });
}
