import { opdVisitsApi } from "./opdVisitsApi";
import { DoctorSchedule, DoctorScheduleSlot } from "@/types";
import { Visit } from "./opdVisitsApi";

export interface DoctorScheduleParams {
  doctor_id: string;
  date: string; // YYYY-MM-DD
}

/**
 * Maps OPD Visit to DoctorScheduleSlot format
 */
function mapVisitToSlot(visit: Visit): DoctorScheduleSlot {
  // Extract time from checked_in_at or use created_at as fallback
  const timeString = visit.checked_in_at || visit.created_at;
  const time = timeString ? new Date(timeString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) : '00:00';

  // Map visit_type correctly, including emergency
  let type: "appointment" | "walk_in" | "emergency";
  if (visit.visit_type === 'emergency') {
    type = 'emergency';
  } else if (visit.visit_type === 'appointment') {
    type = 'appointment';
  } else {
    type = 'walk_in';
  }

  return {
    time,
    type,
    item_id: visit.id,
    patient_id: visit.patient_id,
    patient_name: visit.patient_name || 'Unknown Patient',
    status: visit.status,
    duration_minutes: 20, // Default duration
    token_number: visit.token_number || 0,
  };
}

export const doctorScheduleApi = {
  /**
   * Get today's schedule for a doctor using existing OPD Visits API
   */
  async getTodaySchedule(
    params: DoctorScheduleParams,
    tenantId?: string
  ): Promise<DoctorSchedule> {
    // Fetch OPD visits for the doctor on the given date
    const response = await opdVisitsApi.list({
      doctor_id: params.doctor_id,
      start_date: params.date,
      end_date: params.date,
      sort_by: 'checked_in_at',
      sort_order: 'asc',
      page: 1,
      page_size: 100, // Get all visits for the day
      tenant_id: tenantId,
    });

    // Map visits to schedule slots
    const slots = response.items.map(mapVisitToSlot);

    // Count visits by type (emergency counted as walk-in for totals)
    const appointmentCount = slots.filter(s => s.type === 'appointment').length;
    const opdVisitCount = slots.filter(s => s.type === 'walk_in' || s.type === 'emergency').length;

    return {
      date: params.date,
      total_appointments: appointmentCount,
      total_opd_visits: opdVisitCount,
      slots,
    };
  },
};
