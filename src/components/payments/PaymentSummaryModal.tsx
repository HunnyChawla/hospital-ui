"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { invoicesApi, Invoice, InvoiceStatus } from "@/services/invoicesApi";
import { paymentsApi, Payment } from "@/services/paymentsApi";
import { patientsApi } from "@/services/patientsApi";
import { analyticsApi } from "@/services/analyticsApi";
import { currency, formatDate } from "@/utils/format";
import { getErrorMessage } from "@/utils/errorHandler";
import { toast } from "sonner";
import { SkeletonRow } from "@/components/shared/SkeletonRow";
import { CreditCard, Calendar, User, FileText } from "lucide-react";

interface PaymentSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "collected" | "pending";
}

interface InvoiceWithPatient extends Invoice {
  patient_name?: string;
  patient_mobile?: string;
  payments?: Payment[];
}

export function PaymentSummaryModal({
  isOpen,
  onClose,
  type,
}: PaymentSummaryModalProps) {
  const [invoices, setInvoices] = useState<InvoiceWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    if (isOpen) {
      fetchInvoices(1);
      fetchTotals();
    } else {
      // Reset state when modal closes
      setInvoices([]);
      setPage(1);
      setError(null);
      setTotalAmount(0);
      setTotalCollected(0);
    }
  }, [isOpen, type]);

  // Fetch totals using analytics API - much more efficient!
  const fetchTotals = async () => {
    try {
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      
      const revenueData = await analyticsApi.revenue({
        start_date: oneYearAgo.toISOString().split("T")[0],
        end_date: today.toISOString().split("T")[0],
        granularity: "monthly",
      });

      if (type === "collected") {
        // For collected, show only "paid" invoices (not partial)
        // Fetch paid invoices to get accurate total
        try {
          const paidResponse = await invoicesApi.list({
            page: 1,
            page_size: 100,
            status: "paid",
          });
          
          let totalPaid = paidResponse.items.reduce(
            (sum, inv) => sum + inv.paid_amount,
            0
          );
          let totalInvoiced = paidResponse.items.reduce(
            (sum, inv) => sum + inv.total_amount,
            0
          );
          
          // If there are more pages, fetch them (limit to 10 pages)
          if (paidResponse.total_pages > 1) {
            for (let page = 2; page <= Math.min(paidResponse.total_pages, 10); page++) {
              const nextPage = await invoicesApi.list({
                page,
                page_size: 100,
                status: "paid",
              });
              totalPaid += nextPage.items.reduce((sum, inv) => sum + inv.paid_amount, 0);
              totalInvoiced += nextPage.items.reduce((sum, inv) => sum + inv.total_amount, 0);
            }
          }
          
          setTotalCollected(totalPaid);
          setTotalAmount(totalInvoiced);
        } catch (err) {
          console.error("Failed to fetch paid invoice totals:", err);
          // Fallback to analytics data if invoice fetch fails
          const totalPaid = revenueData.data.reduce(
            (sum, point) => sum + point.collected_amount,
            0
          );
          const totalInvoiced = revenueData.data.reduce(
            (sum, point) => sum + point.invoiced_amount,
            0
          );
          setTotalCollected(totalPaid);
          setTotalAmount(totalInvoiced);
        }
      } else {
        // For pending, we want both pending AND partial invoices
        // Fetch both to get accurate total
        try {
          const [pendingResponse, partialResponse] = await Promise.all([
            invoicesApi.list({
              page: 1,
              page_size: 100,
              status: "pending",
            }),
            invoicesApi.list({
              page: 1,
              page_size: 100,
              status: "partial",
            }),
          ]);
          
          // Calculate totals from both pending and partial
          // Calculate balance as total_amount - paid_amount if balance_amount is missing/0
          const getBalance = (inv: Invoice) => {
            if (inv.balance_amount != null && inv.balance_amount > 0) {
              return inv.balance_amount;
            }
            // Calculate balance if not provided
            return (inv.total_amount || 0) - (inv.paid_amount || 0);
          };
          
          let totalBalance = pendingResponse.items.reduce(
            (sum, inv) => sum + getBalance(inv),
            0
          ) + partialResponse.items.reduce(
            (sum, inv) => sum + getBalance(inv),
            0
          );
          
          let totalInvoiced = pendingResponse.items.reduce(
            (sum, inv) => sum + inv.total_amount,
            0
          ) + partialResponse.items.reduce(
            (sum, inv) => sum + inv.total_amount,
            0
          );
          
          // If there are more pages, fetch them (limit to 10 pages each)
          const maxPages = Math.max(pendingResponse.total_pages, partialResponse.total_pages);
          if (maxPages > 1) {
            for (let page = 2; page <= Math.min(maxPages, 10); page++) {
              const [nextPending, nextPartial] = await Promise.all([
                invoicesApi.list({
                  page,
                  page_size: 100,
                  status: "pending",
                }).catch(() => ({ items: [] })),
                invoicesApi.list({
                  page,
                  page_size: 100,
                  status: "partial",
                }).catch(() => ({ items: [] })),
              ]);
              
              const getBalance = (inv: Invoice) => {
                if (inv.balance_amount != null && inv.balance_amount > 0) {
                  return inv.balance_amount;
                }
                return (inv.total_amount || 0) - (inv.paid_amount || 0);
              };
              
              totalBalance += nextPending.items.reduce((sum, inv) => sum + getBalance(inv), 0);
              totalBalance += nextPartial.items.reduce((sum, inv) => sum + getBalance(inv), 0);
              totalInvoiced += nextPending.items.reduce((sum, inv) => sum + inv.total_amount, 0);
              totalInvoiced += nextPartial.items.reduce((sum, inv) => sum + inv.total_amount, 0);
            }
          }
          
          setTotalCollected(totalBalance);
          setTotalAmount(totalInvoiced);
        } catch (err) {
          console.error("Failed to fetch pending invoice totals:", err);
          // Fallback to 0 if fetch fails
          setTotalCollected(0);
          setTotalAmount(0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch totals:", err);
      // Don't show error toast for totals, just log it
      // Totals will remain at 0 if fetch fails
    }
  };

  const fetchInvoices = async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      let filteredItems: Invoice[] = [];
      let totalCount = 0;
      let totalPagesCount = 0;

      if (type === "collected") {
        // Fetch paid invoices with proper pagination
        const response = await invoicesApi.list({
          page: pageNum,
          page_size: pageSize,
          status: "paid",
        });
        // Double-check: filter to ensure only paid invoices (in case API doesn't filter correctly)
        filteredItems = response.items.filter((inv) => inv.status === "paid");
        // If API returned non-paid invoices, we need to adjust totals
        // But typically API should filter correctly, so we use API totals
        totalCount = response.total;
        totalPagesCount = response.total_pages;
      } else if (type === "pending") {
        // For pending, show both "pending" AND "partial" invoices
        // Fetch both in batches of 100 and combine them, then do client-side pagination
        let allPendingInvoices: Invoice[] = [];
        const fetchPageSize = 100;
        let page = 1;
        let hasMorePending = true;
        let hasMorePartial = true;

        // Fetch all pending invoices
        while (hasMorePending) {
          const pendingResponse = await invoicesApi.list({
            page,
            page_size: fetchPageSize,
            status: "pending",
          }).catch(() => ({ items: [], total_pages: 0 }));
          
          allPendingInvoices = [...allPendingInvoices, ...pendingResponse.items];
          hasMorePending = page < (pendingResponse.total_pages || 0);
          page++;
          // Limit to first 10 pages to avoid too many requests
          if (page > 10) break;
        }

        // Fetch all partial invoices
        page = 1;
        while (hasMorePartial) {
          const partialResponse = await invoicesApi.list({
            page,
            page_size: fetchPageSize,
            status: "partial",
          }).catch(() => ({ items: [], total_pages: 0 }));
          
          allPendingInvoices = [...allPendingInvoices, ...partialResponse.items];
          hasMorePartial = page < (partialResponse.total_pages || 0);
          page++;
          // Limit to first 10 pages to avoid too many requests
          if (page > 10) break;
        }
        
        // Remove duplicates and sort by date (newest first)
        const uniqueInvoices = Array.from(
          new Map(allPendingInvoices.map((inv) => [inv.id, inv])).values()
        );
        const sortedInvoices = uniqueInvoices.sort(
          (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
        );
        
        // Client-side pagination
        totalCount = sortedInvoices.length;
        totalPagesCount = Math.ceil(totalCount / pageSize);
        const startIdx = (pageNum - 1) * pageSize;
        const endIdx = startIdx + pageSize;
        filteredItems = sortedInvoices.slice(startIdx, endIdx);
      }

      // Fetch patient details for each invoice
      const invoicesWithPatients = await Promise.all(
        filteredItems.map(async (invoice) => {
          try {
            const patient = await patientsApi.getById(invoice.patient_id);
            // Fetch payments for this invoice
            const paymentsResponse = await paymentsApi.list({
              invoice_id: invoice.id,
              page_size: 100,
            });
            return {
              ...invoice,
              patient_name: patient.name,
              patient_mobile: patient.mobile,
              payments: paymentsResponse.items,
            };
          } catch (err) {
            console.error(`Failed to fetch patient for invoice ${invoice.id}:`, err);
            return {
              ...invoice,
              patient_name: "Unknown",
              patient_mobile: undefined,
              payments: [],
            };
          }
        })
      );

      if (pageNum === 1) {
        setInvoices(invoicesWithPatients);
      } else {
        // Remove duplicates when appending new invoices
        setInvoices((prev) => {
          const existingIds = new Set(prev.map((inv) => inv.id));
          const newInvoices = invoicesWithPatients.filter(
            (inv) => !existingIds.has(inv.id)
          );
          return [...prev, ...newInvoices];
        });
      }
      setTotal(totalCount);
      setTotalPages(totalPagesCount);
      setPage(pageNum);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast.error(errorMessage || "Failed to load payment summary");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (page < totalPages && !loading) {
      fetchInvoices(page + 1);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${type === "collected" ? "Collected" : "Pending"} Payments Summary`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total {type === "collected" ? "Collected" : "Pending"}
            </p>
            <p
              className={`mt-1 text-2xl font-semibold ${
                type === "collected" ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {currency(totalCollected)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total Invoices
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{total}</p>
          </div>
        </div>

        {/* Invoices List */}
        {loading && invoices.length === 0 ? (
          <div className="py-4">
            <SkeletonRow rows={5} />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : invoices.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-4 text-sm font-semibold text-slate-900">
              No {type === "collected" ? "collected" : "pending"} payments found
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {type === "collected"
                ? "No payments have been collected yet"
                : "All invoices have been paid"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Invoice
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Patient
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                        Total
                      </th>
                      {type === "collected" ? (
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                          Paid
                        </th>
                      ) : (
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                          Balance
                        </th>
                      )}
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <div>
                              <p className="font-semibold text-slate-900">
                                {invoice.invoice_number}
                              </p>
                              <p className="text-xs text-slate-500">
                                {invoice.line_items?.length || 0} items
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-400" />
                            <div>
                              <p className="font-semibold text-slate-900">
                                {invoice.patient_name || "Unknown"}
                              </p>
                              {invoice.patient_mobile && (
                                <p className="text-xs text-slate-500">
                                  {invoice.patient_mobile}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-700">
                              {formatDate(invoice.invoice_date)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {currency(invoice.total_amount)}
                        </td>
                        {type === "collected" ? (
                          <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                            {currency(invoice.paid_amount)}
                          </td>
                        ) : (
                          <td className="px-4 py-3 text-right font-semibold text-amber-600">
                            {currency(
                              invoice.balance_amount != null && invoice.balance_amount > 0
                                ? invoice.balance_amount
                                : (invoice.total_amount || 0) - (invoice.paid_amount || 0)
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`pill ${
                              invoice.status === "paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : invoice.status === "partial"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Load More */}
            {page < totalPages && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50"
              >
                {loading ? "Loading..." : `Load More (${total - invoices.length} remaining)`}
              </button>
            )}

            {invoices.length > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
                <span>
                  Showing {invoices.length} of {total} invoices
                </span>
                <span>
                  Page {page} of {totalPages}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
