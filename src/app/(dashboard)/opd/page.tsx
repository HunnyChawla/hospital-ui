"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AppointmentsList } from "@/components/opd/AppointmentsList";
import { OpdList } from "@/components/opd/OpdList";
import { AppointmentFormModal } from "@/components/opd/AppointmentFormModal";
import { OpdFormModal } from "@/components/opd/OpdFormModal";
import { CalendarPlus, Stethoscope } from "lucide-react";
import { appointmentKeys } from "@/hooks/queries/useAppointments";
import { opdVisitKeys } from "@/hooks/queries/useOpdVisits";

export default function OpdPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"appointments" | "opd">("appointments");
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showOpdModal, setShowOpdModal] = useState(false);

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

  return (
    <div className="mt-6 grid gap-6">
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* Tabs */}
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleTabChange("appointments")}
              className={`px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === "appointments"
                  ? "border-b-2 border-sky-500 text-sky-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Appointments
            </button>
            <button
              onClick={() => handleTabChange("opd")}
              className={`px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === "opd"
                  ? "border-b-2 border-sky-500 text-sky-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              OPD Visits
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "appointments" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Appointments List</p>
                  <p className="text-xs text-slate-500">View and manage patient appointments</p>
                </div>
                <button
                  onClick={() => setShowAppointmentModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
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
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">OPD Visits List</p>
                  <p className="text-xs text-slate-500">View and manage OPD visits by doctor and date</p>
                </div>
                <button
                  onClick={() => setShowOpdModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
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
    </div>
  );
}
