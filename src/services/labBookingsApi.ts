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
}

export interface LabBooking {
  id: string;
  tenant_id: string;
  patient_id: string;
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
  price?: number | null;
}

export interface BookAdvisedTestsRequest {
  patient_id: string;
  visit_id: string;
  scheduled_date: string; // YYYY-MM-DD
  priority?: TestPriority;
  lab_test_ids: string[];
  notes?: string;
  payment_method?: PaymentMethod;
  payment_reference?: string;
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

  async getAdvisedTests(visitId: string, tenantId?: string): Promise<AdvisedTest[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params: Record<string, string> = { visit_id: visitId };
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
};

