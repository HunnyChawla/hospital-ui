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
  return {
    doctor_id: visits[0]?.doctor_id || "",
    date: startDate,
    slots: visits.map((visit) => ({
      patient_id: visit.patient_id,
      patient_name: visit.patient_name || "Unknown",
      patient_uhid: null, // Visit type doesn't have patient object
      visit_id: visit.id,
      token_number: visit.token_number,
      time: visit.checked_in_at, // Use checked_in_at as time
      status: visit.status,
      visit_type: visit.visit_type,
    })),
    total_patients: visits.length,
  };
}

/**
 * Calculates daily statistics from visits
 */
function calculateStats(visits: Visit[]): OptometristStats {
  return {
    total_patients: visits.length,
    completed: visits.filter((v) => v.status === "completed").length,
    in_progress: visits.filter((v) => v.status === "in_consultation").length,
    waiting: visits.filter((v) => v.status === "checked_in").length, // "checked_in" is the waiting status
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
