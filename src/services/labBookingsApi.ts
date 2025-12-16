import { apiClient } from "./api";

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
  scheduled_date?: string; // YYYY-MM-DD
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

export const labBookingsApi = {
  async create(booking: CreateLabBookingRequest, tenantId?: string): Promise<LabBooking> {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const response = await apiClient.post<LabBooking>("/lab-bookings", booking, { params });
    return response.data;
  },

  async list(params?: LabBookingsSearchParams): Promise<LabBookingsSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.scheduled_date) queryParams.append("scheduled_date", params.scheduled_date);
    if (params?.booking_number) queryParams.append("booking_number", params.booking_number);
    if (params?.tenant_id) queryParams.append("tenant_id", params.tenant_id);
    
    const queryString = queryParams.toString();
    const url = `/lab-bookings${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<LabBookingsSearchResponse>(url);
    return response.data;
  },

  async getById(bookingId: string, tenantId?: string): Promise<LabBooking> {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const response = await apiClient.get<LabBooking>(`/lab-bookings/${bookingId}`, { params });
    return response.data;
  },

  async updateStatus(
    bookingId: string,
    status: BookingStatus,
    tenantId?: string
  ): Promise<LabBooking> {
    const params: Record<string, string> = {};
    if (tenantId) {
      params.tenant_id = tenantId;
    }
    const response = await apiClient.patch<LabBooking>(
      `/lab-bookings/${bookingId}/status`,
      { status },
      { params }
    );
    return response.data;
  },
};

