"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/redux/hooks";
import { appointmentsApi, Appointment } from "@/services/appointmentsApi";
import { opdVisitsApi, CreateVisitRequest } from "@/services/opdVisitsApi";
import { CreateOpdFromAppointmentModal } from "./CreateOpdFromAppointmentModal";
import { formatDate } from "@/utils/format";
import { Calendar, User, Stethoscope, CheckCircle2, XCircle, Clock as ClockIcon, Plus } from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface AppointmentsListProps {
  doctorId?: string;
  appointmentDate?: string;
}

export function AppointmentsList({ doctorId, appointmentDate }: AppointmentsListProps) {
  const doctors = useAppSelector((s) => s.doctors.list);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctorId || "");
  const [selectedDate, setSelectedDate] = useState(appointmentDate || "");

  // Set default date on client side only to avoid hydration mismatch
  useEffect(() => {
    if (!selectedDate && !appointmentDate) {
      setSelectedDate(new Date().toISOString().split("T")[0]);
    } else if (appointmentDate) {
      setSelectedDate(appointmentDate);
    }
  }, [appointmentDate, selectedDate]);

  useEffect(() => {
    // Set default doctor when doctors are loaded
    if (doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

  const fetchAppointments = useCallback(async () => {
    if (!selectedDoctorId) return;
    
    setLoading(true);
    try {
      // Patient name and mobile are included in the API response
      const data = await appointmentsApi.getByDoctor(selectedDoctorId, selectedDate, {
        appointmentsOnly: false,
      });
      
      setAppointments(data);
    } catch (error: any) {
      console.error("Failed to fetch appointments:", error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDoctorId, selectedDate]);

  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      fetchAppointments();
    }
  }, [selectedDoctorId, selectedDate, fetchAppointments]);

  // Listen for appointment creation events to refresh the list
  useEffect(() => {
    const handleAppointmentCreated = () => {
      if (selectedDoctorId && selectedDate) {
        fetchAppointments();
      }
    };

    window.addEventListener("appointment:created", handleAppointmentCreated);
    return () => {
      window.removeEventListener("appointment:created", handleAppointmentCreated);
    };
  }, [selectedDoctorId, selectedDate, fetchAppointments]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
      case "cancelled":
      case "no_show":
        return <XCircle className="h-3 w-3 text-rose-500" />;
      case "checked_in":
        return <CheckCircle2 className="h-3 w-3 text-sky-500" />;
      default:
        return <ClockIcon className="h-3 w-3 text-amber-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 text-emerald-700";
      case "cancelled":
      case "no_show":
        return "bg-rose-50 text-rose-700";
      case "checked_in":
        return "bg-sky-50 text-sky-700";
      default:
        return "bg-amber-50 text-amber-700";
    }
  };

  const handleCreateOpdFromAppointment = async (appointment: Appointment) => {
    // This function is now handled by modal flow.
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [appointmentForModal, setAppointmentForModal] = useState<Appointment | null>(null);

  const openCreateModal = (appt: Appointment) => {
    setAppointmentForModal(appt);
    setShowCreateModal(true);
  };

  const handleAfterCreated = (visitId: string) => {
    // Refresh appointments list
    if (selectedDoctorId && selectedDate) {
      fetchAppointments();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-slate-600 flex items-center gap-1">
            <Stethoscope className="h-4 w-4" />
            Doctor
          </span>
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          >
            <option value="">Select doctor</option>
            {doctors.map((doc) => {
              const doctorName = doc.name || `Dr. ${doc.specialization}`;
              return (
                <option key={doc.id} value={doc.id}>
                  {doctorName} - {doc.specialization}
                </option>
              );
            })}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-slate-600 flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Date
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          />
        </label>
      </div>

      {loading ? (
        <SkeletonRow rows={3} />
      ) : appointments.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
          <p className="text-slate-500">No appointments found for selected doctor and date</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="relative rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700 font-bold">
                    #{appointment.token_number}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {appointment.patient_name || `Patient ${appointment.patient_id.slice(0, 8)}...`}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      {appointment.patient_mobile && (
                        <span>{appointment.patient_mobile}</span>
                      )}
                      {appointment.visit_id && (
                        <span className="text-emerald-600">Visit Created</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2">
                  <span className={`pill flex items-center gap-1 px-2 py-0.5 text-xs font-normal ${getStatusColor(appointment.status)}`}>
                    {getStatusIcon(appointment.status)}
                    <span className="capitalize">{appointment.status.replace("_", " ")}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!appointment.visit_id && appointment.status !== "cancelled" && appointment.status !== "no_show" && (
                    <button
                      onClick={() => openCreateModal(appointment)}
                      className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600"
                      style={{ width: "2rem" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.width = "auto";
                        e.currentTarget.style.paddingLeft = "0.75rem";
                        e.currentTarget.style.paddingRight = "0.75rem";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.width = "2rem";
                        e.currentTarget.style.paddingLeft = "0.5rem";
                        e.currentTarget.style.paddingRight = "0.5rem";
                      }}
                      title="Create OPD"
                    >
                      <Plus className="h-4 w-4 shrink-0" />
                      <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Create OPD</span>
                    </button>
                  )}
                </div>
              </div>
              {appointment.notes && (
                <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                  {appointment.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CreateOpdFromAppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        appointment={appointmentForModal}
        doctor={appointmentForModal ? doctors.find((d) => d.id === appointmentForModal.doctor_id) : null}
        onCreated={handleAfterCreated}
      />
    </div>
  );
}

