import { apiClient } from "./api";
import { Patient } from "@/types";

export interface PatientSearchParams {
  mobile?: string;
  name?: string;
  page?: number;
  page_size?: number;
}

export interface PatientApiResponse {
  id: string;
  tenant_id: string;
  uhid: string;
  first_name: string;
  last_name: string;
  mobile: string;
  email: string | null;
  date_of_birth: string;
  gender: string;
  abha_id: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  created_at: string;
  updated_at: string;
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
  const fullName = `${apiPatient.first_name} ${apiPatient.last_name}`.trim();
  const gender = apiPatient.gender.charAt(0).toUpperCase() + apiPatient.gender.slice(1).toLowerCase();
  
  return {
    id: apiPatient.id,
    name: fullName,
    age: calculateAge(apiPatient.date_of_birth),
    gender: (gender === "Male" || gender === "Female" ? gender : "Other") as "Male" | "Female" | "Other",
    mobile: apiPatient.mobile,
    healthId: apiPatient.uhid || apiPatient.abha_id || "",
    doctor: "", // Will be set separately if needed
    lastVisit: apiPatient.updated_at || apiPatient.created_at,
    outstanding: 0, // Will be calculated from billing records
    status: "Active" as const,
  };
};

export const patientsApi = {
  async search(params: PatientSearchParams = {}): Promise<PatientsSearchResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.mobile) queryParams.append("mobile", params.mobile);
    if (params.name) queryParams.append("name", params.name);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.page_size) queryParams.append("page_size", params.page_size.toString());
    
    const queryString = queryParams.toString();
    const url = `/patients/search${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<PatientsSearchResponse>(url);
    return response.data;
  },

  // Convert API response items to Patient array
  mapToPatients(apiPatients: PatientApiResponse[]): Patient[] {
    return apiPatients.map(mapApiPatientToPatient);
  },
};

