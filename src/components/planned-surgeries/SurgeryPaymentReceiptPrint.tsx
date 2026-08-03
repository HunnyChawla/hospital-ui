"use client";

import { useEffect, useState } from "react";
import { Payment, paymentsApi } from "@/services/paymentsApi";
import { useTenant } from "@/hooks/useTenant";
import { formatDate, currency } from "@/utils/format";
import { PrintHeader } from "@/components/common/PrintHeader";

interface SurgeryPaymentReceiptPrintProps {
    paymentId: string;
    onReady?: () => void;
}

/**
 * Single-payment receipt for surgery advance/balance payments. Unlike
 * InvoicePaymentReceiptPrint (which prints every payment linked to an
 * invoice), surgery advances are frequently collected before any invoice
 * exists (invoice_id is null until SurgeryBillingService.generate_invoice
 * runs), so this fetches by paymentId directly instead.
 */
export function SurgeryPaymentReceiptPrint({ paymentId, onReady }: SurgeryPaymentReceiptPrintProps) {
    const { tenant } = useTenant();
    const [payment, setPayment] = useState<Payment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await paymentsApi.getById(paymentId);
                setPayment(data);
            } catch (err: any) {
                console.error("Failed to fetch payment receipt data:", err);
                setError(err?.response?.data?.detail || err?.message || "Failed to fetch payment receipt");
            } finally {
                setLoading(false);
                setTimeout(() => onReady?.(), 150);
            }
        };
        if (paymentId) fetchData();
    }, [paymentId, onReady]);

    if (loading) {
        return (
            <div className="mx-auto max-w-2xl bg-white p-4 print:p-2">
                <div className="text-center py-8">
                    <p className="text-slate-600">Loading payment receipt...</p>
                </div>
            </div>
        );
    }

    if (error || !payment) {
        return (
            <div className="mx-auto max-w-2xl bg-white p-4 print:p-2">
                <div className="text-center py-8">
                    <p className="text-red-600">Error: {error || "Payment not found"}</p>
                </div>
            </div>
        );
    }

    const isRefund = payment.amount < 0;

    return (
        <div className="mx-auto max-w-2xl bg-white p-4 print:p-2">
            <PrintHeader
                tenant={tenant}
                documentType={isRefund ? "Refund Receipt" : "Payment Receipt"}
                invoiceNumber={payment.invoice_number || undefined}
            />

            <div className="mb-3 rounded border border-emerald-500 bg-emerald-50 p-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <p className="text-[10px] text-slate-600">Receipt Number</p>
                        <p className="text-sm font-bold text-slate-900">{payment.payment_number}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-600">Payment Date</p>
                        <p className="text-sm font-bold text-emerald-600">{formatDate(payment.payment_date)}</p>
                    </div>
                </div>
            </div>

            <div className="mb-3 space-y-1">
                <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
                    Patient Details
                </h2>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <p className="text-[10px] text-slate-600">Patient Name</p>
                        <p className="font-semibold text-slate-900">{payment.patient_name || "Unknown"}</p>
                    </div>
                    {payment.patient_mobile && (
                        <div>
                            <p className="text-[10px] text-slate-600">Mobile Number</p>
                            <p className="font-semibold text-slate-900">{payment.patient_mobile}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-3 space-y-1">
                <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
                    Payment Details
                </h2>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <p className="text-[10px] text-slate-600">Method</p>
                        <p className="font-semibold text-slate-900 capitalize">{payment.payment_method}</p>
                    </div>
                    {payment.payment_reference && (
                        <div>
                            <p className="text-[10px] text-slate-600">Reference</p>
                            <p className="font-semibold text-slate-900">{payment.payment_reference}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-[10px] text-slate-600">Status</p>
                        <p className="font-semibold text-slate-900 capitalize">{payment.status}</p>
                    </div>
                </div>
                {payment.notes && (
                    <p className="text-xs text-slate-700 mt-1">
                        <span className="text-slate-500">Notes: </span>
                        {payment.notes}
                    </p>
                )}
            </div>

            <div className="flex justify-between rounded border border-emerald-500 bg-emerald-50 p-2 mt-2">
                <span className="text-sm font-bold text-slate-900">{isRefund ? "Refund Amount" : "Amount Paid"}</span>
                <span className={`text-lg font-bold ${isRefund ? "text-red-600" : "text-emerald-600"}`}>
                    {isRefund ? "-" : ""}{currency(Math.abs(payment.amount))}
                </span>
            </div>

            <div className="mt-4 border-t border-slate-300 pt-2 text-center text-[10px] text-slate-500">
                <p>This is a computer-generated receipt.</p>
                <p className="mt-1">Generated on {formatDate(new Date().toISOString())}</p>
            </div>
        </div>
    );
}
