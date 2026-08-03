import { apiClient } from "./api";
import { Patient } from "@/types";
import { getTenantIdForApi } from "@/utils/auth";

export interface PatientSearchParams {
  mobile?: string;
  name?: string;
  uhid?: string;
  date_of_birth?: string;
  page?: number;
  page_size?: number;
  tenant_id?: string; // PlatformOwner only
}

export interface GlobalSearchParams {
  q: string;
  page?: number;
  page_size?: number;
  tenant_id?: string; // PlatformOwner only
}

export interface PatientApiResponse {
  id: string;
  tenant_id: string;
  uhid: string;
  title: string | null;
  first_name: string;
  last_name: string | null;
  mobile: string;
  email: string | null;
  date_of_birth: string;
  gender: string;
  abha_id: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  category: string | null;
  abha_number?: string | null;
  abha_address?: string | null;
  abha_linked_at?: string | null;
  abha_verified?: boolean;
  aadhaar_number?: string | null;
  created_at: string;
  updated_at: string;
}


export interface CreatePatientRequest {
  title?: string | null;
  first_name: string;
  last_name?: string | null;
  mobile: string;
  email?: string | null;
  date_of_birth: string; // YYYY-MM-DD
  gender: "male" | "female" | "other";
  abha_id?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  category?: string | null;
  abha_number?: string | null;
  abha_address?: string | null;
  abha_linked_at?: string | null;
  abha_verified?: boolean;
  aadhaar_number?: string | null;
}


export interface UpdatePatientRequest {
  title?: string | null;
  first_name?: string;
  last_name?: string | null;
  mobile?: string;
  email?: string | null;
  date_of_birth?: string;
  gender?: string;
  abha_id?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  category?: string | null;
  abha_number?: string | null;
  abha_address?: string | null;
  abha_linked_at?: string | null;
  abha_verified?: boolean;
  aadhaar_number?: string | null;
}


export interface PatientsSearchResponse {
  items: PatientApiResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Helper function to calculate age from date of birth
const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Map API response to Patient type
const mapApiPatientToPatient = (apiPatient: PatientApiResponse): Patient => {
  const titlePrefix = apiPatient.title && !apiPatient.first_name.startsWith(apiPatient.title) ? `${apiPatient.title} ` : "";
  const fullName = `${titlePrefix}${apiPatient.first_name} ${apiPatient.last_name || ""}`.trim();
  const gender = apiPatient.gender.charAt(0).toUpperCase() + apiPatient.gender.slice(1).toLowerCase();

  return {
    id: apiPatient.id,
    title: apiPatient.title || undefined,
    name: fullName,
    age: calculateAge(apiPatient.date_of_birth),
    gender: (gender === "Male" || gender === "Female" ? gender : "Other") as "Male" | "Female" | "Other",
    mobile: apiPatient.mobile,
    healthId: apiPatient.uhid || apiPatient.abha_id || "",
    doctor: "", // Will be set separately if needed
    lastVisit: apiPatient.updated_at || apiPatient.created_at,
    outstanding: 0, // Will be calculated from billing records
    status: "Active" as const,
    address: apiPatient.address || undefined,
    city: apiPatient.city || undefined,
    state: apiPatient.state || undefined,
    pincode: apiPatient.pincode || undefined,
    category: apiPatient.category || undefined,
    abhaId: apiPatient.abha_id || undefined,
    abhaNumber: apiPatient.abha_number || undefined,
    abhaAddress: apiPatient.abha_address || undefined,
    abhaVerified: apiPatient.abha_verified || false,
    abhaLinkedAt: apiPatient.abha_linked_at || undefined,
  };
};


// Helper function to format patient name with title
export const formatPatientName = (patient: { title?: string | null; first_name?: string; last_name?: string | null }): string => {
  if (!patient || !patient.first_name) return "";
  const titlePrefix = patient.title && !patient.first_name.startsWith(patient.title) ? `${patient.title} ` : "";
  return `${titlePrefix}${patient.first_name} ${patient.last_name || ""}`.trim();
};

export const patientsApi = {
  async create(patient: CreatePatientRequest, tenantId?: string): Promise<PatientApiResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<PatientApiResponse>("/patients", patient, { params });
    return response.data;
  },

  async searchGlobal(params: GlobalSearchParams): Promise<PatientsSearchResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("q", params.q);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.page_size) queryParams.append("page_size", params.page_size.toString());
    const apiTenantId = getTenantIdForApi(params.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const response = await apiClient.get<PatientsSearchResponse>(`/patients/search/global?${queryParams.toString()}`);
    return response.data;
  },

  async search(params: PatientSearchParams = {}): Promise<PatientsSearchResponse> {
    const queryParams = new URLSearchParams();

    if (params.mobile) queryParams.append("mobile", params.mobile);
    if (params.name) queryParams.append("name", params.name);
    if (params.uhid) queryParams.append("uhid", params.uhid);
    if (params.date_of_birth) queryParams.append("date_of_birth", params.date_of_birth);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.page_size) queryParams.append("page_size", params.page_size.toString());
    const apiTenantId = getTenantIdForApi(params.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/patients/search${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<PatientsSearchResponse>(url);
    return response.data;
  },

  async getById(patientId: string, tenantId?: string): Promise<PatientApiResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<PatientApiResponse>(`/patients/${patientId}`, { params });
    return response.data;
  },

  async getByUhid(uhid: string, tenantId?: string): Promise<PatientApiResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<PatientApiResponse>(`/patients/uhid/${uhid}`, { params });
    return response.data;
  },

  async update(patientId: string, updates: UpdatePatientRequest, tenantId?: string): Promise<PatientApiResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<PatientApiResponse>(`/patients/${patientId}`, updates, { params });
    return response.data;
  },

  // Convert API response items to Patient array
  mapToPatients(apiPatients: PatientApiResponse[]): Patient[] {
    return apiPatients.map(mapApiPatientToPatient);
  },
};

