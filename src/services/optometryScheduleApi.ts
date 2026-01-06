/**
 * Optometry Schedule API
 *
 * Note: Optometrists reuse the existing OPD visits infrastructure.
 * - Optometrists are stored in the doctors table with specialization="Optometry"
 * - Schedule is fetched via OPD visits API filtered by doctor_id
 * - This is a convenience wrapper around opdVisitsApi.list()
 */

import { opdVisitsApi, Visit } from "./opdVisitsApi";
import type { OptometristSchedule, OptometristStats } from "@/types";

export interface OptometryScheduleParams {
  optometrist_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  tenant_id?: string;
}

/**
 * Maps OPD visits to optometrist schedule format
 */
function mapVisitsToSchedule(visits: Visit[], startDate: string): OptometristSchedule {
  // Extract time from checked_in_at or use created_at as fallback
  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '00:00';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Map visit_type to type (they're the same type)
  const mapVisitType = (visitType: string): "appointment" | "walk_in" | "emergency" => {
    if (visitType === 'emergency') return 'emergency';
    if (visitType === 'appointment') return 'appointment';
    return 'walk_in';
  };

  const slots = visits.map((visit) => {
    const timeString = visit.checked_in_at || visit.created_at;
    return {
      patient_id: visit.patient_id,
      patient_name: visit.patient_name || "Unknown",
      patient_uhid: null, // Visit type doesn't have patient object
      visit_id: visit.id,
      token_number: visit.token_number ?? undefined,
      time: formatTime(timeString),
      type: mapVisitType(visit.visit_type),
      status: visit.status,
      duration_minutes: 20, // Default duration
    };
  });

  return {
    date: startDate,
    total_appointments: visits.filter(v => v.visit_type === 'appointment').length,
    total_opd_visits: visits.length,
    slots,
  };
}

/**
 * Calculates daily statistics from visits
 */
function calculateStats(visits: Visit[]): OptometristStats {
  return {
    todayTotal: visits.length,
    todayCompleted: visits.filter((v) => v.status === "completed").length,
    todayInProgress: visits.filter((v) => v.status === "in_consultation").length,
    todayPending: visits.filter((v) => v.status === "checked_in").length, // "checked_in" is the waiting status
  };
}

export const optometryScheduleApi = {
  /**
   * Get schedule for an optometrist
   * Uses start_date and end_date for filtering
   * 
   * @param params.start_date - Start of date range (YYYY-MM-DD)
   * @param params.end_date - End of date range (YYYY-MM-DD)
   * 
   * For single day, pass same date for both start_date and end_date
   */
  async getTodaySchedule(params: OptometryScheduleParams): Promise<OptometristSchedule> {
    const visits = await opdVisitsApi.list({
      doctor_id: params.optometrist_id,
      start_date: params.start_date,
      end_date: params.end_date,
      page: 1,
      page_size: 100, // Get all visits for the period
      tenant_id: params.tenant_id,
    });

    return mapVisitsToSchedule(visits.items, params.start_date);
  },

  /**
   * Get statistics for optometrist
   * Uses start_date and end_date for filtering
   */
  async getStats(params: OptometryScheduleParams): Promise<OptometristStats> {
    const visits = await opdVisitsApi.list({
      doctor_id: params.optometrist_id,
      start_date: params.start_date,
      end_date: params.end_date,
      page: 1,
      page_size: 100,
      tenant_id: params.tenant_id,
    });

    return calculateStats(visits.items);
  },
};
