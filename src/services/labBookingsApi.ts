import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import { LabResultsResponse } from "@/types";

export type BookingStatus = "scheduled" | "sample_collected" | "in_progress" | "completed" | "cancelled";
export type TestPriority = "routine" | "urgent" | "stat";
export type PaymentMethod = "cash" | "upi" | "card" | "cheque";

export interface LabBookingTest {
  id: string;
  lab_test_id: string;
  test_code: string;
  test_name: string;
  price: number;
  original_price?: number | null;
  is_price_overridden?: boolean;
  prescription_metadata?: Record<string, any> | null;
}

export interface LabBooking {
  id: string;
  tenant_id: string;
  patient_id: string;
  visit_id?: string | null;
  prescription_id?: string | null;
  sample_id?: string | null;
  booking_number: string;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string | null; // HH:MM
  priority: TestPriority;
  status: BookingStatus;
  invoice_id: string | null;
  payment_id: string | null;
  notes: string | null;
  tests: LabBookingTest[];
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLabBookingRequest {
  patient_id: string;
  visit_id?: string;
  prescription_id?: string;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time?: string; // HH:MM
  priority?: TestPriority;
  tests: Array<{
    lab_test_id: string;
    price?: number;
  }>;
  notes?: string;
  payment_method?: PaymentMethod;
  payment_reference?: string;
}

export interface LabBookingsSearchParams {
  page?: number;
  page_size?: number;
  patient_id?: string;
  status?: BookingStatus;
  scheduled_date?: string; // YYYY-MM-DD (kept for backward compatibility)
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  booking_number?: string;
  tenant_id?: string; // PlatformOwner only
}

export interface LabBookingsSearchResponse {
  items: LabBooking[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdvisedTest {
  advice_item_id: string;
  lab_test_id: string;
  test_code: string;
  test_name: string;
  advice_type: string;
  already_booked: boolean;
  existing_booking_id?: string | null;
  existing_booking_number?: string | null;
  existing_booking_status?: BookingStatus | null;
  existing_booking_date?: string | null;
  price?: number | null;
  prescription_metadata?: Record<string, any> | null;
}

export interface BookAdvisedTestsRequest {
  patient_id: string;
  visit_id?: string;
  admission_id?: string;
  scheduled_date: string; // YYYY-MM-DD
  priority?: TestPriority;
  lab_test_ids: string[];
  test_items?: Array<{
    lab_test_id: string;
    price?: number;
  }>;
  notes?: string;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  test_metadata?: Array<{
    lab_test_id: string;
    metadata: Record<string, any>;
  }>;
}

export const labBookingsApi = {
  async create(booking: CreateLabBookingRequest, tenantId?: string): Promise<LabBooking> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<LabBooking>("/lab-bookings", booking, { params });
    return response.data;
  },

  async list(params?: LabBookingsSearchParams): Promise<LabBookingsSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.status) queryParams.append("status", params.status);
    
    // Use start_date and end_date if provided, otherwise fall back to scheduled_date
    if (params?.start_date && params?.end_date) {
      queryParams.append("start_date", params.start_date);
      queryParams.append("end_date", params.end_date);
    } else if (params?.scheduled_date) {
      queryParams.append("scheduled_date", params.scheduled_date);
    }
    
    if (params?.booking_number) queryParams.append("booking_number", params.booking_number);
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);
    
    const queryString = queryParams.toString();
    const url = `/lab-bookings${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<LabBookingsSearchResponse>(url);
    return response.data;
  },

  async getById(bookingId: string, tenantId?: string): Promise<LabBooking> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<LabBooking>(`/lab-bookings/${bookingId}`, { params });
    return response.data;
  },

  async updateStatus(
    bookingId: string,
    status: BookingStatus,
    tenantId?: string
  ): Promise<LabBooking> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params: Record<string, string> = {};
    if (apiTenantId) {
      params.tenant_id = apiTenantId;
    }
    const response = await apiClient.patch<LabBooking>(
      `/lab-bookings/${bookingId}/status`,
      { status },
      { params }
    );
    return response.data;
  },

  /**
   * Get lab test results with normal ranges
   */
  async getResults(
    bookingId: string,
    tenantId?: string
  ): Promise<LabResultsResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<LabResultsResponse>(
      `/lab-tests/bookings/${bookingId}/results`,
      { params }
    );
    return response.data;
  },

  async getAdvisedTests(
    identifier: string | { visit_id?: string; admission_id?: string },
    tenantId?: string
  ): Promise<AdvisedTest[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params: Record<string, string> = {};
    if (typeof identifier === "string") {
      params.visit_id = identifier;
    } else {
      if (identifier.visit_id) params.visit_id = identifier.visit_id;
      if (identifier.admission_id) params.admission_id = identifier.admission_id;
    }
    if (apiTenantId) {
      params.tenant_id = apiTenantId;
    }
    const response = await apiClient.get<AdvisedTest[]>("/lab-bookings/advised-tests", { params });
    return response.data;
  },

  async bookAdvisedTests(data: BookAdvisedTestsRequest, tenantId?: string): Promise<LabBooking> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<LabBooking>("/lab-bookings/advised-tests/book", data, { params });
    return response.data;
  },

  async getPatientsWithPendingTests(
    params?: { start_date?: string; end_date?: string; tenant_id?: string }
  ): Promise<PatientWithPendingTestsResponse> {
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/lab-bookings/patients-with-pending-tests${queryString ? `?${queryString}` : ""}`;
    const response = await apiClient.get<PatientWithPendingTestsResponse>(url);
    return response.data;
  },
};

export interface PatientWithPendingTests {
  patient_id: string;
  patient_uhid?: string | null;
  patient_name: string;
  patient_mobile: string | null;
  visit_id?: string | null;
  visit_number: string;
  visit_date: string;
  doctor_name: string | null;
  pending_test_count: number;
  total_advised_count?: number;
  booked_count?: number;
  admission_id?: string | null;
  admission_number?: string | null;
  encounter_type?: "opd" | "ipd";
  encounter_details?: string | null;
}

export interface PatientWithPendingTestsResponse {
  total: number;
  items: PatientWithPendingTests[];
}


