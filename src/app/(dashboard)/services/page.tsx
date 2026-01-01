"use client";

import { ServicesPanel } from "@/components/services/ServicesPanel";

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Service Master</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage hospital services, categories, and pricing structure
        </p>
      </div>

      <ServicesPanel />
    </div>
  );
}
