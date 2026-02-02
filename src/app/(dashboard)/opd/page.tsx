"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AppointmentsList } from "@/components/opd/AppointmentsList";
import { OpdList } from "@/components/opd/OpdList";
import { AppointmentFormModal } from "@/components/opd/AppointmentFormModal";
import { OpdFormModal } from "@/components/opd/OpdFormModal";
import { CalendarPlus, Stethoscope, RefreshCw } from "lucide-react";
import { appointmentKeys } from "@/hooks/queries/useAppointments";
import { opdVisitKeys } from "@/hooks/queries/useOpdVisits";

export default function OpdPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"appointments" | "opd">("appointments");
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  const [showOpdModal, setShowOpdModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle query parameters for tabs and modals
  useEffect(() => {
    const tab = searchParams.get("tab");
    const action = searchParams.get("action");

    // Set active tab if provided
    if (tab === "appointments" || tab === "opd") {
      setActiveTab(tab);
    }

    // Open modals based on action
    if (action === "appointment") {
      setShowAppointmentModal(true);
    } else if (action === "opd") {
      setShowOpdModal(true);
    }
  }, [searchParams]);

  const handleTabChange = (tab: "appointments" | "opd") => {
    setActiveTab(tab);

    // Invalidate queries to refetch data when switching tabs
    if (tab === "appointments") {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    } else {
      queryClient.invalidateQueries({ queryKey: opdVisitKeys.lists() });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (activeTab === "appointments") {
        await queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      } else {
        await queryClient.invalidateQueries({ queryKey: opdVisitKeys.lists() });
      }
    } finally {
      // Add a small delay so the user sees the spinner even if the query is instant
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* Tabs */}

        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => handleTabChange("appointments")}
              className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab === "appointments"
                ? "border-b-2 border-sky-500 text-sky-600"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              Appointments
            </button>
            <button
              onClick={() => handleTabChange("opd")}
              className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab === "opd"
                ? "border-b-2 border-sky-500 text-sky-600"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              OPD Visits
            </button>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 disabled:opacity-70"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>


        {/* Content */}
        <div className="p-4 sm:p-6">
          {activeTab === "appointments" && (
            <div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Appointments List</p>
                  <p className="text-xs text-slate-500">View and manage patient appointments</p>
                </div>
                <button
                  onClick={() => setShowAppointmentModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow sm:w-auto"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Book Appointment
                </button>
              </div>
              <AppointmentsList />
            </div>
          )}

          {activeTab === "opd" && (
            <div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">OPD Visits List</p>
                  <p className="text-xs text-slate-500">View and manage OPD visits by doctor and date</p>
                </div>
                <button
                  onClick={() => setShowOpdModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow sm:w-auto"
                >
                  <Stethoscope className="h-4 w-4" />
                  Create OPD
                </button>
              </div>
              <OpdList />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AppointmentFormModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
      />

      <OpdFormModal
        isOpen={showOpdModal}
        onClose={() => setShowOpdModal(false)}
      />
    </div >
  );
}
