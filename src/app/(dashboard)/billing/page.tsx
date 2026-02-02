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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing & Invoices</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage patient invoices, collect payments, and track billing history
        </p>
      </div>

      <BillingManagement
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
      />
    </div>
  );
}
