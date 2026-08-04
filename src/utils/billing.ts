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
  // Null for standalone (invoice-less) payments - there's no invoice, so
  // showing a date under this label would be misleading.
  invoiceDate: string | null;
  paymentId: string | null;
  invoiceNumber: string | null;
  // The invoice's own id, resolved regardless of row shape - `txn.id` for a
  // row_type="invoice" row, `txn.invoice_id` for a row_type="payment" row
  // that has one (Payments feed scope). Null when there's genuinely no
  // invoice. Use this (not txn.id) to key Collect/Print Invoice/View actions.
  invoiceId: string | null;
  patientName: string | null;
  patientUhid: string | null;
  patientMobile: string | null;
  // The invoice's service type (opd/ipd/lab/surgery) for invoice rows; for
  // standalone (invoice-less) payments there's no invoice to derive a type
  // from, so this falls back to the payment's own service_category (already
  // derived server-side, e.g. "Surgery Advance: ...").
  serviceType: string | null;
  // This specific transaction's own amount - distinct from total/received/
  // pending below, which are the invoice's aggregate state and repeat
  // identically across every payment row belonging to the same invoice.
  transactionAmount: number | null;
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
        invoiceId: txn.id,
        serviceType: txn.invoice_type,
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
          transactionAmount: null,
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
            transactionAmount: p.amount,
            method: p.payment_method,
            status: p.status,
            hasPayment: true,
          });
        });
      }
    } else {
      // row_type="payment": invoice-less in Combined/Invoices scope, but in
      // Payments scope may carry a real linked invoice - key off
      // txn.invoice_number presence rather than assuming invoice-less.
      const payment = txn.payment;
      const hasInvoice = !!txn.invoice_number;
      const balance = hasInvoice ? (txn.total_amount || 0) - (txn.paid_amount || 0) : 0;
      rows.push({
        key: txn.id,
        paymentDate: payment?.payment_date ?? null,
        invoiceDate: txn.invoice_date ?? null,
        paymentId: payment?.payment_number ?? null,
        invoiceNumber: txn.invoice_number ?? null,
        invoiceId: txn.invoice_id ?? null,
        serviceType: txn.invoice_type ?? payment?.service_category ?? null,
        patientName: txn.patient_name,
        patientUhid: txn.patient_uhid,
        patientMobile: txn.patient_mobile,
        transactionAmount: payment?.amount ?? null,
        total: hasInvoice ? txn.total_amount : null,
        received: hasInvoice ? txn.paid_amount : (payment?.amount ?? null),
        pending: hasInvoice && balance > 0 ? balance : null,
        method: payment?.payment_method ?? null,
        status: payment?.status ?? null,
        hasPayment: !!payment,
        isStandalone: !hasInvoice,
        txn,
      });
    }
  });

  return rows;
}
