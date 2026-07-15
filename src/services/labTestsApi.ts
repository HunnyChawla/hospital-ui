import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface LabTest {
  id: string;
  tenant_id: string;
  test_code: string;
  test_name: string;
  description: string | null;
  category: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLabTestRequest {
  test_code: string;
  test_name: string;
  description?: string;
  category: string;
  price: number;
}

export interface UpdateLabTestRequest {
  test_name?: string;
  description?: string;
  category?: string;
  price?: number;
  is_active?: boolean;
}

export interface LabTestsSearchParams {
  page?: number;
  page_size?: number;
  category?: string;
  is_active?: boolean;
  search?: string;
  patient_id?: string;
  tenant_id?: string; // PlatformOwner only
}

export interface LabTestsSearchResponse {
  items: LabTest[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface LabTestParameter {
  id: string;
  tenant_id: string;
  test_code: string;
  parameter_code: string;
  parameter_name: string;
  unit: string;
  normal_min: number | null;
  normal_max: number | null;
  normal_text: string | null;
  gender: string;
  age_min: number;
  age_max: number;
  method: string | null;
  display_order: number;
  is_active: boolean;
  section_name?: string | null;
  parameter_type: "number" | "dropdown" | "text" | "image";
  dropdown_options?: string[] | null;
}

export interface CreateLabTestParameterRequest {
  parameter_code: string;
  parameter_name: string;
  unit: string;
  normal_min?: number;
  normal_max?: number;
  normal_text?: string;
  gender: "ALL" | "M" | "F";
  age_min?: number;
  age_max?: number;
  method?: string;
  display_order: number;
  is_active?: boolean;
  section_name?: string | null;
  parameter_type: "number" | "dropdown" | "text" | "image";
  dropdown_options?: string[] | null;
}

export interface UpdateLabTestParameterRequest {
  parameter_code?: string;
  parameter_name?: string;
  unit?: string;
  normal_min?: number | null;
  normal_max?: number | null;
  normal_text?: string | null;
  gender?: "ALL" | "M" | "F";
  age_min?: number;
  age_max?: number;
  method?: string | null;
  display_order?: number;
  is_active?: boolean;
  section_name?: string | null;
  parameter_type?: "number" | "dropdown" | "text" | "image";
  dropdown_options?: string[] | null;
}

export interface LabTestPrice {
  id: string;
  lab_test_id: string;
  test_code: string;
  tenant_id: string;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateLabTestPriceRequest {
  price: number;
}

export interface LabTestResult {
  id: string;
  booking_item_id: string;
  parameter_id: string;
  parameter_name: string;
  parameter_code: string;
  unit: string;
  result_value: string;
  result_numeric: number | null;
  is_abnormal: boolean;
  normal_min: number | null;
  normal_max: number | null;
  normal_text: string | null;
  notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  section_name?: string | null;
  parameter_type: "number" | "dropdown" | "text" | "image";
}

export interface LabTestResultsResponse {
  booking_item_id: string;
  lab_test_id: string;
  test_code: string;
  test_name: string;
  results: LabTestResult[];
}

export interface PublishResultsRequest {
  results: Array<{
    parameter_id: string;
    result_value?: string | null;
    result_numeric?: number | null;
    notes?: string | null;
    image_url?: string | null;
  }>;
}

export interface PrescriptionField {
  id: string;
  tenant_id: string;
  test_code: string;
  field_name: string;
  field_type: "text" | "dropdown" | "number";
  dropdown_options?: string[] | null;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
}

export interface CreatePrescriptionFieldRequest {
  field_name: string;
  field_type: "text" | "dropdown" | "number";
  dropdown_options?: string[] | null;
  is_required?: boolean;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdatePrescriptionFieldRequest {
  field_name?: string;
  field_type?: "text" | "dropdown" | "number";
  dropdown_options?: string[] | null;
  is_required?: boolean;
  display_order?: number;
  is_active?: boolean;
}

export const labTestsApi = {
  async create(test: CreateLabTestRequest, tenantId?: string): Promise<LabTest> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<LabTest>("/lab-tests", test, { params });
    return response.data;
  },

  async list(params?: LabTestsSearchParams): Promise<LabTestsSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.category) queryParams.append("category", params.category);
    if (params?.is_active !== undefined) queryParams.append("is_active", params.is_active.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);
    
    const queryString = queryParams.toString();
    const url = `/lab-tests${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<LabTestsSearchResponse>(url);
    return response.data;
  },

  async getById(testId: string, tenantId?: string): Promise<LabTest> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<LabTest>(`/lab-tests/${testId}`, { params });
    return response.data;
  },

  async update(testId: string, updates: UpdateLabTestRequest, tenantId?: string): Promise<LabTest> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.patch<LabTest>(`/lab-tests/${testId}`, updates, { params });
    return response.data;
  },

  async getTestParameters(testCode: string, gender?: string, tenantId?: string): Promise<LabTestParameter[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params: Record<string, string> = {};
    if (apiTenantId) params.tenant_id = apiTenantId;
    if (gender) params.gender = gender;
    const response = await apiClient.get<LabTestParameter[]>(`/lab-tests/${testCode}/parameters`, { params });
    return response.data;
  },

  async createParameter(
    testCode: string,
    parameter: CreateLabTestParameterRequest,
    tenantId?: string
  ): Promise<LabTestParameter> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<LabTestParameter>(
      `/lab-tests/${testCode}/parameters`,
      parameter,
      { params }
    );
    return response.data;
  },

  async updateParameter(
    testCode: string,
    parameterId: string,
    updates: UpdateLabTestParameterRequest,
    tenantId?: string
  ): Promise<LabTestParameter> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.patch<LabTestParameter>(
      `/lab-tests/${testCode}/parameters/${parameterId}`,
      updates,
      { params }
    );
    return response.data;
  },

  async deleteParameter(testCode: string, parameterId: string, tenantId?: string): Promise<void> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    await apiClient.delete(`/lab-tests/${testCode}/parameters/${parameterId}`, { params });
  },

  async getResults(
    labBookingId: string,
    bookingItemId: string,
    tenantId?: string
  ): Promise<LabTestResult[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<LabTestResultsResponse>(
      `/lab-tests/bookings/${labBookingId}/items/${bookingItemId}/results`,
      { params }
    );
    // Return the results array from the response
    return response.data.results || [];
  },

  async publishResults(
    labBookingId: string,
    bookingItemId: string,
    results: PublishResultsRequest,
    tenantId?: string
  ): Promise<LabTestResult[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<LabTestResult[]>(
      `/lab-tests/bookings/${labBookingId}/items/${bookingItemId}/results`,
      results,
      { params }
    );
    return response.data;
  },

  async getTestPrice(testCode: string, tenantId?: string): Promise<LabTestPrice> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<LabTestPrice>(`/lab-tests/prices/${testCode}`, { params });
    return response.data;
  },

  async updateTestPrice(
    testCode: string,
    updates: UpdateLabTestPriceRequest,
    tenantId?: string
  ): Promise<LabTestPrice> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.patch<LabTestPrice>(
      `/lab-tests/prices/${testCode}`,
      updates,
      { params }
    );
    return response.data;
  },

  async listPrescriptionFields(testCode: string, tenantId?: string): Promise<PrescriptionField[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<PrescriptionField[]>(`/lab-tests/${testCode}/prescription-fields`, { params });
    return response.data;
  },

  async createPrescriptionField(
    testCode: string,
    field: CreatePrescriptionFieldRequest,
    tenantId?: string
  ): Promise<PrescriptionField> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<PrescriptionField>(
      `/lab-tests/${testCode}/prescription-fields`,
      field,
      { params }
    );
    return response.data;
  },

  async updatePrescriptionField(
    testCode: string,
    fieldId: string,
    updates: UpdatePrescriptionFieldRequest,
    tenantId?: string
  ): Promise<PrescriptionField> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.patch<PrescriptionField>(
      `/lab-tests/${testCode}/prescription-fields/${fieldId}`,
      updates,
      { params }
    );
    return response.data;
  },

  async deletePrescriptionField(testCode: string, fieldId: string, tenantId?: string): Promise<void> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    await apiClient.delete(`/lab-tests/${testCode}/prescription-fields/${fieldId}`, { params });
  },
};

