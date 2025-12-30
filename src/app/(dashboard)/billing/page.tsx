"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BillingManagement } from "@/components/billing/BillingManagement";
import { invoiceKeys } from "@/hooks/queries/useInvoices";

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "partial" | "refunded">("all");

  const handleStatusFilterChange = (filter: "all" | "pending" | "paid" | "partial" | "refunded") => {
    setStatusFilter(filter);

    // Invalidate invoices queries to refetch with new filter
    queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
  };

  return (
    <div className="mt-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-lg font-semibold text-slate-900">Billing & Invoices</p>
          <p className="text-xs text-slate-500">Manage invoices and patient billing</p>
        </div>
        <BillingManagement
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
        />
      </div>
    </div>
  );
}
