"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LabBookingsList } from "@/components/lab-bookings/LabBookingsList";
import { LabBookingFormModal } from "@/components/lab-bookings/LabBookingFormModal";
import { Beaker } from "lucide-react";

export default function LabBookingsPage() {
  const searchParams = useSearchParams();
  const [showModal, setShowModal] = useState(false);

  // Handle query parameters for opening modals
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "add") {
      setShowModal(true);
    }
  }, [searchParams]);

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Lab Bookings</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage lab test bookings and reports
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md sm:w-auto cursor-pointer"
          >
            <Beaker className="h-4 w-4" />
            Create Booking
          </button>
        </div>

        <div className="mt-6">
          <LabBookingsList />
        </div>
      </div>

      <LabBookingFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
