import { Payment, BillingTransactionRow } from "@/services/paymentsApi";

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

// One flattened, sortable row of the Billing table view: one per date-matching
// payment (or one placeholder per invoice with none in range, or one per
// standalone invoice-less payment) - same-date-only, matching the
// printed/exported report's convention. Shared by BillingManagement's table
// view and BillingTransactionsPrint so both render identical row structure.
export interface BillingTableRow {
  key: string;
  paymentDate: string | null;
  invoiceDate: string;
  paymentId: string | null;
  invoiceNumber: string | null;
  patientName: string | null;
  patientUhid: string | null;
  patientMobile: string | null;
  total: number | null;
  received: number | null;
  pending: number | null;
  method: string | null;
  status: string | null;
  hasPayment: boolean;
  isStandalone: boolean;
  txn: BillingTransactionRow;
}

export function buildTableRows(
  transactions: BillingTransactionRow[],
  startDate: string | undefined,
  endDate: string | undefined
): BillingTableRow[] {
  const rows: BillingTableRow[] = [];

  transactions.forEach((txn) => {
    if (txn.row_type === "invoice") {
      const balance = (txn.total_amount || 0) - (txn.paid_amount || 0);
      const datedPayments = filterPaymentsToDateRange(txn.payments, startDate, endDate);
      const common = {
        invoiceDate: txn.row_date,
        invoiceNumber: txn.invoice_number,
        patientName: txn.patient_name,
        patientUhid: txn.patient_uhid,
        patientMobile: txn.patient_mobile,
        total: txn.total_amount,
        received: txn.paid_amount,
        pending: balance > 0 ? balance : null,
        isStandalone: false,
        txn,
      };
      if (datedPayments.length === 0) {
        rows.push({
          ...common,
          key: `${txn.id}-empty`,
          paymentDate: null,
          paymentId: null,
          method: null,
          status: null,
          hasPayment: false,
        });
      } else {
        datedPayments.forEach((p) => {
          rows.push({
            ...common,
            key: p.id,
            paymentDate: p.payment_date,
            paymentId: p.payment_number,
            method: p.payment_method,
            status: p.status,
            hasPayment: true,
          });
        });
      }
    } else {
      const payment = txn.payment;
      rows.push({
        key: txn.id,
        paymentDate: payment?.payment_date ?? null,
        invoiceDate: txn.row_date,
        paymentId: payment?.payment_number ?? null,
        invoiceNumber: null,
        patientName: txn.patient_name,
        patientUhid: txn.patient_uhid,
        patientMobile: txn.patient_mobile,
        total: null,
        received: payment?.amount ?? null,
        pending: null,
        method: payment?.payment_method ?? null,
        status: payment?.status ?? null,
        hasPayment: !!payment,
        isStandalone: true,
        txn,
      });
    }
  });

  return rows;
}
